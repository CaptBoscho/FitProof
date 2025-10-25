import NetInfo from '@react-native-community/netinfo';
import {
  SyncQueueManager,
  ConflictDetector,
  SyncStatus,
  type SyncQueueItem,
} from './syncQueue';
import {
  getUnsyncedWorkoutSessions,
  getUnsyncedMLTrainingData,
  markSessionAsSynced,
  markMLTrainingDataAsSynced,
  deleteWorkoutSession,
  deleteMLTrainingDataBySession,
  type WorkoutSession,
  type MLTrainingData,
} from './databaseHelpers';
import {
  syncWorkoutSession as apiSyncWorkoutSession,
  syncMLTrainingData as apiSyncMLTrainingData,
  type SyncWorkoutSessionInput,
  type SyncMLTrainingDataInput,
} from './graphqlClient';
import {
  ConflictResolutionService,
  ConflictLogger,
  type SyncConflict,
  type ConflictResolutionResult,
} from './conflictResolution';
import { networkMonitor, type NetworkStatus } from './networkMonitor';
import { deviceService } from './deviceService';

// Sync Configuration
const SYNC_CONFIG = {
  BATCH_SIZE: 10, // Default, will be overridden by network monitor
  AUTO_SYNC_INTERVAL: 60000, // 1 minute
  MAX_CONCURRENT_SYNCS: 3,
};

// Sync Event Types
export type SyncEventType =
  | 'sync_started'
  | 'sync_queueing'
  | 'sync_processing'
  | 'sync_progress'
  | 'sync_completed'
  | 'sync_failed'
  | 'sync_conflict'
  | 'sync_paused'
  | 'sync_resumed';

export interface SyncProgressData {
  phase: 'queueing' | 'processing' | 'completed';
  current: number;
  total: number;
  synced: number;
  failed: number;
  conflicts: number;
  currentItem?: {
    type: string;
    id: string;
  };
  estimatedTimeRemaining?: number; // milliseconds
}

export type SyncEvent = {
  type: SyncEventType;
  data?: any;
  error?: string;
  timestamp: number;
};

type SyncEventListener = (event: SyncEvent) => void;

// Sync Service
export class SyncService {
  private static instance: SyncService;
  private isSyncing: boolean = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private listeners: SyncEventListener[] = [];
  private isOnline: boolean = false;

