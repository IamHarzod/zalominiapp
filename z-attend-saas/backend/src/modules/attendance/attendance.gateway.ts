import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as crypto from 'crypto';
import { RedisService } from '../redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: 'attendance',
})
export class AttendanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AttendanceGateway.name);

  @WebSocketServer()
  server: Server;

  // Quản lý các bộ đếm thời gian xoay mã QR của từng phiên
  private sessionTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly redisService: RedisService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client kết nối WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ngắt kết nối WebSocket: ${client.id}`);
  }

  /**
   * Màn chiếu Giảng viên hoặc Sinh viên join vào phòng của phiên điểm danh
   */
  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!data?.sessionId) return;
    const room = `session:${data.sessionId}`;
    await client.join(room);
    this.logger.log(`Socket ${client.id} đã vào phòng: ${room}`);

    // Gửi ngay token hiện tại nếu phiên đang chạy
    const currentToken = await this.redisService.getQrToken(data.sessionId);
    if (currentToken) {
      client.emit('qr_refresh', {
        sessionId: data.sessionId,
        qrToken: currentToken,
        expiresIn: 10,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Rời khỏi phòng
   */
  @SubscribeMessage('leave_session')
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    if (!data?.sessionId) return;
    const room = `session:${data.sessionId}`;
    await client.leave(room);
    this.logger.log(`Socket ${client.id} đã rời phòng: ${room}`);
  }

  /**
   * Sinh Token QR ngẫu nhiên bảo mật
   */
  private generateSecureQrToken(sessionId: string): string {
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `QR_${sessionId.slice(0, 8)}_${timestamp}_${randomBytes}`;
  }

  /**
   * Kích hoạt vòng lặp phát QR đổi mới mỗi 10 giây cho màn chiếu Giảng viên
   */
  async startQrRotation(sessionId: string): Promise<void> {
    this.stopQrRotation(sessionId); // Dọn dẹp timer cũ nếu có

    const rotate = async () => {
      const qrToken = this.generateSecureQrToken(sessionId);
      await this.redisService.setQrToken(sessionId, qrToken, 10);

      const room = `session:${sessionId}`;
      this.server?.to(room).emit('qr_refresh', {
        sessionId,
        qrToken,
        expiresIn: 10,
        timestamp: Date.now(),
      });
      this.logger.debug(`[QR Ticker] Đã phát mã QR mới cho session ${sessionId}`);
    };

    // Phát ngay lập tức mã đầu tiên
    await rotate();

    // Lặp lại mỗi 10 giây
    const timer = setInterval(rotate, 10000);
    this.sessionTimers.set(sessionId, timer);
  }

  /**
   * Dừng xoay mã QR khi phiên kết thúc
   */
  stopQrRotation(sessionId: string): void {
    const timer = this.sessionTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.sessionTimers.delete(sessionId);
      this.logger.log(`Đã dừng xoay mã QR cho session ${sessionId}`);
    }
    // Xóa token trên Redis và báo sự kiện kết thúc
    void this.redisService.deleteQrToken(sessionId);
    this.server?.to(`session:${sessionId}`).emit('session_closed', { sessionId });
  }

  /**
   * Bắn sự kiện realtime cho màn chiếu khi có sinh viên điểm danh thành công
   */
  notifyStudentCheckin(
    sessionId: string,
    studentData: {
      studentId: string;
      studentCode: string;
      fullName: string;
      checkinTime: Date;
      distanceMeters: number;
    },
  ) {
    const room = `session:${sessionId}`;
    this.server?.to(room).emit('student_checked_in', {
      sessionId,
      ...studentData,
    });
    this.logger.log(
      `[Realtime] Bắn thông báo SV ${studentData.studentCode} (${studentData.fullName}) đã check-in thành công.`,
    );
  }
}
