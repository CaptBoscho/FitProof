import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('workout_sessions')
export class TestWorkoutSession {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column('uuid')
  userId: string;

  @Field(() => ID)
  @Column('uuid')
  exerciseId: string;

  @Field()
  @Column({ default: 'portrait' })
  deviceOrientation: string;

  @Field(() => Date)
  @Column({ type: 'datetime' })
  startedAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Field(() => Int)
  @Column({ default: 0 })
  totalReps: number;

  @Field(() => Int)
  @Column({ default: 0 })
  validReps: number;

  @Field(() => Int)
  @Column({ default: 0 })
  totalPoints: number;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  durationSeconds?: number;

  @Field()
  @Column({ default: false })
  isCompleted: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}