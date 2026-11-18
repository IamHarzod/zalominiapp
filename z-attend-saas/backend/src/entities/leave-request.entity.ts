import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Classroom } from './classroom.entity';

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('leave_requests')
export class LeaveRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'student_id' })
  studentId: string;

  @ManyToOne(() => User, (user) => user.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ type: 'varchar', length: 36, name: 'class_id' })
  classId: string;

  @ManyToOne(() => Classroom, (classroom) => classroom.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @Column({ type: 'date', name: 'target_date' })
  targetDate: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 500, name: 'evidence_image_url' })
  evidenceImageUrl: string;

  @Column({ type: 'json', nullable: true, name: 'ai_extracted_data' })
  aiExtractedData: Record<string, any> | null;

  @Column({ type: 'float', default: 0.0, name: 'ai_risk_score' })
  aiRiskScore: number;

  @Column({
    type: 'enum',
    enum: LeaveStatus,
    default: LeaveStatus.PENDING,
  })
  status: LeaveStatus;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'reviewer_id' })
  reviewerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
