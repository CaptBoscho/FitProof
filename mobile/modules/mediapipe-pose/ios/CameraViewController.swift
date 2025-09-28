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

    // Exercise tracking
    var exerciseType: String = "pushup"
    private var repCount: Int = 0
    private var poseDetector: PoseDetector?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

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
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopCamera()
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

        // Create landmark overlay
        overlayView = PoseLandmarkOverlayView()
        overlayView.backgroundColor = .clear
        overlayView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlayView)

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

            // Overlay (fullscreen)
            overlayView.topAnchor.constraint(equalTo: view.topAnchor),
            overlayView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlayView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    private func loadMediaPipeModel() {
        processingQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                let options = PoseLandmarkerOptions()

                // Use the model file from the app's main bundle
                if let bundlePath = Bundle.main.path(forResource: "pose_landmarker_lite", ofType: "task") {
                    print("MediaPipe iOS: Found model at path: \(bundlePath)")
                    options.baseOptions.modelAssetPath = bundlePath
                } else {
                    print("MediaPipe iOS: Model not found in bundle, using fallback path")
                    options.baseOptions.modelAssetPath = "pose_landmarker_lite.task"
                }

                options.runningMode = .liveStream
                options.minPoseDetectionConfidence = 0.5
                options.minPosePresenceConfidence = 0.5
                options.minTrackingConfidence = 0.5
                options.numPoses = 1
                options.poseLandmarkerLiveStreamDelegate = self

                self.poseLandmarker = try PoseLandmarker(options: options)

                DispatchQueue.main.async {
                    print("MediaPipe iOS: Model loaded successfully")
                }
            } catch {
                DispatchQueue.main.async {
                    print("MediaPipe iOS: Failed to load model: \(error.localizedDescription)")
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
        previewLayer?.frame = view.bounds

        if let previewLayer = previewLayer {
            view.layer.insertSublayer(previewLayer, at: 0)
        }

        captureSession.commitConfiguration()

        // Set camera to maximum zoom out for widest field of view
        do {
            try camera.lockForConfiguration()
            camera.videoZoomFactor = camera.minAvailableVideoZoomFactor
            camera.unlockForConfiguration()
        } catch {
            print("Failed to set zoom: \(error)")
        }
    }

    private func startCamera() {
        sessionQueue.async { [weak self] in
            self?.captureSession?.startRunning()
        }
    }

    private func stopCamera() {
        sessionQueue.async { [weak self] in
            self?.captureSession?.stopRunning()
        }
    }

    // MARK: - Actions

    @objc private func backButtonTapped() {
        dismiss(animated: true)
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

    // MARK: - Cleanup

    deinit {
        stopCamera()
        poseLandmarker = nil
    }
}

// MARK: - AVCaptureVideoDataOutputSampleBufferDelegate

extension CameraViewController: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard !isProcessing,
              let poseLandmarker = poseLandmarker else { return }

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
            print("MediaPipe iOS: Failed to process frame: \(error.localizedDescription)")
        }

        isProcessing = false
    }
}

// MARK: - PoseLandmarkerLiveStreamDelegate

extension CameraViewController: PoseLandmarkerLiveStreamDelegate {
    func poseLandmarker(_ poseLandmarker: PoseLandmarker, didFinishDetection result: PoseLandmarkerResult?, timestampInMilliseconds: Int, error: Error?) {

        if let error = error {
            print("MediaPipe iOS: Pose detection error: \(error.localizedDescription)")
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

        print("MediaPipe iOS: Detected pose with \(landmarks.count) landmarks")

        // Analyze pose for exercise-specific detection
        if let poseDetector = poseDetector {
            let poseState = poseDetector.detectPose(landmarks: landmarks)

            // Update rep count if it changed
            if poseState.repCount != repCount {
                updateRepCount(poseState.repCount)
            }

            // Log pose analysis results
            print("MediaPipe iOS: Exercise=\(exerciseType), Phase=\(poseState.currentPhase), Confidence=\(poseState.confidence), Reps=\(poseState.repCount)")
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