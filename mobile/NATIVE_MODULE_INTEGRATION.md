# Native Module Data Integration

## Overview
This document outlines how to integrate the ML training data capture from native modules (iOS/Android) with the React Native storage system.

## Current Architecture

### Native Side (iOS/Android)
- **PoseDetector**: Captures ML training data every 10th frame
  - Stores: landmarks, angles, metrics, labels
  - Methods: `getMLFrameData()`, `clearMLFrameData()`
- **CameraViewController/CameraActivity**: Tracks session stats
  - Stores: validReps, invalidReps, formErrors, duration
  - Prints session summary to console on exit

### React Native Side
- **WorkoutSessionManager**: Manages session lifecycle and storage
  - Methods: `startSession()`, `addMLFrameData()`, `completeSession()`
- **Database**: SQLite storage with tables for sessions, reps, and ML data
  - Helpers: `createWorkoutSession()`, `bulkSaveMLTrainingData()`, etc.

## Integration Plan (Future Work)

### Option 1: Export Data on Session Complete (Recommended)
When the native camera view closes, export all collected data to React Native:

#### iOS Implementation
```swift
// In CameraViewController.swift
func getSessionData() -> [String: Any] {
    let mlFrames = poseDetector?.getMLFrameData() ?? []

    return [
        "sessionStats": [
            "totalReps": repCount,
            "validReps": validReps,
            "invalidReps": invalidReps,
            "formErrors": formErrors,
            "duration": durationSeconds
        ],
        "mlFrameData": mlFrames.map { frame in
            [
                "frameNumber": frame.frameNumber,
                "timestamp": frame.timestamp,
                "landmarks": frame.landmarks.map { ["name": $0.name, "x": $0.x, "y": $0.y, "z": $0.z, "visibility": $0.visibility] },
                "armAngle": frame.armAngle,
                "legAngle": frame.legAngle,
                // ... other fields
            ]
        }
    ]
}

// Add method to MediaPipePoseModule to retrieve this data
@objc func getLastSessionData(_ callback: RCTResponseSenderBlock) {
    // Return session data
}
```

#### Android Implementation
```kotlin
// In CameraActivity.kt
fun getSessionData(): WritableMap {
    val mlFrames = poseDetector.getMLFrameData()

    val sessionData = Arguments.createMap()
    // Similar structure to iOS
    return sessionData
}

// Add method to MediaPipePoseModule
@ReactMethod
fun getLastSessionData(promise: Promise) {
    // Return session data
}
```

#### React Native Integration
```typescript
// In MediaPipeDemoScreen.tsx or workout completion handler
import mediaPipePose from 'mediapipe-pose';
import { WorkoutSessionManager } from './services/workoutStorage';

const handleWorkoutComplete = async () => {
    // Get data from native module
    const sessionData = await mediaPipePose.getLastSessionData();

    // Create session manager
    const manager = new WorkoutSessionManager(userId, exerciseId, exerciseType);
    await manager.startSession();

    // Add all ML frame data
    for (const frameData of sessionData.mlFrameData) {
        manager.addMLFrameData(frameData);
    }

    // Complete session
    await manager.completeSession(
        sessionData.sessionStats.totalReps,
        sessionData.sessionStats.validReps,
        pointsPerRep
    );

    // Navigate to summary screen
    navigation.navigate('WorkoutSummary', {
        exerciseType,
        duration: sessionData.sessionStats.duration,
        totalReps: sessionData.sessionStats.totalReps,
        validReps: sessionData.sessionStats.validReps,
        invalidReps: sessionData.sessionStats.invalidReps,
        formErrors: sessionData.sessionStats.formErrors
    });
};
```

### Option 2: Real-time Event Streaming
Stream data from native to React Native in real-time using event emitters:

- Use `RCTEventEmitter` (iOS) / `DeviceEventEmitter` (Android)
- Emit events on every captured ML frame
- React Native listens and buffers data
- More complex but allows real-time UI updates

### Option 3: Direct Native Storage (Not Recommended)
Store data directly in native SQLite from iOS/Android:
- Pros: No data transfer overhead
- Cons: Harder to maintain, less flexible, duplicated storage logic

## Testing Integration

1. **Unit Test**: Mock native module responses
2. **Integration Test**: Run workout, verify data saved to SQLite
3. **Performance Test**: Measure data transfer time for ~100-300 frames
4. **Memory Test**: Ensure no memory leaks when transferring large datasets

## Timeline
- **Phase 1 (Day 35-37)**: Implement native module export methods
- **Phase 2 (Day 38)**: Integrate with WorkoutSessionManager
- **Phase 3 (Day 39-40)**: Test and optimize data transfer
