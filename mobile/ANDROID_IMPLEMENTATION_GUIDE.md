# Android MediaPipe Pose Detection Implementation Guide

This document outlines the complete implementation of MediaPipe pose detection with exercise-specific analysis on Android. Follow these steps to replicate the same functionality on iOS.

## Overview

We implemented a native Android camera activity that:
- Uses MediaPipe for real-time pose detection
- Draws exercise-specific landmarks as red dots
- Automatically detects exercise phases and counts reps
- Switches orientation based on exercise type
- Provides a fullscreen immersive camera experience

## 1. Navigation to Native Activity

### Problem Solved
Instead of hosting MediaPipe camera view within React Native screens, we navigate directly to a native Android activity for better performance and camera handling.

### Implementation

**Modified MediaPipePoseModule.kt:**
```kotlin
@ReactMethod
fun openNativeCameraActivity(promise: Promise) {
    try {
        val intent = android.content.Intent(reactContext, CameraActivity::class.java)
        intent.putExtra("EXERCISE_TYPE", currentExerciseMode)
        reactContext.currentActivity?.startActivity(intent)
        promise.resolve(null)
    } catch (e: Exception) {
        promise.reject("ACTIVITY_ERROR", "Failed to open native camera activity: ${e.message}", e)
    }
}
```

**Updated ExercisesScreen.tsx:**
```typescript
const handleExerciseSelect = async (exercise: Exercise) => {
    try {
        const exerciseType = exercise.name.toLowerCase() as 'pushup' | 'squat' | 'situp';
        mediaPipePose.setExerciseMode(exerciseType);
        await mediaPipePose.openNativeCameraActivity();
    } catch (error) {
        Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
};
```

**Removed CameraPreviewViewManager from package:**
```kotlin
override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList() // No longer need React Native view managers
}
```

## 2. Landmark Overlay Implementation

### Problem Solved
MediaPipe landmarks needed to be visualized as red dots overlaid on the camera preview, with proper coordinate transformation for both portrait and landscape orientations.

### Implementation

**Created PoseLandmarkOverlay.kt:**
```kotlin
class PoseLandmarkOverlay @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var results: PoseLandmarkerResult? = null
    private var pointPaint = Paint()
    private var exerciseType: String = "pushup"

    companion object {
        private const val LANDMARK_STROKE_WIDTH = 12f
        private const val LANDMARK_RADIUS = 8f
    }

    init {
        initPaints()
    }

    private fun initPaints() {
        pointPaint.apply {
            color = Color.RED
            strokeWidth = LANDMARK_STROKE_WIDTH
            style = Paint.Style.FILL
            isAntiAlias = true
        }
    }

    override fun draw(canvas: Canvas) {
        super.draw(canvas)

        results?.let { poseLandmarkerResult ->
            val relevantLandmarks = getRelevantLandmarks(exerciseType)

            for (landmark in poseLandmarkerResult.landmarks()) {
                for ((index, normalizedLandmark) in landmark.withIndex()) {
                    if (relevantLandmarks.contains(index) &&
                        normalizedLandmark.visibility().isPresent &&
                        normalizedLandmark.visibility().get() > 0.5f) {

                        // Handle different orientations
                        val isLandscape = width > height
                        val normalizedX: Float
                        val normalizedY: Float

                        if (isLandscape) {
                            // Direct mapping with mirroring for front camera
                            normalizedX = 1.0f - normalizedLandmark.x()
                            normalizedY = normalizedLandmark.y()
                        } else {
                            // 90-degree rotation + mirroring
                            normalizedX = 1.0f - normalizedLandmark.y()
                            normalizedY = 1.0f - normalizedLandmark.x()
                        }

                        val x = normalizedX * width
                        val y = normalizedY * height

                        canvas.drawCircle(x, y, LANDMARK_RADIUS, pointPaint)
                    }
                }
            }
        }
    }

    private fun getRelevantLandmarks(exerciseType: String): Set<Int> {
        return when (exerciseType) {
            "pushup" -> setOf(7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32)
            "squat" -> setOf(11, 12, 23, 24, 25, 26, 27, 28, 31, 32)
            "situp" -> setOf(7, 8, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30)
            else -> setOf()
        }
    }
}
```

### Key Coordinate Transformation Logic

**Landscape Mode (Pushups/Situps):**
- Direct mapping with front camera mirroring
- `normalizedX = 1.0f - landmark.x()` (mirror horizontally)
- `normalizedY = landmark.y()` (direct mapping)

**Portrait Mode (Squats):**
- 90-degree rotation required due to camera orientation
- `normalizedX = 1.0f - landmark.y()` (swap and mirror)
- `normalizedY = 1.0f - landmark.x()` (swap and mirror)

## 3. Orientation-Based Exercise Modes

### Problem Solved
Different exercises require different orientations for optimal pose detection:
- Pushups/Situps: Landscape (side view of body)
- Squats: Portrait (front view of body)

