import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { StartSessionDto } from './dto/start-session.dto';
import { CheckInDto } from './dto/check-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../../entities';

@Controller('api/v1/attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * GIẢNG VIÊN: Bắt đầu phiên điểm danh
   * POST /api/v1/attendance/sessions/start
   */
  @Post('sessions/start')
  @HttpCode(HttpStatus.CREATED)
  async startSession(
    @CurrentUser('id') lecturerId: string,
    @Body() dto: StartSessionDto,
  ) {
    const result = await this.attendanceService.startSession(lecturerId, dto);
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
    };
  }

  /**
   * GIẢNG VIÊN: Đóng phiên điểm danh
   * POST /api/v1/attendance/sessions/:id/close
   */
  @Post('sessions/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeSession(
    @CurrentUser('id') lecturerId: string,
    @Param('id') sessionId: string,
  ) {
    const result = await this.attendanceService.closeSession(lecturerId, sessionId);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  /**
   * Lấy thông tin chi tiết phiên điểm danh & Danh sách sinh viên có mặt
   * GET /api/v1/attendance/sessions/:id
   */
  @Get('sessions/:id')
  async getSessionDetails(@Param('id') sessionId: string) {
    const result = await this.attendanceService.getSessionDetails(sessionId);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  /**
   * SINH VIÊN: Quét mã QR & Gửi GPS điểm danh
   * POST /api/v1/attendance/check-in
   */
  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(
    @CurrentUser() studentUser: User,
    @Body() dto: CheckInDto,
  ) {
    const result = await this.attendanceService.checkIn(studentUser, dto);
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
    };
  }
}
