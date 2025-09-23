import { InputType, Field, ID, Int } from 'type-graphql';
import { IsUUID, IsOptional, IsBoolean, IsNumber, IsString, IsDate, Min, Max } from 'class-validator';

@InputType()
export class CreateWorkoutSessionInput {
  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => ID)
  @IsUUID()
  exerciseId: string;

  @Field({ nullable: true, defaultValue: 'portrait' })
  @IsOptional()
  @IsString()
  deviceOrientation?: string;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  startedAt?: Date;
}

@InputType()
export class UpdateWorkoutSessionInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalReps?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  validReps?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPoints?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  completedAt?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSeconds?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

@InputType()
export class CreateWorkoutRepInput {
  @Field(() => ID)
  @IsUUID()
  sessionId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  repNumber: number;

  @Field()
  @IsBoolean()
  isValid: boolean;

  @Field(() => Number, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidenceScore?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  validationErrors?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMs?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  startedAt?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  completedAt?: Date;
}

@InputType()
export class WorkoutSessionFiltersInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

@InputType()
export class WorkoutRepFiltersInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isValid?: boolean;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

@InputType()
export class CompleteWorkoutSessionInput {
  @Field(() => Int)
  @IsNumber()
  @Min(0)
  totalReps: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  validReps: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  totalPoints: number;
}