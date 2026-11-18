import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Classroom } from './classroom.entity';
import { User } from './user.entity';

export enum EnrollmentStatus {
  ENROLLED = 'ENROLLED',
  DROPPED = 'DROPPED',
}

@Entity('class_enrollments')
@Unique(['classId', 'studentId'])
export class ClassEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36, name: 'class_id' })
  classId: string;

  @ManyToOne(() => Classroom, (classroom) => classroom.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classroom: Classroom;

  @Column({ type: 'varchar', length: 36, name: 'student_id' })
  studentId: string;

  @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ENROLLED,
  })
  status: EnrollmentStatus;

  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;
}
