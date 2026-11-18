import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ClassEnrollment } from './class-enrollment.entity';
import { AttendanceSession } from './attendance-session.entity';
import { LeaveRequest } from './leave-request.entity';

@Entity('classrooms')
export class Classroom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 36, name: 'lecturer_id' })
  lecturerId: string;

  @ManyToOne(() => User, (user) => user.managedClassrooms, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'lecturer_id' })
  lecturer: User;

  @Column({ type: 'varchar', length: 50, name: 'room_code' })
  roomCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, name: 'default_lat' })
  defaultLat: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, name: 'default_long' })
  defaultLong: number;

  @Column({ type: 'int', default: 30, name: 'allowed_radius' })
  allowedRadius: number;

  @Column({ type: 'int', default: 15, name: 'total_sessions' })
  totalSessions: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => ClassEnrollment, (enrollment) => enrollment.classroom)
  enrollments: ClassEnrollment[];

  @OneToMany(() => AttendanceSession, (session) => session.classroom)
  sessions: AttendanceSession[];

  @OneToMany(() => LeaveRequest, (request) => request.classroom)
  leaveRequests: LeaveRequest[];
}
