import { ObjectType, Field, Int } from 'type-graphql';
import { User } from '../entities/User';
import { WorkoutSession } from '../entities/WorkoutSession';

@ObjectType()
export class AuthResponse {
  @Field()
  token: string;

  @Field(() => User)
  user: User;

  @Field()
  message: string;
}

@ObjectType()
export class UserStatsResponse {
  @Field(() => Int)
  totalSessions: number;

  @Field(() => Int)
  completedSessions: number;

  @Field(() => Int)
  totalReps: number;

  @Field(() => Int)
  totalPoints: number;

  @Field(() => Number)
  averageSessionDuration: number;
}

@ObjectType()
export class ExerciseStatsResponse {
  @Field(() => Int)
  totalSessions: number;

  @Field(() => WorkoutSession, { nullable: true })
  bestSession: WorkoutSession | null;

  @Field(() => Number)
  averageReps: number;

  @Field(() => Number)
  improvementTrend: number;
}

@ObjectType()
export class StreakDataResponse {
  @Field(() => Int)
  currentStreak: number;

  @Field(() => Int)
  longestStreak: number;

  @Field(() => [Date])
  workoutDays: Date[];
}

@ObjectType()
export class SessionStatsResponse {
  @Field(() => Int)
  totalReps: number;

  @Field(() => Int)
  validReps: number;

  @Field(() => Number)
  averageConfidence: number;

  @Field(() => Number)
  completionRate: number;

  @Field(() => Number)
  averageDuration: number;
}

@ObjectType()
export class ValidationError {
  @Field()
  error: string;

  @Field(() => Int)
  frequency: number;
}

@ObjectType()
export class ConfidenceByRep {
  @Field(() => Int)
  repNumber: number;

  @Field(() => Number)
  confidence: number;
}

@ObjectType()
export class ValidationTrend {
  @Field(() => Int)
  repNumber: number;

  @Field()
  isValid: boolean;

  @Field(() => Number)
  confidence: number;
}

@ObjectType()
export class FormAnalysisResponse {
  @Field(() => [ValidationError])
  commonErrors: ValidationError[];

  @Field(() => [ConfidenceByRep])
  averageConfidenceByRep: ConfidenceByRep[];

  @Field(() => [ValidationTrend])
  validationTrend: ValidationTrend[];
}

@ObjectType()
export class GenericResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

@ObjectType()
export class PaginatedUsersResponse {
  @Field(() => [User])
  users: User[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

@ObjectType()
export class PaginatedSessionsResponse {
  @Field(() => [WorkoutSession])
  sessions: WorkoutSession[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}