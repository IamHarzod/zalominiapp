import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AttendanceSession,
  SessionStatus,
  AttendanceRecord,
  AttendanceStatus,
  Classroom,
  ClassEnrollment,
  EnrollmentStatus,
  User,
  UserRole,
  UserStatus,
} from '../../entities';
import { RedisService } from '../redis/redis.service';
import { AttendanceGateway } from './attendance.gateway';
import { StartSessionDto } from './dto/start-session.dto';
import { CheckInDto } from './dto/check-in.dto';
import { calculateHaversineDistance } from './utils/haversine.util';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceSession)
    private readonly sessionRepository: Repository<AttendanceSession>,
    @InjectRepository(AttendanceRecord)
    private readonly recordRepository: Repository<AttendanceRecord>,
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    @InjectRepository(ClassEnrollment)
    private readonly enrollmentRepository: Repository<ClassEnrollment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly attendanceGateway: AttendanceGateway,
  ) {}

  /**
   * 1. GIẢNG VIÊN: Mở phiên điểm danh mới
   */
  async startSession(lecturerId: string, dto: StartSessionDto) {
    // 1. Kiểm tra lớp học có tồn tại và thuộc về giảng viên này không
    const classroom = await this.classroomRepository.findOne({
      where: { id: dto.classId },
    });
    if (!classroom) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }
    if (classroom.lecturerId !== lecturerId) {
      throw new ForbiddenException('Bạn không có quyền mở điểm danh cho lớp học này.');
    }

    // 2. Nếu đang có phiên OPEN của lớp này, tự động đóng phiên cũ
    const activeSession = await this.sessionRepository.findOne({
      where: { classId: dto.classId, status: SessionStatus.OPEN },
    });
    if (activeSession) {
      activeSession.status = SessionStatus.CLOSED;
      activeSession.endTime = new Date();
      await this.sessionRepository.save(activeSession);
      this.attendanceGateway.stopQrRotation(activeSession.id);
    }

    // 3. Khởi tạo phiên mới
    const allowedRadius = dto.allowedRadius || classroom.allowedRadius || 30;
    const newSession = this.sessionRepository.create({
      classId: dto.classId,
      sessionNumber: dto.sessionNumber,
      startTime: new Date(),
      status: SessionStatus.OPEN,
      sessionLat: dto.sessionLat,
      sessionLong: dto.sessionLong,
      allowedRadius,
    });

    const savedSession = await this.sessionRepository.save(newSession);
    this.logger.log(`Giảng viên ${lecturerId} đã mở phiên điểm danh ${savedSession.id} cho lớp ${classroom.name}`);

    // 4. Kích hoạt phát QR động mỗi 10 giây qua WebSocket & Redis
    await this.attendanceGateway.startQrRotation(savedSession.id);

    return {
      message: 'Mở phiên điểm danh thành công.',
      session: {
        id: savedSession.id,
        classId: savedSession.classId,
        className: classroom.name,
        sessionNumber: savedSession.sessionNumber,
        startTime: savedSession.startTime,
        sessionLat: savedSession.sessionLat,
        sessionLong: savedSession.sessionLong,
        allowedRadius: savedSession.allowedRadius,
        status: savedSession.status,
      },
    };
  }

  /**
   * 2. GIẢNG VIÊN: Đóng phiên điểm danh
   */
  async closeSession(lecturerId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { classroom: true },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên điểm danh.');
    }
    if (session.classroom.lecturerId !== lecturerId) {
      throw new ForbiddenException('Bạn không có quyền đóng phiên điểm danh này.');
    }
    if (session.status === SessionStatus.CLOSED) {
      return { message: 'Phiên điểm danh này đã được đóng trước đó.', session };
    }

    // Cập nhật trạng thái
    session.status = SessionStatus.CLOSED;
    session.endTime = new Date();
    await this.sessionRepository.save(session);

    // Dừng phát QR qua WebSocket
    this.attendanceGateway.stopQrRotation(session.id);

    // Đếm tổng số sinh viên đã điểm danh
    const totalPresent = await this.recordRepository.count({
      where: { sessionId: session.id },
    });

    return {
      message: 'Đã đóng phiên điểm danh thành công.',
      sessionId: session.id,
      status: session.status,
      endTime: session.endTime,
      totalPresent,
    };
  }

  /**
   * 3. SINH VIÊN: Quét mã QR & Gửi GPS điểm danh (CORE CHỐNG GIAN LẬN KÉP)
   */
  async checkIn(studentUser: User, dto: CheckInDto) {
    // Chỉ tài khoản vai trò Sinh viên mới được phép check-in
    if (studentUser.role !== UserRole.STUDENT) {
      throw new ForbiddenException('Chỉ tài khoản Sinh viên mới có quyền thực hiện điểm danh.');
    }

    // 1. Chống spam: Dùng Distributed Lock trên Redis (khoảng cách 3s giữa các lần bấm)
    const lockKey = `lock:checkin:${studentUser.id}:${dto.sessionId}`;
    const acquired = await this.redisService.acquireLock(lockKey, 3);
    if (!acquired) {
      throw new BadRequestException('Thao tác quá nhanh. Vui lòng đợi trong giây lát!');
    }

    try {
      // 2. Kiểm tra phiên điểm danh có đang MỞ hay không
      const session = await this.sessionRepository.findOne({
        where: { id: dto.sessionId },
      });
      if (!session) {
        throw new NotFoundException('Phiên điểm danh không tồn tại.');
      }
      if (session.status !== SessionStatus.OPEN) {
        throw new BadRequestException('Phiên điểm danh này đã kết thúc hoặc bị hủy.');
      }

      // 3. BẪY GIAN LẬN LỚP 1: Kiểm tra QR Token trên Redis (Hiệu lực đúng 10s)
      const currentQrToken = await this.redisService.getQrToken(dto.sessionId);
      if (!currentQrToken || currentQrToken !== dto.qrToken) {
        throw new BadRequestException(
          'Mã QR đã hết hạn hoặc không hợp lệ. Vui lòng quét lại mã QR mới hiển thị trên màn chiếu!',
        );
      }

      // 4. BẪY GIAN LẬN LỚP 2: Kiểm tra khoảng cách địa lý GPS Haversine
      const distanceMeters = calculateHaversineDistance(
        Number(session.sessionLat),
        Number(session.sessionLong),
        dto.clientLat,
        dto.clientLong,
      );

      if (distanceMeters > session.allowedRadius) {
        this.logger.warn(
          `CẢNH BÁO GIAN LẬN VỊ TRÍ: SV ${studentUser.studentCode} (${studentUser.fullName}) cách phòng học ${distanceMeters}m (Giới hạn: ${session.allowedRadius}m).`,
        );
        throw new ForbiddenException(
          `Vị trí của bạn đang cách phòng học ${distanceMeters} mét, vượt quá bán kính cho phép (${session.allowedRadius}m). Bạn phải có mặt trong phòng học để điểm danh!`,
        );
      }

      // 5. BẪY GIAN LẬN LỚP 3: Chống điểm danh trùng trong cùng 1 buổi
      const existingRecord = await this.recordRepository.findOne({
        where: {
          sessionId: dto.sessionId,
          studentId: studentUser.id,
        },
      });
      if (existingRecord) {
        throw new ConflictException('Bạn đã điểm danh thành công trong buổi học này rồi.');
      }

      // 6. Ghi nhận kết quả điểm danh vào cơ sở dữ liệu
      const record = this.recordRepository.create({
        sessionId: dto.sessionId,
        studentId: studentUser.id,
        checkinTime: new Date(),
        clientLat: dto.clientLat,
        clientLong: dto.clientLong,
        distanceMeters,
        status: AttendanceStatus.PRESENT,
      });

      const savedRecord = await this.recordRepository.save(record);
      this.logger.log(
        `✅ ĐIỂM DANH THÀNH CÔNG: SV ${studentUser.studentCode} | Khoảng cách: ${distanceMeters}m | Thời gian: ${savedRecord.checkinTime}`,
      );

      // 7. Bắn thông báo Realtime lên màn chiếu của Giảng viên qua WebSocket
      this.attendanceGateway.notifyStudentCheckin(dto.sessionId, {
        studentId: studentUser.id,
        studentCode: studentUser.studentCode || '',
        fullName: studentUser.fullName,
        checkinTime: savedRecord.checkinTime,
        distanceMeters,
      });

      return {
        success: true,
        message: 'Điểm danh thành công!',
        record: {
          id: savedRecord.id,
          checkinTime: savedRecord.checkinTime,
          distanceMeters,
          status: savedRecord.status,
        },
      };
    } finally {
      // Giải phóng khóa Redis
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * 4. Lấy chi tiết phiên điểm danh và danh sách sinh viên có mặt
   */
  async getSessionDetails(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { classroom: true, records: { student: true } },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên điểm danh.');
    }

    return {
      session: {
        id: session.id,
        className: session.classroom.name,
        roomCode: session.classroom.roomCode,
        sessionNumber: session.sessionNumber,
        status: session.status,
        startTime: session.startTime,
        endTime: session.endTime,
        sessionLat: session.sessionLat,
        sessionLong: session.sessionLong,
        allowedRadius: session.allowedRadius,
      },
      totalPresent: session.records?.length || 0,
      attendees:
        session.records?.map((rec) => ({
          studentId: rec.studentId,
          studentCode: rec.student?.studentCode,
          fullName: rec.student?.fullName,
          checkinTime: rec.checkinTime,
          distanceMeters: rec.distanceMeters,
          status: rec.status,
        })) || [],
    };
  }

  /**
   * 5. SINH VIÊN: Lấy danh sách các lớp học phần đang mở để đăng ký
   */
  async getAvailableClasses(studentId: string) {
    let classes = await this.classroomRepository.find({
      relations: { lecturer: true },
      order: { createdAt: 'DESC' },
    });

    // Tự động tạo 2 lớp mẫu nếu hệ thống chưa có lớp nào để sinh viên test ngay
    if (classes.length === 0) {
      let demoLecturer = await this.userRepository.findOne({
        where: { zaloUserId: 'demo_lecturer_01' },
      });
      if (!demoLecturer) {
        demoLecturer = await this.userRepository.save(
          this.userRepository.create({
            zaloUserId: 'demo_lecturer_01',
            fullName: 'TS. Nguyễn Văn Giảng',
            phoneNumber: '0909000111',
            role: UserRole.LECTURER,
            status: UserStatus.ACTIVE,
          }),
        );
      }

      await this.classroomRepository.save([
        this.classroomRepository.create({
          code: 'IT001_K15',
          name: 'Phát triển Ứng dụng Di động (Zalo Mini App)',
          lecturerId: demoLecturer.id,
          roomCode: 'Phòng B2.04',
          defaultLat: 10.7769,
          defaultLong: 106.7009,
          allowedRadius: 100,
        }),
        this.classroomRepository.create({
          code: 'SE104_N2',
          name: 'Nhập môn Công nghệ Phần mềm',
          lecturerId: demoLecturer.id,
          roomCode: 'Phòng A102',
          defaultLat: 10.7769,
          defaultLong: 106.7009,
          allowedRadius: 100,
        }),
      ]);

      classes = await this.classroomRepository.find({
        relations: { lecturer: true },
        order: { createdAt: 'DESC' },
      });
    }

    const myEnrolls = await this.enrollmentRepository.find({
      where: { studentId, status: EnrollmentStatus.ENROLLED },
    });
    const enrolledIds = new Set(myEnrolls.map((e) => e.classId));

    return classes.map((cls) => ({
      id: cls.id,
      code: cls.code,
      name: cls.name,
      roomCode: cls.roomCode,
      lecturerName: cls.lecturer?.fullName || 'Giảng viên',
      totalSessions: cls.totalSessions,
      isEnrolled: enrolledIds.has(cls.id),
    }));
  }

  /**
   * 6. SINH VIÊN: Lấy danh sách các lớp đã đăng ký tham gia
   */
  async getMyEnrolledClasses(studentId: string) {
    const enrolls = await this.enrollmentRepository.find({
      where: { studentId, status: EnrollmentStatus.ENROLLED },
      relations: { classEntity: { lecturer: true } } as any,
      order: { enrolledAt: 'DESC' },
    });

    // Fallback load classroom info safely
    const result: any[] = [];
    for (const e of enrolls) {
      const cls = await this.classroomRepository.findOne({
        where: { id: e.classId },
        relations: { lecturer: true },
      });
      if (cls) {
        result.push({
          id: cls.id,
          code: cls.code,
          name: cls.name,
          roomCode: cls.roomCode,
          lecturerName: cls.lecturer?.fullName || 'Giảng viên',
          totalSessions: cls.totalSessions,
          enrolledAt: e.enrolledAt,
        });
      }
    }
    return result;
  }

  /**
   * 7. SINH VIÊN: Đăng ký tham gia vào 1 lớp học đã tồn tại
   */
  async enrollClass(studentId: string, classId: string) {
    const cls = await this.classroomRepository.findOne({ where: { id: classId } });
    if (!cls) {
      throw new NotFoundException('Không tìm thấy lớp học phần.');
    }

    const existing = await this.enrollmentRepository.findOne({
      where: { studentId, classId },
    });
    if (existing) {
      return { message: 'Bạn đã đăng ký lớp học này rồi.', classId };
    }

    const enrollment = this.enrollmentRepository.create({
      studentId,
      classId,
      status: EnrollmentStatus.ENROLLED,
    });
    await this.enrollmentRepository.save(enrollment);

    return {
      message: `Đăng ký lớp "${cls.name}" thành công!`,
      classId: cls.id,
    };
  }
}
