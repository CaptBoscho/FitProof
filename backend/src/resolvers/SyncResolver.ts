import { Mutation, Arg, Resolver, ID } from 'type-graphql';
import { WorkoutSession } from '../entities/WorkoutSession';
import { MLTrainingData } from '../entities/MLTrainingData';
import { WorkoutSessionRepository } from '../repositories/WorkoutSessionRepository';
import { MLTrainingDataRepository } from '../repositories/MLTrainingDataRepository';
import { AppDataSource } from '../config/database';
import {
  SyncWorkoutSessionInput,
  SyncMLTrainingDataInput,
  BulkSyncInput,
  SyncWorkoutSessionResponse,
  SyncMLDataResponse,
  BulkSyncResponse,
  SyncItemResult,
  SyncConflict,
} from '../types/SyncTypes';
import { ConflictResolutionService, ConflictResolutionStrategy } from '../services/ConflictResolutionService';

@Resolver()
export class SyncResolver {
  private sessionRepository: WorkoutSessionRepository;
  private mlDataRepository: MLTrainingDataRepository;

  constructor() {
    this.sessionRepository = new WorkoutSessionRepository(AppDataSource);
    this.mlDataRepository = new MLTrainingDataRepository(AppDataSource);
  }

  /**
   * Sync a single workout session from mobile
   */
  @Mutation(() => SyncWorkoutSessionResponse)
  async syncWorkoutSession(
    @Arg('input') input: SyncWorkoutSessionInput
  ): Promise<SyncWorkoutSessionResponse> {
    try {
      const result = await this.processSyncWorkoutSession(input);

      return {
        success: result.success,
        message: result.success
          ? 'Workout session synced successfully'
          : `Failed to sync workout session: ${result.error}`,
        results: [result],
        synced: result.success ? 1 : 0,
        failed: result.success ? 0 : 1,
        conflicts: result.conflict ? 1 : 0,
      };
    } catch (error) {
      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: [{
          id: input.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        synced: 0,
        failed: 1,
        conflicts: 0,
      };
    }
  }

  /**
   * Sync multiple workout sessions in bulk
   */
  @Mutation(() => SyncWorkoutSessionResponse)
  async syncWorkoutSessions(
    @Arg('sessions', () => [SyncWorkoutSessionInput]) sessions: SyncWorkoutSessionInput[]
  ): Promise<SyncWorkoutSessionResponse> {
    const results: SyncItemResult[] = [];
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    for (const session of sessions) {
      try {
        const result = await this.processSyncWorkoutSession(session);
        results.push(result);

        if (result.success) {
          synced++;
        } else {
          failed++;
        }

        if (result.conflict) {
          conflicts++;
        }
      } catch (error) {
        results.push({
          id: session.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      message: `Synced ${synced}/${sessions.length} sessions. ${failed} failed, ${conflicts} conflicts.`,
      results,
      synced,
      failed,
      conflicts,
    };
  }

  /**
   * Sync ML training data in bulk
   */
  @Mutation(() => SyncMLDataResponse)
  async syncMLTrainingData(
    @Arg('data', () => [SyncMLTrainingDataInput]) data: SyncMLTrainingDataInput[]
  ): Promise<SyncMLDataResponse> {
    const results: SyncItemResult[] = [];
    let synced = 0;
    let failed = 0;

    try {
      // Group by session for better organization
      const bySession = data.reduce((acc, frame) => {
        if (!acc[frame.sessionId]) {
          acc[frame.sessionId] = [];
        }
        acc[frame.sessionId].push(frame);
        return acc;
      }, {} as Record<string, SyncMLTrainingDataInput[]>);

      // Process each session's ML data
      for (const [sessionId, frames] of Object.entries(bySession)) {
        try {
          // Validate session exists
          const session = await this.sessionRepository.findById(sessionId);
          if (!session) {
            // Session doesn't exist - mark all frames as failed
            for (const frame of frames) {
              results.push({
                id: `${sessionId}-frame-${frame.frameNumber}`,
                success: false,
                error: 'Session not found',
              });
              failed++;
            }
            continue;
          }

          // Create ML data records
          const mlDataRecords = frames.map(frame => ({
            id: `${sessionId}-frame-${frame.frameNumber}`, // Generate stable ID
            sessionId: frame.sessionId,
            frameNumber: frame.frameNumber,
            timestamp: frame.timestamp,
            landmarksCompressed: frame.landmarksCompressed,
            repNumber: frame.repNumber,
            phaseLabel: frame.phaseLabel,
            isValidRep: frame.isValidRep,
            createdAt: frame.createdAt,
          }));

          await this.mlDataRepository.bulkCreate(mlDataRecords);

          // Mark all frames as synced
          for (const frame of frames) {
            results.push({
              id: `${sessionId}-frame-${frame.frameNumber}`,
              success: true,
            });
            synced++;
          }
        } catch (error) {
          // Mark all frames for this session as failed
          for (const frame of frames) {
            results.push({
              id: `${sessionId}-frame-${frame.frameNumber}`,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
          }
        }
      }

      return {
        success: failed === 0,
        message: `Synced ${synced}/${data.length} ML data frames. ${failed} failed.`,
        results,
        synced,
        failed,
      };
    } catch (error) {
      return {
        success: false,
        message: `ML data sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        results: data.map(frame => ({
          id: `${frame.sessionId}-frame-${frame.frameNumber}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
        synced: 0,
        failed: data.length,
      };
    }
  }

  /**
   * Bulk sync - sync both sessions and ML data in one mutation
   */
  @Mutation(() => BulkSyncResponse)
  async bulkSync(@Arg('input') input: BulkSyncInput): Promise<BulkSyncResponse> {
    // Sync sessions first
    const sessionsResponse = await this.syncWorkoutSessions(input.sessions);

    // Sync ML data
    const mlDataResponse = await this.syncMLTrainingData(input.mlData);

    return {
      success: sessionsResponse.success && mlDataResponse.success,
      message: `Bulk sync completed. Sessions: ${sessionsResponse.synced}/${input.sessions.length}, ML Data: ${mlDataResponse.synced}/${input.mlData.length}`,
      sessions: sessionsResponse,
      mlData: mlDataResponse,
      totalSynced: sessionsResponse.synced + mlDataResponse.synced,
      totalFailed: sessionsResponse.failed + mlDataResponse.failed,
      totalConflicts: sessionsResponse.conflicts,
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Process syncing a single workout session with conflict detection and resolution
   */
  private async processSyncWorkoutSession(
    input: SyncWorkoutSessionInput
  ): Promise<SyncItemResult> {
    // Check if session already exists
    const existing = await this.sessionRepository.findById(input.id);

    if (existing) {
      // Use ConflictResolutionService for detection
      const conflictInfo = ConflictResolutionService.detectConflict(input, existing);

      if (conflictInfo.hasConflict) {
        console.log('🔍 Conflict detected:');
        console.log(ConflictResolutionService.generateConflictReport(conflictInfo));

        // Apply resolution strategy
        const resolvedData = ConflictResolutionService.resolveConflict(
          input,
          existing,
          conflictInfo.strategy
        );

        // Update with resolved data
        await this.sessionRepository.update(input.id, resolvedData);

        // Return conflict info for client awareness
        const conflict: SyncConflict = {
          entityType: 'workout_session',
          entityId: input.id,
          conflictFields: conflictInfo.conflictFields,
          resolution: conflictInfo.strategy,
          serverUpdatedAt: conflictInfo.serverUpdatedAt,
          clientUpdatedAt: conflictInfo.clientUpdatedAt,
          message: ConflictResolutionService.getRecommendedAction(conflictInfo),
        };

        return {
          id: input.id,
          success: true, // Still successful, but with conflict resolved
          conflict,
        };
      }

      // No conflict - update with client data
      await this.sessionRepository.update(input.id, {
        totalReps: input.totalReps,
        validReps: input.validReps,
        totalPoints: input.points,
        durationSeconds: input.duration,
        isCompleted: input.isCompleted,
        completedAt: input.isCompleted ? input.updatedAt : undefined,
      });

      return {
        id: input.id,
        success: true,
      };
    }

    // Session doesn't exist - create it
    await this.sessionRepository.create({
      userId: input.userId,
      exerciseId: input.exerciseId,
      totalReps: input.totalReps,
      validReps: input.validReps,
      totalPoints: input.points,
      durationSeconds: input.duration,
      isCompleted: input.isCompleted,
      startedAt: input.createdAt,
      completedAt: input.isCompleted ? input.updatedAt : undefined,
    });

    return {
      id: input.id,
      success: true,
    };
  }
}
