import UIKit
import AVFoundation
import MediaPipeTasksVision

class CameraViewController: UIViewController {

    // MARK: - Properties
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var videoOutput: AVCaptureVideoDataOutput?
    private let sessionQueue = DispatchQueue(label: "camera.session.queue")
    private let processingQueue = DispatchQueue(label: "pose.processing.queue", qos: .userInitiated)

    private var poseLandmarker: PoseLandmarker?
    private var isProcessing = false
    private var currentImageWidth: Int = 0
    private var currentImageHeight: Int = 0

    // UI Elements
    private var backButton: UIButton!
    private var repCountLabel: UILabel!
    private var overlayView: PoseLandmarkOverlayView!
    private var countdownLabel: UILabel!

    // Countdown state
    private var countdownTimer: Timer?
    private var countdownValue: Int = 5
    private var isCountdownActive: Bool = true

    // Exercise tracking
    var exerciseType: String = "pushup"
    private var repCount: Int = 0
    private var poseDetector: PoseDetector?
    private var isCleanedUp = false

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        NSLog("Debug_Media: Are you getting this? ----------------------------")
        NSLog("Debug_Media: 🔥 CameraViewController viewDidLoad - Exercise: %@", exerciseType)
        NSLog("Debug_Media: 🎬 Camera permissions status: %d", AVCaptureDevice.authorizationStatus(for: .video).rawValue)

        // Initialize pose detector for this exercise
        poseDetector = PoseDetector(exerciseType: exerciseType)

        // Set orientation based on exercise type
        setOrientationForExercise()

        // Setup UI
        setupUI()

        // Load MediaPipe model
        loadMediaPipeModel()

