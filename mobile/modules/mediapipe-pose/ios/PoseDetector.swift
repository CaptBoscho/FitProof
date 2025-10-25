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

// MARK: - ML Training Data Structures

struct MLLandmarkData {
    let name: String
    let x: Float
    let y: Float
    let z: Float
    let visibility: Float
}

struct MLFrameData {
    let timestamp: TimeInterval
    let exerciseType: String
    let frameNumber: Int

    // Raw landmarks
    let landmarks: [MLLandmarkData]

    // Computed angles
    let armAngle: Float?
    let legAngle: Float?
    let torsoAngle: Float?

    // Exercise-specific metrics
    let shoulderDropPercentage: Float?
    let kneeDropDistance: Float?
    let footStability: Float?

    // Detection state
    let currentPhase: String
    let isValidForm: Bool
    let confidence: Float

    // Ground truth labels
    let labeledPhase: String      // "up", "down", "mid", etc.
    let labeledFormQuality: String // "good", "knees_down", "arms_not_straight", etc.
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

    // Pushup phase detection thresholds (angle-based)
    private let pushupArmAngleUp: Float = 160.0         // Arms straight (up position)
    private let pushupArmAngleDown: Float = 105.0       // Arms bent (down position) - PRIMARY METHOD
    private let pushupLegStraightMin: Float = 120.0     // Minimum leg straightness for proper form (invalidates if less)
    private let pushupLegKneeDownMax: Float = 100.0     // Maximum leg angle when knees are down
    private let pushupShoulderDropPercent: Float = 40.0 // Minimum shoulder drop % for down position (backup method)

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

    // Situp phase detection thresholds (angle-based)
    private let situpTorsoAngleUp: Float = 100.0    // Sitting up (torso bent forward)
    private let situpTorsoAngleDown: Float = 150.0  // Lying down (torso nearly flat)

    // MARK: - Properties
    private let exerciseType: String
    private var lastPhase: String = "up"
    private var repCount: Int = 0
    private var isTransitioning: Bool = false
    private var currentLandmarks: [NormalizedLandmark]?

    // Frame tracking for pushup validation (COMMENTED OUT - using state machine instead)
    // private var frameBuffer: [FrameData] = []
    // private var isRecordingRep: Bool = false
    // private var repStartTime: TimeInterval = 0
    // private var hadLegAngleViolation: Bool = false  // Track if legs bent too much during rep

    // State machine for rep counting (simpler approach)
    private var recordedUp: Bool = false      // Have we seen a valid up position?
    private var recordedDown: Bool = false    // Have we seen a valid down position after up?

    // Shoulder drop tracking for pushup down position (alternative method)
    private var shoulderYAtUp: Float? = nil         // Shoulder Y position when arms are straight (up)
    private var wristYAtUp: Float? = nil            // Wrist Y position when arms are straight (up)

    // ML Training Data Capture (every 10th frame)
    private var frameCounter: Int = 0
    private var mlFrameData: [MLFrameData] = []

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

    // ML Training Data methods
    func getMLFrameData() -> [MLFrameData] {
        return mlFrameData
    }

    func clearMLFrameData() {
        mlFrameData.removeAll()
        frameCounter = 0
    }

    // MARK: - Exercise-Specific Detection

    private func detectPushupPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Check if all required landmarks are visible FIRST
        guard areRequiredLandmarksVisible() else {
            NSLog("Debug_Pushup: Required landmarks not visible - cannot detect pose")
            return PoseState(
                exerciseType: exerciseType,
                currentPhase: "unknown",
                confidence: 0.0,
                repCount: repCount,
                isValidRep: false,
                validationMessage: "Required landmarks not visible"
            )
        }

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
        let leftHip = landmarks[LandmarkIndices.leftHip]
        let rightHip = landmarks[LandmarkIndices.rightHip]
        let leftKnee = landmarks[LandmarkIndices.leftKnee]
        let rightKnee = landmarks[LandmarkIndices.rightKnee]
        let leftAnkle = landmarks[LandmarkIndices.leftAnkle]
        let rightAnkle = landmarks[LandmarkIndices.rightAnkle]

