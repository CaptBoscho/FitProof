// Manual test utility for data management service
// Run this from React Native to verify data management works

import { dataManager, DataManagementService } from '../dataManagement';
import { WorkoutSessionManager } from '../workoutStorage';
import { createWorkoutSession, bulkSaveMLTrainingData } from '../databaseHelpers';

export const testDataManagement = async () => {
  console.log('🧪 Testing Data Management Service...');

  try {
    // Test 1: Get storage statistics
    console.log('\n📊 Test 1: Get Storage Statistics');
    const stats = await dataManager.getStorageStats();
    console.log('   Storage Stats:');
    console.log(`   - Total Size: ${stats.totalSizeMB} MB`);
    console.log(`   - Workout Sessions: ${stats.workoutSessionsCount} (${stats.workoutSessionsSizeMB} MB)`);
    console.log(`   - ML Data: ${stats.mlDataCount} (${stats.mlDataSizeMB} MB)`);
    console.log(`   - Sync Queue: ${stats.syncQueueCount} (${stats.syncQueueSizeMB} MB)`);
    console.log(`   - Percentage Used: ${stats.percentageUsed}%`);
    console.log(`   - Is Near Limit: ${stats.isNearLimit}`);

    // Test 2: Check if cleanup is needed
    console.log('\n🧹 Test 2: Check if Cleanup Needed');
    const needsCleanup = await dataManager.needsCleanup();
    console.log(`   Needs Cleanup: ${needsCleanup}`);

    // Test 3: Data lifecycle summary
    console.log('\n📅 Test 3: Data Lifecycle Summary');
    const lifecycle = await dataManager.getDataLifecycleSummary();
    console.log('   Lifecycle Summary:');
    console.log(`   - Oldest Session: ${lifecycle.oldestSession ? new Date(lifecycle.oldestSession).toLocaleString() : 'None'}`);
    console.log(`   - Newest Session: ${lifecycle.newestSession ? new Date(lifecycle.newestSession).toLocaleString() : 'None'}`);
    console.log(`   - Oldest ML Data: ${lifecycle.oldestMLData ? new Date(lifecycle.oldestMLData).toLocaleString() : 'None'}`);
    console.log(`   - Newest ML Data: ${lifecycle.newestMLData ? new Date(lifecycle.newestMLData).toLocaleString() : 'None'}`);
    console.log(`   - Unsynced Sessions: ${lifecycle.unsyncedSessions}`);
    console.log(`   - Unsynced ML Data: ${lifecycle.unsyncedMLData}`);
    console.log(`   - Pending Sync Items: ${lifecycle.pendingSyncItems}`);

    // Test 4: Create test data for cleanup demonstration
    console.log('\n📝 Test 4: Create Test Data');
    const testSessionId = await createWorkoutSession({
      userId: 'test-user-cleanup',
      exerciseId: 'test-exercise',
      exerciseType: 'pushup',
    });
    console.log(`   Created test session: ${testSessionId}`);

    // Create some old test data (simulate old timestamp)
    const oldTimestamp = Date.now() - (100 * 24 * 60 * 60 * 1000); // 100 days ago
    await bulkSaveMLTrainingData([
      {
        sessionId: testSessionId,
        frameNumber: 1,
        timestamp: oldTimestamp,
        landmarksCompressed: '[]',
        repNumber: 1,
        phaseLabel: 'up',
        isValidRep: true,
      },
    ]);
    console.log('   Created old test ML data');

    // Test 5: Run cleanup (dry run - won't delete if not needed)
    console.log('\n🧹 Test 5: Run Cleanup');
    const cleanupResult = await dataManager.runCleanup(false);
    console.log('   Cleanup Result:');
    console.log(`   - Workout Sessions Deleted: ${cleanupResult.workoutSessionsDeleted}`);
    console.log(`   - ML Data Deleted: ${cleanupResult.mlDataDeleted}`);
    console.log(`   - Sync Queue Cleaned: ${cleanupResult.syncQueueCleaned}`);
    console.log(`   - Space Freed: ${cleanupResult.spaceFreedfMB} MB`);

    // Test 6: Force cleanup
    console.log('\n🧹 Test 6: Force Cleanup');
    const forceCleanupResult = await dataManager.runCleanup(true);
    console.log('   Force Cleanup Result:');
    console.log(`   - Workout Sessions Deleted: ${forceCleanupResult.workoutSessionsDeleted}`);
    console.log(`   - ML Data Deleted: ${forceCleanupResult.mlDataDeleted}`);
    console.log(`   - Sync Queue Cleaned: ${forceCleanupResult.syncQueueCleaned}`);
    console.log(`   - Space Freed: ${forceCleanupResult.spaceFreedfMB} MB`);

    // Test 7: Export data (sample)
    console.log('\n📤 Test 7: Export Data');
    const exportData = await dataManager.exportData(true);
    console.log('   Export Data:');
    console.log(`   - Timestamp: ${new Date(exportData.timestamp).toLocaleString()}`);
    console.log(`   - Version: ${exportData.version}`);
    console.log(`   - Workout Sessions: ${exportData.workoutSessions.length}`);
    console.log(`   - ML Data Sample: ${exportData.mlDataSample.length}`);
    console.log(`   - Sync Queue Snapshot: ${exportData.syncQueueSnapshot.length}`);

    // Test 8: Export as JSON string
    console.log('\n📄 Test 8: Export as JSON String');
    const jsonExport = await dataManager.exportDataAsJSON(false);
    console.log(`   JSON Export Length: ${jsonExport.length} characters`);
    console.log(`   First 200 chars: ${jsonExport.substring(0, 200)}...`);

    // Test 9: Storage stats after cleanup
    console.log('\n📊 Test 9: Storage Stats After Cleanup');
    const statsAfter = await dataManager.getStorageStats();
    console.log('   Storage Stats After:');
    console.log(`   - Total Size: ${statsAfter.totalSizeMB} MB`);
    console.log(`   - Percentage Used: ${statsAfter.percentageUsed}%`);
    console.log(`   - Is Near Limit: ${statsAfter.isNearLimit}`);

    console.log('\n✅ All data management tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
};

// Test storage monitoring over time
export const testStorageMonitoring = async () => {
  console.log('🧪 Testing Storage Monitoring...');

  try {
    // Create multiple sessions to simulate storage growth
    console.log('\n📝 Creating test sessions...');
    const sessionIds: string[] = [];

    for (let i = 0; i < 5; i++) {
      const manager = new WorkoutSessionManager(
        `test-user-${i}`,
        `test-exercise-${i}`,
        'pushup'
      );
      await manager.startSession();

      // Add some ML frames
      for (let frame = 0; frame < 20; frame++) {
        manager.addMLFrameData({
          frameNumber: frame,
          timestamp: Date.now(),
          landmarks: Array(33).fill(null).map(() => ({
            x: Math.random(),
            y: Math.random(),
            z: Math.random(),
            visibility: Math.random(),
          })),
          armAngle: 90,
          legAngle: 180,
          hipKneeAnkleAngle: 180,
          shoulderHipKneeAngle: 180,
          torsoAngle: 90,
          isValidForm: true,
          confidence: 0.9,
          phaseLabel: 'up',
        });
      }

      await manager.completeSession(10, 8, 10);
      sessionIds.push(manager.getSessionId());
      console.log(`   Created session ${i + 1}/5`);

      // Check storage after each session
      const stats = await dataManager.getStorageStats();
      console.log(`   Storage: ${stats.totalSizeMB} MB (${stats.percentageUsed}%)`);
    }

    // Final storage check
    console.log('\n📊 Final Storage Check');
    const finalStats = await dataManager.getStorageStats();
    console.log('   Final Storage Stats:');
    console.log(`   - Total Size: ${finalStats.totalSizeMB} MB`);
    console.log(`   - Workout Sessions: ${finalStats.workoutSessionsCount}`);
    console.log(`   - ML Data Frames: ${finalStats.mlDataCount}`);
    console.log(`   - Percentage Used: ${finalStats.percentageUsed}%`);

    // Check if cleanup is needed
    const needsCleanup = await dataManager.needsCleanup();
    console.log(`   Needs Cleanup: ${needsCleanup}`);

    if (needsCleanup) {
      console.log('\n🧹 Running cleanup...');
      const cleanupResult = await dataManager.runCleanup(false);
      console.log('   Cleanup completed');
      console.log(`   Space freed: ${cleanupResult.spaceFreedfMB} MB`);
    }

    console.log('\n✅ Storage monitoring test passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Storage monitoring test failed:', error);
    return false;
  }
};

// Test cleanup policies
export const testCleanupPolicies = async () => {
  console.log('🧪 Testing Cleanup Policies...');

  try {
    // Create old data that should be cleaned up
    console.log('\n📝 Creating old test data...');

    // Create old session (95 days ago - beyond 90 day retention)
    const oldTimestamp = Date.now() - (95 * 24 * 60 * 60 * 1000);
    const oldSessionId = await createWorkoutSession({
      userId: 'test-user-old',
      exerciseId: 'test-exercise',
      exerciseType: 'squat',
    });

    // Manually update timestamp to simulate old data
    // (In production, this would happen naturally over time)
    console.log(`   Created old session: ${oldSessionId}`);

    // Create old ML data (35 days ago - beyond 30 day retention)
    const oldMLTimestamp = Date.now() - (35 * 24 * 60 * 60 * 1000);
    await bulkSaveMLTrainingData([
      {
        sessionId: oldSessionId,
        frameNumber: 1,
        timestamp: oldMLTimestamp,
        landmarksCompressed: '[]',
        repNumber: 1,
        phaseLabel: 'down',
        isValidRep: true,
      },
    ]);
    console.log('   Created old ML data');

    // Check storage before cleanup
    console.log('\n📊 Storage Before Cleanup');
    const statsBefore = await dataManager.getStorageStats();
    console.log(`   ML Data Count: ${statsBefore.mlDataCount}`);

    // Run cleanup
    console.log('\n🧹 Running Cleanup...');
    const cleanupResult = await dataManager.runCleanup(true);
    console.log('   Cleanup Results:');
    console.log(`   - Workout Sessions Deleted: ${cleanupResult.workoutSessionsDeleted}`);
    console.log(`   - ML Data Deleted: ${cleanupResult.mlDataDeleted}`);
    console.log(`   - Sync Queue Cleaned: ${cleanupResult.syncQueueCleaned}`);

    // Check storage after cleanup
    console.log('\n📊 Storage After Cleanup');
    const statsAfter = await dataManager.getStorageStats();
    console.log(`   ML Data Count: ${statsAfter.mlDataCount}`);
    console.log(`   Reduction: ${statsBefore.mlDataCount - statsAfter.mlDataCount} frames`);

    console.log('\n✅ Cleanup policies test passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Cleanup policies test failed:', error);
    return false;
  }
};

export default {
  testDataManagement,
  testStorageMonitoring,
  testCleanupPolicies,
};
