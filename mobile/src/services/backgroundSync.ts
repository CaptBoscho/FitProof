/**
 * Background Sync Service
 * Handles periodic background sync for both iOS and Android
 */

import BackgroundFetch from 'react-native-background-fetch';
import { syncService } from './syncService';

// Background Sync Configuration
const BACKGROUND_SYNC_CONFIG = {
  MINIMUM_FETCH_INTERVAL: 15, // 15 minutes (iOS minimum)
  STOP_ON_TERMINATE: false, // Continue after app termination
  START_ON_BOOT: true, // Start on device boot (Android)
  ENABLE_HEADLESS: true, // Run even when app is killed (Android)
};

export type BackgroundSyncStatus =
  | 'configured'
  | 'running'
  | 'stopped'
  | 'error'
  | 'disabled';

export interface BackgroundSyncStats {
  status: BackgroundSyncStatus;
  lastRunAt?: Date;
  nextScheduledAt?: Date;
  successCount: number;
  failureCount: number;
  isEnabled: boolean;
}

/**
 * Background Sync Service
 * Manages periodic sync in background using react-native-background-fetch
 */
export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isConfigured: boolean = false;
  private isEnabled: boolean = false;
  private stats: BackgroundSyncStats = {
    status: 'disabled',
    successCount: 0,
    failureCount: 0,
    isEnabled: false,
  };

  private constructor() {}

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Initialize and configure background sync
   */
  async initialize(): Promise<void> {
    if (this.isConfigured) {
      console.log('⏭️  Background sync already configured');
      return;
    }

    try {
      console.log('🔧 Configuring background sync...');

      // Configure background fetch
      const status = await BackgroundFetch.configure(
        {
          minimumFetchInterval: BACKGROUND_SYNC_CONFIG.MINIMUM_FETCH_INTERVAL,
          stopOnTerminate: BACKGROUND_SYNC_CONFIG.STOP_ON_TERMINATE,
          startOnBoot: BACKGROUND_SYNC_CONFIG.START_ON_BOOT,
          enableHeadless: BACKGROUND_SYNC_CONFIG.ENABLE_HEADLESS,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        },
        // Task callback
        async (taskId: string) => {
          console.log('🔄 [Background] Sync task triggered:', taskId);
          await this.performBackgroundSync(taskId);
        },
        // Task timeout callback
        (taskId: string) => {
          console.warn('⏰ [Background] Sync task timeout:', taskId);
          this.stats.failureCount++;
          BackgroundFetch.finish(taskId);
        }
      );

      console.log('✅ Background sync configured with status:', status);

      this.isConfigured = true;
      this.isEnabled = true;
      this.stats.status = 'configured';
      this.stats.isEnabled = true;

      // Register headless task for Android
      this.registerHeadlessTask();
    } catch (error) {
      console.error('❌ Failed to configure background sync:', error);
      this.stats.status = 'error';
      throw error;
    }
  }

  /**
   * Perform background sync
   */
  private async performBackgroundSync(taskId: string): Promise<void> {
    const startTime = Date.now();
    this.stats.status = 'running';
    this.stats.lastRunAt = new Date();

    try {
      console.log('📤 [Background] Starting sync...');

      // Perform sync
      await syncService.sync();

      const duration = Date.now() - startTime;
      console.log(`✅ [Background] Sync completed in ${duration}ms`);

      this.stats.successCount++;
      this.stats.status = 'configured';

      // Notify OS that task is complete
      BackgroundFetch.finish(taskId);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [Background] Sync failed after ${duration}ms:`, error);

      this.stats.failureCount++;
      this.stats.status = 'error';

      // Still need to finish the task
      BackgroundFetch.finish(taskId);
    }
  }

  /**
   * Register headless task for Android
   * This allows sync to run even when app is terminated
   */
  private registerHeadlessTask(): void {
    BackgroundFetch.registerHeadlessTask(async (event) => {
      const { taskId, timeout } = event;

      console.log('🤖 [Headless] Background task started:', taskId);

      if (timeout) {
        console.warn('⏰ [Headless] Task timeout!');
        BackgroundFetch.finish(taskId);
        return;
      }

      await this.performBackgroundSync(taskId);
    });
  }

  /**
   * Start background sync
   */
  async start(): Promise<void> {
    if (!this.isConfigured) {
      await this.initialize();
    }

    console.log('▶️  Starting background sync...');
    await BackgroundFetch.start();
    this.isEnabled = true;
    this.stats.isEnabled = true;
    this.stats.status = 'configured';
    console.log('✅ Background sync started');
  }

  /**
   * Stop background sync
   */
  async stop(): Promise<void> {
    console.log('⏸️  Stopping background sync...');
    await BackgroundFetch.stop();
    this.isEnabled = false;
    this.stats.isEnabled = false;
    this.stats.status = 'stopped';
    console.log('✅ Background sync stopped');
  }

  /**
   * Schedule an immediate background sync
   */
  async scheduleImmediateSync(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('⚠️  Background sync not configured, using regular sync');
      await syncService.sync();
      return;
    }

    console.log('⚡ Scheduling immediate background sync...');

    await BackgroundFetch.scheduleTask({
      taskId: 'com.fitproof.immediate-sync',
      delay: 0, // Execute immediately
      periodic: false,
      forceAlarmManager: true, // Use AlarmManager on Android for reliability
      stopOnTerminate: false,
      startOnBoot: false,
    });
  }

  /**
   * Check background sync status
   */
  async checkStatus(): Promise<number> {
    const status = await BackgroundFetch.status();

    const statusMap = {
      [BackgroundFetch.STATUS_RESTRICTED]: 'Restricted (iOS)',
      [BackgroundFetch.STATUS_DENIED]: 'Denied (iOS)',
      [BackgroundFetch.STATUS_AVAILABLE]: 'Available',
    };

    console.log('📊 Background fetch status:', statusMap[status] || `Unknown (${status})`);

    return status;
  }

  /**
   * Get background sync statistics
   */
  getStats(): BackgroundSyncStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.successCount = 0;
    this.stats.failureCount = 0;
    console.log('🔄 Background sync stats reset');
  }

  /**
   * Check if background sync is enabled
   */
  isBackgroundSyncEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