        // Choose the better side for analysis (supports side view)
        let betterSideIndices = chooseBetterPushupSide()
        let usingLeftSide = betterSideIndices.contains(11) // contains left shoulder

        // Calculate arm angle (shoulder-elbow-wrist)
        let armAngle: Float
        if usingLeftSide {
            armAngle = calculateAngle(point1: leftShoulder, point2: leftElbow, point3: leftWrist)
        } else {
            armAngle = calculateAngle(point1: rightShoulder, point2: rightElbow, point3: rightWrist)
        }

        // Calculate leg angle (hip-knee-ankle) to ensure legs stay straight
        let legAngle: Float
        if usingLeftSide {
            legAngle = calculateAngle(point1: leftHip, point2: leftKnee, point3: leftAnkle)
        } else {
            legAngle = calculateAngle(point1: rightHip, point2: rightKnee, point3: rightAnkle)
        }

        // Check if knees are touching the ground using LEG ANGLE (primary method)
        // When knees are down: leg angle is very small (~80-100°)
        // When knees are up: leg angle is larger (~140-180°)
        let kneesDownByAngle = legAngle < pushupLegKneeDownMax

        // ALTERNATIVE: Ground line Y-coordinate check (currently disabled, but kept for future use)
        // In camera coordinates: Y=0 is TOP, Y=1 is BOTTOM
        // When knees are UP (proper form): knee Y > ground line (knee further from camera)
        // When knees are DOWN: knee Y < ground line (knee closer to camera/ground)
        let kneeY = usingLeftSide ? leftKnee.y : rightKnee.y
        let wristY = usingLeftSide ? leftWrist.y : rightWrist.y
        let ankleY = usingLeftSide ? leftAnkle.y : rightAnkle.y
        let groundLineY = max(wristY, ankleY)
        let kneesDownByYCoord = kneeY < groundLineY  // INVERTED: smaller Y = closer to ground

        // Use leg angle as primary detection method
        let kneesDown = kneesDownByAngle

        // Track shoulder Y position when in up position (for alternative down detection)
        let shoulderY = usingLeftSide ? leftShoulder.y : rightShoulder.y

        // Capture shoulder and wrist Y when arms are straight (up position)
        if armAngle > pushupArmAngleUp && legAngle >= pushupLegStraightMin {
            shoulderYAtUp = shoulderY
            wristYAtUp = wristY
        }

        // Calculate shoulder drop percentage (alternative method for detecting down)
        // NOTE: In camera coordinates during pushup, shoulder Y DECREASES (moves closer to camera)
        var shoulderDropPercent: Float = 0.0
        var isDownByShoulderDrop = false
        if let upShoulderY = shoulderYAtUp, let upWristY = wristYAtUp {
            // Total possible drop distance (from shoulder at up to wrist at up)
            // Since wrist is typically higher on screen (smaller Y), this will be negative
            let totalDropDistance = abs(upWristY - upShoulderY)

            if totalDropDistance > 0 {
                // Current drop (how much shoulder has moved toward wrist from up position)
                // When doing pushup, shoulder Y decreases (moves up on screen/closer to camera)
                let currentDrop = abs(shoulderY - upShoulderY)

                // Calculate percentage (0% = at up position, 100% = at wrist level)
                shoulderDropPercent = (currentDrop / totalDropDistance) * 100.0

                // Check if shoulder has dropped enough
                isDownByShoulderDrop = shoulderDropPercent >= pushupShoulderDropPercent
            }
        }

        // Track leg angle violations during rep recording (COMMENTED OUT - using state machine)
        // if isRecordingRep && exerciseType == "pushup" {
        //     if legAngle < pushupLegStraightMin && !kneesDown {
        //         NSLog("Debug_Pushup: ⚠️ Leg angle violation during rep: %.1f < %.0f", legAngle, pushupLegStraightMin)
        //         hadLegAngleViolation = true
        //     }
        // }

        // Determine current phase based on arm angle and form
        // PRIMARY: Use arm angle ONLY (shoulder drop kept for reference but not used)
        let isDownByArmAngle = armAngle < pushupArmAngleDown
        let isDown = isDownByArmAngle  // Only use arm angle for down detection

