import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { ClassEnrollment } from './class-enrollment.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { LeaveRequest } from './leave-request.entity';
import { Transaction } from './transaction.entity';

export enum UserRole {
  STUDENT = 'STUDENT',
  LECTURER = 'LECTURER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true, name: 'zalo_user_id' })
  zaloUserId: string;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true, name: 'student_code' })
  studentCode: string | null;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true, name: 'phone_number' })
  phoneNumber: string | null;

  @Column({ type: 'varchar', length: 150, name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'school_name' })
  schoolName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'administrative_class' })
  administrativeClass: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Classroom, (classroom) => classroom.lecturer)
  managedClassrooms: Classroom[];

  @OneToMany(() => ClassEnrollment, (enrollment) => enrollment.student)
  enrollments: ClassEnrollment[];

  @OneToMany(() => AttendanceRecord, (record) => record.student)
  attendanceRecords: AttendanceRecord[];

  @OneToMany(() => LeaveRequest, (request) => request.student)
  leaveRequests: LeaveRequest[];

  @OneToMany(() => Transaction, (trans) => trans.user)
  transactions: Transaction[];
}
