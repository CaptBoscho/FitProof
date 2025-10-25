import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { WorkoutSession } from './WorkoutSession';

@ObjectType()
@Entity('ml_training_data')
export class MLTrainingData {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Field(() => WorkoutSession, { nullable: true })
  @ManyToOne(() => WorkoutSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session?: WorkoutSession;

  @Field(() => Int)
  @Column({ name: 'frame_number', type: 'int' })
  frameNumber: number;

  @Field(() => Float)
  @Column({ type: 'float' })
  timestamp: number;

  @Field()
  @Column({ name: 'landmarks_compressed', type: 'text' })
  landmarksCompressed: string; // JSON string of compressed landmark array

  @Field(() => Int)
  @Column({ name: 'rep_number', type: 'int' })
  repNumber: number;

  @Field()
  @Column({ name: 'phase_label', type: 'varchar', length: 50 })
  phaseLabel: string;

  @Field()
  @Column({ name: 'is_valid_rep', type: 'boolean', default: true })
  isValidRep: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
