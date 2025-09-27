package com.fitproof.mediapipe

import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import kotlin.math.*

data class PoseState(
    val exerciseType: String,
    val currentPhase: String, // "up", "down", "mid"
    val confidence: Float,
    val repCount: Int = 0
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
        private const val PUSHUP_ANGLE_THRESHOLD_DOWN = 90f  // Degrees
        private const val PUSHUP_ANGLE_THRESHOLD_UP = 160f   // Degrees
        private const val SQUAT_HIP_KNEE_RATIO_DOWN = 0.95f // Hip below knee
        private const val SQUAT_HIP_KNEE_RATIO_UP = 1.1f    // Hip above knee
    }

    private var lastPhase = "up"
    private var repCount = 0
    private var isTransitioning = false

    fun detectPose(landmarks: List<NormalizedLandmark>): PoseState {
        if (landmarks.size < 33) {
            return PoseState(exerciseType, "unknown", 0f, repCount)
        }

        return when (exerciseType) {
            "pushup" -> detectPushupPose(landmarks)
            "squat" -> detectSquatPose(landmarks)
            "situp" -> detectSitupPose(landmarks)
            else -> PoseState(exerciseType, "unknown", 0f, repCount)
        }
    }

    private fun detectPushupPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Get key landmarks for pushup analysis
        val leftShoulder = landmarks[LandmarkIndices.LEFT_SHOULDER]
        val rightShoulder = landmarks[LandmarkIndices.RIGHT_SHOULDER]
        val leftElbow = landmarks[LandmarkIndices.LEFT_ELBOW]
        val rightElbow = landmarks[LandmarkIndices.RIGHT_ELBOW]
        val leftWrist = landmarks[LandmarkIndices.LEFT_WRIST]
        val rightWrist = landmarks[LandmarkIndices.RIGHT_WRIST]

        // Calculate average arm angle (shoulder-elbow-wrist)
        val leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist)
        val rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)
        val avgArmAngle = (leftArmAngle + rightArmAngle) / 2

        // Determine current phase based on arm angle
        val currentPhase = when {
            avgArmAngle < PUSHUP_ANGLE_THRESHOLD_DOWN -> "down"
            avgArmAngle > PUSHUP_ANGLE_THRESHOLD_UP -> "up"
            else -> "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase)

        // Calculate confidence based on landmark visibility
        val confidence = calculateConfidence(listOf(
            leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist
        ))

        println("PoseDetector: Pushup - armAngle=$avgArmAngle, phase=$currentPhase, reps=$repCount")

        return PoseState(exerciseType, currentPhase, confidence, repCount)
    }

    private fun detectSquatPose(landmarks: List<NormalizedLandmark>): PoseState {
        // Get key landmarks for squat analysis
        val leftHip = landmarks[LandmarkIndices.LEFT_HIP]
        val rightHip = landmarks[LandmarkIndices.RIGHT_HIP]
        val leftKnee = landmarks[LandmarkIndices.LEFT_KNEE]
        val rightKnee = landmarks[LandmarkIndices.RIGHT_KNEE]

        // Calculate average hip and knee heights
        val avgHipY = (leftHip.y() + rightHip.y()) / 2
        val avgKneeY = (leftKnee.y() + rightKnee.y()) / 2
        val hipKneeRatio = avgHipY / avgKneeY

        // Determine current phase based on hip-knee relationship
        val currentPhase = when {
            hipKneeRatio > SQUAT_HIP_KNEE_RATIO_DOWN -> "down"  // Hip below knee
            hipKneeRatio < SQUAT_HIP_KNEE_RATIO_UP -> "up"     // Hip above knee
            else -> "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase)

        // Calculate confidence
        val confidence = calculateConfidence(listOf(leftHip, rightHip, leftKnee, rightKnee))

        println("PoseDetector: Squat - hipKneeRatio=$hipKneeRatio, phase=$currentPhase, reps=$repCount")

        return PoseState(exerciseType, currentPhase, confidence, repCount)
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

    private fun updateRepCount(currentPhase: String) {
        // Count a rep when transitioning from "down" to "up"
        if (lastPhase == "down" && currentPhase == "up" && !isTransitioning) {
            repCount++
            isTransitioning = true
            println("PoseDetector: Rep completed! Total reps: $repCount")
        } else if (currentPhase == "down") {
            isTransitioning = false
        }

        lastPhase = currentPhase
    }

    fun resetRepCount() {
        repCount = 0
        lastPhase = "up"
        isTransitioning = false
    }

    fun getRepCount(): Int = repCount
}