import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AttendanceSession,
  AttendanceRecord,
  Classroom,
  ClassEnrollment,
} from '../../entities';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceGateway } from './attendance.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceSession,
      AttendanceRecord,
      Classroom,
      ClassEnrollment,
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway],
  exports: [AttendanceService, AttendanceGateway],
})
export class AttendanceModule {}
