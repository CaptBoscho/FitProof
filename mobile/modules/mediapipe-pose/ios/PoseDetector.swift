import Foundation
import MediaPipeTasksVision

struct PoseState {
    let exerciseType: String
    let currentPhase: String // "up", "down", "mid"
    let confidence: Float
    let repCount: Int
}

class PoseDetector {

    // MARK: - Landmark Indices (based on trackedLandmarks.ts)
    struct LandmarkIndices {
        static let leftEar = 7
        static let rightEar = 8
        static let leftShoulder = 11
        static let rightShoulder = 12
        static let leftElbow = 13
        static let rightElbow = 14
        static let leftWrist = 15
        static let rightWrist = 16
        static let leftHip = 23
        static let rightHip = 24
        static let leftKnee = 25
        static let rightKnee = 26
        static let leftAnkle = 27
        static let rightAnkle = 28
        static let leftHeel = 29
        static let rightHeel = 30
        static let leftFootIndex = 31
        static let rightFootIndex = 32
    }

    // MARK: - Constants
    private let minConfidence: Float = 0.7
    private let pushupAngleThresholdDown: Float = 90.0  // Degrees
    private let pushupAngleThresholdUp: Float = 160.0   // Degrees
    private let squatHipKneeRatioDown: Float = 0.95     // Hip below knee
    private let squatHipKneeRatioUp: Float = 1.1        // Hip above knee

    // MARK: - Properties
    private let exerciseType: String
    private var lastPhase: String = "up"
    private var repCount: Int = 0
    private var isTransitioning: Bool = false

    // MARK: - Initialization

    init(exerciseType: String) {
        self.exerciseType = exerciseType
    }

    // MARK: - Public Methods

    func detectPose(landmarks: [NormalizedLandmark]) -> PoseState {
        guard landmarks.count >= 33 else {
            return PoseState(exerciseType: exerciseType, currentPhase: "unknown", confidence: 0.0, repCount: repCount)
        }

        switch exerciseType {
        case "pushup":
            return detectPushupPose(landmarks: landmarks)
        case "squat":
            return detectSquatPose(landmarks: landmarks)
        case "situp":
            return detectSitupPose(landmarks: landmarks)
        default:
            return PoseState(exerciseType: exerciseType, currentPhase: "unknown", confidence: 0.0, repCount: repCount)
        }
    }

    func resetRepCount() {
        repCount = 0
        lastPhase = "up"
        isTransitioning = false
    }

    func getRepCount() -> Int {
        return repCount
    }

    // MARK: - Exercise-Specific Detection

    private func detectPushupPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Get key landmarks for pushup analysis
        let leftShoulder = landmarks[LandmarkIndices.leftShoulder]
        let rightShoulder = landmarks[LandmarkIndices.rightShoulder]
        let leftElbow = landmarks[LandmarkIndices.leftElbow]
        let rightElbow = landmarks[LandmarkIndices.rightElbow]
        let leftWrist = landmarks[LandmarkIndices.leftWrist]
        let rightWrist = landmarks[LandmarkIndices.rightWrist]

        // Calculate average arm angle (shoulder-elbow-wrist)
        let leftArmAngle = calculateAngle(point1: leftShoulder, point2: leftElbow, point3: leftWrist)
        let rightArmAngle = calculateAngle(point1: rightShoulder, point2: rightElbow, point3: rightWrist)
        let avgArmAngle = (leftArmAngle + rightArmAngle) / 2

        // Determine current phase based on arm angle
        let currentPhase: String
        if avgArmAngle < pushupAngleThresholdDown {
            currentPhase = "down"
        } else if avgArmAngle > pushupAngleThresholdUp {
            currentPhase = "up"
        } else {
            currentPhase = "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase: currentPhase)

        // Calculate confidence based on landmark visibility
        let keyLandmarks = [leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        print("PoseDetector iOS: Pushup - armAngle=\(avgArmAngle), phase=\(currentPhase), reps=\(repCount)")

        return PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: repCount)
    }

