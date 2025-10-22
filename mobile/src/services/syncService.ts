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
  type WorkoutSession,
  type MLTrainingData,
} from './databaseHelpers';

// Sync Configuration
const SYNC_CONFIG = {
  BATCH_SIZE: 10,
  AUTO_SYNC_INTERVAL: 60000, // 1 minute
  MAX_CONCURRENT_SYNCS: 3,
};

// Sync Event Types
export type SyncEvent = {
  type: 'sync_started' | 'sync_progress' | 'sync_completed' | 'sync_failed' | 'sync_conflict';
  data?: any;
  error?: string;
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
  private emitEvent(event: SyncEvent): void {
    this.listeners.forEach(listener => listener(event));
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
      if (mlData.length > 0) {
        // Group by session for batch upload
        const bySession = mlData.reduce((acc, frame) => {
          if (!acc[frame.sessionId]) {
            acc[frame.sessionId] = [];
          }
          acc[frame.sessionId].push(frame);
          return acc;
        }, {} as Record<string, MLTrainingData[]>);

        // Queue each session's ML data as a batch
        for (const [sessionId, frames] of Object.entries(bySession)) {
          const alreadyQueued = await SyncQueueManager.hasEntityInQueue('ml_training_data', sessionId);
          if (!alreadyQueued) {
            await SyncQueueManager.addToQueue('ml_training_data', sessionId, 'create', frames);
          }
        }
      }

      console.log(`📦 Queued ${sessions.length} sessions and ${Object.keys(bySession || {}).length} ML data batches`);
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
      // Get retryable items
      const items = await SyncQueueManager.getRetryableItems(SYNC_CONFIG.BATCH_SIZE);

      if (items.length === 0) {
        console.log('✅ No items to sync');
        return { synced, failed, conflicts };
      }

      console.log(`📤 Processing ${items.length} items from sync queue...`);

      // Process each item
      for (const item of items) {
        try {
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

          // Emit progress
          this.emitEvent({
            type: 'sync_progress',
            data: {
              current: synced + failed + conflicts,
              total: items.length,
              synced,
              failed,
              conflicts,
            },
          });
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

      // TODO: Implement actual API calls to backend
      // For now, simulate sync with delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Simulate 10% failure rate for testing
      if (Math.random() < 0.1) {
        throw new Error('Simulated network error');
      }

      // Mark as synced in local database
      if (item.entityType === 'workout_session') {
        await markSessionAsSynced(item.entityId);
      } else if (item.entityType === 'ml_training_data') {
        const frames = payload as MLTrainingData[];
        const ids = frames.map(f => f.id!).filter(id => id !== undefined);
        await markMLTrainingDataAsSynced(ids);
      }

      console.log(`✅ Synced ${item.entityType}:${item.entityId}`);
      return SyncStatus.SUCCESS;
    } catch (error) {
      console.error(`❌ Failed to sync ${item.entityType}:${item.entityId}:`, error);

      // Check if it's a conflict error
      if (error instanceof Error && error.message.includes('conflict')) {
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
}

// Export singleton instance
export const syncService = SyncService.getInstance();
