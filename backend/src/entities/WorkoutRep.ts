import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';
import { WorkoutSession } from './WorkoutSession';

export interface LandmarkFrame {
  timestamp: number;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }>;
  confidence: number;
}

export interface PoseSequenceEntry {
  pose: string;
  timestamp: number;
  confidence: number;
  angles?: Record<string, number>;
}

export interface CalculatedAngles {
  leftShoulder?: number;
  rightShoulder?: number;
  leftElbow?: number;
  rightElbow?: number;
  leftHip?: number;
  rightHip?: number;
  leftKnee?: number;
  rightKnee?: number;
  torsoAngle?: number;
  neckAngle?: number;
}

@ObjectType()
@Entity('workout_reps')
export class WorkoutRep {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'uuid', name: 'session_id' })
  @Index()
  sessionId: string;

  @Field(() => WorkoutSession)
  @ManyToOne(() => WorkoutSession, { eager: false })
  @JoinColumn({ name: 'session_id' })
  session: WorkoutSession;

  @Field(() => Int)
  @Column({ type: 'int', name: 'rep_number' })
  repNumber: number;

  @Field()
  @Column({ type: 'boolean', name: 'is_valid', default: false })
  isValid: boolean;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'confidence_score', default: 0 })
  confidenceScore: number;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'validation_errors', nullable: true })
  validationErrors: string | null;

  // JSONB columns for storing complex data
  @Column({ type: 'jsonb', name: 'landmark_frames', nullable: true })
  landmarkFrames: LandmarkFrame[] | null;

  @Column({ type: 'jsonb', name: 'pose_sequence', nullable: true })
  poseSequence: PoseSequenceEntry[] | null;

  @Column({ type: 'jsonb', name: 'calculated_angles', nullable: true })
  calculatedAngles: CalculatedAngles | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  startedAt: Date | null;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods for working with JSONB data
  addLandmarkFrame(frame: LandmarkFrame): void {
    if (!this.landmarkFrames) {
      this.landmarkFrames = [];
    }
    this.landmarkFrames.push(frame);
  }

  addPoseSequenceEntry(entry: PoseSequenceEntry): void {
    if (!this.poseSequence) {
      this.poseSequence = [];
    }
    this.poseSequence.push(entry);
  }

  setCalculatedAngles(angles: CalculatedAngles): void {
    this.calculatedAngles = angles;
  }

  getValidationErrorsArray(): string[] {
    if (!this.validationErrors) return [];
    try {
      return JSON.parse(this.validationErrors);
    } catch {
      return [this.validationErrors];
    }
  }

  setValidationErrors(errors: string[]): void {
    this.validationErrors = JSON.stringify(errors);
  }
}