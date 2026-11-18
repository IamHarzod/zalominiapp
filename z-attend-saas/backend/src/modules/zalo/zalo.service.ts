import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

export interface ZaloUserProfile {
  zaloUserId: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly isDev: boolean;

  constructor(private readonly configService: ConfigService) {
    this.appId = this.configService.get<string>('ZALO_APP_ID', '');
    this.appSecret = this.configService.get<string>('ZALO_APP_SECRET', '');
    this.isDev = this.configService.get<string>('NODE_ENV', 'development') === 'development';
  }

  /**
   * Tính mã băm HMAC-SHA256 làm chứng chỉ xác thực gọi Server-to-Server
   */
  private generateAppSecretProof(accessToken: string): string {
    if (!this.appSecret) return '';
    return crypto.createHmac('sha256', this.appSecret).update(accessToken).digest('hex');
  }

  /**
   * Lấy thông tin người dùng từ Zalo Graph API
   */
  async getZaloProfile(accessToken: string): Promise<ZaloUserProfile> {
    // 1. Chế độ Mock / Test dành riêng cho Local Dev (tiện test Postman khi chưa có App Secret thật)
    if (this.isDev && (accessToken.startsWith('mock_') || accessToken.startsWith('test_'))) {
      this.logger.debug(`[MOCK MODE] Sử dụng mock profile cho token: ${accessToken}`);
      const mockId = accessToken.replace(/^(mock_|test_)/, '');
      return {
        zaloUserId: `zalo_${mockId}`,
        name: `Sinh viên Test (${mockId})`,
        avatarUrl: 'https://zalo-api.zalopay.vn/static/images/avatar.png',
      };
    }

    // 2. Chế độ Production: Gọi Zalo Graph API thật
    try {
      const appSecretProof = this.generateAppSecretProof(accessToken);
      const url = 'https://graph.zalo.me/v2.0/me?fields=id,name,picture';

      const response = await axios.get(url, {
        headers: {
          access_token: accessToken,
          ...(appSecretProof ? { appsecret_proof: appSecretProof } : {}),
        },
        timeout: 10000,
      });

      if (response.data?.error) {
        this.logger.error(`Zalo Graph API Error: ${JSON.stringify(response.data)}`);
        throw new UnauthorizedException(
          `Zalo Token không hợp lệ: ${response.data.message || 'Lỗi xác thực Zalo'}`,
        );
      }

      const { id, name, picture } = response.data;
      return {
        zaloUserId: String(id),
        name: name || 'Người dùng Zalo',
        avatarUrl: picture?.data?.url || undefined,
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Lỗi kết nối tới Zalo Open Platform: ${error?.message || error}`);
      throw new UnauthorizedException('Không thể xác thực với máy chủ Zalo. Vui lòng thử lại sau.');
    }
  }

  /**
   * Giải mã số điện thoại từ Zalo Phone Token
   */
  async getPhoneNumber(phoneToken: string, accessToken: string): Promise<string> {
    // 1. Mock Mode cho Local Dev
    if (
      this.isDev &&
      (phoneToken.startsWith('mock_phone_') ||
        phoneToken.startsWith('09') ||
        phoneToken.startsWith('08') ||
        phoneToken.startsWith('03'))
    ) {
      const mockPhone = phoneToken.startsWith('mock_phone_')
        ? phoneToken.replace('mock_phone_', '')
        : phoneToken;
      return mockPhone;
    }

    // 2. Gọi Zalo Graph API giải mã SĐT
    try {
      const url = 'https://graph.zalo.me/v2.0/me/info';
      const response = await axios.get(url, {
        headers: {
          access_token: accessToken,
          code: phoneToken,
          secret_key: this.appSecret,
        },
        timeout: 10000,
      });

      if (response.data?.error) {
        this.logger.error(`Zalo Phone API Error: ${JSON.stringify(response.data)}`);
        throw new UnauthorizedException('Không thể giải mã số điện thoại từ Zalo Phone Token.');
      }

      const phone = response.data?.data?.number;
      if (!phone) {
        throw new UnauthorizedException('Không tìm thấy số điện thoại hợp lệ từ Zalo.');
      }

      // Chuẩn hóa định dạng SĐT (VD: 84912345678 -> 0912345678)
      return phone.startsWith('84') ? '0' + phone.slice(2) : phone;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Lỗi giải mã số điện thoại Zalo: ${error?.message || error}`);
      throw new UnauthorizedException('Lỗi giải mã số điện thoại xác thực.');
    }
  }
}
