import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AttendanceSession } from './attendance-session.entity';
import { User } from './user.entity';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
}

@Entity('attendance_records')
@Unique(['sessionId', 'studentId'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => AttendanceSession, (session) => session.records, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: AttendanceSession;

  @Column({ type: 'varchar', length: 36, name: 'student_id' })
  studentId: string;

  @ManyToOne(() => User, (user) => user.attendanceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @CreateDateColumn({ name: 'checkin_time' })
  checkinTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'client_lat' })
  clientLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'client_long' })
  clientLong: number;

  @Column({ type: 'float', name: 'distance_meters' })
  distanceMeters: number;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;
}
