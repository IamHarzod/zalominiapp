import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('subscription_plans')
export class SubscriptionPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'bigint', name: 'price_vnd' })
  priceVnd: number;

  @Column({ type: 'int', default: 3, name: 'max_classes' })
  maxClasses: number;

  @Column({ type: 'int', default: 50, name: 'max_students_per_class' })
  maxStudentsPerClass: number;

  @Column({ type: 'json', nullable: true })
  features: Record<string, any> | null;

  @OneToMany(() => Transaction, (trans) => trans.plan)
  transactions: Transaction[];
}