        let currentPhase: String
        if kneesDown {
            currentPhase = "kneeDown"
        } else if legAngle < pushupLegStraightMin {
            currentPhase = "mid" // Legs not straight enough
        } else if isDown {
            currentPhase = "down" // Arms bent (low position) - detected by ARM ANGLE
        } else if armAngle > pushupArmAngleUp {
            currentPhase = "up" // Arms straight (high position)
        } else {
            currentPhase = "mid" // Transition
        }

        // State machine for pushup rep counting
        if exerciseType == "pushup" {
            if currentPhase == "up" {
                if !recordedUp {
                    // First time seeing up position
                    recordedUp = true
                    NSLog("Debug_Pushup: 🟢 Recorded UP position (ready to start)")
                } else if recordedUp && recordedDown {
                    // Complete rep: up -> down -> up
                    repCount += 1
                    recordedDown = false  // Reset for next rep
                    NSLog("Debug_Pushup: ✅ REP COUNTED! Total reps: %d", repCount)
                }
            } else if currentPhase == "down" {
                if recordedUp && !recordedDown {
                    // Valid down after up
                    recordedDown = true
                    NSLog("Debug_Pushup: 🔵 Recorded DOWN position")
                }
            } else if currentPhase == "kneeDown" {
                // Invalid form - reset
                if recordedUp || recordedDown {
                    NSLog("Debug_Pushup: ❌ INVALID - Knees down, resetting flags")
                }
                recordedUp = false
                recordedDown = false
            } else if currentPhase == "mid" && legAngle < pushupLegStraightMin {
                // Legs not straight enough - reset
                if recordedUp || recordedDown {
                    NSLog("Debug_Pushup: ❌ INVALID - Legs bent too much, resetting flags")
                }
                recordedUp = false
                recordedDown = false
            } else if currentPhase == "unknown" {
                // Partial visibility - reset
                if recordedUp || recordedDown {
                    NSLog("Debug_Pushup: ⚠️ Lost visibility, resetting flags")
                }
                recordedUp = false
                recordedDown = false
            }
        }

        // Debug logging
        let sideName = usingLeftSide ? "LEFT" : "RIGHT"
        NSLog("Debug_Pushup: iOS Pushup Analysis (using %@ side)", sideName)
        NSLog("Debug_Pushup: ⭐ ARM ANGLE=%.1f (up>%.0f=UP, <%.0f=DOWN) → %@", armAngle, pushupArmAngleUp, pushupArmAngleDown, isDownByArmAngle ? "DOWN✅" : (armAngle > pushupArmAngleUp ? "UP✅" : "MID"))
        NSLog("Debug_Pushup: Shoulder Drop: Y=%.3f, @Up=%.3f, Wrist@Up=%.3f → %%=%.1f%% (need >=%.0f%%) → %@", shoulderY, shoulderYAtUp ?? 0, wristYAtUp ?? 0, shoulderDropPercent, pushupShoulderDropPercent, isDownByShoulderDrop ? "DOWN✅" : "NO")
        NSLog("Debug_Pushup: Leg Angle=%.1f (kneeDown<%.0f, straight>%.0f)", legAngle, pushupLegKneeDownMax, pushupLegStraightMin)
        NSLog("Debug_Pushup: 🎯 PHASE=%@ | RecordedUp=%@ | RecordedDown=%@ | Reps=%d", currentPhase, recordedUp ? "YES" : "NO", recordedDown ? "YES" : "NO", repCount)

        // Track frames for validation (COMMENTED OUT - using state machine)
        // trackFrameForValidation(frame: currentFrame, currentPhase: currentPhase)

        // Count reps and validate (COMMENTED OUT - using state machine)
        // let (newRepCount, validationResult) = updateRepCountWithValidation(currentPhase: currentPhase)

        // Calculate confidence using all key landmarks
        let keyLandmarks: [NormalizedLandmark]
        if usingLeftSide {
            keyLandmarks = [leftShoulder, leftElbow, leftWrist, leftHip, leftKnee, leftAnkle]
        } else {
            keyLandmarks = [rightShoulder, rightElbow, rightWrist, rightHip, rightKnee, rightAnkle]
        }
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        // Determine validation message
        var validationMessage: String? = nil
        if kneesDown {
            validationMessage = "Keep knees off the ground"
        } else if legAngle < pushupLegStraightMin {
            validationMessage = "Keep legs straight"
        }

