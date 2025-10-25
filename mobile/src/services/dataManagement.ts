import { getDatabase } from './database';
import {
  getWorkoutSession,
  deleteWorkoutSession,
  deleteMLTrainingDataBySession,
  type WorkoutSession,
  type MLTrainingData,
} from './databaseHelpers';
import { SyncQueueManager } from './syncQueue';

// Data Management Configuration
const DATA_MANAGEMENT_CONFIG = {
  // Retention periods (in days)
  // NOTE: Local storage is temporary buffer only - data deleted after successful sync
  // These retention periods are only for UNSYNCED data and safety fallback
  WORKOUT_SESSION_RETENTION_DAYS: 7, // Keep unsynced sessions for 7 days before cleanup
  ML_TRAINING_DATA_RETENTION_DAYS: 7, // Keep unsynced ML data for 7 days before cleanup
  SYNC_QUEUE_RETENTION_DAYS: 7, // Keep failed sync items for 7 days

  // Storage limits (in MB)
  MAX_TOTAL_STORAGE_MB: 100, // Reduced since data is deleted after sync
  MAX_ML_DATA_STORAGE_MB: 80,
  WARNING_THRESHOLD_PERCENTAGE: 80, // Warn when 80% full

  // Cleanup batch size
  CLEANUP_BATCH_SIZE: 100,
};

// Storage statistics
export interface StorageStats {
  totalSizeMB: number;
  workoutSessionsSizeMB: number;
  mlDataSizeMB: number;
  syncQueueSizeMB: number;
  workoutSessionsCount: number;
  mlDataCount: number;
  syncQueueCount: number;
  percentageUsed: number;
  isNearLimit: boolean;
}

// Cleanup result
export interface CleanupResult {
  workoutSessionsDeleted: number;
  mlDataDeleted: number;
  syncQueueCleaned: number;
  spaceFreedfMB: number;
}

// Export format for debugging
export interface DataExport {
  timestamp: number;
  version: string;
  stats: StorageStats;
  workoutSessions: WorkoutSession[];
  mlDataSample: MLTrainingData[]; // Sample of ML data (not all)
  syncQueueSnapshot: any[];
}

// Data Management Service
export class DataManagementService {
  private static instance: DataManagementService;
  private isCleanupRunning: boolean = false;

  private constructor() {}

  static getInstance(): DataManagementService {
    if (!DataManagementService.instance) {
      DataManagementService.instance = new DataManagementService();
    }
    return DataManagementService.instance;
  }

  // ==================== STORAGE MONITORING ====================

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const db = getDatabase();

    try {
      // Get counts
      const workoutSessionsCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM workout_sessions'
      );

