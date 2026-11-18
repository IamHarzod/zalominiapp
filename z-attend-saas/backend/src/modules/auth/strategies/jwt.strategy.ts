import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../../entities';

export interface JwtPayload {
  sub: string;
  role: string;
  zaloUserId: string;
  type?: 'OFFICIAL' | 'TEMP_BINDING';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'zattend_jwt_super_secret_key_2026_xyz'),
    });
  }

  async validate(payload: JwtPayload) {
    // Nếu là tempToken dùng cho việc Bind Profile
    if (payload.type === 'TEMP_BINDING') {
      return {
        zaloUserId: payload.zaloUserId,
        isTemp: true,
      };
    }

    // Nếu là Access Token chính thức
    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa tạm thời. Vui lòng liên hệ Giảng viên.');
    }

    return user;
  }
}
