package com.fitproof.mediapipe

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import kotlin.math.*

data class PoseState(
    val exerciseType: String,
    val currentPhase: String, // "up", "down", "mid"
    val confidence: Float,
    val repCount: Int = 0,
    val isValidRep: Boolean = true,
    val validationMessage: String? = null
)

data class LandmarkData(
    val x: Float,
    val y: Float,
    val visibility: Float
)

data class FrameData(
    val landmarks: List<LandmarkData>,
    val timestamp: Long
)

data class AngleData(
    var initial: Float = 0f,
    var min: Float = Float.MAX_VALUE,
    var max: Float = Float.MIN_VALUE,
    var final: Float = 0f
)

data class LandmarkStats(
    var minY: Float = Float.MAX_VALUE,
    var maxY: Float = Float.MIN_VALUE
)

class PoseDetector(private val exerciseType: String) {

    companion object {
        // Landmark indices based on trackedLandmarks.ts
        object LandmarkIndices {
            // Pushup landmarks
            const val LEFT_EAR = 7
            const val RIGHT_EAR = 8
            const val LEFT_SHOULDER = 11
            const val RIGHT_SHOULDER = 12
            const val LEFT_ELBOW = 13
            const val RIGHT_ELBOW = 14
            const val LEFT_WRIST = 15
            const val RIGHT_WRIST = 16
            const val LEFT_HIP = 23
            const val RIGHT_HIP = 24
            const val LEFT_KNEE = 25
            const val RIGHT_KNEE = 26
            const val LEFT_ANKLE = 27
            const val RIGHT_ANKLE = 28
            const val LEFT_HEEL = 29
            const val RIGHT_HEEL = 30
            const val LEFT_FOOT_INDEX = 31
            const val RIGHT_FOOT_INDEX = 32
        }

        // Thresholds for pose detection
        private const val MIN_CONFIDENCE = 0.7f

        // Pushup phase detection thresholds (angle-based)
        private const val PUSHUP_ARM_ANGLE_UP = 160f         // Arms straight (up position)
        private const val PUSHUP_ARM_ANGLE_DOWN = 105f       // Arms bent (down position) - PRIMARY METHOD
        private const val PUSHUP_LEG_STRAIGHT_MIN = 120f     // Minimum leg straightness for proper form (invalidates if less)
        private const val PUSHUP_LEG_KNEE_DOWN_MAX = 100f    // Maximum leg angle when knees are down
        private const val PUSHUP_SHOULDER_DROP_PERCENT = 40f // Minimum shoulder drop % for down position (backup method)

        // Pushup validation thresholds (from TypeScript model)
        private const val LEG_ANGLE_MIN_THRESHOLD = 120f    // Minimum leg straightness
        private const val ARM_STRAIGHT_THRESHOLD = 150f     // Start/end arm straightness
        private const val ARM_BEND_THRESHOLD = 110f         // Maximum arm bend depth

        // Squat validation thresholds (from TypeScript model)
        private const val SQUAT_LEG_STRAIGHT_THRESHOLD = 150f  // End position leg straightness
        private const val SQUAT_LEG_BEND_THRESHOLD = 105f      // Bottom position leg bend
        private const val FOOT_STABILITY_THRESHOLD = 0.05f     // Maximum foot movement

        // Squat phase detection thresholds (angle-based)
        private const val SQUAT_ANGLE_UP = 160f      // Standing position (leg nearly straight)
        private const val SQUAT_ANGLE_DOWN = 110f    // Squat bottom position (leg bent)
    }

    private var lastPhase = "up"
    private var repCount = 0
    private var isTransitioning = false
    private var currentLandmarks: List<NormalizedLandmark>? = null

    // Frame tracking for pushup validation (COMMENTED OUT - using state machine instead)
    // private val frameBuffer = mutableListOf<FrameData>()
    // private var isRecordingRep = false
    // private var repStartTime = 0L
    // private var hadLegAngleViolation = false  // Track if legs bent too much during rep

    // State machine for rep counting (simpler approach)
    private var recordedUp = false      // Have we seen a valid up position?
    private var recordedDown = false    // Have we seen a valid down position after up?

    // Shoulder drop tracking for pushup down position (alternative method)
    private var shoulderYAtUp: Float? = null         // Shoulder Y position when arms are straight (up)
    private var wristYAtUp: Float? = null            // Wrist Y position when arms are straight (up)

    fun detectPose(landmarks: List<NormalizedLandmark>): PoseState {
        if (landmarks.size < 33) {
            return PoseState(exerciseType, "unknown", 0f, repCount)
        }

        // Store current landmarks for visibility checking
        this.currentLandmarks = landmarks

        return when (exerciseType) {
            "pushup" -> detectPushupPose(landmarks)
            "squat" -> detectSquatPose(landmarks)
            "situp" -> detectSitupPose(landmarks)
            else -> PoseState(exerciseType, "unknown", 0f, repCount)
        }
    }

    private fun detectPushupPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Check if all required landmarks are visible FIRST
        if (!areRequiredLandmarksVisible()) {
            println("Debug_Pushup: Required landmarks not visible - cannot detect pose")
            return PoseState(
                exerciseType = exerciseType,
                currentPhase = "unknown",
                confidence = 0f,
                repCount = repCount,
                isValidRep = false,
                validationMessage = "Required landmarks not visible"
            )
        }

