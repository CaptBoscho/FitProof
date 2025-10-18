import Foundation
import MediaPipeTasksVision

struct PoseState {
    let exerciseType: String
    let currentPhase: String // "up", "down", "mid"
    let confidence: Float
    let repCount: Int
    let isValidRep: Bool
    let validationMessage: String?

    init(exerciseType: String, currentPhase: String, confidence: Float, repCount: Int, isValidRep: Bool = true, validationMessage: String? = nil) {
        self.exerciseType = exerciseType
        self.currentPhase = currentPhase
        self.confidence = confidence
        self.repCount = repCount
        self.isValidRep = isValidRep
        self.validationMessage = validationMessage
    }
}

struct LandmarkData {
    let x: Float
    let y: Float
    let visibility: Float
}

struct FrameData {
    let landmarks: [LandmarkData]
    let timestamp: TimeInterval
}

struct AngleData {
    var initial: Float = 0.0
    var min: Float = Float.greatestFiniteMagnitude
    var max: Float = -Float.greatestFiniteMagnitude
    var final: Float = 0.0
}

struct LandmarkStats {
    var minY: Float = Float.greatestFiniteMagnitude
    var maxY: Float = -Float.greatestFiniteMagnitude
    var minX: Float = Float.greatestFiniteMagnitude
    var maxX: Float = -Float.greatestFiniteMagnitude
}

struct ValidationResult {
    let isValid: Bool
    let message: String?

    init(isValid: Bool, message: String? = nil) {
        self.isValid = isValid
        self.message = message
    }
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

    // Pushup validation thresholds (from TypeScript model)
    private let legAngleMinThreshold: Float = 120.0     // Minimum leg straightness
    private let armStraightThreshold: Float = 150.0     // Start/end arm straightness
    private let armBendThreshold: Float = 110.0         // Maximum arm bend depth

    // Squat validation thresholds (from TypeScript model)
    private let squatLegStraightThreshold: Float = 150.0  // End position leg straightness
    private let squatLegBendThreshold: Float = 105.0      // Bottom position leg bend
    private let footStabilityThreshold: Float = 0.05     // Maximum foot movement

    // Squat phase detection thresholds (angle-based)
    private let squatAngleUp: Float = 160.0      // Standing position (leg nearly straight)
    private let squatAngleDown: Float = 110.0    // Squat bottom position (leg bent)

    // MARK: - Properties
    private let exerciseType: String
    private var lastPhase: String = "up"
    private var repCount: Int = 0
    private var isTransitioning: Bool = false
    private var currentLandmarks: [NormalizedLandmark]?

    // Frame tracking for pushup validation
    private var frameBuffer: [FrameData] = []
    private var isRecordingRep: Bool = false
    private var repStartTime: TimeInterval = 0

    // MARK: - Initialization

    init(exerciseType: String) {
        self.exerciseType = exerciseType
    }

    // MARK: - Public Methods

    func detectPose(landmarks: [NormalizedLandmark]) -> PoseState {
        guard landmarks.count >= 33 else {
            return PoseState(exerciseType: exerciseType, currentPhase: "unknown", confidence: 0.0, repCount: repCount)
        }

        // Store current landmarks for visibility checking
        self.currentLandmarks = landmarks

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
        // Convert landmarks to our format for tracking
        let currentFrame = FrameData(
            landmarks: landmarks.map { LandmarkData(x: $0.x, y: $0.y, visibility: $0.visibility?.floatValue ?? 0.0) },
            timestamp: Date().timeIntervalSince1970
        )

        // Get key landmarks for pushup analysis
        let leftShoulder = landmarks[LandmarkIndices.leftShoulder]
        let rightShoulder = landmarks[LandmarkIndices.rightShoulder]
        let leftElbow = landmarks[LandmarkIndices.leftElbow]
        let rightElbow = landmarks[LandmarkIndices.rightElbow]
        let leftWrist = landmarks[LandmarkIndices.leftWrist]
        let rightWrist = landmarks[LandmarkIndices.rightWrist]

        // Choose the better arm for analysis (supports side view)
        let betterArmIndices = chooseBetterPushupSide()
        let usingLeftArm = betterArmIndices.contains(11) // contains left shoulder

        let armAngle: Float
        if usingLeftArm {
            armAngle = calculateAngle(point1: leftShoulder, point2: leftElbow, point3: leftWrist)
        } else {
            armAngle = calculateAngle(point1: rightShoulder, point2: rightElbow, point3: rightWrist)
        }

        // Determine current phase based on arm angle
        let currentPhase: String
        if armAngle < pushupAngleThresholdDown {
            currentPhase = "down"
        } else if armAngle > pushupAngleThresholdUp {
            currentPhase = "up"
        } else {
            currentPhase = "mid"
        }

        // Track frames for validation
        trackFrameForValidation(frame: currentFrame, currentPhase: currentPhase)

        // Count reps and validate
        let (newRepCount, validationResult) = updateRepCountWithValidation(currentPhase: currentPhase)

        // Calculate confidence using selected arm landmarks
        let keyLandmarks = usingLeftArm ? [leftShoulder, leftElbow, leftWrist] : [rightShoulder, rightElbow, rightWrist]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        // Detailed pose logging disabled for normal operation
        // NSLog("Debug_Media: PoseDetector iOS: Pushup - armAngle=%.1f, phase=%@, reps=%d", armAngle, currentPhase, newRepCount)

        return PoseState(
            exerciseType: exerciseType,
            currentPhase: currentPhase,
            confidence: confidence,
            repCount: newRepCount,
            isValidRep: validationResult?.isValid ?? true,
            validationMessage: validationResult?.message
        )
    }