        // Setup camera
        setupCamera()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        // Hide navigation bar and status bar for fullscreen experience
        navigationController?.setNavigationBarHidden(true, animated: animated)
        setNeedsStatusBarAppearanceUpdate()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startCamera()
        updatePreviewLayerFrame()
        startCountdown()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updatePreviewLayerFrame()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        NSLog("Debug_Media: 🔙 View will disappear - calling cleanup...")
        cleanup()
    }

    override var prefersStatusBarHidden: Bool {
        return true
    }

    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        switch exerciseType {
        case "pushup", "situp":
            return .landscape
        case "squat":
            return .portrait
        default:
            return .portrait
        }
    }

    override var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation {
        switch exerciseType {
        case "pushup", "situp":
            return .landscapeRight
        case "squat":
            return .portrait
        default:
            return .portrait
        }
    }

    // MARK: - Setup Methods

    private func setOrientationForExercise() {
        // Note: For iOS 12-15 compatibility, we rely on supportedInterfaceOrientations
        // and preferredInterfaceOrientationForPresentation methods instead of
        // requestGeometryUpdate which is only available in iOS 16+

        // The orientation will be handled by the supportedInterfaceOrientations
        // and preferredInterfaceOrientationForPresentation override methods
    }

    private func setupUI() {
        view.backgroundColor = .black

        // Create back button
        backButton = UIButton(type: .system)
        backButton.setImage(UIImage(systemName: "xmark"), for: .normal)
        backButton.tintColor = .white
        backButton.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        backButton.layer.cornerRadius = 20
        backButton.addTarget(self, action: #selector(backButtonTapped), for: .touchUpInside)
        backButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(backButton)

        // Create rep counter
        repCountLabel = UILabel()
        repCountLabel.text = "Reps: \(repCount)"
        repCountLabel.textColor = .white
        repCountLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        repCountLabel.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        repCountLabel.textAlignment = .center
        repCountLabel.layer.cornerRadius = 8
        repCountLabel.clipsToBounds = true
        repCountLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(repCountLabel)

        // Create countdown label (center of screen)
        countdownLabel = UILabel()
        countdownLabel.text = "5"
        countdownLabel.textColor = .white
        countdownLabel.font = UIFont.systemFont(ofSize: 120, weight: .bold)
        countdownLabel.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        countdownLabel.textAlignment = .center
        countdownLabel.layer.cornerRadius = 75
        countdownLabel.clipsToBounds = true
        countdownLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(countdownLabel)

        // Create landmark overlay (add first so it's behind buttons)
        overlayView = PoseLandmarkOverlayView()
        overlayView.backgroundColor = .clear
        overlayView.translatesAutoresizingMaskIntoConstraints = false
        view.insertSubview(overlayView, at: 0)

        // Setup constraints
        NSLayoutConstraint.activate([
            // Back button (top-left)
            backButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            backButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            backButton.widthAnchor.constraint(equalToConstant: 40),
            backButton.heightAnchor.constraint(equalToConstant: 40),

            // Rep counter (top-right)
            repCountLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            repCountLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            repCountLabel.heightAnchor.constraint(equalToConstant: 40),
            repCountLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 100),

            // Countdown label (center)
            countdownLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            countdownLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            countdownLabel.widthAnchor.constraint(equalToConstant: 150),
            countdownLabel.heightAnchor.constraint(equalToConstant: 150),

            // Overlay (fullscreen)
            overlayView.topAnchor.constraint(equalTo: view.topAnchor),
            overlayView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlayView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadMediaPipeModel() {
        NSLog("Debug_Media: MediaPipe iOS: Starting to load model...")

        processingQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                NSLog("Debug_Media: MediaPipe iOS: Creating PoseLandmarkerOptions...")
                let options = PoseLandmarkerOptions()

                // Use the model file from the app's main bundle
                if let bundlePath = Bundle.main.path(forResource: "pose_landmarker_lite", ofType: "task") {
                    NSLog("Debug_Media: MediaPipe iOS: Found model at path: %@", bundlePath)
                    options.baseOptions.modelAssetPath = bundlePath
                } else {
                    NSLog("Debug_Media: MediaPipe iOS: Model not found in bundle, using fallback path")
                    options.baseOptions.modelAssetPath = "pose_landmarker_lite.task"
                }

                NSLog("Debug_Media: MediaPipe iOS: Setting up options...")
                options.runningMode = .liveStream
                options.minPoseDetectionConfidence = 0.5
                options.minPosePresenceConfidence = 0.5
                options.minTrackingConfidence = 0.5
                options.numPoses = 1
                options.poseLandmarkerLiveStreamDelegate = self

                NSLog("Debug_Media: MediaPipe iOS: Creating PoseLandmarker...")
                self.poseLandmarker = try PoseLandmarker(options: options)

                DispatchQueue.main.async {
                    NSLog("Debug_Media: MediaPipe iOS: Model loaded successfully!")
                    NSLog("Debug_Media: 🎯 PoseLandmarker created: %@", self.poseLandmarker != nil ? "SUCCESS" : "FAILED")
                }
            } catch {
                DispatchQueue.main.async {
                    NSLog("Debug_Media: MediaPipe iOS: Failed to load model: %@", error.localizedDescription)
                    NSLog("Debug_Media: MediaPipe iOS: Error details: %@", error.localizedDescription)
                    self.showAlert(title: "Error", message: "Failed to load MediaPipe model: \(error.localizedDescription)")
                }
            }
        }
    }

    private func setupCamera() {
        captureSession = AVCaptureSession()
        guard let captureSession = captureSession else { return }

        captureSession.beginConfiguration()
        captureSession.sessionPreset = .hd1280x720

        // Add camera input (front camera)
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

        // Create preview layer
        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession)
        previewLayer?.videoGravity = .resizeAspectFill

        if let previewLayer = previewLayer {
            view.layer.insertSublayer(previewLayer, at: 0)
        }

        captureSession.commitConfiguration()
        NSLog("Debug_Media: 🎬 Capture session setup completed: %@", captureSession != nil ? "SUCCESS" : "FAILED")

        // Set camera to maximum zoom out for widest field of view
        do {
            try camera.lockForConfiguration()
            camera.videoZoomFactor = camera.minAvailableVideoZoomFactor
            camera.unlockForConfiguration()
        } catch {
            NSLog("Debug_Media: Failed to set zoom: %@", error.localizedDescription)
        }
    }

    private func startCamera() {
        sessionQueue.async { [weak self] in
            NSLog("Debug_Media: 🎬 Starting camera session...")
            self?.captureSession?.startRunning()
            NSLog("Debug_Media: 🎬 Camera session started: %@", self?.captureSession?.isRunning == true ? "RUNNING" : "NOT_RUNNING")
        }
    }

    private func stopCamera() {
        guard let captureSession = captureSession, captureSession.isRunning else {
            NSLog("Debug_Media: 🎬 Camera session already stopped or nil")
            return
        }

        sessionQueue.async { [weak self] in
            NSLog("Debug_Media: 🎬 Stopping camera session on background queue...")
            self?.captureSession?.stopRunning()
            NSLog("Debug_Media: 🎬 Camera session stop requested")
        }
    }

    private func updatePreviewLayerFrame() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let previewLayer = self.previewLayer else { return }

            previewLayer.frame = self.view.bounds

            // Set the correct video orientation based on device orientation
            if let connection = previewLayer.connection {
                let orientation = UIApplication.shared.statusBarOrientation
                switch orientation {
                case .portrait:
                    connection.videoOrientation = .portrait
                case .portraitUpsideDown:
                    connection.videoOrientation = .portraitUpsideDown
                case .landscapeLeft:
                    connection.videoOrientation = .landscapeLeft
                case .landscapeRight:
                    connection.videoOrientation = .landscapeRight
                default:
                    connection.videoOrientation = .portrait
                }
            }
        }
    }

    // MARK: - Actions

    @objc private func backButtonTapped() {
        NSLog("Debug_Media: 🔙 Back button tapped - starting cleanup...")

        // Comprehensive cleanup to prevent crashes
        cleanup()

        DispatchQueue.main.async { [weak self] in
            NSLog("Debug_Media: 🔙 Dismissing view controller...")
            self?.dismiss(animated: true) {
                NSLog("Debug_Media: 🔙 View controller dismissed successfully")
            }
        }
    }

    private func cleanup() {
        // Prevent multiple cleanup calls
        guard !isCleanedUp else {
            NSLog("Debug_Media: 🧹 ⚠️ Cleanup already performed, skipping...")
            return
        }

        NSLog("Debug_Media: 🧹 Starting comprehensive cleanup...")
        isCleanedUp = true

        // Stop camera session
        NSLog("Debug_Media: 🧹 Stopping camera session...")
        stopCamera()
        NSLog("Debug_Media: 🧹 Camera session stopped")

        // Clear MediaPipe
        NSLog("Debug_Media: 🧹 Clearing MediaPipe...")
        poseLandmarker = nil
        NSLog("Debug_Media: 🧹 MediaPipe cleared")

        // Clear pose detector
        NSLog("Debug_Media: 🧹 Clearing pose detector...")
        poseDetector = nil
        NSLog("Debug_Media: 🧹 Pose detector cleared")

        // Clear countdown timer
        NSLog("Debug_Media: 🧹 Clearing countdown timer...")
        countdownTimer?.invalidate()
        countdownTimer = nil
        NSLog("Debug_Media: 🧹 Countdown timer cleared")

        // Clear overlay
        NSLog("Debug_Media: 🧹 Clearing overlay...")
        overlayView?.clear()
        NSLog("Debug_Media: 🧹 Overlay cleared")

        // Reset processing flags
        NSLog("Debug_Media: 🧹 Resetting processing flags...")
        isProcessing = false
        NSLog("Debug_Media: 🧹 ✅ Cleanup completed successfully")
    }

    private func updateRepCount(_ newCount: Int) {
        repCount = newCount
        DispatchQueue.main.async { [weak self] in
            self?.repCountLabel.text = "Reps: \(self?.repCount ?? 0)"
        }
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    // MARK: - Countdown Methods

    private func startCountdown() {
        countdownValue = 5
        isCountdownActive = true
        countdownLabel.isHidden = false
        countdownLabel.text = String(countdownValue)

        NSLog("Debug_Media: Starting 5-second countdown before exercise detection")

        countdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            self?.updateCountdown()
        }
    }

    private func updateCountdown() {
        countdownValue -= 1

        if countdownValue > 0 {
            countdownLabel.text = String(countdownValue)

            // Add animation for visual feedback
            UIView.animate(withDuration: 0.3, animations: {
                self.countdownLabel.transform = CGAffineTransform(scaleX: 1.2, y: 1.2)
            }) { _ in
                UIView.animate(withDuration: 0.3) {
                    self.countdownLabel.transform = CGAffineTransform.identity
                }
            }
        } else {
            // Countdown finished
            finishCountdown()
        }
    }

    private func finishCountdown() {
        countdownTimer?.invalidate()
        countdownTimer = nil
        isCountdownActive = false

        // Show "GO!" briefly then hide
        countdownLabel.text = "GO!"
        countdownLabel.backgroundColor = UIColor.green.withAlphaComponent(0.7)

        NSLog("Debug_Media: Countdown finished - exercise detection now active")

        UIView.animate(withDuration: 0.5, animations: {
            self.countdownLabel.transform = CGAffineTransform(scaleX: 1.5, y: 1.5)
        }) { _ in
            UIView.animate(withDuration: 0.5, delay: 0.5, options: [], animations: {
                self.countdownLabel.alpha = 0
            }) { _ in
                self.countdownLabel.isHidden = true
                self.countdownLabel.alpha = 1
                self.countdownLabel.backgroundColor = UIColor.black.withAlphaComponent(0.7)
                self.countdownLabel.transform = CGAffineTransform.identity
            }
        }
    }

    // MARK: - Cleanup

    deinit {
        NSLog("Debug_Media: 🧹 CameraViewController deinit - final cleanup")
        cleanup()
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraViewController: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !isProcessing else {
            NSLog("Debug_Media: MediaPipe iOS: Skipping frame - already processing")
            return
        }

        guard let poseLandmarker = poseLandmarker else {
            NSLog("Debug_Media: MediaPipe iOS: No pose landmarker available")
            return
        }

        isProcessing = true

        do {
            // Get image dimensions
            if let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) {
                currentImageWidth = CVPixelBufferGetWidth(imageBuffer)
                currentImageHeight = CVPixelBufferGetHeight(imageBuffer)
            }

            let image = try MPImage(sampleBuffer: sampleBuffer)
            let timestampMs = Int(Date().timeIntervalSince1970 * 1000)

            try poseLandmarker.detectAsync(image: image, timestampInMilliseconds: timestampMs)
        } catch {
            NSLog("Debug_Media: MediaPipe iOS: Failed to process frame: %@", error.localizedDescription)
        }

        isProcessing = false
    }
}

