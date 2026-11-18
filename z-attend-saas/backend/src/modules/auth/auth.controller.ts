import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZaloLoginDto } from './dto/zalo-login.dto';
import { BindStudentProfileDto } from './dto/bind-student-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 1. API Xác thực Đăng nhập từ Zalo Mini App
   * POST /api/v1/auth/zalo/login
   */
  @Post('zalo/login')
  @HttpCode(HttpStatus.OK)
  async loginWithZalo(@Body() dto: ZaloLoginDto) {
    const result = await this.authService.loginWithZalo(dto);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }

  /**
   * 2. API Khóa cứng Định danh Sinh viên (MSSV + SĐT + Zalo User ID)
   * Yêu cầu Bearer tempToken gửi trong Header Authorization
   * POST /api/v1/auth/student/bind-profile
   */
  @Post('student/bind-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async bindStudentProfile(
    @CurrentUser() tempUser: any,
    @Body() dto: BindStudentProfileDto,
  ) {
    const result = await this.authService.bindStudentProfile(tempUser, dto);
    return {
      statusCode: HttpStatus.CREATED,
      data: result,
    };
  }

  /**
   * 3. API Lấy thông tin cá nhân hiện tại
   * Yêu cầu Bearer AccessToken chính thức
   * GET /api/v1/auth/me
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('id') userId: string) {
    const result = await this.authService.getProfile(userId);
    return {
      statusCode: HttpStatus.OK,
      data: result,
    };
  }
}