    private func detectSquatPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Get key landmarks for squat analysis
        let leftHip = landmarks[LandmarkIndices.leftHip]
        let rightHip = landmarks[LandmarkIndices.rightHip]
        let leftKnee = landmarks[LandmarkIndices.leftKnee]
        let rightKnee = landmarks[LandmarkIndices.rightKnee]
        let leftAnkle = landmarks[LandmarkIndices.leftAnkle]
        let rightAnkle = landmarks[LandmarkIndices.rightAnkle]

        // Choose the better side for analysis (supports side view)
        let betterSideIndices = chooseBetterSquatSide()
        let usingLeftSide = betterSideIndices.contains(23) // contains left hip

        // Calculate leg angle (hip-knee-ankle)
        let legAngle: Float
        if usingLeftSide {
            legAngle = calculateAngle(point1: leftHip, point2: leftKnee, point3: leftAnkle)
        } else {
            legAngle = calculateAngle(point1: rightHip, point2: rightKnee, point3: rightAnkle)
        }

        // Determine current phase based on leg angle
        // When standing: leg is straight (~160-180 degrees)
        // When squatting: leg is bent (~90-110 degrees)
        let currentPhase: String
        if legAngle > squatAngleUp {
            currentPhase = "up"    // Standing - leg straight
        } else if legAngle < squatAngleDown {
            currentPhase = "down"  // Squatting - leg bent
        } else {
            currentPhase = "mid"   // Transition
        }

        // Debug logging for squat detection
        let sideName = usingLeftSide ? "LEFT" : "RIGHT"
        NSLog("Debug_Squat: iOS Squat Analysis (using %@ side)", sideName)
        NSLog("Debug_Squat: Left Hip Y=%.3f, Right Hip Y=%.3f", leftHip.y, rightHip.y)
        NSLog("Debug_Squat: Left Knee Y=%.3f, Right Knee Y=%.3f", leftKnee.y, rightKnee.y)
        NSLog("Debug_Squat: Left Ankle Y=%.3f, Right Ankle Y=%.3f", leftAnkle.y, rightAnkle.y)
        NSLog("Debug_Squat: Leg Angle=%.1f (thresholds: up>%.0f, down<%.0f)", legAngle, squatAngleUp, squatAngleDown)
        NSLog("Debug_Squat: Phase Detected=%@, Last Phase=%@, Transitioning=%@", currentPhase, lastPhase, isTransitioning ? "YES" : "NO")

        // Count reps on phase transitions (no validation for squat)
        let (newRepCount, _) = updateRepCountWithValidation(currentPhase: currentPhase)