      const mlDataCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM ml_training_data'
      );

      const syncQueueCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sync_queue'
      );

      // Estimate sizes (rough approximation)
      // Average workout session: ~2 KB
      // Average ML data frame: ~10 KB (compressed landmarks)
      // Average sync queue item: ~5 KB
      const workoutSessionsSizeMB = (workoutSessionsCount?.count ?? 0) * 2 / 1024;
      const mlDataSizeMB = (mlDataCount?.count ?? 0) * 10 / 1024;
      const syncQueueSizeMB = (syncQueueCount?.count ?? 0) * 5 / 1024;

      const totalSizeMB = workoutSessionsSizeMB + mlDataSizeMB + syncQueueSizeMB;
      const percentageUsed = (totalSizeMB / DATA_MANAGEMENT_CONFIG.MAX_TOTAL_STORAGE_MB) * 100;
      const isNearLimit = percentageUsed >= DATA_MANAGEMENT_CONFIG.WARNING_THRESHOLD_PERCENTAGE;

      return {
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
        workoutSessionsSizeMB: Math.round(workoutSessionsSizeMB * 100) / 100,
        mlDataSizeMB: Math.round(mlDataSizeMB * 100) / 100,
        syncQueueSizeMB: Math.round(syncQueueSizeMB * 100) / 100,
        workoutSessionsCount: workoutSessionsCount?.count ?? 0,
        mlDataCount: mlDataCount?.count ?? 0,
        syncQueueCount: syncQueueCount?.count ?? 0,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        isNearLimit,
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      throw error;
    }
  }

  /**
   * Check if storage cleanup is needed
   */
  async needsCleanup(): Promise<boolean> {
    const stats = await this.getStorageStats();
    return stats.isNearLimit;
  }

  // ==================== DATA CLEANUP ====================

  /**
   * Run automatic data cleanup based on retention policies
   */
  async runCleanup(force: boolean = false): Promise<CleanupResult> {
    if (this.isCleanupRunning) {
      console.log('⏳ Cleanup already in progress, skipping...');
      return {
        workoutSessionsDeleted: 0,
        mlDataDeleted: 0,
        syncQueueCleaned: 0,
        spaceFreedfMB: 0,
      };
    }

    this.isCleanupRunning = true;

    try {
      console.log('🧹 Starting data cleanup...');

      const statsBefore = await this.getStorageStats();
      let workoutSessionsDeleted = 0;
      let mlDataDeleted = 0;
      let syncQueueCleaned = 0;

      // Only run cleanup if needed (or forced)
      if (!force && !statsBefore.isNearLimit) {
        console.log('✅ No cleanup needed (storage usage: ' + statsBefore.percentageUsed + '%)');
        this.isCleanupRunning = false;
        return {
          workoutSessionsDeleted: 0,
          mlDataDeleted: 0,
          syncQueueCleaned: 0,
          spaceFreedfMB: 0,
        };
      }

      // Step 1: Clean up old ML training data (oldest first, keep recent data)
      mlDataDeleted = await this.cleanupOldMLData();

      // Step 2: Clean up old synced workout sessions (if still needed)
      if (force || (await this.needsCleanup())) {
        workoutSessionsDeleted = await this.cleanupOldWorkoutSessions();
      }

      // Step 3: Clean up old failed sync queue items
      syncQueueCleaned = await this.cleanupOldSyncQueue();

      const statsAfter = await this.getStorageStats();
      const spaceFreedfMB = statsBefore.totalSizeMB - statsAfter.totalSizeMB;

      console.log(`✅ Cleanup completed:`);
      console.log(`   Workout sessions deleted: ${workoutSessionsDeleted}`);
      console.log(`   ML data deleted: ${mlDataDeleted}`);
      console.log(`   Sync queue cleaned: ${syncQueueCleaned}`);
      console.log(`   Space freed: ${spaceFreedfMB.toFixed(2)} MB`);

      return {
        workoutSessionsDeleted,
        mlDataDeleted,
        syncQueueCleaned,
        spaceFreedfMB: Math.round(spaceFreedfMB * 100) / 100,
      };
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Clean up old ML training data
   * NOTE: Synced data is deleted immediately after sync.
   * This only cleans up old UNSYNCED data that's been sitting for too long.
   */
  private async cleanupOldMLData(): Promise<number> {
    const db = getDatabase();
    const cutoffDate = Date.now() - (DATA_MANAGEMENT_CONFIG.ML_TRAINING_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Find old UNSYNCED ML data (safety cleanup for stuck data)
      const result = await db.runAsync(
        `DELETE FROM ml_training_data
         WHERE synced = 0 AND created_at < ?`,
        [cutoffDate]
      );

      const deletedCount = result.changes;
      if (deletedCount > 0) {
        console.log(`🧹 Deleted ${deletedCount} old unsynced ML training data records (older than ${DATA_MANAGEMENT_CONFIG.ML_TRAINING_DATA_RETENTION_DAYS} days)`);
      }
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup ML data:', error);
      return 0;
    }
  }

  /**
   * Clean up old workout sessions
   * NOTE: Synced data is deleted immediately after sync.
   * This only cleans up old UNSYNCED sessions that's been sitting for too long.
   */
  private async cleanupOldWorkoutSessions(): Promise<number> {
    const db = getDatabase();
    const cutoffDate = Date.now() - (DATA_MANAGEMENT_CONFIG.WORKOUT_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Get old UNSYNCED sessions (safety cleanup for stuck data)
      const oldSessions = await db.getAllAsync<{ id: string }>(
        `SELECT id FROM workout_sessions
         WHERE synced = 0 AND created_at < ?
         LIMIT ?`,
        [cutoffDate, DATA_MANAGEMENT_CONFIG.CLEANUP_BATCH_SIZE]
      );

      let deletedCount = 0;

      // Delete each session and its related data
      for (const session of oldSessions) {
        await deleteWorkoutSession(session.id);
        deletedCount++;
      }

      if (deletedCount > 0) {
        console.log(`🧹 Deleted ${deletedCount} old unsynced workout sessions (older than ${DATA_MANAGEMENT_CONFIG.WORKOUT_SESSION_RETENTION_DAYS} days)`);
      }
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup workout sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up old sync queue items
   */
  private async cleanupOldSyncQueue(): Promise<number> {
    const db = getDatabase();
    const cutoffDate = Date.now() - (DATA_MANAGEMENT_CONFIG.SYNC_QUEUE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    try {
      // Delete old failed items
      const result = await db.runAsync(
        `DELETE FROM sync_queue
         WHERE retry_count >= ? AND created_at < ?`,
        [5, cutoffDate] // Max retry count is 5
      );

      const deletedCount = result.changes;
      console.log(`🧹 Cleaned ${deletedCount} old sync queue items`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to cleanup sync queue:', error);
      return 0;
    }
  }

  /**
   * Delete all unsynced data (use with caution!)
   */
  async deleteAllUnsyncedData(): Promise<void> {
    const db = getDatabase();

    try {
      console.log('⚠️ Deleting ALL unsynced data...');

      await db.runAsync('DELETE FROM ml_training_data WHERE synced = 0');
      await db.runAsync('DELETE FROM workout_sessions WHERE synced = 0');
      await db.runAsync('DELETE FROM sync_queue');

      console.log('✅ All unsynced data deleted');
    } catch (error) {
      console.error('❌ Failed to delete unsynced data:', error);
      throw error;
    }
  }

  // ==================== DATA EXPORT ====================

  /**
   * Export data for debugging/analysis
   */
  async exportData(includeSampleMLData: boolean = true): Promise<DataExport> {
    const db = getDatabase();

    try {
      console.log('📤 Exporting data...');

      // Get storage stats
      const stats = await this.getStorageStats();

      // Get all workout sessions
      const workoutSessions = await db.getAllAsync<any>(
        'SELECT * FROM workout_sessions ORDER BY created_at DESC'
      );

      // Get sample of ML data (last 100 frames) if requested
      let mlDataSample: any[] = [];
      if (includeSampleMLData) {
        mlDataSample = await db.getAllAsync<any>(
          'SELECT * FROM ml_training_data ORDER BY created_at DESC LIMIT 100'
        );
      }

      // Get sync queue snapshot
      const syncQueueSnapshot = await db.getAllAsync<any>(
        'SELECT * FROM sync_queue ORDER BY created_at DESC'
      );

      const exportData: DataExport = {
        timestamp: Date.now(),
        version: '1.0.0',
        stats,
        workoutSessions: workoutSessions.map(row => ({
          id: row.id,
          userId: row.user_id,
          exerciseId: row.exercise_id,
          exerciseType: row.exercise_type,
          totalReps: row.total_reps,
          validReps: row.valid_reps,
          invalidReps: row.invalid_reps,
          points: row.points,
          duration: row.duration,
          isCompleted: row.is_completed === 1,
          synced: row.synced === 1,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        mlDataSample: mlDataSample.map(row => ({
          id: row.id,
          sessionId: row.session_id,
          frameNumber: row.frame_number,
          timestamp: row.timestamp,
          landmarksCompressed: row.landmarks_compressed,
          repNumber: row.rep_number,
          phaseLabel: row.phase_label,
          isValidRep: row.is_valid_rep === 1,
          synced: row.synced === 1,
          createdAt: row.created_at,
        })),
        syncQueueSnapshot,
      };

      console.log('✅ Data exported successfully');
      console.log(`   Workout sessions: ${exportData.workoutSessions.length}`);
      console.log(`   ML data sample: ${exportData.mlDataSample.length}`);
      console.log(`   Sync queue items: ${exportData.syncQueueSnapshot.length}`);

      return exportData;
    } catch (error) {
      console.error('❌ Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Export data as JSON string
   */
  async exportDataAsJSON(includeSampleMLData: boolean = true): Promise<string> {
    const data = await this.exportData(includeSampleMLData);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Get data lifecycle summary
   */
  async getDataLifecycleSummary(): Promise<{
    oldestSession: number | null;
    newestSession: number | null;
    oldestMLData: number | null;
    newestMLData: number | null;
    unsyncedSessions: number;
    unsyncedMLData: number;
    pendingSyncItems: number;
  }> {
    const db = getDatabase();

    try {
      const oldestSession = await db.getFirstAsync<{ created_at: number }>(
        'SELECT created_at FROM workout_sessions ORDER BY created_at ASC LIMIT 1'
      );

      const newestSession = await db.getFirstAsync<{ created_at: number }>(
        'SELECT created_at FROM workout_sessions ORDER BY created_at DESC LIMIT 1'
      );

      const oldestMLData = await db.getFirstAsync<{ created_at: number }>(
        'SELECT created_at FROM ml_training_data ORDER BY created_at ASC LIMIT 1'
      );

      const newestMLData = await db.getFirstAsync<{ created_at: number }>(
        'SELECT created_at FROM ml_training_data ORDER BY created_at DESC LIMIT 1'
      );

      const unsyncedSessions = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM workout_sessions WHERE synced = 0'
      );

      const unsyncedMLData = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM ml_training_data WHERE synced = 0'
      );

      const pendingSyncItems = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM sync_queue'
      );

      return {
        oldestSession: oldestSession?.created_at ?? null,
        newestSession: newestSession?.created_at ?? null,
        oldestMLData: oldestMLData?.created_at ?? null,
        newestMLData: newestMLData?.created_at ?? null,
        unsyncedSessions: unsyncedSessions?.count ?? 0,
        unsyncedMLData: unsyncedMLData?.count ?? 0,
        pendingSyncItems: pendingSyncItems?.count ?? 0,
      };
    } catch (error) {
      console.error('❌ Failed to get data lifecycle summary:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataManager = DataManagementService.getInstance();