        let poseState = PoseState(
            exerciseType: exerciseType,
            currentPhase: currentPhase,
            confidence: confidence,
            repCount: repCount,  // Use state machine rep count
            isValidRep: currentPhase != "kneeDown" && legAngle >= pushupLegStraightMin,
            validationMessage: validationMessage
        )

        // Capture ML training data
        let kneeDropDist = groundLineY - kneeY  // Distance knee is below ground line
        captureMLFrameData(
            landmarks: landmarks,
            poseState: poseState,
            armAngle: armAngle,
            legAngle: legAngle,
            torsoAngle: nil,
            shoulderDropPercentage: shoulderDropPercent,
            kneeDropDistance: kneesDown ? kneeDropDist : nil
        )

        return poseState
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

        // Count reps on phase transitions (simple state tracking - no validation for squat yet)
        if lastPhase == "down" && currentPhase == "up" && !isTransitioning {
            repCount += 1
            NSLog("Debug_Squat: ✅ REP COUNTED! Total reps: %d", repCount)
            isTransitioning = true
        } else if currentPhase == "down" {
            isTransitioning = false
        }

        // Update lastPhase for tracking transitions
        if currentPhase != "mid" {
            lastPhase = currentPhase
        }

        // Calculate confidence using selected side landmarks
        let keyLandmarks = usingLeftSide ? [leftHip, leftKnee, leftAnkle] : [rightHip, rightKnee, rightAnkle]
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        let poseState = PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: repCount)

        // Capture ML training data
        captureMLFrameData(
            landmarks: landmarks,
            poseState: poseState,
            armAngle: nil,
            legAngle: legAngle,
            torsoAngle: nil,
            shoulderDropPercentage: nil,
            kneeDropDistance: nil
        )

        return poseState
    }

    private func detectSitupPose(landmarks: [NormalizedLandmark]) -> PoseState {
        // Get key landmarks for situp analysis
        let nose = landmarks[0]  // Using nose as head reference
        let leftShoulder = landmarks[LandmarkIndices.leftShoulder]
        let rightShoulder = landmarks[LandmarkIndices.rightShoulder]
        let leftHip = landmarks[LandmarkIndices.leftHip]
        let rightHip = landmarks[LandmarkIndices.rightHip]
        let leftKnee = landmarks[LandmarkIndices.leftKnee]
        let rightKnee = landmarks[LandmarkIndices.rightKnee]

        // Check visibility of key landmarks
        let keyLandmarks = [nose, leftShoulder, rightShoulder, leftHip, rightHip]
        let visibleCount = keyLandmarks.filter { ($0.visibility as? Double ?? 0.0) > 0.5 }.count

        guard visibleCount >= 4 else {
            NSLog("Debug_Situp: ⚠️ Insufficient landmark visibility (%d/5)", visibleCount)
            return PoseState(exerciseType: exerciseType, currentPhase: "unknown", confidence: 0.0, repCount: repCount)
        }

        // Calculate average positions
        let avgShoulder = NormalizedLandmark(
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2,
            z: (leftShoulder.z + rightShoulder.z) / 2,
            visibility: NSNumber(value: min(leftShoulder.visibility as? Double ?? 0.0, rightShoulder.visibility as? Double ?? 0.0)),
            presence: NSNumber(value: min(leftShoulder.presence as? Double ?? 0.0, rightShoulder.presence as? Double ?? 0.0))
        )

        let avgHip = NormalizedLandmark(
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2,
            z: (leftHip.z + rightHip.z) / 2,
            visibility: NSNumber(value: min(leftHip.visibility as? Double ?? 0.0, rightHip.visibility as? Double ?? 0.0)),
            presence: NSNumber(value: min(leftHip.presence as? Double ?? 0.0, rightHip.presence as? Double ?? 0.0))
        )

        // Calculate torso angle: hip -> shoulder -> nose
        // When lying flat: angle ~180° (straight line)
        // When sitting up: angle <90° (torso bent forward)
        let torsoAngle = calculateAngle(point1: avgHip, point2: avgShoulder, point3: nose)

        // Determine current phase based on torso angle
        let currentPhase: String
        if torsoAngle < situpTorsoAngleUp {
            currentPhase = "up"    // Sitting up - torso bent forward
        } else if torsoAngle > situpTorsoAngleDown {
            currentPhase = "down"  // Lying down - torso nearly flat
        } else {
            currentPhase = "mid"   // Transition
        }

        // Debug logging for situp detection
        NSLog("Debug_Situp: iOS Situp Analysis")
        NSLog("Debug_Situp: Nose Y=%.3f, Shoulder Y=%.3f, Hip Y=%.3f", nose.y, avgShoulder.y, avgHip.y)
        NSLog("Debug_Situp: Torso Angle=%.1f° (thresholds: up<%.0f, down>%.0f)", torsoAngle, situpTorsoAngleUp, situpTorsoAngleDown)
        NSLog("Debug_Situp: Phase Detected=%@, RecordedUp=%@, RecordedDown=%@", currentPhase, recordedUp ? "Yes" : "No", recordedDown ? "Yes" : "No")

        // State machine for rep counting
        if currentPhase == "up" {
            if !recordedUp {
                recordedUp = true
                NSLog("Debug_Situp: ⭐ RECORDED UP POSITION")
            } else if recordedUp && recordedDown {
                // Complete rep: up -> down -> up
                repCount += 1
                NSLog("Debug_Situp: ✅ REP COUNTED! Total reps: %d", repCount)
                recordedDown = false
            }
        } else if currentPhase == "down" {
            if recordedUp && !recordedDown {
                recordedDown = true
                NSLog("Debug_Situp: 🎯 RECORDED DOWN POSITION")
            }
        } else if currentPhase == "unknown" {
            // Reset state if landmarks not visible
            recordedUp = false
            recordedDown = false
        }

        // Calculate confidence
        let confidence = calculateConfidence(landmarks: keyLandmarks)

        let poseState = PoseState(exerciseType: exerciseType, currentPhase: currentPhase, confidence: confidence, repCount: repCount)

        // Capture ML training data
        captureMLFrameData(
            landmarks: landmarks,
            poseState: poseState,
            armAngle: nil,
            legAngle: nil,
            torsoAngle: torsoAngle,
            shoulderDropPercentage: nil,
            kneeDropDistance: nil
        )

        return poseState
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

    // COMMENTED OUT - Using state machine instead of frame buffer
    // private func trackFrameForValidation(frame: FrameData, currentPhase: String) {
    //     guard exerciseType == "pushup" || exerciseType == "squat" else { return }
    //
    //     // Only proceed if all required landmarks are visible
    //     guard areRequiredLandmarksVisible() else {
    //         // If we were recording and lose visibility, stop recording
    //         if isRecordingRep {
    //             if exerciseType == "squat" {
    //                 NSLog("Debug_Squat: Lost required landmark visibility during rep - canceling recording")
    //             } else {
    //                 NSLog("Debug_Media: Lost required landmark visibility during rep - canceling recording")
    //             }
    //             isRecordingRep = false
    //             frameBuffer.removeAll()
    //         }
    //         return
    //     }
    //
    //     // Start recording when transitioning to "down" with full visibility
    //     if !isRecordingRep && currentPhase == "down" && lastPhase == "up" {
    //         if exerciseType == "squat" {
    //             NSLog("Debug_Squat: Starting rep recording with full visibility (up → down)")
    //         } else {
    //             NSLog("Debug_Pushup: Starting rep recording with full visibility (up → down)")
    //         }
    //         isRecordingRep = true
    //         repStartTime = frame.timestamp
    //         frameBuffer.removeAll()
    //         hadLegAngleViolation = false  // Reset leg angle violation flag for new rep
    //     }
    //
    //     // Add frame to buffer if recording (only frames with full visibility)
    //     if isRecordingRep {
    //         frameBuffer.append(frame)
    //     }
    // }

    // COMMENTED OUT - Using state machine instead
    // private func updateRepCountWithValidation(currentPhase: String) -> (Int, ValidationResult?) {
    //     var validationResult: ValidationResult? = nil
    //
    //     // If knees are down during pushup, invalidate the current rep
    //     if exerciseType == "pushup" && currentPhase == "kneeDown" && isRecordingRep {
    //         NSLog("Debug_Pushup: ❌ INVALID REP - Knees touching ground")
    //         isRecordingRep = false
    //         frameBuffer.removeAll()
    //         isTransitioning = true
    //         return (repCount, ValidationResult(isValid: false, message: "Keep knees off the ground"))
    //     }
    //
    //     if lastPhase == "down" && currentPhase == "up" && !isTransitioning {
    //         // Check if all required landmarks are visible before counting rep
    //         guard areRequiredLandmarksVisible() else {
    //             if exerciseType == "squat" {
    //                 NSLog("Debug_Squat: SKIPPING REP - required landmarks not visible")
    //             } else {
    //                 NSLog("Debug_Pushup: SKIPPING REP - required landmarks not visible")
    //             }
    //             isTransitioning = true
    //             lastPhase = currentPhase
    //             return (repCount, ValidationResult(isValid: false, message: "Required landmarks not visible"))
    //         }
    //         // Check for leg angle violation during pushup rep
    //         if exerciseType == "pushup" && hadLegAngleViolation {
    //             NSLog("Debug_Pushup: ❌ INVALID REP - Legs bent too much (< 120°) during rep")
    //             validationResult = ValidationResult(isValid: false, message: "Keep legs straight throughout the pushup")
    //             isRecordingRep = false
    //             frameBuffer.removeAll()
    //             hadLegAngleViolation = false
    //             isTransitioning = true
    //             lastPhase = currentPhase
    //             return (repCount, validationResult)
    //         }
    //
    //         // End of rep - validate if we have frame data
    //         if (exerciseType == "pushup" || exerciseType == "squat") && isRecordingRep && !frameBuffer.isEmpty {
    //             switch exerciseType {
    //             case "pushup":
    //                 validationResult = validatePushupRep(frames: frameBuffer)
    //             case "squat":
    //                 validationResult = validateSquatRep(frames: frameBuffer)
    //             default:
    //                 validationResult = ValidationResult(isValid: true) // fallback
    //             }
    //
    //             if validationResult!.isValid {
    //                 repCount += 1
    //                 if exerciseType == "squat" {
    //                     NSLog("Debug_Squat: ✅ VALID REP COUNTED! Total reps: %d", repCount)
    //                 } else {
    //                     NSLog("Debug_Pushup: ✅ VALID REP COUNTED! Total reps: %d", repCount)
    //                 }
    //             } else {
    //                 if exerciseType == "squat" {
    //                     NSLog("Debug_Squat: ❌ INVALID REP: %@", validationResult!.message ?? "Unknown error")
    //                 } else {
    //                     NSLog("Debug_Pushup: ❌ INVALID REP: %@", validationResult!.message ?? "Unknown error")
    //                 }
    //             }
    //
    //             // Reset recording
    //             isRecordingRep = false
    //             frameBuffer.removeAll()
    //             hadLegAngleViolation = false
    //         } else {
    //             // Non-validated exercise or no frame data
    //             repCount += 1
    //             if exerciseType == "squat" {
    //                 NSLog("Debug_Squat: ✅ REP COUNTED (no validation)! Total reps: %d", repCount)
    //             } else {
    //                 NSLog("Debug_Media: PoseDetector iOS: Rep completed! Total reps: %d", repCount)
    //             }
    //         }
    //
    //         isTransitioning = true
    //     } else if currentPhase == "down" {
    //         isTransitioning = false
    //     }
    //
    //     // Only update lastPhase for definitive phases (not "mid" or "kneeDown")
    //     if currentPhase != "mid" && currentPhase != "kneeDown" {
    //         lastPhase = currentPhase
    //     }
    //     return (repCount, validationResult)
    // }

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

    // MARK: - ML Training Data Capture

    private func captureMLFrameData(
        landmarks: [NormalizedLandmark],
        poseState: PoseState,
        armAngle: Float?,
        legAngle: Float?,
        torsoAngle: Float?,
        shoulderDropPercentage: Float?,
        kneeDropDistance: Float?
    ) {
        frameCounter += 1

        // Only capture every 10th frame
        guard frameCounter % 10 == 0 else { return }

        // Skip frames where landmarks are not fully visible (phase is "unknown")
        guard poseState.currentPhase != "unknown" else {
            NSLog("Debug_ML: Skipping frame %d - landmarks not fully visible", frameCounter)
            return
        }

        // Determine which landmarks to capture based on exercise type
        let landmarkNames: [(name: String, index: Int)]
        switch exerciseType {
        case "pushup":
            landmarkNames = [
                ("nose", 0),
                ("left_shoulder", LandmarkIndices.leftShoulder),
                ("right_shoulder", LandmarkIndices.rightShoulder),
                ("left_elbow", LandmarkIndices.leftElbow),
                ("right_elbow", LandmarkIndices.rightElbow),
                ("left_wrist", LandmarkIndices.leftWrist),
                ("right_wrist", LandmarkIndices.rightWrist),
                ("left_hip", LandmarkIndices.leftHip),
                ("right_hip", LandmarkIndices.rightHip),
                ("left_knee", LandmarkIndices.leftKnee),
                ("right_knee", LandmarkIndices.rightKnee),
                ("left_ankle", LandmarkIndices.leftAnkle),
                ("right_ankle", LandmarkIndices.rightAnkle)
            ]
        case "squat":
            landmarkNames = [
                ("left_shoulder", LandmarkIndices.leftShoulder),
                ("right_shoulder", LandmarkIndices.rightShoulder),
                ("left_hip", LandmarkIndices.leftHip),
                ("right_hip", LandmarkIndices.rightHip),
                ("left_knee", LandmarkIndices.leftKnee),
                ("right_knee", LandmarkIndices.rightKnee),
                ("left_ankle", LandmarkIndices.leftAnkle),
                ("right_ankle", LandmarkIndices.rightAnkle)
            ]
        case "situp":
            landmarkNames = [
                ("nose", 0),
                ("left_shoulder", LandmarkIndices.leftShoulder),
                ("right_shoulder", LandmarkIndices.rightShoulder),
                ("left_hip", LandmarkIndices.leftHip),
                ("right_hip", LandmarkIndices.rightHip),
                ("left_knee", LandmarkIndices.leftKnee),
                ("right_knee", LandmarkIndices.rightKnee),
                ("left_ankle", LandmarkIndices.leftAnkle),
                ("right_ankle", LandmarkIndices.rightAnkle)
            ]
        default:
            return
        }

        // Extract landmark data
        let mlLandmarks = landmarkNames.map { name, index in
            let landmark = landmarks[index]
            return MLLandmarkData(
                name: name,
                x: landmark.x,
                y: landmark.y,
                z: landmark.z ?? 0.0,
                visibility: landmark.visibility?.floatValue ?? 0.0
            )
        }

        // Determine ground truth labels based on current state
        let labeledPhase = poseState.currentPhase
        let labeledFormQuality: String
        if !poseState.isValidRep {
            // Use validation message to determine form quality
            if let message = poseState.validationMessage {
                if message.contains("knee") || message.contains("Knee") {
                    labeledFormQuality = "knees_down"
                } else if message.contains("arm") || message.contains("straight") {
                    labeledFormQuality = "arms_not_straight"
                } else if message.contains("leg") {
                    labeledFormQuality = "legs_bent"
                } else if message.contains("visible") || message.contains("Visible") {
                    labeledFormQuality = "landmarks_not_visible"
                } else {
                    labeledFormQuality = "other_form_issue"
                }
            } else {
                labeledFormQuality = "unknown_issue"
            }
        } else {
            labeledFormQuality = "good"
        }

        // Create frame data
        let frameData = MLFrameData(
            timestamp: Date().timeIntervalSince1970,
            exerciseType: exerciseType,
            frameNumber: frameCounter,
            landmarks: mlLandmarks,
            armAngle: armAngle,
            legAngle: legAngle,
            torsoAngle: torsoAngle,
            shoulderDropPercentage: shoulderDropPercentage,
            kneeDropDistance: kneeDropDistance,
            footStability: nil, // Can be added for squat if needed
            currentPhase: poseState.currentPhase,
            isValidForm: poseState.isValidRep,
            confidence: poseState.confidence,
            labeledPhase: labeledPhase,
            labeledFormQuality: labeledFormQuality
        )

        mlFrameData.append(frameData)
    }
}