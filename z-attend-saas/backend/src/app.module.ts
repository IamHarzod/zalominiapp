import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  User,
  Classroom,
  ClassEnrollment,
  AttendanceSession,
  AttendanceRecord,
  LeaveRequest,
  SubscriptionPlan,
  Transaction,
} from './entities';
import { ZaloModule } from './modules/zalo/zalo.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
      // Đọc file .env duy nhất từ thư mục gốc z-attend-saas
      ConfigModule.forRoot({
        envFilePath: '../.env',
        isGlobal: true,
      }),
      // Cấu hình TypeORM kết nối MySQL container
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          type: 'mysql',
          host: config.get<string>('DB_HOST', 'localhost'),
          port: parseInt(config.get<string>('DB_PORT', '3306'), 10),
          username: config.get<string>('DB_USER', 'zattend_user'),
          password: config.get<string>('DB_PASSWORD', 'zattend_secret_password'),
          database: config.get<string>('DB_NAME', 'zattend_db'),
          entities: [
            User,
            Classroom,
            ClassEnrollment,
            AttendanceSession,
            AttendanceRecord,
            LeaveRequest,
            SubscriptionPlan,
            Transaction,
          ],
          synchronize: true, // Tự động sync table trong môi trường dev
          logging: ['error', 'warn'],
        }),
      }),
      // Module nghiệp vụ Zalo & Auth
      ZaloModule,
      AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