        // Convert landmarks to our format for tracking
        val currentFrame = FrameData(
            landmarks = landmarks.map { LandmarkData(it.x(), it.y(), it.visibility().orElse(0f)) },
            timestamp = System.currentTimeMillis()
        )

        // Get key landmarks for pushup analysis
        val leftShoulder = landmarks[LandmarkIndices.LEFT_SHOULDER]
        val rightShoulder = landmarks[LandmarkIndices.RIGHT_SHOULDER]
        val leftElbow = landmarks[LandmarkIndices.LEFT_ELBOW]
        val rightElbow = landmarks[LandmarkIndices.RIGHT_ELBOW]
        val leftWrist = landmarks[LandmarkIndices.LEFT_WRIST]
        val rightWrist = landmarks[LandmarkIndices.RIGHT_WRIST]
        val leftHip = landmarks[LandmarkIndices.LEFT_HIP]
        val rightHip = landmarks[LandmarkIndices.RIGHT_HIP]
        val leftKnee = landmarks[LandmarkIndices.LEFT_KNEE]
        val rightKnee = landmarks[LandmarkIndices.RIGHT_KNEE]
        val leftAnkle = landmarks[LandmarkIndices.LEFT_ANKLE]
        val rightAnkle = landmarks[LandmarkIndices.RIGHT_ANKLE]

        // Choose the better side for analysis (supports side view)
        val betterSideIndices = chooseBetterPushupSide()
        val usingLeftSide = betterSideIndices.contains(11) // contains left shoulder

        // Calculate arm angle (shoulder-elbow-wrist)
        val armAngle = if (usingLeftSide) {
            calculateAngle(leftShoulder, leftElbow, leftWrist)
        } else {
            calculateAngle(rightShoulder, rightElbow, rightWrist)
        }

        // Calculate leg angle (hip-knee-ankle) to ensure legs stay straight
        val legAngle = if (usingLeftSide) {
            calculateAngle(leftHip, leftKnee, leftAnkle)
        } else {
            calculateAngle(rightHip, rightKnee, rightAnkle)
        }

        // Check if knees are touching the ground using LEG ANGLE (primary method)
        // When knees are down: leg angle is very small (~80-100°)
        // When knees are up: leg angle is larger (~140-180°)
        val kneesDownByAngle = legAngle < PUSHUP_LEG_KNEE_DOWN_MAX

        // ALTERNATIVE: Ground line Y-coordinate check (currently disabled, but kept for future use)
        // In camera coordinates: Y=0 is TOP, Y=1 is BOTTOM
        // When knees are UP (proper form): knee Y > ground line (knee further from camera)
        // When knees are DOWN: knee Y < ground line (knee closer to camera/ground)
        val kneeY = if (usingLeftSide) leftKnee.y() else rightKnee.y()
        val wristY = if (usingLeftSide) leftWrist.y() else rightWrist.y()
        val ankleY = if (usingLeftSide) leftAnkle.y() else rightAnkle.y()
        val groundLineY = maxOf(wristY, ankleY)
        val kneesDownByYCoord = kneeY < groundLineY  // INVERTED: smaller Y = closer to ground

        // Use leg angle as primary detection method
        val kneesDown = kneesDownByAngle

        // Track shoulder Y position when in up position (for alternative down detection)
        val shoulderY = if (usingLeftSide) leftShoulder.y() else rightShoulder.y()

        // Capture shoulder and wrist Y when arms are straight (up position)
        if (armAngle > PUSHUP_ARM_ANGLE_UP && legAngle >= PUSHUP_LEG_STRAIGHT_MIN) {
            shoulderYAtUp = shoulderY
            wristYAtUp = wristY
        }

        // Calculate shoulder drop percentage (alternative method for detecting down)
        // NOTE: In camera coordinates during pushup, shoulder Y DECREASES (moves closer to camera)
        var shoulderDropPercent = 0f
        var isDownByShoulderDrop = false
        val upShoulderY = shoulderYAtUp
        val upWristY = wristYAtUp
        if (upShoulderY != null && upWristY != null) {
            // Total possible drop distance (from shoulder at up to wrist at up)
            // Since wrist is typically higher on screen (smaller Y), this will be negative
            val totalDropDistance = Math.abs(upWristY - upShoulderY)

            if (totalDropDistance > 0) {
                // Current drop (how much shoulder has moved toward wrist from up position)
                // When doing pushup, shoulder Y decreases (moves up on screen/closer to camera)
                val currentDrop = Math.abs(shoulderY - upShoulderY)

                // Calculate percentage (0% = at up position, 100% = at wrist level)
                shoulderDropPercent = (currentDrop / totalDropDistance) * 100f

                // Check if shoulder has dropped enough
                isDownByShoulderDrop = shoulderDropPercent >= PUSHUP_SHOULDER_DROP_PERCENT
            }
        }

        // Track leg angle violations during rep recording (COMMENTED OUT - using state machine)
        // if (isRecordingRep && exerciseType == "pushup") {
        //     if (legAngle < PUSHUP_LEG_STRAIGHT_MIN && !kneesDown) {
        //         println("Debug_Pushup: ⚠️ Leg angle violation during rep: $legAngle < $PUSHUP_LEG_STRAIGHT_MIN")
        //         hadLegAngleViolation = true
        //     }
        // }