### Implementation

**Updated AndroidManifest.xml:**
```xml
<activity
    android:name=".CameraActivity"
    android:screenOrientation="unspecified"
    android:theme="@style/Theme.AppCompat.NoActionBar"
    android:exported="false" />
```

**CameraActivity.kt orientation logic:**
```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // Get exercise type from intent
    exerciseType = intent.getStringExtra("EXERCISE_TYPE") ?: "pushup"

    // Set orientation based on exercise type
    requestedOrientation = when (exerciseType) {
        "pushup", "situp" -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        "squat" -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        else -> ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }
}
```

## 4. Exercise-Specific Landmark Tracking

### Problem Solved
Instead of tracking all 33 MediaPipe landmarks, we focus only on the relevant body parts for each exercise type, improving performance and reducing visual noise.

### Landmark Definitions (from trackedLandmarks.ts)

**Pushup Landmarks (18 points):**
- Ears (7, 8) - Head tracking
- Shoulders (11, 12) - Upper body alignment
- Elbows (13, 14) - Arm bend detection
- Wrists (15, 16) - Hand position
- Hips (23, 24) - Body alignment
- Knees (25, 26) - Leg tracking
- Ankles (27, 28) - Foot position
- Heels (29, 30) - Foot tracking
- Foot indices (31, 32) - Toe position

**Squat Landmarks (10 points):**
- Shoulders (11, 12) - Upper body
- Hips (23, 24) - Hip level tracking
- Knees (25, 26) - Knee bend detection
- Ankles (27, 28) - Foot position
- Foot indices (31, 32) - Toe position

**Situp Landmarks (12 points):**
- Ears (7, 8) - Head tracking
- Shoulders (11, 12) - Torso tracking
- Hips (23, 24) - Hip position
- Knees (25, 26) - Leg position
- Ankles (27, 28) - Foot position
- Heels (29, 30) - Foot tracking

## 5. Real-Time Pose Detection and Rep Counting

### Problem Solved
Automatically detect exercise phases ("up", "down", "mid") and count repetitions in real-time using biomechanical analysis.

### Implementation

**Created PoseDetector.kt:**
```kotlin
data class PoseState(
    val exerciseType: String,
    val currentPhase: String, // "up", "down", "mid"
    val confidence: Float,
    val repCount: Int = 0
)

class PoseDetector(private val exerciseType: String) {

    companion object {
        // Thresholds for pose detection
        private const val MIN_CONFIDENCE = 0.7f
        private const val PUSHUP_ANGLE_THRESHOLD_DOWN = 90f  // Degrees
        private const val PUSHUP_ANGLE_THRESHOLD_UP = 160f   // Degrees
        private const val SQUAT_HIP_KNEE_RATIO_DOWN = 0.95f // Hip below knee
        private const val SQUAT_HIP_KNEE_RATIO_UP = 1.1f    // Hip above knee
    }

    private var lastPhase = "up"
    private var repCount = 0
    private var isTransitioning = false

    fun detectPose(landmarks: List<NormalizedLandmark>): PoseState {
        return when (exerciseType) {
            "pushup" -> detectPushupPose(landmarks)
            "squat" -> detectSquatPose(landmarks)
            "situp" -> detectSitupPose(landmarks)
            else -> PoseState(exerciseType, "unknown", 0f, repCount)
        }
    }

    private fun detectPushupPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Calculate average arm angle (shoulder-elbow-wrist)
        val leftArmAngle = calculateAngle(
            landmarks[11], landmarks[13], landmarks[15] // shoulder-elbow-wrist
        )
        val rightArmAngle = calculateAngle(
            landmarks[12], landmarks[14], landmarks[16]
        )
        val avgArmAngle = (leftArmAngle + rightArmAngle) / 2

        val currentPhase = when {
            avgArmAngle < PUSHUP_ANGLE_THRESHOLD_DOWN -> "down"
            avgArmAngle > PUSHUP_ANGLE_THRESHOLD_UP -> "up"
            else -> "mid"
        }

        updateRepCount(currentPhase)
        return PoseState(exerciseType, currentPhase, calculateConfidence(landmarks), repCount)
    }

    private fun detectSquatPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Calculate hip-knee height relationship
        val avgHipY = (landmarks[23].y() + landmarks[24].y()) / 2
        val avgKneeY = (landmarks[25].y() + landmarks[26].y()) / 2
        val hipKneeRatio = avgHipY / avgKneeY

        val currentPhase = when {
            hipKneeRatio > SQUAT_HIP_KNEE_RATIO_DOWN -> "down"
            hipKneeRatio < SQUAT_HIP_KNEE_RATIO_UP -> "up"
            else -> "mid"
        }

        updateRepCount(currentPhase)
        return PoseState(exerciseType, currentPhase, calculateConfidence(landmarks), repCount)
    }

    private fun detectSitupPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Calculate torso angle (ear-shoulder-hip)
        val avgEarY = (landmarks[7].y() + landmarks[8].y()) / 2
        val avgShoulderY = (landmarks[11].y() + landmarks[12].y()) / 2
        val avgHipY = (landmarks[23].y() + landmarks[24].y()) / 2

        val earShoulderDiff = avgEarY - avgShoulderY
        val shoulderHipDiff = avgShoulderY - avgHipY
        val torsoAngle = atan2(earShoulderDiff, shoulderHipDiff) * 180 / PI

        val currentPhase = when {
            torsoAngle > 45 -> "up"
            torsoAngle < 15 -> "down"
            else -> "mid"
        }

        updateRepCount(currentPhase)
        return PoseState(exerciseType, currentPhase, calculateConfidence(landmarks), repCount)
    }

    private fun calculateAngle(point1: NormalizedLandmark, point2: NormalizedLandmark, point3: NormalizedLandmark): Float {
        // Calculate angle at point2 between vectors (point2->point1) and (point2->point3)
        val a = sqrt((point2.x() - point3.x()).pow(2) + (point2.y() - point3.y()).pow(2))
        val b = sqrt((point1.x() - point3.x()).pow(2) + (point1.y() - point3.y()).pow(2))
        val c = sqrt((point1.x() - point2.x()).pow(2) + (point1.y() - point2.y()).pow(2))

        val angle = acos((a.pow(2) + c.pow(2) - b.pow(2)) / (2 * a * c)) * 180 / PI
        return angle.toFloat()
    }

    private fun updateRepCount(currentPhase: String) {
        // Count a rep when transitioning from "down" to "up"
        if (lastPhase == "down" && currentPhase == "up" && !isTransitioning) {
            repCount++
            isTransitioning = true
        } else if (currentPhase == "down") {
            isTransitioning = false
        }
        lastPhase = currentPhase
    }
}
```

