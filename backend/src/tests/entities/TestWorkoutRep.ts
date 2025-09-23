import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('workout_reps')
export class TestWorkoutRep {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column('uuid')
  sessionId: string;

  @Field(() => Int)
  @Column()
  repNumber: number;

  @Field()
  @Column()
  isValid: boolean;

  @Field(() => Number)
  @Column('real', { default: 0 })
  confidenceScore: number;

  @Column('text', { nullable: true })
  validationErrors?: string;

  @Column('simple-json', { nullable: true })
  landmarkFrames?: any;

  @Column('simple-json', { nullable: true })
  poseSequence?: any;

  @Column('simple-json', { nullable: true })
  calculatedAngles?: any;

  @Field(() => Int, { nullable: true })
  @Column({ nullable: true })
  durationMs?: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Field(() => Date)
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  getValidationErrorsArray(): string[] {
    if (!this.validationErrors) return [];
    try {
      return JSON.parse(this.validationErrors);
    } catch {
      return [];
    }
  }
}