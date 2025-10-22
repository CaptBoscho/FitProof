import { getDatabase } from './database';

// Sync Queue Types
export interface SyncQueueItem {
  id?: number;
  entityType: 'workout_session' | 'workout_rep' | 'ml_training_data';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string; // JSON string
  retryCount: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  CONFLICT = 'conflict',
}

// Sync Queue Operations
export class SyncQueueManager {
  private static readonly MAX_RETRY_COUNT = 5;
  private static readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private static readonly MAX_RETRY_DELAY = 60000; // 60 seconds

  // Add item to sync queue
  static async addToQueue(
    entityType: SyncQueueItem['entityType'],
    entityId: string,
    operation: SyncQueueItem['operation'],
    payload: any
  ): Promise<number> {
    const db = getDatabase();
    const now = Date.now();

    const result = await db.runAsync(
      `INSERT INTO sync_queue (
        entity_type, entity_id, operation, payload,
        retry_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        operation,
        JSON.stringify(payload),
        0,
        now,
        now,
      ]
    );

    console.log(`✅ Added ${entityType}:${entityId} to sync queue (operation: ${operation})`);
    return result.lastInsertRowId;
  }

  // Get pending items from queue
  static async getPendingItems(limit: number = 50): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue
       ORDER BY created_at ASC
       LIMIT ?`,
      [limit]
    );

    return results.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Get items that are ready for retry (based on exponential backoff)
  static async getRetryableItems(limit: number = 20): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const now = Date.now();

    const results = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue
       WHERE retry_count < ?
       ORDER BY updated_at ASC
       LIMIT ?`,
      [this.MAX_RETRY_COUNT, limit]
    );

    // Filter by exponential backoff delay
    return results
      .filter(row => {
        const delay = this.calculateRetryDelay(row.retry_count);
        const nextRetryTime = row.updated_at + delay;
        return now >= nextRetryTime;
      })
      .map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        operation: row.operation,
        payload: row.payload,
        retryCount: row.retry_count,
        lastError: row.last_error,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
  }

  // Calculate exponential backoff delay
  static calculateRetryDelay(retryCount: number): number {
    const delay = Math.min(
      this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount),
      this.MAX_RETRY_DELAY
    );
    return delay;
  }

  // Update retry count and error for an item
  static async updateRetry(id: number, error: string): Promise<void> {
    const db = getDatabase();
    const now = Date.now();

    await db.runAsync(
      `UPDATE sync_queue
       SET retry_count = retry_count + 1,
           last_error = ?,
           updated_at = ?
       WHERE id = ?`,
      [error, now, id]
    );

    console.log(`⚠️ Updated retry count for queue item ${id}`);
  }

  // Remove item from queue (after successful sync)
  static async removeFromQueue(id: number): Promise<void> {
    const db = getDatabase();

    await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);

    console.log(`✅ Removed item ${id} from sync queue`);
  }

  // Remove multiple items from queue
  static async removeBatch(ids: number[]): Promise<void> {
    if (ids.length === 0) return;

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');

    await db.runAsync(
      `DELETE FROM sync_queue WHERE id IN (${placeholders})`,
      ids
    );

    console.log(`✅ Removed ${ids.length} items from sync queue`);
  }

  // Get failed items (exceeded max retry count)
  static async getFailedItems(): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue
       WHERE retry_count >= ?
       ORDER BY updated_at DESC`,
      [this.MAX_RETRY_COUNT]
    );

    return results.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  // Clear failed items (after manual review)
  static async clearFailedItems(): Promise<void> {
    const db = getDatabase();

    await db.runAsync(
      `DELETE FROM sync_queue WHERE retry_count >= ?`,
      [this.MAX_RETRY_COUNT]
    );

    console.log(`✅ Cleared failed items from sync queue`);
  }

  // Reset retry count for an item (manual retry)
  static async resetRetryCount(id: number): Promise<void> {
    const db = getDatabase();
    const now = Date.now();

    await db.runAsync(
      `UPDATE sync_queue
       SET retry_count = 0,
           last_error = NULL,
           updated_at = ?
       WHERE id = ?`,
      [now, id]
    );

    console.log(`✅ Reset retry count for queue item ${id}`);
  }

  // Get queue statistics
  static async getQueueStats(): Promise<{
    total: number;
    pending: number;
    retrying: number;
    failed: number;
  }> {
    const db = getDatabase();

    const total = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    );

    const pending = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE retry_count = 0'
    );

    const retrying = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue
       WHERE retry_count > 0 AND retry_count < ?`,
      [this.MAX_RETRY_COUNT]
    );

    const failed = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sync_queue
       WHERE retry_count >= ?`,
      [this.MAX_RETRY_COUNT]
    );

    return {
      total: total?.count ?? 0,
      pending: pending?.count ?? 0,
      retrying: retrying?.count ?? 0,
      failed: failed?.count ?? 0,
    };
  }

  // Check if entity exists in queue
  static async hasEntityInQueue(entityType: string, entityId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE entity_type = ? AND entity_id = ?',
      [entityType, entityId]
    );

    return (result?.count ?? 0) > 0;
  }

  // Get items by entity type
  static async getItemsByType(entityType: SyncQueueItem['entityType']): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    const results = await db.getAllAsync<any>(
      'SELECT * FROM sync_queue WHERE entity_type = ? ORDER BY created_at ASC',
      [entityType]
    );

    return results.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payload: row.payload,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}

// Conflict Detection
export class ConflictDetector {
  // Check for conflicts between local and server data
  static detectConflict(
    localData: any,
    serverData: any,
    entityType: string
  ): {
    hasConflict: boolean;
    conflictFields: string[];
    resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  } {
    const conflictFields: string[] = [];
    let hasConflict = false;

    // Timestamp-based conflict detection
    const localTimestamp = localData.updatedAt || localData.createdAt;
    const serverTimestamp = serverData.updatedAt || serverData.createdAt;

    // If server is newer, potential conflict
    if (serverTimestamp > localTimestamp) {
      // Check which fields differ
      for (const key in localData) {
        if (key === 'updatedAt' || key === 'createdAt' || key === 'synced') continue;

        if (JSON.stringify(localData[key]) !== JSON.stringify(serverData[key])) {
          conflictFields.push(key);
          hasConflict = true;
        }
      }
    }

    // Determine resolution strategy
    let resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual' = 'server_wins';

    if (!hasConflict) {
      resolution = 'client_wins'; // No conflict, use client data
    } else if (entityType === 'workout_session') {
      // For workout sessions, server wins on completion data
      if (conflictFields.includes('isCompleted') || conflictFields.includes('completedAt')) {
        resolution = 'server_wins';
      } else {
        resolution = 'merge'; // Can merge other fields
      }
    } else if (entityType === 'ml_training_data') {
      // ML training data is append-only, no conflicts
      resolution = 'client_wins';
    } else {
      // Manual resolution needed for other types
      resolution = 'manual';
    }

    return {
      hasConflict,
      conflictFields,
      resolution,
    };
  }

  // Merge conflicting data based on strategy
  static mergeData(
    localData: any,
    serverData: any,
    strategy: 'server_wins' | 'client_wins' | 'merge'
  ): any {
    switch (strategy) {
      case 'server_wins':
        return { ...serverData };

      case 'client_wins':
        return { ...localData };

      case 'merge':
        // Intelligent merge: prefer client for user-generated data
        return {
          ...serverData, // Start with server data
          ...localData,  // Override with local changes
          updatedAt: Math.max(localData.updatedAt, serverData.updatedAt), // Use latest timestamp
        };

      default:
        return serverData;
    }
  }
}