## 6. UI Overlays and Camera Setup

### Camera Configuration
```kotlin
// Maximum zoom out for widest field of view
camera?.let { cam ->
    val cameraControl = cam.cameraControl
    val cameraInfo = cam.cameraInfo
    val minZoomRatio = cameraInfo.zoomState.value?.minZoomRatio ?: 0.1f
    cameraControl.setZoomRatio(minZoomRatio)
}
```

### UI Overlays
```kotlin
// Back button (top-left)
backButton = ImageButton(this).apply {
    setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
    background = null
    setColorFilter(Color.WHITE)
    setOnClickListener { finish() }
}

// Rep counter (top-right)
repCountText = TextView(this).apply {
    text = "Reps: $repCount"
    textSize = 24f
    setTextColor(Color.WHITE)
    setBackgroundColor(Color.parseColor("#80000000"))
}
```

### Fullscreen Configuration
```kotlin
// Make activity fullscreen
window.decorView.systemUiVisibility = (
    android.view.View.SYSTEM_UI_FLAG_FULLSCREEN or
    android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
    android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
)
```

## 7. Integration with MediaPipe

### MediaPipe Processing Loop
```kotlin
private fun handlePoseResult(result: PoseLandmarkerResult) {
    val landmarks = result.landmarks()
    if (landmarks.isNotEmpty()) {
        val firstPose = landmarks[0]

        // Analyze pose for exercise-specific detection
        val poseState = poseDetector.detectPose(firstPose)

        // Update rep count if it changed
        if (poseState.repCount != repCount) {
            updateRepCount(poseState.repCount)
        }

        // Update overlay with landmarks
        runOnUiThread {
            overlayView.setResults(result, currentImageHeight, currentImageWidth, exerciseType)
        }
    }
}
```

## Implementation Summary for iOS

To replicate this on iOS, you'll need to:

1. **Create a native iOS ViewController** instead of hosting MediaPipe in React Native
2. **Implement the same coordinate transformation logic** for landscape/portrait orientations
3. **Port the PoseDetector logic** to Swift with the same angle calculations and thresholds
4. **Create a Custom UIView overlay** for drawing red landmark dots
5. **Set up orientation constraints** based on exercise type
6. **Implement the same UI elements** (back button, rep counter)
7. **Configure MediaPipe for iOS** with the same model and processing pipeline

The core algorithms and thresholds should remain identical between platforms for consistent behavior.

## Key Files Created/Modified

### Android Files:
- `CameraActivity.kt` - Main native camera activity
- `PoseLandmarkOverlay.kt` - Custom view for drawing landmarks
- `PoseDetector.kt` - Exercise-specific pose analysis
- `MediaPipePoseModule.kt` - Bridge to native activity
- `MediaPipePosePackage.kt` - Removed view managers
- `AndroidManifest.xml` - Added activity configuration

### React Native Files:
- `ExercisesScreen.tsx` - Modified to use native activity
- `mediapipe-pose/index.ts` - Added openNativeCameraActivity method

This architecture provides optimal performance for real-time pose detection while maintaining clean separation between platform-specific implementations.