        // Determine current phase based on arm angle and form
        // PRIMARY: Use arm angle ONLY (shoulder drop kept for reference but not used)
        val isDownByArmAngle = armAngle < PUSHUP_ARM_ANGLE_DOWN
        val isDown = isDownByArmAngle  // Only use arm angle for down detection

        val currentPhase = when {
            kneesDown -> "kneeDown"
            legAngle < PUSHUP_LEG_STRAIGHT_MIN -> "mid" // Legs not straight enough
            isDown -> "down" // Arms bent (low position) - detected by ARM ANGLE
            armAngle > PUSHUP_ARM_ANGLE_UP -> "up" // Arms straight (high position)
            else -> "mid" // Transition
        }

        // State machine for pushup rep counting
        if (exerciseType == "pushup") {
            when (currentPhase) {
                "up" -> {
                    if (!recordedUp) {
                        // First time seeing up position
                        recordedUp = true
                        println("Debug_Pushup: 🟢 Recorded UP position (ready to start)")
                    } else if (recordedUp && recordedDown) {
                        // Complete rep: up -> down -> up
                        repCount++
                        recordedDown = false  // Reset for next rep
                        println("Debug_Pushup: ✅ REP COUNTED! Total reps: $repCount")
                    }
                }
                "down" -> {
                    if (recordedUp && !recordedDown) {
                        // Valid down after up
                        recordedDown = true
                        println("Debug_Pushup: 🔵 Recorded DOWN position")
                    }
                }
                "kneeDown" -> {
                    // Invalid form - reset
                    if (recordedUp || recordedDown) {
                        println("Debug_Pushup: ❌ INVALID - Knees down, resetting flags")
                    }
                    recordedUp = false
                    recordedDown = false
                }
                "mid" -> {
                    if (legAngle < PUSHUP_LEG_STRAIGHT_MIN) {
                        // Legs not straight enough - reset
                        if (recordedUp || recordedDown) {
                            println("Debug_Pushup: ❌ INVALID - Legs bent too much, resetting flags")
                        }
                        recordedUp = false
                        recordedDown = false
                    }
                }
                "unknown" -> {
                    // Partial visibility - reset
                    if (recordedUp || recordedDown) {
                        println("Debug_Pushup: ⚠️ Lost visibility, resetting flags")
                    }
                    recordedUp = false
                    recordedDown = false
                }
            }
        }

        // Debug logging
        val sideName = if (usingLeftSide) "LEFT" else "RIGHT"
        println("Debug_Pushup: Android Pushup Analysis (using $sideName side)")
        println("Debug_Pushup: ⭐ ARM ANGLE=$armAngle (up>$PUSHUP_ARM_ANGLE_UP=UP, <$PUSHUP_ARM_ANGLE_DOWN=DOWN) → ${if (isDownByArmAngle) "DOWN✅" else if (armAngle > PUSHUP_ARM_ANGLE_UP) "UP✅" else "MID"}")
        println("Debug_Pushup: Shoulder Drop: Y=$shoulderY, @Up=${upShoulderY ?: 0f}, Wrist@Up=${upWristY ?: 0f} → %=$shoulderDropPercent% (need >=$PUSHUP_SHOULDER_DROP_PERCENT%) → ${if (isDownByShoulderDrop) "DOWN✅" else "NO"}")
        println("Debug_Pushup: Leg Angle=$legAngle (kneeDown<$PUSHUP_LEG_KNEE_DOWN_MAX, straight>$PUSHUP_LEG_STRAIGHT_MIN)")
        println("Debug_Pushup: 🎯 PHASE=$currentPhase | RecordedUp=${if (recordedUp) "YES" else "NO"} | RecordedDown=${if (recordedDown) "YES" else "NO"} | Reps=$repCount")

        // Track frames for validation (COMMENTED OUT - using state machine)
        // trackFrameForValidation(currentFrame, currentPhase)

        // Count reps and validate (COMMENTED OUT - using state machine)
        // val (newRepCount, validationResult) = updateRepCountWithValidation(currentPhase)

        // Calculate confidence using all key landmarks
        val keyLandmarks = if (usingLeftSide) {
            listOf(leftShoulder, leftElbow, leftWrist, leftHip, leftKnee, leftAnkle)
        } else {
            listOf(rightShoulder, rightElbow, rightWrist, rightHip, rightKnee, rightAnkle)
        }
        val confidence = calculateConfidence(keyLandmarks)

        // Determine validation message
        val validationMessage = when {
            kneesDown -> "Keep knees off the ground"
            legAngle < PUSHUP_LEG_STRAIGHT_MIN -> "Keep legs straight"
            else -> null
        }

