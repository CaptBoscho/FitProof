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

export interface SitupMetrics {
  maxTorsoAngle: number;
  minTorsoAngle: number;
  coreEngagement: number;
  handPosition: 'behind_head' | 'crossed_chest' | 'at_sides' | 'other';
  legPosition: 'bent' | 'straight' | 'anchored';
  neckAlignment: number;
  formIssues: string[];
}

@ObjectType()
@Entity('situp_reps')
export class SitupRep {
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
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'range_of_motion', default: 0 })
  rangeOfMotion: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'form_score', default: 0 })
  formScore: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'min_torso_angle', default: 0 })
  minTorsoAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'max_torso_angle', default: 0 })
  maxTorsoAngle: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'core_engagement_score', default: 0 })
  coreEngagementScore: number;

  @Field(() => Number)
  @Column({ type: 'decimal', precision: 5, scale: 2, name: 'neck_alignment_score', default: 0 })
  neckAlignmentScore: number;

  @Column({ type: 'jsonb', name: 'situp_metrics', nullable: true })
  situpMetrics: SitupMetrics | null;

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

  setSitupMetrics(metrics: SitupMetrics): void {
    this.situpMetrics = metrics;
  }

  calculateFormScore(): number {
    if (!this.situpMetrics) return 0;

    let score = 100;

    // Deduct points for form issues
    if (this.rangeOfMotion < 70) score -= 25;
    if (this.coreEngagementScore < 80) score -= 20;
    if (this.neckAlignmentScore < 80) score -= 15;
    if (this.situpMetrics.handPosition === 'behind_head' && this.neckAlignmentScore < 90) {
      score -= 10; // Extra penalty for poor neck alignment with hands behind head
    }

    this.formScore = Math.max(0, score);
    return this.formScore;
  }
}