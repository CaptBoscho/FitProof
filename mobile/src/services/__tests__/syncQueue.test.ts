// Manual test utility for sync queue
// Run this from React Native to verify sync queue works

import { SyncQueueManager, ConflictDetector } from '../syncQueue';
import { syncService } from '../syncService';

export const testSyncQueue = async () => {
  console.log('🧪 Testing Sync Queue...');

  try {
    // Test 1: Add items to queue
    console.log('\n📝 Test 1: Add Items to Queue');
    const item1 = await SyncQueueManager.addToQueue(
      'workout_session',
      'session-123',
      'create',
      { totalReps: 10, validReps: 8 }
    );
    console.log('   Added item 1:', item1);

    const item2 = await SyncQueueManager.addToQueue(
      'ml_training_data',
      'session-456',
      'create',
      { frames: [{ frame: 1 }, { frame: 2 }] }
    );
    console.log('   Added item 2:', item2);

    // Test 2: Get pending items
    console.log('\n📋 Test 2: Get Pending Items');
    const pending = await SyncQueueManager.getPendingItems();
    console.log('   Pending items:', pending.length);
    pending.forEach(item => {
      console.log(`   - ${item.entityType}:${item.entityId} (retry: ${item.retryCount})`);
    });

    // Test 3: Queue statistics
    console.log('\n📊 Test 3: Queue Statistics');
    const stats = await SyncQueueManager.getQueueStats();
    console.log('   Total:', stats.total);
    console.log('   Pending:', stats.pending);
    console.log('   Retrying:', stats.retrying);
    console.log('   Failed:', stats.failed);

    // Test 4: Exponential backoff calculation
    console.log('\n⏱️  Test 4: Exponential Backoff');
    for (let i = 0; i < 6; i++) {
      const delay = SyncQueueManager.calculateRetryDelay(i);
      console.log(`   Retry ${i}: ${delay}ms (${(delay / 1000).toFixed(1)}s)`);
    }

    // Test 5: Update retry count
    console.log('\n🔄 Test 5: Update Retry Count');
    await SyncQueueManager.updateRetry(item1, 'Test error');
    const updated = await SyncQueueManager.getPendingItems();
    const item1Updated = updated.find(i => i.id === item1);
    console.log(`   Item ${item1} retry count: ${item1Updated?.retryCount}`);
    console.log(`   Item ${item1} error: ${item1Updated?.lastError}`);

    // Test 6: Conflict detection
    console.log('\n⚔️  Test 6: Conflict Detection');
    const localData = {
      id: '123',
      totalReps: 15,
      validReps: 12,
      updatedAt: Date.now() - 5000, // 5 seconds ago
    };
    const serverData = {
      id: '123',
      totalReps: 14,
      validReps: 11,
      updatedAt: Date.now(), // Now
    };
    const conflict = ConflictDetector.detectConflict(localData, serverData, 'workout_session');
    console.log('   Has conflict:', conflict.hasConflict);
    console.log('   Conflict fields:', conflict.conflictFields);
    console.log('   Resolution:', conflict.resolution);

    if (conflict.hasConflict) {
      const merged = ConflictDetector.mergeData(localData, serverData, conflict.resolution);
      console.log('   Merged data:', merged);
    }

    // Test 7: Retryable items
    console.log('\n🔁 Test 7: Retryable Items');
    const retryable = await SyncQueueManager.getRetryableItems();
    console.log('   Retryable items:', retryable.length);
    retryable.forEach(item => {
      const nextDelay = SyncQueueManager.calculateRetryDelay(item.retryCount);
      const nextRetryTime = new Date(item.updatedAt + nextDelay);
      console.log(`   - ${item.entityType}:${item.entityId} (next retry: ${nextRetryTime.toLocaleTimeString()})`);
    });

    // Test 8: Sync service status
    console.log('\n🔄 Test 8: Sync Service Status');
    const syncStatus = await syncService.getSyncStatus();
    console.log('   Online:', syncStatus.isOnline);
    console.log('   Syncing:', syncStatus.isSyncing);
    console.log('   Queue:', syncStatus.queueStats);

    // Test 9: Remove from queue
    console.log('\n🗑️  Test 9: Remove from Queue');
    await SyncQueueManager.removeFromQueue(item2);
    const afterRemove = await SyncQueueManager.getQueueStats();
    console.log('   Items after removal:', afterRemove.total);

    // Test 10: Has entity in queue
    console.log('\n🔍 Test 10: Check Entity in Queue');
    const hasSession = await SyncQueueManager.hasEntityInQueue('workout_session', 'session-123');
    const hasMissing = await SyncQueueManager.hasEntityInQueue('workout_session', 'missing-999');
    console.log('   Has session-123:', hasSession);
    console.log('   Has missing-999:', hasMissing);

    console.log('\n✅ All sync queue tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
};

// Test sync service
export const testSyncService = async () => {
  console.log('🧪 Testing Sync Service...');

  try {
    // Test 1: Manual sync
    console.log('\n🔄 Test 1: Manual Sync');
    await syncService.sync();
    console.log('   Sync completed');

    // Test 2: Event listener
    console.log('\n📡 Test 2: Event Listener');
    const unsubscribe = syncService.addEventListener(event => {
      console.log(`   Event: ${event.type}`, event.data || event.error || '');
    });

    // Test 3: Auto sync
    console.log('\n⏰ Test 3: Auto Sync (will run every 60s)');
    syncService.startAutoSync();
    console.log('   Auto-sync started');

    // Wait a bit to see events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Stop auto sync
    syncService.stopAutoSync();
    console.log('   Auto-sync stopped');

    // Cleanup
    unsubscribe();

    console.log('\n✅ All sync service tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
};

export default { testSyncQueue, testSyncService };
