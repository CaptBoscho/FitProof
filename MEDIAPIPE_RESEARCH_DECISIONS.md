# MediaPipe Integration Research & Decisions

## Our Situation
- **Downloaded Model**: We have `pose_landmarker_lite.task` (5.5MB TensorFlow Lite model)
- **Project**: React Native + Expo for FitProof fitness app
- **Target**: Real-time pose detection for pushups, situps, squats
- **Performance Goal**: 60fps on mid-range devices


## Model File Location
- **Current**: `/Users/corbin/Repos2/FitProof/pose_landmarker_lite.task`
- **Target**: Move to mobile app assets folder during Day 15 setup
- **Usage**: Primary model for pose detection if package supports it

## Camera + Processing Architecture Analysis

### Architecture Decision: Native Camera Component vs React Native Camera + Bridge

Based on performance research, we need to choose between:

#### Option A: React Native Vision Camera + Native Frame Processor
**Architecture**: RN Camera → JSI Bridge → Native MediaPipe Processing
- **Performance**: ~1ms JSI overhead (68ms native vs 69ms with JSI)
- **Data Flow**: 700MB/sec at 60fps (12MB per 4K frame)
- **Pros**:
  - Familiar RN development model
  - Vision Camera ecosystem and community
  - JSI enables near-native performance
  - Easier UI integration (overlays, controls)
- **Cons**:
  - Still involves bridge crossing for every frame
  - Complex Frame Processor Plugin development
  - Platform-specific plugin implementations

#### Option B: Full Native Camera Component
**Architecture**: Native Camera + MediaPipe → Rendered Native View in RN
- **Performance**: Pure native performance (68ms processing)
- **Data Flow**: No bridge crossing for camera frames
- **Pros**:
  - Maximum performance (no bridge overhead)
  - Direct MediaPipe integration
  - Simpler data flow
  - Better memory management
- **Cons**:
  - More complex RN↔Native communication
  - Platform-specific camera implementations
  - Harder UI overlay integration
  - More native development required

### **RECOMMENDATION: Option B - Full Native Camera Component**

**Rationale for FitProof**:
1. **Performance Critical**: 60fps target with complex pose detection
2. **Data Intensive**: 33 landmarks × 60fps = 1,980 data points/sec
3. **Battery Optimization**: Native processing is more power efficient
4. **Exercise Validation**: Real-time form feedback requires minimal latency
5. **Model Control**: Direct access to our `pose_landmarker_lite.task` file

### Implementation Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Native  │    │   Native Bridge  │    │   Native Camera │
│                 │    │                  │    │   + MediaPipe   │
│ - UI Controls   │◄──►│ - Commands       │◄──►│ - Camera Feed   │
│ - Rep Counter   │    │ - Landmarks      │    │ - Pose Detection│
│ - Feedback      │    │ - Exercise State │    │ - Model Loading │
│ - Navigation    │    │ - Performance    │    │ - GPU Processing│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Native Component Responsibilities**:
- Camera initialization and permissions
- MediaPipe model loading (`pose_landmarker_lite.task`)
- Real-time frame processing (30-60fps)
- Pose landmark extraction (33 points)
- Basic pose classification

**React Native Responsibilities**:
- Exercise selection and session management
- Rep counting logic and validation
- Real-time UI feedback and overlays
- Navigation and workout flow
- Data persistence and sync

### Technical Implementation Plan

#### iOS Native Component
- **Language**: Swift with MediaPipe iOS SDK
- **Camera**: AVCaptureSession for camera access
- **Processing**: MediaPipe PoseLandmarker task
- **Bridge**: React Native bridge for landmark data
- **View**: UIView embedded in RN component

#### Android Native Component
- **Language**: Kotlin with MediaPipe Android SDK
- **Camera**: CameraX for camera access
- **Processing**: MediaPipe PoseLandmarker task
- **Bridge**: React Native bridge for landmark data
- **View**: View embedded in RN component

#### Bridge Interface
```typescript
interface MediaPipeBridge {
  startCamera(): Promise<void>
  stopCamera(): Promise<void>
  loadModel(modelPath: string): Promise<void>
  setExerciseMode(exercise: 'pushup' | 'situp' | 'squat'): void

  // Event listeners
  onLandmarksDetected: (landmarks: PoseLandmarks) => void
  onPoseClassified: (pose: PoseType, confidence: number) => void
  onError: (error: string) => void
}
```

---

**Decision Date**: September 23, 2025
**Architecture Decision**: Full Native Camera Component with MediaPipe
**Status**: Ready to begin Day 15 implementation with native approach