// MARK: - PoseLandmarkerLiveStreamDelegate

extension CameraViewController: PoseLandmarkerLiveStreamDelegate {
    func poseLandmarker(_ poseLandmarker: PoseLandmarker, didFinishDetection result: PoseLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {
        // Safety check: ignore callbacks if we're cleaned up
        guard self.poseLandmarker != nil else {
            NSLog("Debug_Media: 🔍 Ignoring MediaPipe callback - already cleaned up")
            return
        }

        if let error = error {
            NSLog("Debug_Media: MediaPipe iOS: Pose detection error: %@", error.localizedDescription)
            return
        }

        guard let result = result,
              let landmarks = result.landmarks.first else {
            // Clear overlay if no poses detected
            DispatchQueue.main.async { [weak self] in
                self?.overlayView.clear()
            }
            return
        }

        // Only analyze pose if countdown is finished
        if !isCountdownActive, let poseDetector = poseDetector {
            let poseState = poseDetector.detectPose(landmarks: landmarks)

            // Update rep count if it changed
            if poseState.repCount != repCount {
                updateRepCount(poseState.repCount)
            }

            // Log rep count changes only
            if poseState.repCount != repCount {
                NSLog("Debug_Media: 💪 Rep completed! Exercise=%@, Phase=%@, Total Reps=%d", exerciseType, poseState.currentPhase, poseState.repCount)
            }
        } else if isCountdownActive {
            NSLog("Debug_Media: Countdown active - skipping pose analysis")
        }

        // Update the overlay with new pose results
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.overlayView.setResults(
                result,
                imageHeight: self.currentImageHeight,
                imageWidth: self.currentImageWidth,
                exerciseType: self.exerciseType
            )
        }
    }
}
