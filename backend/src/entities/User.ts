import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('users')
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_points', default: 0 })
  totalPoints: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'current_streak', default: 0 })
  currentStreak: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', name: 'last_workout_date', nullable: true })
  lastWorkoutDate: Date | null;

  @Field()
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}