import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../../entities';
import { ZaloService } from '../zalo/zalo.service';
import { ZaloLoginDto } from './dto/zalo-login.dto';
import { BindStudentProfileDto } from './dto/bind-student-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly zaloService: ZaloService,
  ) {}

  /**
   * Sinh JWT Token chính thức cho người dùng
   */
  private generateAuthTokens(user: User) {
    const payload = {
      sub: user.id,
      role: user.role,
      zaloUserId: user.zaloUserId,
      studentCode: user.studentCode,
      type: 'OFFICIAL',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        zaloUserId: user.zaloUserId,
        studentCode: user.studentCode,
        fullName: user.fullName,
        schoolName: user.schoolName,
        administrativeClass: user.administrativeClass,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * 1. API: Xác thực đăng nhập qua Zalo Access Token
   */
  async loginWithZalo(dto: ZaloLoginDto) {
    // 1. Xác thực với Zalo Graph API Server-to-Server
    const zaloProfile = await this.zaloService.getZaloProfile(dto.zaloAccessToken);
    this.logger.log(`Xác thực Zalo thành công cho user: ${zaloProfile.zaloUserId} (${zaloProfile.name})`);

    // 2. Tra cứu cơ sở dữ liệu xem Zalo ID này đã đăng ký chưa
    const existingUser = await this.userRepository.findOne({
      where: { zaloUserId: zaloProfile.zaloUserId },
    });

    // Case 1: Đã có tài khoản trên hệ thống
    if (existingUser) {
      if (existingUser.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Giảng viên.');
      }

      // Cập nhật lại avatar nếu Zalo có thay đổi
      if (zaloProfile.avatarUrl && existingUser.avatarUrl !== zaloProfile.avatarUrl) {
        existingUser.avatarUrl = zaloProfile.avatarUrl;
        await this.userRepository.save(existingUser);
      }

      const tokens = this.generateAuthTokens(existingUser);
      return {
        isRegistered: true,
        ...tokens,
      };
    }

    // Case 2: Chưa có tài khoản -> Sinh tempToken (hạn 300s) để sang bước Onboarding
    const tempPayload = {
      zaloUserId: zaloProfile.zaloUserId,
      type: 'TEMP_BINDING',
    };

    const tempToken = this.jwtService.sign(tempPayload, { expiresIn: '300s' });

    return {
      isRegistered: false,
      tempToken,
      zaloProfile: {
        zaloUserId: zaloProfile.zaloUserId,
        name: zaloProfile.name,
        avatarUrl: zaloProfile.avatarUrl,
      },
      message: 'Tài khoản chưa liên kết định danh. Vui lòng hoàn tất nhập MSSV và Số điện thoại.',
    };
  }

  /**
   * 2. API: Khóa cứng định danh Sinh viên (Tam giác: Zalo ID + MSSV + SĐT)
   */
  async bindStudentProfile(tempUser: { zaloUserId: string; isTemp?: boolean }, dto: BindStudentProfileDto) {
    if (!tempUser?.zaloUserId) {
      throw new UnauthorizedException('Phiên đăng ký định danh không hợp lệ hoặc đã hết hạn.');
    }

    const cleanStudentCode = dto.studentCode.trim().toUpperCase();
    const cleanFullName = dto.fullName.trim();

    // 1. Giải mã số điện thoại từ Zalo Phone Token
    const phoneNumber = await this.zaloService.getPhoneNumber(dto.phoneToken, '');

    // 2. Bẫy lỗi gian lận: Kiểm tra tam giác định danh độc nhất
    // 2.1. Zalo ID đã bị bind chưa?
    const existingZalo = await this.userRepository.findOne({
      where: { zaloUserId: tempUser.zaloUserId },
    });
    if (existingZalo) {
      throw new ConflictException({
        statusCode: 409,
        error: 'IDENTITY_ALREADY_BOUND',
        message: 'Tài khoản Zalo này đã được liên kết với một hồ sơ sinh viên khác.',
      });
    }

    // 2.2. MSSV đã bị ai chiếm trước chưa?
    const existingStudentCode = await this.userRepository.findOne({
      where: { studentCode: cleanStudentCode },
    });
    if (existingStudentCode) {
      throw new ConflictException({
        statusCode: 409,
        error: 'IDENTITY_ALREADY_BOUND',
        message: `Mã số sinh viên "${cleanStudentCode}" đã được đăng ký bởi một tài khoản Zalo khác. Vui lòng liên hệ Giảng viên nếu đây là sự nhầm lẫn.`,
      });
    }

    // 2.3. Số điện thoại đã bị chiếm chưa?
    const existingPhone = await this.userRepository.findOne({
      where: { phoneNumber },
    });
    if (existingPhone) {
      throw new ConflictException({
        statusCode: 409,
        error: 'IDENTITY_ALREADY_BOUND',
        message: `Số điện thoại "${phoneNumber}" đã được liên kết trên hệ thống. Mỗi sinh viên chỉ được dùng 1 số điện thoại duy nhất.`,
      });
    }

    // 3. Khởi tạo tài khoản Sinh viên mới (Khóa cứng vĩnh viễn + Lưu Trường & Lớp)
    const newUser = this.userRepository.create({
      zaloUserId: tempUser.zaloUserId,
      studentCode: cleanStudentCode,
      phoneNumber,
      fullName: cleanFullName,
      schoolName: dto.schoolName.trim(),
      administrativeClass: dto.administrativeClass.trim().toUpperCase(),
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(newUser);
    this.logger.log(
      `Đã khóa cứng thành công Sinh viên: ${savedUser.fullName} | MSSV: ${savedUser.studentCode} | ZaloID: ${savedUser.zaloUserId} | SĐT: ${savedUser.phoneNumber}`,
    );

    // 4. Sinh bộ token chính thức để sinh viên bắt đầu điểm danh
    const tokens = this.generateAuthTokens(savedUser);
    return {
      message: 'Liên kết định danh thành công. Tài khoản sinh viên đã được kích hoạt.',
      ...tokens,
    };
  }

  /**
   * 3. API: Lấy thông tin tài khoản hiện tại
   */
  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Không tìm thấy thông tin tài khoản.');
    }

    return {
      id: user.id,
      zaloUserId: user.zaloUserId,
      studentCode: user.studentCode,
      fullName: user.fullName,
      schoolName: user.schoolName,
      administrativeClass: user.administrativeClass,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