        return PoseState(
            exerciseType = exerciseType,
            currentPhase = currentPhase,
            confidence = confidence,
            repCount = repCount,  // Use state machine rep count
            isValidRep = currentPhase != "kneeDown" && legAngle >= PUSHUP_LEG_STRAIGHT_MIN,
            validationMessage = validationMessage
        )
    }

    private fun detectSquatPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Convert landmarks to our format for tracking
        val currentFrame = FrameData(
            landmarks = landmarks.map { LandmarkData(it.x(), it.y(), it.visibility().orElse(0f)) },
            timestamp = System.currentTimeMillis()
        )

        // Get key landmarks for squat analysis
        val leftHip = landmarks[LandmarkIndices.LEFT_HIP]
        val rightHip = landmarks[LandmarkIndices.RIGHT_HIP]
        val leftKnee = landmarks[LandmarkIndices.LEFT_KNEE]
        val rightKnee = landmarks[LandmarkIndices.RIGHT_KNEE]
        val leftAnkle = landmarks[LandmarkIndices.LEFT_ANKLE]
        val rightAnkle = landmarks[LandmarkIndices.RIGHT_ANKLE]

        // Choose the better side for analysis (supports side view)
        val betterSideIndices = chooseBetterSquatSide()
        val usingLeftSide = betterSideIndices.contains(23) // contains left hip

        // Calculate leg angle (hip-knee-ankle)
        val legAngle = if (usingLeftSide) {
            calculateAngle(leftHip, leftKnee, leftAnkle)
        } else {
            calculateAngle(rightHip, rightKnee, rightAnkle)
        }

        // Determine current phase based on leg angle
        // When standing: leg is straight (~160-180 degrees)
        // When squatting: leg is bent (~90-110 degrees)
        val currentPhase = when {
            legAngle > SQUAT_ANGLE_UP -> "up"    // Standing - leg straight
            legAngle < SQUAT_ANGLE_DOWN -> "down"  // Squatting - leg bent
            else -> "mid"                          // Transition
        }

        // Debug logging for squat detection
        val sideName = if (usingLeftSide) "LEFT" else "RIGHT"
        println("Debug_Squat: Android Squat Analysis (using $sideName side)")
        println("Debug_Squat: Left Hip Y=${leftHip.y()}, Right Hip Y=${rightHip.y()}")
        println("Debug_Squat: Left Knee Y=${leftKnee.y()}, Right Knee Y=${rightKnee.y()}")
        println("Debug_Squat: Left Ankle Y=${leftAnkle.y()}, Right Ankle Y=${rightAnkle.y()}")
        println("Debug_Squat: Leg Angle=$legAngle (thresholds: up>$SQUAT_ANGLE_UP, down<$SQUAT_ANGLE_DOWN)")
        println("Debug_Squat: Phase Detected=$currentPhase, Last Phase=$lastPhase, Transitioning=$isTransitioning")

        // Track frames for validation
        trackFrameForValidation(currentFrame, currentPhase)

        // Count reps and validate
        val (newRepCount, validationResult) = updateRepCountWithValidation(currentPhase)

        // Calculate confidence using selected side landmarks
        val keyLandmarks = if (usingLeftSide) {
            listOf(leftHip, leftKnee, leftAnkle)
        } else {
            listOf(rightHip, rightKnee, rightAnkle)
        }
        val confidence = calculateConfidence(keyLandmarks)

        return PoseState(
            exerciseType = exerciseType,
            currentPhase = currentPhase,
            confidence = confidence,
            repCount = newRepCount,
            isValidRep = validationResult?.isValid ?: true,
            validationMessage = validationResult?.message
        )
    }

    private fun detectSitupPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Get key landmarks for situp analysis
        val leftEar = landmarks[LandmarkIndices.LEFT_EAR]
        val rightEar = landmarks[LandmarkIndices.RIGHT_EAR]
        val leftShoulder = landmarks[LandmarkIndices.LEFT_SHOULDER]
        val rightShoulder = landmarks[LandmarkIndices.RIGHT_SHOULDER]
        val leftHip = landmarks[LandmarkIndices.LEFT_HIP]
        val rightHip = landmarks[LandmarkIndices.RIGHT_HIP]

        // Calculate torso angle (ear-shoulder-hip)
        val avgEarY = (leftEar.y() + rightEar.y()) / 2
        val avgShoulderY = (leftShoulder.y() + rightShoulder.y()) / 2
        val avgHipY = (leftHip.y() + rightHip.y()) / 2

        // Determine phase based on relative positions
        val earShoulderDiff = avgEarY - avgShoulderY
        val shoulderHipDiff = avgShoulderY - avgHipY
        val torsoAngle = atan2(earShoulderDiff, shoulderHipDiff) * 180 / PI

        val currentPhase = when {
            torsoAngle > 45 -> "up"     // Sitting up
            torsoAngle < 15 -> "down"   // Lying down
            else -> "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase)

        // Calculate confidence
        val confidence = calculateConfidence(listOf(
            leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip
        ))

        println("PoseDetector: Situp - torsoAngle=$torsoAngle, phase=$currentPhase, reps=$repCount")

        return PoseState(exerciseType, currentPhase, confidence, repCount)
    }

    private fun calculateAngle(point1: NormalizedLandmark, point2: NormalizedLandmark, point3: NormalizedLandmark): Float {
        // Calculate angle at point2 between vectors (point2->point1) and (point2->point3)
        val a = sqrt((point2.x() - point3.x()).pow(2) + (point2.y() - point3.y()).pow(2))
        val b = sqrt((point1.x() - point3.x()).pow(2) + (point1.y() - point3.y()).pow(2))
        val c = sqrt((point1.x() - point2.x()).pow(2) + (point1.y() - point2.y()).pow(2))

        val angle = acos((a.pow(2) + c.pow(2) - b.pow(2)) / (2 * a * c)) * 180 / PI
        return angle.toFloat()
    }

    private fun calculateConfidence(landmarks: List<NormalizedLandmark>): Float {
        val visibilityScores = landmarks.mapNotNull { landmark ->
            if (landmark.visibility().isPresent) landmark.visibility().get() else null
        }

        return if (visibilityScores.isNotEmpty()) {
            visibilityScores.average().toFloat()
        } else {
            0f
        }
    }

    fun areRequiredLandmarksVisible(): Boolean {
        val landmarks = currentLandmarks ?: return false
        val visibilityThreshold = 0.5f  // Lowered for side view compatibility

        val requiredIndices = when (exerciseType) {
            "pushup" -> {
                // Choose the better side (left or right) for side view compatibility
                chooseBetterPushupSide()
            }
            "squat" -> {
                // Choose the better side (left or right) for side view compatibility
                chooseBetterSquatSide()
            }
            "situp" -> {
                // Ears, shoulders, hips for torso angle analysis
                listOf(7, 8, 11, 12, 23, 24)
            }
            else -> return false
        }

        // Check that all required landmarks are visible
        for (index in requiredIndices) {
            if (index >= landmarks.size) {
                println("PoseDetector: Landmark $index out of bounds")
                return false
            }

            val visibility = if (landmarks[index].visibility().isPresent) {
                landmarks[index].visibility().get()
            } else {
                0.0f
            }

            if (visibility < visibilityThreshold) {
                println("PoseDetector: Landmark $index not visible enough ($visibility < $visibilityThreshold)")
                return false
            }
        }

        return true
    }

    private fun chooseBetterPushupSide(): List<Int> {
        val landmarks = currentLandmarks ?: return listOf(11, 12, 13, 14, 15, 16) // fallback to all

        // Calculate visibility for each side (shoulder, elbow, wrist)
        val leftShoulderVis = if (landmarks[11].visibility().isPresent) landmarks[11].visibility().get() else 0.0f
        val leftElbowVis = if (landmarks[13].visibility().isPresent) landmarks[13].visibility().get() else 0.0f
        val leftWristVis = if (landmarks[15].visibility().isPresent) landmarks[15].visibility().get() else 0.0f
        val leftSideVis = (leftShoulderVis + leftElbowVis + leftWristVis) / 3.0f

        val rightShoulderVis = if (landmarks[12].visibility().isPresent) landmarks[12].visibility().get() else 0.0f
        val rightElbowVis = if (landmarks[14].visibility().isPresent) landmarks[14].visibility().get() else 0.0f
        val rightWristVis = if (landmarks[16].visibility().isPresent) landmarks[16].visibility().get() else 0.0f
        val rightSideVis = (rightShoulderVis + rightElbowVis + rightWristVis) / 3.0f

        println("PoseDetector: Pushup side visibility - Left: %.2f (shoulder: %.2f, elbow: %.2f, wrist: %.2f), Right: %.2f (shoulder: %.2f, elbow: %.2f, wrist: %.2f)".format(
            leftSideVis, leftShoulderVis, leftElbowVis, leftWristVis, rightSideVis, rightShoulderVis, rightElbowVis, rightWristVis))

        // Choose the side with better average visibility
        return if (leftSideVis > rightSideVis) {
            println("PoseDetector: Using LEFT arm landmarks")
            listOf(11, 13, 15) // left shoulder, elbow, wrist
        } else {
            println("PoseDetector: Using RIGHT arm landmarks")
            listOf(12, 14, 16) // right shoulder, elbow, wrist
        }
    }

    private fun chooseBetterSquatSide(): List<Int> {
        val landmarks = currentLandmarks ?: return listOf(11, 12, 23, 24, 25, 26, 27, 28) // fallback to all

        // Calculate visibility for each side (shoulder, hip, knee, ankle required for proper squat form)
        val leftShoulderVis = if (landmarks[11].visibility().isPresent) landmarks[11].visibility().get() else 0.0f
        val leftHipVis = if (landmarks[23].visibility().isPresent) landmarks[23].visibility().get() else 0.0f
        val leftKneeVis = if (landmarks[25].visibility().isPresent) landmarks[25].visibility().get() else 0.0f
        val leftAnkleVis = if (landmarks[27].visibility().isPresent) landmarks[27].visibility().get() else 0.0f
        val leftSideVis = (leftShoulderVis + leftHipVis + leftKneeVis + leftAnkleVis) / 4.0f

        val rightShoulderVis = if (landmarks[12].visibility().isPresent) landmarks[12].visibility().get() else 0.0f
        val rightHipVis = if (landmarks[24].visibility().isPresent) landmarks[24].visibility().get() else 0.0f
        val rightKneeVis = if (landmarks[26].visibility().isPresent) landmarks[26].visibility().get() else 0.0f
        val rightAnkleVis = if (landmarks[28].visibility().isPresent) landmarks[28].visibility().get() else 0.0f
        val rightSideVis = (rightShoulderVis + rightHipVis + rightKneeVis + rightAnkleVis) / 4.0f

        println("Debug_Squat: Side visibility - Left: %.2f (shoulder: %.2f, hip: %.2f, knee: %.2f, ankle: %.2f), Right: %.2f (shoulder: %.2f, hip: %.2f, knee: %.2f, ankle: %.2f)".format(
            leftSideVis, leftShoulderVis, leftHipVis, leftKneeVis, leftAnkleVis, rightSideVis, rightShoulderVis, rightHipVis, rightKneeVis, rightAnkleVis))

        // Choose the side with better average visibility
        return if (leftSideVis > rightSideVis) {
            println("Debug_Squat: Using LEFT side landmarks (shoulder, hip, knee, ankle)")
            listOf(11, 23, 25, 27) // left shoulder, left hip, left knee, left ankle
        } else {
            println("Debug_Squat: Using RIGHT side landmarks (shoulder, hip, knee, ankle)")
            listOf(12, 24, 26, 28) // right shoulder, right hip, right knee, right ankle
        }
    }

    private fun updateRepCount(currentPhase: String) {
        // Count a rep when transitioning from "down" to "up"
        if (lastPhase == "down" && currentPhase == "up" && !isTransitioning) {
            repCount++
            isTransitioning = true
            println("PoseDetector: Rep completed! Total reps: $repCount")
        } else if (currentPhase == "down") {
            isTransitioning = false
        }

        // Only update lastPhase for definitive phases (not "mid")
        if (currentPhase != "mid") {
            lastPhase = currentPhase
        }
    }

    fun resetRepCount() {
        repCount = 0
        lastPhase = "up"
        isTransitioning = false
    }

    fun getRepCount(): Int = repCount

    // MARK: - Pushup Validation Methods

    data class ValidationResult(
        val isValid: Boolean,
        val message: String? = null
    )

    private fun trackFrameForValidation(frame: FrameData, currentPhase: String) {
        if (exerciseType != "pushup" && exerciseType != "squat") return

        // Only proceed if all required landmarks are visible
        if (!areRequiredLandmarksVisible()) {
            // If we were recording and lose visibility, stop recording
            if (isRecordingRep) {
                if (exerciseType == "squat") {
                    println("Debug_Squat: Lost required landmark visibility during rep - canceling recording")
                } else {
                    println("Debug_Media: Lost required landmark visibility during rep - canceling recording")
                }
                isRecordingRep = false
                frameBuffer.clear()
            }
            return
        }

        // Start recording when transitioning to "down" with full visibility
        if (!isRecordingRep && currentPhase == "down" && lastPhase == "up") {
            if (exerciseType == "squat") {
                println("Debug_Squat: Starting rep recording with full visibility (up → down)")
            } else {
                println("Debug_Pushup: Starting rep recording with full visibility (up → down)")
            }
            isRecordingRep = true
            repStartTime = frame.timestamp
            frameBuffer.clear()
            hadLegAngleViolation = false  // Reset leg angle violation flag for new rep
        }

        // Add frame to buffer if recording (only frames with full visibility)
        if (isRecordingRep) {
            frameBuffer.add(frame)
        }
    }

    private fun updateRepCountWithValidation(currentPhase: String): Pair<Int, ValidationResult?> {
        // Basic rep counting
        var validationResult: ValidationResult? = null

        // If knees are down during pushup, invalidate the current rep
        if (exerciseType == "pushup" && currentPhase == "kneeDown" && isRecordingRep) {
            println("Debug_Pushup: ❌ INVALID REP - Knees touching ground")
            isRecordingRep = false
            frameBuffer.clear()
            isTransitioning = true
            return Pair(repCount, ValidationResult(false, "Keep knees off the ground"))
        }

        if (lastPhase == "down" && currentPhase == "up" && !isTransitioning) {
            // Check if all required landmarks are visible before counting rep
            if (!areRequiredLandmarksVisible()) {
                println("PoseDetector: Skipping rep - required landmarks not visible")
                isTransitioning = true
                lastPhase = currentPhase
                return Pair(repCount, ValidationResult(false, "Required landmarks not visible"))
            }
            // Check for leg angle violation during pushup rep
            if (exerciseType == "pushup" && hadLegAngleViolation) {
                println("Debug_Pushup: ❌ INVALID REP - Legs bent too much (< 120°) during rep")
                validationResult = ValidationResult(false, "Keep legs straight throughout the pushup")
                isRecordingRep = false
                frameBuffer.clear()
                hadLegAngleViolation = false
                isTransitioning = true
                lastPhase = currentPhase
                return Pair(repCount, validationResult)
            }

            // End of rep - validate if we have frame data
            if ((exerciseType == "pushup" || exerciseType == "squat") && isRecordingRep && frameBuffer.isNotEmpty()) {
                validationResult = when (exerciseType) {
                    "pushup" -> validatePushupRep(frameBuffer)
                    "squat" -> validateSquatRep(frameBuffer)
                    else -> ValidationResult(true) // fallback
                }

                if (validationResult.isValid) {
                    repCount++
                    println("Debug_Pushup: ✅ VALID REP COUNTED! Total reps: $repCount")
                } else {
                    println("Debug_Pushup: ❌ INVALID REP: ${validationResult.message}")
                }

                // Reset recording
                isRecordingRep = false
                frameBuffer.clear()
                hadLegAngleViolation = false
            } else {
                // Non-validated exercise or no frame data
                repCount++
                println("PoseDetector: Rep completed! Total reps: $repCount")
            }

            isTransitioning = true
        } else if (currentPhase == "down") {
            isTransitioning = false
        }

        // Only update lastPhase for definitive phases (not "mid" or "kneeDown")
        if (currentPhase != "mid" && currentPhase != "kneeDown") {
            lastPhase = currentPhase
        }
        return Pair(repCount, validationResult)
    }

    private fun validatePushupRep(frames: List<FrameData>): ValidationResult {
        if (frames.isEmpty()) {
            return ValidationResult(false, "No frame data available")
        }

        // Determine which arm to use based on visibility
        val isLeftArm = determineArmToUse(frames.first().landmarks)

        // Calculate angles and landmark stats across all frames
        val armAngleData = AngleData()
        val legAngleData = AngleData()
        val wristStats = LandmarkStats()
        val kneeStats = LandmarkStats()
        val footStats = LandmarkStats()

        for ((index, frame) in frames.withIndex()) {
            // Calculate arm angle
            val armAngle = if (isLeftArm) {
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.LEFT_SHOULDER],
                    frame.landmarks[LandmarkIndices.LEFT_ELBOW],
                    frame.landmarks[LandmarkIndices.LEFT_WRIST]
                )
            } else {
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.RIGHT_SHOULDER],
                    frame.landmarks[LandmarkIndices.RIGHT_ELBOW],
                    frame.landmarks[LandmarkIndices.RIGHT_WRIST]
                )
            }

            // Calculate leg angle (hip-knee-ankle)
            val legAngle = if (isLeftArm) {
                // Use right leg if left arm is visible
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.RIGHT_HIP],
                    frame.landmarks[LandmarkIndices.RIGHT_KNEE],
                    frame.landmarks[LandmarkIndices.RIGHT_ANKLE]
                )
            } else {
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.LEFT_HIP],
                    frame.landmarks[LandmarkIndices.LEFT_KNEE],
                    frame.landmarks[LandmarkIndices.LEFT_ANKLE]
                )
            }

            // Update angle data
            if (index == 0) {
                armAngleData.initial = armAngle
                legAngleData.initial = legAngle
            }
            if (index == frames.size - 1) {
                armAngleData.final = armAngle
                legAngleData.final = legAngle
            }

            armAngleData.min = minOf(armAngleData.min, armAngle)
            armAngleData.max = maxOf(armAngleData.max, armAngle)
            legAngleData.min = minOf(legAngleData.min, legAngle)
            legAngleData.max = maxOf(legAngleData.max, legAngle)

            // Update landmark stats
            val wristIndex = if (isLeftArm) LandmarkIndices.LEFT_WRIST else LandmarkIndices.RIGHT_WRIST
            val kneeIndex = if (isLeftArm) LandmarkIndices.RIGHT_KNEE else LandmarkIndices.LEFT_KNEE
            val footIndex = if (isLeftArm) LandmarkIndices.RIGHT_FOOT_INDEX else LandmarkIndices.LEFT_FOOT_INDEX

            wristStats.minY = minOf(wristStats.minY, frame.landmarks[wristIndex].y)
            wristStats.maxY = maxOf(wristStats.maxY, frame.landmarks[wristIndex].y)
            kneeStats.minY = minOf(kneeStats.minY, frame.landmarks[kneeIndex].y)
            kneeStats.maxY = maxOf(kneeStats.maxY, frame.landmarks[kneeIndex].y)
            footStats.minY = minOf(footStats.minY, frame.landmarks[footIndex].y)
            footStats.maxY = maxOf(footStats.maxY, frame.landmarks[footIndex].y)
        }

        // Validate according to the original TypeScript logic
        return validatePushupForm(armAngleData, legAngleData, wristStats, kneeStats, footStats)
    }

    private fun determineArmToUse(landmarks: List<LandmarkData>): Boolean {
        val leftVisibility = (
            landmarks[LandmarkIndices.LEFT_SHOULDER].visibility +
            landmarks[LandmarkIndices.LEFT_ELBOW].visibility +
            landmarks[LandmarkIndices.LEFT_WRIST].visibility
        ) / 3

        val rightVisibility = (
            landmarks[LandmarkIndices.RIGHT_SHOULDER].visibility +
            landmarks[LandmarkIndices.RIGHT_ELBOW].visibility +
            landmarks[LandmarkIndices.RIGHT_WRIST].visibility
        ) / 3

        return leftVisibility >= rightVisibility // Prefer left if equal
    }

    private fun calculateAngleFromLandmarks(point1: LandmarkData, point2: LandmarkData, point3: LandmarkData): Float {
        val a = sqrt((point2.x - point3.x).pow(2) + (point2.y - point3.y).pow(2))
        val b = sqrt((point1.x - point3.x).pow(2) + (point1.y - point3.y).pow(2))
        val c = sqrt((point1.x - point2.x).pow(2) + (point1.y - point2.y).pow(2))

        val angle = acos((a.pow(2) + c.pow(2) - b.pow(2)) / (2 * a * c)) * 180 / PI
        return angle.toFloat()
    }

    private fun validatePushupForm(
        armAngleData: AngleData,
        legAngleData: AngleData,
        wristStats: LandmarkStats,
        kneeStats: LandmarkStats,
        footStats: LandmarkStats
    ): ValidationResult {
        // 1. Check leg straightness
        if (legAngleData.min < LEG_ANGLE_MIN_THRESHOLD) {
            return ValidationResult(false, "Keep legs straight")
        }

        // 2. Check arm start position
        if (armAngleData.initial <= ARM_STRAIGHT_THRESHOLD) {
            return ValidationResult(false, "Start with arms straight")
        }

        // 3. Check arm end position
        if (armAngleData.final <= ARM_STRAIGHT_THRESHOLD) {
            return ValidationResult(false, "Straighten arms more at the top of the pushup")
        }

        // 4. Check arm depth
        if (armAngleData.min >= ARM_BEND_THRESHOLD) {
            return ValidationResult(false, "Bend arms more at the bottom of the pushup")
        }

        // 5. Check knee position (knees should not touch ground)
        if (kneeStats.minY >= footStats.maxY) {
            return ValidationResult(false, "Keep knees from touching the ground")
        }

        // 6. Check hand position (hands should stay on ground)
        if (wristStats.minY < kneeStats.minY) {
            return ValidationResult(false, "Keep hands on the ground")
        }

        // All validations passed
        return ValidationResult(true)
    }

    private fun validateSquatRep(frames: List<FrameData>): ValidationResult {
        if (frames.isEmpty()) {
            return ValidationResult(false, "No frame data available")
        }

        // Determine which leg to use based on visibility
        val isLeftLeg = determineSquatLegToUse(frames.first().landmarks)

        // Calculate leg angles and landmark stats across all frames
        var legAngleData = AngleData()
        var shoulderStats = LandmarkStats()
        var hipStats = LandmarkStats()
        var footStats = LandmarkStats()

        for ((index, frame) in frames.withIndex()) {
            // Calculate leg angle (hip-knee-ankle)
            val legAngle = if (isLeftLeg) {
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.LEFT_HIP],
                    frame.landmarks[LandmarkIndices.LEFT_KNEE],
                    frame.landmarks[LandmarkIndices.LEFT_ANKLE]
                )
            } else {
                calculateAngleFromLandmarks(
                    frame.landmarks[LandmarkIndices.RIGHT_HIP],
                    frame.landmarks[LandmarkIndices.RIGHT_KNEE],
                    frame.landmarks[LandmarkIndices.RIGHT_ANKLE]
                )
            }

            // Update angle data
            if (index == 0) {
                legAngleData.initial = legAngle
            }
            if (index == frames.size - 1) {
                legAngleData.final = legAngle
            }

            legAngleData.min = minOf(legAngleData.min, legAngle)
            legAngleData.max = maxOf(legAngleData.max, legAngle)

            // Update landmark stats
            val shoulderIndex = if (isLeftLeg) LandmarkIndices.LEFT_SHOULDER else LandmarkIndices.RIGHT_SHOULDER
            val hipIndex = if (isLeftLeg) LandmarkIndices.LEFT_HIP else LandmarkIndices.RIGHT_HIP
            val footIndex = if (isLeftLeg) LandmarkIndices.LEFT_FOOT_INDEX else LandmarkIndices.RIGHT_FOOT_INDEX

            shoulderStats.minY = minOf(shoulderStats.minY, frame.landmarks[shoulderIndex].y)
            shoulderStats.maxY = maxOf(shoulderStats.maxY, frame.landmarks[shoulderIndex].y)
            hipStats.minY = minOf(hipStats.minY, frame.landmarks[hipIndex].y)
            hipStats.maxY = maxOf(hipStats.maxY, frame.landmarks[hipIndex].y)
            footStats.minY = minOf(footStats.minY, frame.landmarks[footIndex].y)
            footStats.maxY = maxOf(footStats.maxY, frame.landmarks[footIndex].y)
        }

        // Validate according to the original TypeScript logic
        return validateSquatForm(legAngleData, shoulderStats, hipStats, footStats)
    }

    private fun determineSquatLegToUse(landmarks: List<LandmarkData>): Boolean {
        val leftVisibility = (
            landmarks[LandmarkIndices.LEFT_HIP].visibility +
            landmarks[LandmarkIndices.LEFT_KNEE].visibility +
            landmarks[LandmarkIndices.LEFT_ANKLE].visibility
        ) / 3

        val rightVisibility = (
            landmarks[LandmarkIndices.RIGHT_HIP].visibility +
            landmarks[LandmarkIndices.RIGHT_KNEE].visibility +
            landmarks[LandmarkIndices.RIGHT_ANKLE].visibility
        ) / 3

        return leftVisibility > rightVisibility // Use left only if better visibility
    }

    private fun validateSquatForm(
        legAngleData: AngleData,
        shoulderStats: LandmarkStats,
        hipStats: LandmarkStats,
        footStats: LandmarkStats
    ): ValidationResult {
        // 1. Check standing position (shoulder above hip)
        if (shoulderStats.minY >= hipStats.maxY) {
            return ValidationResult(false, "Stand up")
        }

        // 2. Check leg end position (straightness at top)
        if (legAngleData.final <= SQUAT_LEG_STRAIGHT_THRESHOLD) {
            return ValidationResult(false, "Straighten legs more at the top of the squat")
        }

        // 3. Check leg depth (bend at bottom)
        if (legAngleData.min >= SQUAT_LEG_BEND_THRESHOLD) {
            return ValidationResult(false, "Bend legs more at the bottom of the squat")
        }

        // 4. Check foot stability (feet stay on ground)
        if (footStats.minY < footStats.maxY - FOOT_STABILITY_THRESHOLD) {
            return ValidationResult(false, "Keep feet on the ground")
        }

        // All validations passed
        return ValidationResult(true)
    }
}