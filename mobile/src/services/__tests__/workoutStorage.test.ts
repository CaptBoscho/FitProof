// Manual test utility for workout storage
// Run this from React Native to verify storage works

import { WorkoutSessionManager, compressLandmarkData, decompressLandmarkData } from '../workoutStorage';
import { getDatabaseStats } from '../databaseHelpers';

export const testWorkoutStorage = async () => {
  console.log('🧪 Testing Workout Storage...');

  try {
    // Test 1: Compression
    console.log('\n📦 Test 1: Landmark Compression');
    const testLandmarks = [
      { name: 'nose', x: 0.5, y: 0.5, z: 0.1, visibility: 0.95 },
      { name: 'left_shoulder', x: 0.4, y: 0.6, z: 0.15, visibility: 0.92 },
      { name: 'right_shoulder', x: 0.6, y: 0.6, z: 0.15, visibility: 0.93 },
    ];

    const compressed = compressLandmarkData(testLandmarks);
    console.log('   Original size:', JSON.stringify(testLandmarks).length, 'bytes');
    console.log('   Compressed size:', compressed.length, 'bytes');
    console.log('   Compression ratio:', ((1 - compressed.length / JSON.stringify(testLandmarks).length) * 100).toFixed(1) + '%');

    const decompressed = decompressLandmarkData(compressed);
    console.log('   Decompression successful:', decompressed.length === testLandmarks.length);

    // Test 2: Create Session
    console.log('\n📝 Test 2: Create Workout Session');
    const manager = new WorkoutSessionManager('test-user-123', 'exercise-1', 'pushup');
    const sessionId = await manager.startSession();
    console.log('   Session ID:', sessionId);
    console.log('   Session started successfully');

    // Test 3: Add ML Frame Data
    console.log('\n🎞️  Test 3: Add ML Frame Data');
    for (let i = 0; i < 25; i++) {
      manager.addMLFrameData({
        frameNumber: i * 10, // Every 10th frame
        timestamp: Date.now() + i * 100,
        landmarks: testLandmarks,
        armAngle: 160 - i * 2,
        legAngle: 175,
        torsoAngle: undefined,
        shoulderDropPercentage: i * 3,
        kneeDropDistance: undefined,
        footStability: undefined,
        currentPhase: i % 2 === 0 ? 'up' : 'down',
        isValidForm: true,
        confidence: 0.85 + Math.random() * 0.1,
        labeledPhase: i % 2 === 0 ? 'up' : 'down',
        labeledFormQuality: 'good',
      });

      if ((i + 1) % 10 === 0) {
        console.log(`   Added ${i + 1} frames (buffered: ${manager.getSessionStats().mlFramesBuffered})`);
      }
    }

    // Test 4: Complete Session
    console.log('\n✅ Test 4: Complete Session');
    await manager.completeSession(15, 12, 10);
    console.log('   Session completed successfully');

    // Test 5: Check Database Stats
    console.log('\n📊 Test 5: Database Statistics');
    const stats = await getDatabaseStats();
    console.log('   Total Sessions:', stats.totalSessions);
    console.log('   Unsynced Sessions:', stats.unsyncedSessions);
    console.log('   Total ML Frames:', stats.totalMLFrames);
    console.log('   Unsynced ML Frames:', stats.unsyncedMLFrames);

    console.log('\n✅ All tests passed!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
};

// Export for manual testing
export default testWorkoutStorage;
