import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { AttendanceRecord } from './attendance-record.entity';

export enum SessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

@Entity('attendance_sessions')
export class AttendanceSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'class_id' })
  classId: string;

  @ManyToOne(() => Classroom, (classroom) => classroom.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @Column({ type: 'int', name: 'session_number' })
  sessionNumber: number;

  @Column({ type: 'datetime', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'datetime', nullable: true, name: 'end_time' })
  endTime: Date | null;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.OPEN,
  })
  status: SessionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'session_lat' })
  sessionLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'session_long' })
  sessionLong: number;

  @Column({ type: 'int', default: 30, name: 'allowed_radius' })
  allowedRadius: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => AttendanceRecord, (record) => record.session)
  records: AttendanceRecord[];
}
