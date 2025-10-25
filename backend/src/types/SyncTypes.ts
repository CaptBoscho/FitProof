import { InputType, ObjectType, Field, ID, Int, Float } from 'type-graphql';
import { IsUUID, IsOptional, IsBoolean, IsNumber, IsString, IsArray, Min, Max } from 'class-validator';

// ============= INPUT TYPES =============

/**
 * Input for syncing a single workout session from mobile
 */
@InputType()
export class SyncWorkoutSessionInput {
  @Field(() => ID)
  @IsUUID()
  id: string; // Client-generated UUID

  @Field(() => ID)
  @IsUUID()
  userId: string;

  @Field(() => ID)
  @IsUUID()
  exerciseId: string;

  @Field()
  @IsString()
  exerciseType: string; // pushup, squat, situp

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  deviceId?: string; // Device that created this session

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  deviceName?: string; // Human-readable device name

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
  invalidReps: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  points: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  duration: number; // in seconds

  @Field()
  @IsBoolean()
  isCompleted: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

/**
 * Compressed landmark data (array format from mobile)
 */
@InputType()
export class CompressedLandmarkInput {
  @Field(() => [Float])
  @IsArray()
  data: number[]; // [x, y, z, visibility]
}

/**
 * Input for syncing ML training data batch from mobile
 */
@InputType()
export class SyncMLTrainingDataInput {
  @Field(() => ID)
  @IsUUID()
  sessionId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  frameNumber: number;

  @Field(() => Float)
  @IsNumber()
  timestamp: number;

  @Field()
  @IsString()
  landmarksCompressed: string; // JSON string of compressed landmarks

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  repNumber: number;

  @Field()
  @IsString()
  phaseLabel: string; // up, down, mid, etc.

  @Field()
  @IsBoolean()
  isValidRep: boolean;

  @Field(() => Date)
  createdAt: Date;
}

/**
 * Bulk sync input - multiple sessions and ML data
 */
@InputType()
export class BulkSyncInput {
  @Field(() => [SyncWorkoutSessionInput])
  @IsArray()
  sessions: SyncWorkoutSessionInput[];

  @Field(() => [SyncMLTrainingDataInput])
  @IsArray()
  mlData: SyncMLTrainingDataInput[];
}

// ============= RESPONSE TYPES =============

/**
 * Conflict information when server data differs from client
 */
@ObjectType()
export class SyncConflict {
  @Field()
  entityType: string; // 'workout_session' or 'ml_training_data'

  @Field(() => ID)
  entityId: string;

  @Field(() => [String])
  conflictFields: string[]; // Fields that differ

  @Field()
  resolution: string; // 'server_wins', 'client_wins', 'merge'

  @Field(() => Date, { nullable: true })
  serverUpdatedAt?: Date;

  @Field(() => Date, { nullable: true })
  clientUpdatedAt?: Date;

  @Field({ nullable: true })
  message?: string;
}

/**
 * Result of syncing a single item
 */
@ObjectType()
export class SyncItemResult {
  @Field(() => ID)
  id: string;

  @Field()
  success: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field(() => SyncConflict, { nullable: true })
  conflict?: SyncConflict;
}

/**
 * Response for workout session sync
 */
@ObjectType()
export class SyncWorkoutSessionResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => [SyncItemResult])
  results: SyncItemResult[];

  @Field(() => Int)
  synced: number;

  @Field(() => Int)
  failed: number;

  @Field(() => Int)
  conflicts: number;
}

/**
 * Response for ML training data sync
 */
@ObjectType()
export class SyncMLDataResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => [SyncItemResult])
  results: SyncItemResult[];

  @Field(() => Int)
  synced: number;

  @Field(() => Int)
  failed: number;
}

/**
 * Response for bulk sync operation
 */
@ObjectType()
export class BulkSyncResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => SyncWorkoutSessionResponse)
  sessions: SyncWorkoutSessionResponse;

  @Field(() => SyncMLDataResponse)
  mlData: SyncMLDataResponse;

  @Field(() => Int)
  totalSynced: number;

  @Field(() => Int)
  totalFailed: number;

  @Field(() => Int)
  totalConflicts: number;
}
