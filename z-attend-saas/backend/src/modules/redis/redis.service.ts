import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('REDIS_PORT', '6379'), 10);
    const password = this.configService.get<string>('REDIS_PASSWORD', 'zattend_redis_password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      this.logger.log('⚡ Đã kết nối thành công tới Redis Server.');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Lỗi kết nối Redis: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /**
   * Lưu Token QR Code với thời gian sống (TTL mặc định 10s)
   */
  async setQrToken(sessionId: string, qrToken: string, ttlSeconds = 10): Promise<void> {
    const key = `session:${sessionId}:qr`;
    await this.client.set(key, qrToken, 'EX', ttlSeconds);
  }

  /**
   * Lấy Token QR Code hiện tại của phiên
   */
  async getQrToken(sessionId: string): Promise<string | null> {
    const key = `session:${sessionId}:qr`;
    return this.client.get(key);
  }

  /**
   * Xóa Token QR Code khi kết thúc phiên
   */
  async deleteQrToken(sessionId: string): Promise<void> {
    const key = `session:${sessionId}:qr`;
    await this.client.del(key);
  }

  /**
   * Khóa phân tán chống spam (Distributed Lock)
   * Trả về true nếu lấy được khóa, false nếu đang bị request khác giữ
   */
  async acquireLock(lockKey: string, ttlSeconds = 3): Promise<boolean> {
    const result = await this.client.set(lockKey, 'LOCKED', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  /**
   * Xóa khóa khi xử lý xong
   */
  async releaseLock(lockKey: string): Promise<void> {
    await this.client.del(lockKey);
  }
}
