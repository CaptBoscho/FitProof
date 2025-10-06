import Foundation
import React
import AVFoundation
import MediaPipeTasksVision

@objc(MediaPipePose)
class MediaPipePose: RCTEventEmitter {

    // MARK: - Properties
    private var poseLandmarker: PoseLandmarker?
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoOutput: AVCaptureVideoDataOutput?
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private let processingQueue = DispatchQueue(label: "pose.processing.queue", qos: .userInitiated)
    private var currentExerciseMode: String = "pushup"
    private var isProcessing = false

    // Performance monitoring
    private var frameCount = 0
    private var lastFpsUpdate = Date()
    private var processingTimes: [Double] = []

    override init() {
        super.init()
        setupCaptureSession()
    }

    // MARK: - React Native Bridge Methods

    @objc
    func startCamera(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        sessionQueue.async { [weak self] in
            guard let self = self else { return }

            self.requestCameraPermission { granted in
                if granted {
                    self.captureSession?.startRunning()
                    DispatchQueue.main.async {
                        resolve(nil)
                    }
                } else {
                    DispatchQueue.main.async {
                        reject("PERMISSION_DENIED", "Camera permission denied", nil)
                    }
                }
            }
        }
    }

    @objc
    func stopCamera(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        sessionQueue.async { [weak self] in
            self?.captureSession?.stopRunning()
            DispatchQueue.main.async {
                resolve(nil)
            }
        }
    }

    @objc
    func loadModel(_ modelPath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        processingQueue.async { [weak self] in
            do {
                let options = PoseLandmarkerOptions()
                // Use the model file from the app's main bundle
                if let bundlePath = Bundle.main.path(forResource: "pose_landmarker_lite", ofType: "task") {
                    NSLog("Debug_Media: MediaPipe: Found model at path: %@", bundlePath)
                    options.baseOptions.modelAssetPath = bundlePath
                } else {
                    NSLog("Debug_Media: MediaPipe: Model not found in bundle, using fallback path")
                    // Fallback: try direct asset path
                    options.baseOptions.modelAssetPath = "pose_landmarker_lite.task"
                }
                options.runningMode = .liveStream
                options.minPoseDetectionConfidence = 0.5
                options.minPosePresenceConfidence = 0.5
                options.minTrackingConfidence = 0.5
                options.numPoses = 1
                options.poseLandmarkerLiveStreamDelegate = self

                self?.poseLandmarker = try PoseLandmarker(options: options)

                DispatchQueue.main.async {
                    resolve(nil)
                }
            } catch {
                DispatchQueue.main.async {
                    reject("MODEL_LOAD_ERROR", "Failed to load MediaPipe model: \\(error.localizedDescription)", error)
                }
            }
        }
    }

    @objc
    func setExerciseMode(_ exercise: String) {
        currentExerciseMode = exercise
    }

    @objc
    func openNativeCameraActivity(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        NSLog("Debug_Media: 🚀 openNativeCameraActivity called from React Native")
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                NSLog("Debug_Media: ❌ Failed to get self reference")
                reject("SELF_REFERENCE_ERROR", "Failed to get self reference", nil)
                return
            }

            NSLog("Debug_Media: MediaPipe iOS: Opening native camera activity for exercise: %@", self.currentExerciseMode)

