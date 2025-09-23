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
import { CalculatedAngles } from './WorkoutRep';

export interface SquatMetrics {
  maxDepth: number;
  minKneeAngle: number;
  maxKneeAngle: number;
  minHipAngle: number;
  maxHipAngle: number;
  kneeTracking: number;
  backAlignment: number;
  balanceScore: number;
  squatType: 'bodyweight' | 'sumo' | 'narrow' | 'other';
  formIssues: string[];
}

@ObjectType()
@Entity('squat_reps')
export class SquatRep {
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
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'depth_percentage', default: 0 })
  depthPercentage: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'form_score', default: 0 })
  formScore: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'min_knee_angle', default: 0 })
  minKneeAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_knee_angle', default: 0 })
  maxKneeAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'min_hip_angle', default: 0 })
  minHipAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_hip_angle', default: 0 })
  maxHipAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'knee_tracking_score', default: 0 })
  kneeTrackingScore: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'balance_score', default: 0 })
  balanceScore: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'back_alignment_score', default: 0 })
  backAlignmentScore: number;

  @Column({ type: 'jsonb', name: 'squat_metrics', nullable: true })
  squatMetrics: SquatMetrics | null;

  @Column({ type: 'jsonb', name: 'angle_progression', nullable: true })
  angleProgression: CalculatedAngles[] | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', name: 'duration_ms', nullable: true })
  durationMs: number | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', name: 'feedback_message', nullable: true })
  feedbackMessage: string | null;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Helper methods
  addAngleProgression(angles: CalculatedAngles): void {
    if (!this.angleProgression) {
      this.angleProgression = [];
    }
    this.angleProgression.push(angles);
  }

  setSquatMetrics(metrics: SquatMetrics): void {
    this.squatMetrics = metrics;
  }

  calculateFormScore(): number {
    if (!this.squatMetrics) return 0;

    let score = 100;

    // Deduct points for form issues
    if (this.depthPercentage < 80) score -= 30; // Depth is crucial for squats
    if (this.kneeTrackingScore < 80) score -= 20;
    if (this.backAlignmentScore < 80) score -= 20;
    if (this.balanceScore < 70) score -= 15;

    // Bonus for achieving good depth
    if (this.depthPercentage >= 90) score += 5;

    this.formScore = Math.max(0, Math.min(100, score));
    return this.formScore;
  }

  meetsDepthRequirement(): boolean {
    return this.depthPercentage >= 80; // Hip crease below knee level
  }
}