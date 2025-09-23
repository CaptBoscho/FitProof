import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { User } from './User';
import { Exercise } from './Exercise';

@ObjectType()
@Entity('workout_sessions')
export class WorkoutSession {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string;

  @Field(() => User)
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'exercise_id' })
  @Index()
  exerciseId: string;

  @Field(() => Exercise)
  @ManyToOne(() => Exercise, { eager: true })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_reps', default: 0 })
  totalReps: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'valid_reps', default: 0 })
  validReps: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_points', default: 0 })
  totalPoints: number;

  @Field()
  @Column({ type: 'varchar', length: 20, name: 'device_orientation', default: 'portrait' })
  deviceOrientation: string;

  @Field(() => Date)
  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds: number | null;

  @Field()
  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Computed field for completion rate
  @Field(() => Number)
  get completionRate(): number {
    if (this.totalReps === 0) return 0;
    return (this.validReps / this.totalReps) * 100;
  }
}