        // Calculate confidence using selected side landmarks
        let keyLandmarks = usingLeftSide ? [leftHip, leftKnee, leftAnkle] : [rightHip, rightKnee, rightAnkle]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        return PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: newRepCount)
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

        // Count reps on phase transitions (no validation for situp)
        let (newRepCount, _) = updateRepCountWithValidation(currentPhase: currentPhase)

        // Calculate confidence
        let keyLandmarks = [leftEar, rightEar, leftShoulder, rightShoulder, leftHip, rightHip]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        // Detailed pose logging disabled for normal operation
        // NSLog("Debug_Media: PoseDetector iOS: Situp - torsoAngle=%.1f, phase=%@, reps=%d", torsoAngle, currentPhase, newRepCount)

        return PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: newRepCount)
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

    func areRequiredLandmarksVisible() -> Bool {
        guard let landmarks = currentLandmarks else { return false }

        let requiredIndices: [Int]
        let visibilityThreshold: Float = 0.5  // Lowered for side view compatibility

        switch exerciseType {
        case "pushup":
            // Choose the better side (left or right) for side view compatibility
            requiredIndices = chooseBetterPushupSide()
            NSLog("Debug_Media: Checking visibility for pushup landmarks (better side): %@", requiredIndices)
        case "squat":
            // Choose the better side (left or right) for side view compatibility
            requiredIndices = chooseBetterSquatSide()
            NSLog("Debug_Squat: Checking visibility for squat landmarks (better side): %@", requiredIndices)
        case "situp":
            // Ears, shoulders, hips for torso angle analysis
            requiredIndices = [7, 8, 11, 12, 23, 24]
        default:
            return false
        }

        // Check that all required landmarks are visible
        for index in requiredIndices {
            guard index < landmarks.count,
                  let visibility = landmarks[index].visibility?.floatValue,
                  visibility >= visibilityThreshold else {
                if exerciseType == "squat" {
                    NSLog("Debug_Squat: Landmark %d not visible enough (%.2f < %.2f)", index, landmarks[index].visibility?.floatValue ?? 0.0, visibilityThreshold)
                } else {
                    NSLog("Debug_Media: PoseDetector iOS: Landmark %d not visible enough (%.2f < %.2f)", index, landmarks[index].visibility?.floatValue ?? 0.0, visibilityThreshold)
                }
                return false
            }
            if exerciseType == "squat" {
                NSLog("Debug_Squat: Landmark %d visibility OK (%.2f >= %.2f)", index, visibility, visibilityThreshold)
            }
        }

        return true
    }

    private func chooseBetterPushupSide() -> [Int] {
        guard let landmarks = currentLandmarks else { return [11, 12, 13, 14, 15, 16] } // fallback to all

        // Calculate visibility for each side (shoulder, elbow, wrist)
        let leftShoulderVis = landmarks[11].visibility?.floatValue ?? 0.0
        let leftElbowVis = landmarks[13].visibility?.floatValue ?? 0.0
        let leftWristVis = landmarks[15].visibility?.floatValue ?? 0.0
        let leftSideVis = (leftShoulderVis + leftElbowVis + leftWristVis) / 3.0

        let rightShoulderVis = landmarks[12].visibility?.floatValue ?? 0.0
        let rightElbowVis = landmarks[14].visibility?.floatValue ?? 0.0
        let rightWristVis = landmarks[16].visibility?.floatValue ?? 0.0
        let rightSideVis = (rightShoulderVis + rightElbowVis + rightWristVis) / 3.0

        NSLog("Debug_Media: Pushup side visibility - Left: %.2f (shoulder: %.2f, elbow: %.2f, wrist: %.2f), Right: %.2f (shoulder: %.2f, elbow: %.2f, wrist: %.2f)",
              leftSideVis, leftShoulderVis, leftElbowVis, leftWristVis, rightSideVis, rightShoulderVis, rightElbowVis, rightWristVis)

        // Choose the side with better average visibility
        if leftSideVis > rightSideVis {
            NSLog("Debug_Media: Using LEFT arm landmarks")
            return [11, 13, 15] // left shoulder, elbow, wrist
        } else {
            NSLog("Debug_Media: Using RIGHT arm landmarks")
            return [12, 14, 16] // right shoulder, elbow, wrist
        }
    }

    private func chooseBetterSquatSide() -> [Int] {
        guard let landmarks = currentLandmarks else { return [11, 12, 23, 24, 25, 26, 27, 28] } // fallback to all

        // Calculate visibility for each side (shoulder, hip, knee, ankle required for proper squat form)
        let leftShoulderVis = landmarks[11].visibility?.floatValue ?? 0.0
        let leftHipVis = landmarks[23].visibility?.floatValue ?? 0.0
        let leftKneeVis = landmarks[25].visibility?.floatValue ?? 0.0
        let leftAnkleVis = landmarks[27].visibility?.floatValue ?? 0.0
        let leftSideVis = (leftShoulderVis + leftHipVis + leftKneeVis + leftAnkleVis) / 4.0

        let rightShoulderVis = landmarks[12].visibility?.floatValue ?? 0.0
        let rightHipVis = landmarks[24].visibility?.floatValue ?? 0.0
        let rightKneeVis = landmarks[26].visibility?.floatValue ?? 0.0
        let rightAnkleVis = landmarks[28].visibility?.floatValue ?? 0.0
        let rightSideVis = (rightShoulderVis + rightHipVis + rightKneeVis + rightAnkleVis) / 4.0

        NSLog("Debug_Squat: Side visibility - Left: %.2f (shoulder: %.2f, hip: %.2f, knee: %.2f, ankle: %.2f), Right: %.2f (shoulder: %.2f, hip: %.2f, knee: %.2f, ankle: %.2f)",
              leftSideVis, leftShoulderVis, leftHipVis, leftKneeVis, leftAnkleVis, rightSideVis, rightShoulderVis, rightHipVis, rightKneeVis, rightAnkleVis)

        // Choose the side with better average visibility
        if leftSideVis > rightSideVis {
            NSLog("Debug_Squat: Using LEFT side landmarks (shoulder, hip, knee, ankle)")
            return [11, 23, 25, 27] // left shoulder, left hip, left knee, left ankle
        } else {
            NSLog("Debug_Squat: Using RIGHT side landmarks (shoulder, hip, knee, ankle)")
            return [12, 24, 26, 28] // right shoulder, right hip, right knee, right ankle
        }
    }

    // MARK: - Pushup Validation Methods

    private func trackFrameForValidation(frame: FrameData, currentPhase: String) {
        guard exerciseType == "pushup" || exerciseType == "squat" else { return }

        // Only proceed if all required landmarks are visible
        guard areRequiredLandmarksVisible() else {
            // If we were recording and lose visibility, stop recording
            if isRecordingRep {
                if exerciseType == "squat" {
                    NSLog("Debug_Squat: Lost required landmark visibility during rep - canceling recording")
                } else {
                    NSLog("Debug_Media: Lost required landmark visibility during rep - canceling recording")
                }
                isRecordingRep = false
                frameBuffer.removeAll()
            }
            return
        }

        // Start recording when transitioning to "down" with full visibility
        if !isRecordingRep && currentPhase == "down" && lastPhase == "up" {
            if exerciseType == "squat" {
                NSLog("Debug_Squat: Starting rep recording with full visibility (up → down)")
            } else {
                NSLog("Debug_Media: Starting rep recording with full visibility (up → down)")
            }
            isRecordingRep = true
            repStartTime = frame.timestamp
            frameBuffer.removeAll()
        }

        // Add frame to buffer if recording (only frames with full visibility)
        if isRecordingRep {
            frameBuffer.append(frame)
        }
    }

    private func updateRepCountWithValidation(currentPhase: String) -> (Int, ValidationResult?) {
        var validationResult: ValidationResult? = nil

        if lastPhase == "down" && currentPhase == "up" && !isTransitioning {
            // Check if all required landmarks are visible before counting rep
            guard areRequiredLandmarksVisible() else {
                if exerciseType == "squat" {
                    NSLog("Debug_Squat: SKIPPING REP - required landmarks not visible")
                } else {
                    NSLog("Debug_Media: PoseDetector iOS: Skipping rep - required landmarks not visible")
                }
                isTransitioning = true
                lastPhase = currentPhase
                return (repCount, ValidationResult(isValid: false, message: "Required landmarks not visible"))
            }
            // End of rep - validate if we have frame data
            if (exerciseType == "pushup" || exerciseType == "squat") && isRecordingRep && !frameBuffer.isEmpty {
                switch exerciseType {
                case "pushup":
                    validationResult = validatePushupRep(frames: frameBuffer)
                case "squat":
                    validationResult = validateSquatRep(frames: frameBuffer)
                default:
                    validationResult = ValidationResult(isValid: true) // fallback
                }

                if validationResult!.isValid {
                    repCount += 1
                    if exerciseType == "squat" {
                        NSLog("Debug_Squat: ✅ VALID REP COUNTED! Total reps: %d", repCount)
                    } else {
                        NSLog("Debug_Media: PoseDetector iOS: Valid %@ rep completed! Total reps: %d", exerciseType, repCount)
                    }
                } else {
                    if exerciseType == "squat" {
                        NSLog("Debug_Squat: ❌ INVALID REP: %@", validationResult!.message ?? "Unknown error")
                    } else {
                        NSLog("Debug_Media: PoseDetector iOS: Invalid %@ rep: %@", exerciseType, validationResult!.message ?? "Unknown error")
                    }
                }

                // Reset recording
                isRecordingRep = false
                frameBuffer.removeAll()
            } else {
                // Non-validated exercise or no frame data
                repCount += 1
                if exerciseType == "squat" {
                    NSLog("Debug_Squat: ✅ REP COUNTED (no validation)! Total reps: %d", repCount)
                } else {
                    NSLog("Debug_Media: PoseDetector iOS: Rep completed! Total reps: %d", repCount)
                }
            }

            isTransitioning = true
        } else if currentPhase == "down" {
            isTransitioning = false
        }

        // Only update lastPhase for definitive phases (not "mid")
        if currentPhase != "mid" {
            lastPhase = currentPhase
        }
        return (repCount, validationResult)
    }

    private func validatePushupRep(frames: [FrameData]) -> ValidationResult {
        guard !frames.isEmpty else {
            return ValidationResult(isValid: false, message: "No frame data available")
        }

        // Determine which arm to use based on visibility
        let isLeftArm = determineArmToUse(landmarks: frames.first!.landmarks)

        // Calculate angles and landmark stats across all frames
        var armAngleData = AngleData()
        var legAngleData = AngleData()
        var wristStats = LandmarkStats()
        var kneeStats = LandmarkStats()
        var footStats = LandmarkStats()

        for (index, frame) in frames.enumerated() {
            // Calculate arm angle
            let armAngle: Float
            if isLeftArm {
                armAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.leftShoulder],
                    point2: frame.landmarks[LandmarkIndices.leftElbow],
                    point3: frame.landmarks[LandmarkIndices.leftWrist]
                )
            } else {
                armAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.rightShoulder],
                    point2: frame.landmarks[LandmarkIndices.rightElbow],
                    point3: frame.landmarks[LandmarkIndices.rightWrist]
                )
            }

            // Calculate leg angle (hip-knee-ankle)
            let legAngle: Float
            if isLeftArm {
                // Use right leg if left arm is visible
                legAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.rightHip],
                    point2: frame.landmarks[LandmarkIndices.rightKnee],
                    point3: frame.landmarks[LandmarkIndices.rightAnkle]
                )
            } else {
                legAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.leftHip],
                    point2: frame.landmarks[LandmarkIndices.leftKnee],
                    point3: frame.landmarks[LandmarkIndices.leftAnkle]
                )
            }

            // Update angle data
            if index == 0 {
                armAngleData.initial = armAngle
                legAngleData.initial = legAngle
            }
            if index == frames.count - 1 {
                armAngleData.final = armAngle
                legAngleData.final = legAngle
            }

            armAngleData.min = min(armAngleData.min, armAngle)
            armAngleData.max = max(armAngleData.max, armAngle)
            legAngleData.min = min(legAngleData.min, legAngle)
            legAngleData.max = max(legAngleData.max, legAngle)

            // Update landmark stats
            let wristIndex = isLeftArm ? LandmarkIndices.leftWrist : LandmarkIndices.rightWrist
            let kneeIndex = isLeftArm ? LandmarkIndices.rightKnee : LandmarkIndices.leftKnee
            let footIndex = isLeftArm ? LandmarkIndices.rightFootIndex : LandmarkIndices.leftFootIndex

            wristStats.minY = min(wristStats.minY, frame.landmarks[wristIndex].y)
            wristStats.maxY = max(wristStats.maxY, frame.landmarks[wristIndex].y)
            kneeStats.minY = min(kneeStats.minY, frame.landmarks[kneeIndex].y)
            kneeStats.maxY = max(kneeStats.maxY, frame.landmarks[kneeIndex].y)
            footStats.minY = min(footStats.minY, frame.landmarks[footIndex].y)
            footStats.maxY = max(footStats.maxY, frame.landmarks[footIndex].y)
        }

        // Validate according to the original TypeScript logic
        return validatePushupForm(
            armAngleData: armAngleData,
            legAngleData: legAngleData,
            wristStats: wristStats,
            kneeStats: kneeStats,
            footStats: footStats
        )
    }

    private func determineArmToUse(landmarks: [LandmarkData]) -> Bool {
        let leftVisibility = (
            landmarks[LandmarkIndices.leftShoulder].visibility +
            landmarks[LandmarkIndices.leftElbow].visibility +
            landmarks[LandmarkIndices.leftWrist].visibility
        ) / 3

        let rightVisibility = (
            landmarks[LandmarkIndices.rightShoulder].visibility +
            landmarks[LandmarkIndices.rightElbow].visibility +
            landmarks[LandmarkIndices.rightWrist].visibility
        ) / 3

        return leftVisibility >= rightVisibility // Prefer left if equal
    }

    private func calculateAngleFromLandmarks(point1: LandmarkData, point2: LandmarkData, point3: LandmarkData) -> Float {
        let a = sqrt(pow(point2.x - point3.x, 2) + pow(point2.y - point3.y, 2))
        let b = sqrt(pow(point1.x - point3.x, 2) + pow(point1.y - point3.y, 2))
        let c = sqrt(pow(point1.x - point2.x, 2) + pow(point1.y - point2.y, 2))

        let angle = acos((pow(a, 2) + pow(c, 2) - pow(b, 2)) / (2 * a * c)) * 180 / Float.pi
        return angle
    }

    private func validatePushupForm(
        armAngleData: AngleData,
        legAngleData: AngleData,
        wristStats: LandmarkStats,
        kneeStats: LandmarkStats,
        footStats: LandmarkStats
    ) -> ValidationResult {
        // 1. Check leg straightness
        if legAngleData.min < legAngleMinThreshold {
            return ValidationResult(isValid: false, message: "Keep legs straight")
        }

        // 2. Check arm start position
        if armAngleData.initial <= armStraightThreshold {
            return ValidationResult(isValid: false, message: "Start with arms straight")
        }

        // 3. Check arm end position
        if armAngleData.final <= armStraightThreshold {
            return ValidationResult(isValid: false, message: "Straighten arms more at the top of the pushup")
        }

        // 4. Check arm depth
        if armAngleData.min >= armBendThreshold {
            return ValidationResult(isValid: false, message: "Bend arms more at the bottom of the pushup")
        }

        // 5. Check knee position (knees should not touch ground)
        if kneeStats.minY >= footStats.maxY {
            return ValidationResult(isValid: false, message: "Keep knees from touching the ground")
        }

        // 6. Check hand position (hands should stay on ground)
        if wristStats.minY < kneeStats.minY {
            return ValidationResult(isValid: false, message: "Keep hands on the ground")
        }

        // All validations passed
        return ValidationResult(isValid: true)
    }

    // MARK: - Squat Validation Methods

    private func validateSquatRep(frames: [FrameData]) -> ValidationResult {
        guard !frames.isEmpty else {
            return ValidationResult(isValid: false, message: "No frame data available")
        }

        // Determine which leg to use based on visibility
        let isLeftLeg = determineSquatLegToUse(landmarks: frames.first!.landmarks)

        // Calculate leg angles and landmark stats across all frames
        var legAngleData = AngleData()
        var shoulderStats = LandmarkStats()
        var hipStats = LandmarkStats()
        var kneeStats = LandmarkStats()
        var footStats = LandmarkStats()

        for (index, frame) in frames.enumerated() {
            // Calculate leg angle (hip-knee-ankle)
            let legAngle: Float
            if isLeftLeg {
                legAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.leftHip],
                    point2: frame.landmarks[LandmarkIndices.leftKnee],
                    point3: frame.landmarks[LandmarkIndices.leftAnkle]
                )
            } else {
                legAngle = calculateAngleFromLandmarks(
                    point1: frame.landmarks[LandmarkIndices.rightHip],
                    point2: frame.landmarks[LandmarkIndices.rightKnee],
                    point3: frame.landmarks[LandmarkIndices.rightAnkle]
                )
            }

            // Update angle data
            if index == 0 {
                legAngleData.initial = legAngle
            }
            if index == frames.count - 1 {
                legAngleData.final = legAngle
            }

            legAngleData.min = min(legAngleData.min, legAngle)
            legAngleData.max = max(legAngleData.max, legAngle)

            // Update landmark stats
            let shoulderIndex = isLeftLeg ? LandmarkIndices.leftShoulder : LandmarkIndices.rightShoulder
            let hipIndex = isLeftLeg ? LandmarkIndices.leftHip : LandmarkIndices.rightHip
            let kneeIndex = isLeftLeg ? LandmarkIndices.leftKnee : LandmarkIndices.rightKnee
            let footIndex = isLeftLeg ? LandmarkIndices.leftFootIndex : LandmarkIndices.rightFootIndex

            // Track Y coordinates (vertical position)
            shoulderStats.minY = min(shoulderStats.minY, frame.landmarks[shoulderIndex].y)
            shoulderStats.maxY = max(shoulderStats.maxY, frame.landmarks[shoulderIndex].y)
            hipStats.minY = min(hipStats.minY, frame.landmarks[hipIndex].y)
            hipStats.maxY = max(hipStats.maxY, frame.landmarks[hipIndex].y)
            kneeStats.minY = min(kneeStats.minY, frame.landmarks[kneeIndex].y)
            kneeStats.maxY = max(kneeStats.maxY, frame.landmarks[kneeIndex].y)
            footStats.minY = min(footStats.minY, frame.landmarks[footIndex].y)
            footStats.maxY = max(footStats.maxY, frame.landmarks[footIndex].y)

            // Track X coordinates (horizontal position) for alignment validation
            shoulderStats.minX = min(shoulderStats.minX, frame.landmarks[shoulderIndex].x)
            shoulderStats.maxX = max(shoulderStats.maxX, frame.landmarks[shoulderIndex].x)
            hipStats.minX = min(hipStats.minX, frame.landmarks[hipIndex].x)
            hipStats.maxX = max(hipStats.maxX, frame.landmarks[hipIndex].x)
            kneeStats.minX = min(kneeStats.minX, frame.landmarks[kneeIndex].x)
            kneeStats.maxX = max(kneeStats.maxX, frame.landmarks[kneeIndex].x)
        }

        // Validate according to the original TypeScript logic
        return validateSquatForm(
            legAngleData: legAngleData,
            shoulderStats: shoulderStats,
            hipStats: hipStats,
            kneeStats: kneeStats,
            footStats: footStats
        )
    }

    private func determineSquatLegToUse(landmarks: [LandmarkData]) -> Bool {
        let leftVisibility = (
            landmarks[LandmarkIndices.leftHip].visibility +
            landmarks[LandmarkIndices.leftKnee].visibility +
            landmarks[LandmarkIndices.leftAnkle].visibility
        ) / 3

        let rightVisibility = (
            landmarks[LandmarkIndices.rightHip].visibility +
            landmarks[LandmarkIndices.rightKnee].visibility +
            landmarks[LandmarkIndices.rightAnkle].visibility
        ) / 3

        return leftVisibility > rightVisibility // Use left only if better visibility
    }

    private func validateSquatForm(
        legAngleData: AngleData,
        shoulderStats: LandmarkStats,
        hipStats: LandmarkStats,
        kneeStats: LandmarkStats,
        footStats: LandmarkStats
    ) -> ValidationResult {
        // 1. Check standing position (shoulder above hip)
        if shoulderStats.minY >= hipStats.maxY {
            return ValidationResult(isValid: false, message: "Stand up")
        }

        // 2. Check shoulder alignment (shoulders should stay aligned between hips and knees horizontally)
        let shoulderCenterX = (shoulderStats.minX + shoulderStats.maxX) / 2.0
        let hipCenterX = (hipStats.minX + hipStats.maxX) / 2.0
        let kneeCenterX = (kneeStats.minX + kneeStats.maxX) / 2.0

        // Allow some tolerance for natural movement
        let alignmentTolerance: Float = 0.1
        let minExpectedX = min(hipCenterX, kneeCenterX) - alignmentTolerance
        let maxExpectedX = max(hipCenterX, kneeCenterX) + alignmentTolerance

        if shoulderCenterX < minExpectedX || shoulderCenterX > maxExpectedX {
            return ValidationResult(isValid: false, message: "Keep shoulders aligned above your legs")
        }

        // 3. Check leg end position (straightness at top)
        if legAngleData.final <= squatLegStraightThreshold {
            return ValidationResult(isValid: false, message: "Straighten legs more at the top of the squat")
        }

        // 4. Check leg depth (bend at bottom)
        if legAngleData.min >= squatLegBendThreshold {
            return ValidationResult(isValid: false, message: "Bend legs more at the bottom of the squat")
        }

        // 5. Check foot stability (feet stay on ground)
        if footStats.minY < footStats.maxY - footStabilityThreshold {
            return ValidationResult(isValid: false, message: "Keep feet on the ground")
        }

        // All validations passed
        return ValidationResult(isValid: true)
    }
}