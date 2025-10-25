import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { WorkoutSession } from './WorkoutSession';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('points_audit_log')
@Index(['userId', 'createdAt'])
export class PointsAuditLog {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => ID)
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Field(() => ID, { nullable: true })
  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId?: string;

  @Field()
  @Column({ type: 'varchar', length: 50 })
  action!: string; // 'workout_completed', 'bonus_applied', 'points_adjusted', etc.

  @Field(() => Int)
  @Column({ name: 'points_change', type: 'int' })
  pointsChange!: number; // Positive for gains, negative for deductions

  @Field(() => Int)
  @Column({ name: 'points_before', type: 'int' })
  pointsBefore!: number;

  @Field(() => Int)
  @Column({ name: 'points_after', type: 'int' })
  pointsAfter!: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  reason?: string; // Explanation of the change

  @Field({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Additional data (breakdown, bonuses applied, etc.)

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => WorkoutSession, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session?: WorkoutSession;
}