  private constructor() {
    this.setupNetworkListener();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // Setup network connectivity listener
  private setupNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`📡 Network status: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

      // Trigger sync when coming back online
      if (!wasOnline && this.isOnline) {
        console.log('🔄 Network restored - triggering sync...');
        this.sync();
      }
    });
  }

  // Add event listener
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Emit event to all listeners
  private emitEvent(event: Omit<SyncEvent, 'timestamp'>): void {
    const fullEvent: SyncEvent = {
      ...event,
      timestamp: Date.now(),
    };
    this.listeners.forEach(listener => listener(fullEvent));
  }

  // Start automatic sync
  startAutoSync(): void {
    if (this.autoSyncInterval) return;

    console.log('🔄 Starting auto-sync (every 60s)...');
    this.autoSyncInterval = setInterval(() => {
      this.sync();
    }, SYNC_CONFIG.AUTO_SYNC_INTERVAL);

    // Trigger immediate sync
    this.sync();
  }

  // Stop automatic sync
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('⏸️  Auto-sync stopped');
    }
  }

  // Main sync method
  async sync(): Promise<void> {
    // Check if already syncing
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return;
    }

    // Check network connectivity
    if (!this.isOnline) {
      console.log('📡 No network connection, skipping sync');
      return;
    }

    // Check network quality and sync recommendation
    const networkStatus = networkMonitor.getStatus();
    if (!networkStatus.canSync) {
      console.log(`📡 Network quality too poor for sync (${networkStatus.quality}), skipping...`);
      this.emitEvent({
        type: 'sync_paused',
        data: {
          reason: 'poor_network',
          quality: networkStatus.quality,
          message: networkMonitor.getQualityDescription(),
        },
      });
      return;
    }

    this.isSyncing = true;
    this.emitEvent({ type: 'sync_started' });

    try {
      console.log('🔄 Starting sync process...');

      // Step 1: Queue unsynced items
      await this.queueUnsyncedItems();

      // Step 2: Process sync queue
      const result = await this.processSyncQueue();

      // Step 3: Handle conflicts
      if (result.conflicts > 0) {
        console.log(`⚠️  ${result.conflicts} conflicts detected`);
        this.emitEvent({ type: 'sync_conflict', data: { count: result.conflicts } });
      }

      console.log(`✅ Sync completed: ${result.synced} items synced, ${result.failed} failed`);
      this.emitEvent({
        type: 'sync_completed',
        data: {
          synced: result.synced,
          failed: result.failed,
          conflicts: result.conflicts,
        },
      });
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.emitEvent({
        type: 'sync_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isSyncing = false;
    }
  }

  // Queue unsynced items
  private async queueUnsyncedItems(): Promise<void> {
    try {
      this.emitEvent({ type: 'sync_queueing' });

      // Get unsynced workout sessions
      const sessions = await getUnsyncedWorkoutSessions();
      for (const session of sessions) {
        const alreadyQueued = await SyncQueueManager.hasEntityInQueue('workout_session', session.id);
        if (!alreadyQueued) {
          await SyncQueueManager.addToQueue('workout_session', session.id, 'create', session);
        }
      }

      // Get unsynced ML training data
      const mlData = await getUnsyncedMLTrainingData();
      let mlDataBatchCount = 0;
      if (mlData.length > 0) {
        // Group by session for batch upload
        const bySession = mlData.reduce((acc, frame) => {
          if (!acc[frame.sessionId]) {
            acc[frame.sessionId] = [];
          }
          acc[frame.sessionId].push(frame);
          return acc;
        }, {} as Record<string, MLTrainingData[]>);

        mlDataBatchCount = Object.keys(bySession).length;

        // Queue each session's ML data as a batch
        for (const [sessionId, frames] of Object.entries(bySession)) {
          const alreadyQueued = await SyncQueueManager.hasEntityInQueue('ml_training_data', sessionId);
          if (!alreadyQueued) {
            await SyncQueueManager.addToQueue('ml_training_data', sessionId, 'create', frames);
          }
        }
      }

      console.log(`📦 Queued ${sessions.length} sessions and ${mlDataBatchCount} ML data batches`);

      this.emitEvent({
        type: 'sync_progress',
        data: {
          phase: 'queueing',
          total: sessions.length + mlDataBatchCount,
        } as Partial<SyncProgressData>,
      });
    } catch (error) {
      console.error('❌ Failed to queue unsynced items:', error);
      throw error;
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<{
    synced: number;
    failed: number;
    conflicts: number;
  }> {
    let synced = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Get adaptive batch size based on network quality
      const batchSize = networkMonitor.getRecommendedBatchSize();

      // Get retryable items
      const items = await SyncQueueManager.getRetryableItems(batchSize);

      if (items.length === 0) {
        console.log('✅ No items to sync');
        return { synced, failed, conflicts };
      }

      console.log(`📤 Processing ${items.length} items from sync queue...`);

      this.emitEvent({
        type: 'sync_processing',
        data: {
          phase: 'processing',
          total: items.length,
        } as Partial<SyncProgressData>,
      });

      const startTime = Date.now();

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
          // Emit progress with current item
          const elapsedTime = Date.now() - startTime;
          const avgTimePerItem = elapsedTime / (i + 1);
          const remainingItems = items.length - (i + 1);
          const estimatedTimeRemaining = avgTimePerItem * remainingItems;

          this.emitEvent({
            type: 'sync_progress',
            data: {
              phase: 'processing',
              current: i + 1,
              total: items.length,
              synced,
              failed,
              conflicts,
              currentItem: {
                type: item.entityType,
                id: item.entityId,
              },
              estimatedTimeRemaining,
            } as SyncProgressData,
          });

          const result = await this.syncItem(item);

          if (result === SyncStatus.SUCCESS) {
            synced++;
            await SyncQueueManager.removeFromQueue(item.id!);
          } else if (result === SyncStatus.CONFLICT) {
            conflicts++;
            await SyncQueueManager.updateRetry(item.id!, 'Conflict detected');
          } else {
            failed++;
            await SyncQueueManager.updateRetry(item.id!, 'Sync failed');
          }
        } catch (error) {
          console.error(`❌ Failed to sync item ${item.id}:`, error);
          failed++;
          await SyncQueueManager.updateRetry(
            item.id!,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }

      return { synced, failed, conflicts };
    } catch (error) {
      console.error('❌ Failed to process sync queue:', error);
      throw error;
    }
  }

  // Sync individual item
  private async syncItem(item: SyncQueueItem): Promise<SyncStatus> {
    console.log(`📤 Syncing ${item.entityType}:${item.entityId}...`);

    try {
      const payload = JSON.parse(item.payload);

      // Sync to backend using GraphQL API
      if (item.entityType === 'workout_session') {
        const session = payload as WorkoutSession;

        // Get device metadata
        const deviceMetadata = await deviceService.getDeviceMetadata();

        // Prepare sync input
        const syncInput: SyncWorkoutSessionInput = {
          id: session.id,
          userId: session.userId,
          exerciseId: session.exerciseId,
          exerciseType: session.exerciseType,
          totalReps: session.totalReps,
          validReps: session.validReps,
          invalidReps: session.invalidReps,
          points: session.points,
          duration: session.duration,
          isCompleted: session.isCompleted,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          deviceId: deviceMetadata.deviceId,
          deviceName: deviceMetadata.deviceName,
        };

        // Call backend API
        const response = await apiSyncWorkoutSession(syncInput);

        // Handle conflicts (even if sync was successful)
        if (response.results && response.results.length > 0) {
          const result = response.results[0];
          if (result.conflict) {
            // Log the conflict
            await ConflictResolutionService.handleConflict(result.conflict as SyncConflict);

            // Note: Backend already resolved the conflict
            // We just log it for awareness
            console.log(`⚠️  Conflict detected and auto-resolved: ${result.conflict.resolution}`);
          }
        }

        if (!response.success) {
          throw new Error(response.message || 'Sync failed');
        }

        // Success - delete local data immediately
        await deleteWorkoutSession(item.entityId);
        console.log(`🗑️  Deleted local workout session ${item.entityId} after sync`);

      } else if (item.entityType === 'ml_training_data') {
        const frames = payload as MLTrainingData[];
        const sessionId = frames[0]?.sessionId;

        if (!sessionId) {
          throw new Error('No session ID found for ML training data');
        }

        // Prepare sync input
        const syncInput: SyncMLTrainingDataInput[] = frames.map(frame => ({
          sessionId: frame.sessionId,
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          landmarksCompressed: frame.landmarksCompressed,
          repNumber: frame.repNumber,
          phaseLabel: frame.phaseLabel,
          isValidRep: frame.isValidRep,
          createdAt: new Date(frame.createdAt),
        }));

        // Call backend API
        const response = await apiSyncMLTrainingData(syncInput);

        if (!response.success) {
          throw new Error(response.message || 'ML data sync failed');
        }

        // Success - delete local data immediately
        await deleteMLTrainingDataBySession(sessionId);
        console.log(`🗑️  Deleted local ML training data for session ${sessionId} after sync`);
      }

      console.log(`✅ Synced and cleaned up ${item.entityType}:${item.entityId}`);
      return SyncStatus.SUCCESS;
    } catch (error) {
      console.error(`❌ Failed to sync ${item.entityType}:${item.entityId}:`, error);

      // Check if it's a conflict error
      if (error instanceof Error && (error.message.includes('conflict') || error.message.includes('Conflict'))) {
        return SyncStatus.CONFLICT;
      }

      return SyncStatus.FAILED;
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    isOnline: boolean;
    isSyncing: boolean;
    queueStats: {
      total: number;
      pending: number;
      retrying: number;
      failed: number;
    };
  }> {
    const queueStats = await SyncQueueManager.getQueueStats();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueStats,
    };
  }

  // Manually retry failed items
  async retryFailed(): Promise<void> {
    const failedItems = await SyncQueueManager.getFailedItems();

    console.log(`🔄 Retrying ${failedItems.length} failed items...`);

    for (const item of failedItems) {
      await SyncQueueManager.resetRetryCount(item.id!);
    }

    // Trigger sync
    await this.sync();
  }

  // Clear all failed items
  async clearFailed(): Promise<void> {
    await SyncQueueManager.clearFailedItems();
    console.log('✅ Cleared all failed items');
  }

  // Get conflict statistics
  getConflictStats(): {
    total: number;
    byResolution: Record<string, number>;
    byType: Record<string, number>;
    recent: SyncConflict[];
  } {
    return ConflictResolutionService.generateConflictSummary();
  }

  // Clear conflict history
  clearConflictHistory(): void {
    ConflictLogger.clearConflicts();
    console.log('✅ Cleared conflict history');
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