    private func detectSquatPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Get key landmarks for squat analysis
        let leftHip = landmarks[LandmarkIndices.leftHip]
        let rightHip = landmarks[LandmarkIndices.rightHip]
        let leftKnee = landmarks[LandmarkIndices.leftKnee]
        let rightKnee = landmarks[LandmarkIndices.rightKnee]

        // Calculate average hip and knee heights
        let avgHipY = (leftHip.y + rightHip.y) / 2
        let avgKneeY = (leftKnee.y + rightKnee.y) / 2
        let hipKneeRatio = avgHipY / avgKneeY

        // Determine current phase based on hip-knee relationship
        let currentPhase: String
        if hipKneeRatio > squatHipKneeRatioDown {
            currentPhase = "down"  // Hip below knee
        } else if hipKneeRatio < squatHipKneeRatioUp {
            currentPhase = "up"    // Hip above knee
        } else {
            currentPhase = "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase: currentPhase)

        // Calculate confidence
        let keyLandmarks = [leftHip, rightHip, leftKnee, rightKnee]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        print("PoseDetector iOS: Squat - hipKneeRatio=\(hipKneeRatio), phase=\(currentPhase), reps=\(repCount)")

        return PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: repCount)
    }

    private func detectSitupPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Get key landmarks for situp analysis
        let leftEar = landmarks[LandmarkIndices.leftEar]
        let rightEar = landmarks[LandmarkIndices.rightEar]
        let leftShoulder = landmarks[LandmarkIndices.leftShoulder]
        let rightShoulder = landmarks[LandmarkIndices.rightShoulder]
        let leftHip = landmarks[LandmarkIndices.leftHip]
        let rightHip = landmarks[LandmarkIndices.rightHip]

        // Calculate torso angle (ear-shoulder-hip)
        let avgEarY = (leftEar.y + rightEar.y) / 2
        let avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2
        let avgHipY = (leftHip.y + rightHip.y) / 2

        // Determine phase based on relative positions
        let earShoulderDiff = avgEarY - avgShoulderY
        let shoulderHipDiff = avgShoulderY - avgHipY
        let torsoAngle = atan2(earShoulderDiff, shoulderHipDiff) * 180 / Float.pi

        let currentPhase: String
        if torsoAngle > 45 {
            currentPhase = "up"     // Sitting up
        } else if torsoAngle < 15 {
            currentPhase = "down"   // Lying down
        } else {
            currentPhase = "mid"
        }

        // Count reps on phase transitions
        updateRepCount(currentPhase: currentPhase)

        // Calculate confidence
        let keyLandmarks = [leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        print("PoseDetector iOS: Situp - torsoAngle=\(torsoAngle), phase=\(currentPhase), reps=\(repCount)")

        return PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: repCount)
    }

    // MARK: - Helper Methods

    private func calculateAngle(point1: NormalizedLandmark, point2: NormalizedLandmark, point3: NormalizedLandmark) -> Float {
        // Calculate angle at point2 between vectors (point2->point1) and (point2->point3)
        let a = sqrt(pow(point2.x - point3.x, 2) + pow(point2.y - point3.y, 2))
        let b = sqrt(pow(point1.x - point3.x, 2) + pow(point1.y - point3.y, 2))
        let c = sqrt(pow(point1.x - point2.x, 2) + pow(point1.y - point2.y, 2))

        let angle = acos((pow(a, 2) + pow(c, 2) - pow(b, 2)) / (2 * a * c)) * 180 / Float.pi
        return angle
    }

    private func calculateConfidence(landmarks: [NormalizedLandmark]) -> Float {
        let visibilityScores = landmarks.compactMap { landmark in
            return landmark.visibility?.floatValue
        }

        if !visibilityScores.isEmpty {
            return visibilityScores.reduce(0.0, +) / Float(visibilityScores.count)
        } else {
            return 0.0
        }
    }

    private func updateRepCount(currentPhase: String) {
        // Count a rep when transitioning from "down" to "up"
        if lastPhase == "down" && currentPhase == "up" && !isTransitioning {
            repCount += 1
            isTransitioning = true
            print("PoseDetector iOS: Rep completed! Total reps: \(repCount)")
        } else if currentPhase == "down" {
            isTransitioning = false
        }

        lastPhase = currentPhase
    }
}