            do {
                let cameraViewController = CameraViewController()
                cameraViewController.exerciseType = self.currentExerciseMode
                cameraViewController.modalPresentationStyle = .fullScreen

                if let presentingViewController = RCTPresentedViewController() {
                    NSLog("Debug_Media: MediaPipe iOS: Presenting camera view controller")
                    presentingViewController.present(cameraViewController, animated: true) {
                        NSLog("Debug_Media: MediaPipe iOS: Camera view controller presented successfully")
                        resolve(nil)
                    }
                } else {
                    NSLog("Debug_Media: MediaPipe iOS: No presenting view controller found")
                    reject("NO_PRESENTING_VC", "No presenting view controller found", nil)
                }
            } catch {
                NSLog("Debug_Media: MediaPipe iOS: Error creating camera view controller: %@", error.localizedDescription)
                reject("CAMERA_VC_ERROR", "Failed to open native camera: \(error.localizedDescription)", error)
            }
        }
    }

    // MARK: - Camera Setup

    private func setupCaptureSession() {
        captureSession = AVCaptureSession()
        guard let captureSession = captureSession else { return }

        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1280x720 // Optimize for performance

        // Add camera input
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            captureSession.commitConfiguration()
            return
        }

        if captureSession.canAddInput(input) {
            captureSession.addInput(input)
        }

        // Add video output
        videoOutput = AVCaptureVideoDataOutput()
        videoOutput?.setSampleBufferDelegate(self, queue: processingQueue)
        videoOutput?.videoSettings = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
        ]

        if let videoOutput = videoOutput, captureSession.canAddOutput(videoOutput) {
            captureSession.addOutput(videoOutput)
        }

        captureSession.commitConfiguration()
    }

    private func requestCameraPermission(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                completion(granted)
            }
        default:
            completion(false)
        }
    }

    // MARK: - Performance Monitoring

    private func updatePerformanceMetrics(processingTime: Double) {
        processingTimes.append(processingTime)
        if processingTimes.count > 30 {
            processingTimes.removeFirst()
        }

        frameCount += 1
        let now = Date()
        if now.timeIntervalSince(lastFpsUpdate) >= 1.0 {
            let fps = Double(frameCount) / now.timeIntervalSince(lastFpsUpdate)
            let avgProcessingTime = processingTimes.reduce(0, +) / Double(processingTimes.count)

            NSLog("Debug_Media: MediaPipe Performance - FPS: %.1f, Avg Processing: %.1fms", fps, avgProcessingTime * 1000)

            frameCount = 0
            lastFpsUpdate = now
        }
    }

    // MARK: - Pose Classification (Basic Implementation)

    private func classifyPose(landmarks: [NormalizedLandmark]) -> (String, Float) {
        // Basic pose classification based on key landmarks
        // This is a simplified version - you'll expand this for actual exercise detection

        guard landmarks.count >= 33 else {
            return ("Unknown", 0.0)
        }

        // Key landmarks for pose classification
        let leftShoulder = landmarks[11]  // Left shoulder
        let rightShoulder = landmarks[12] // Right shoulder
        let leftElbow = landmarks[13]     // Left elbow
        let rightElbow = landmarks[14]    // Right elbow
        let leftWrist = landmarks[15]     // Left wrist
        let rightWrist = landmarks[16]    // Right wrist
        let leftHip = landmarks[23]       // Left hip
        let rightHip = landmarks[24]      // Right hip
        let leftKnee = landmarks[25]      // Left knee
        let rightKnee = landmarks[26]     // Right knee

        // Simple classification based on current exercise mode
        switch currentExerciseMode {
        case "pushup":
            return classifyPushupPose(
                leftShoulder: leftShoulder,
                rightShoulder: rightShoulder,
                leftElbow: leftElbow,
                rightElbow: rightElbow,
                leftWrist: leftWrist,
                rightWrist: rightWrist
            )
        case "squat":
            return classifySquatPose(
                leftHip: leftHip,
                rightHip: rightHip,
                leftKnee: leftKnee,
                rightKnee: rightKnee
            )
        default:
            return ("Standing", 0.7)
        }
    }

    private func classifyPushupPose(leftShoulder: NormalizedLandmark, rightShoulder: NormalizedLandmark,
                                   leftElbow: NormalizedLandmark, rightElbow: NormalizedLandmark,
                                   leftWrist: NormalizedLandmark, rightWrist: NormalizedLandmark) -> (String, Float) {
        // Calculate average elbow height relative to shoulders
        let avgElbowY = (leftElbow.y + rightElbow.y) / 2
        let avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2
        let avgWristY = (leftWrist.y + rightWrist.y) / 2

        // Basic pushup classification
        if avgElbowY < avgShoulderY - 0.1 && avgWristY < avgShoulderY {
            return ("TopOfPushup", 0.8)
        } else if avgElbowY > avgShoulderY + 0.05 {
            return ("BottomOfPushup", 0.8)
        } else {
            return ("MidPushup", 0.7)
        }
    }

    private func classifySquatPose(leftHip: NormalizedLandmark, rightHip: NormalizedLandmark,
                                  leftKnee: NormalizedLandmark, rightKnee: NormalizedLandmark) -> (String, Float) {
        // Calculate knee position relative to hips
        let avgHipY = (leftHip.y + rightHip.y) / 2
        let avgKneeY = (leftKnee.y + rightKnee.y) / 2

        let kneeHipDiff = avgKneeY - avgHipY

        if kneeHipDiff < 0.05 {
            return ("BottomOfSquat", 0.8)
        } else if kneeHipDiff < 0.15 {
            return ("MidSquat", 0.7)
        } else {
            return ("Standing", 0.8)
        }
    }

    // MARK: - React Native Event Emitter

    override func supportedEvents() -> [String]! {
        return ["onLandmarksDetected", "onPoseClassified", "onError"]
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension MediaPipePose: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !isProcessing,
              let poseLandmarker = poseLandmarker else { return }

        isProcessing = true
        let startTime = Date()

        do {
            let image = try MPImage(sampleBuffer: sampleBuffer)
            let timestampMs = Int(Date().timeIntervalSince1970 * 1000)

            try poseLandmarker.detectAsync(image: image, timestampInMilliseconds: timestampMs)
        } catch {
            sendEvent(withName: "onError", body: "Failed to process frame: \\(error.localizedDescription)")
        }

        let processingTime = Date().timeIntervalSince(startTime)
        updatePerformanceMetrics(processingTime: processingTime)
        isProcessing = false
    }
}

// MARK: - PoseLandmarkerLiveStreamDelegate

extension MediaPipePose: PoseLandmarkerLiveStreamDelegate {
    func poseLandmarker(_ poseLandmarker: PoseLandmarker, didFinishDetection result: PoseLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {

        if let error = error {
            sendEvent(withName: "onError", body: "Pose detection error: \\(error.localizedDescription)")
            return
        }

        guard let result = result,
              let landmarks = result.landmarks.first else {
            return
        }

        // Convert landmarks to dictionary format for React Native
        let landmarksData = landmarks.map { landmark in
            return [
                "x": landmark.x,
                "y": landmark.y,
                "z": landmark.z,
                "visibility": landmark.visibility ?? 0.0
            ]
        }

        let poseLandmarksData: [String: Any] = [
            "landmarks": landmarksData,
            "timestamp": timestampInMilliseconds,
            "processingTime": 0, // Will be calculated in JS side
            "confidence": result.landmarks.first?.first?.visibility ?? 0.0
        ]

        // Classify pose
        let (poseType, confidence) = classifyPose(landmarks: landmarks)

        // Send events to React Native
        sendEvent(withName: "onLandmarksDetected", body: poseLandmarksData)
        sendEvent(withName: "onPoseClassified", body: [
            "pose": poseType,
            "confidence": confidence
        ])
    }
}