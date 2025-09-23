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

export interface PushupMetrics {
  maxDepth: number;
  minShoulderAngle: number;
  maxShoulderAngle: number;
  minElbowAngle: number;
  maxElbowAngle: number;
  bodyAlignment: number;
  handPlacement: 'too_wide' | 'too_narrow' | 'correct';
  formIssues: string[];
}

@ObjectType()
@Entity('pushup_reps')
export class PushupRep {
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
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'min_elbow_angle', default: 0 })
  minElbowAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_elbow_angle', default: 0 })
  maxElbowAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'body_alignment_score', default: 0 })
  bodyAlignmentScore: number;

  @Column({ type: 'jsonb', name: 'pushup_metrics', nullable: true })
  pushupMetrics: PushupMetrics | null;

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

  setPushupMetrics(metrics: PushupMetrics): void {
    this.pushupMetrics = metrics;
  }

  calculateFormScore(): number {
    if (!this.pushupMetrics) return 0;

    let score = 100;

    // Deduct points for form issues
    if (this.depthPercentage < 80) score -= 20;
    if (this.bodyAlignmentScore < 80) score -= 15;
    if (this.pushupMetrics.handPlacement !== 'correct') score -= 10;

    this.formScore = Math.max(0, score);
    return this.formScore;
  }
}