package com.fitproof.mediapipe

import android.Manifest
import android.content.pm.PackageManager
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.*
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import kotlin.math.abs

class MediaPipePoseModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var poseLandmarker: PoseLandmarker? = null
    private var camera: Camera? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val processingExecutor: ExecutorService = Executors.newSingleThreadExecutor()

    private var currentExerciseMode: String = "pushup"
    private var isProcessing = false
    private var cameraPreviewView: CameraPreviewView? = null

    // Performance monitoring
    private var frameCount = 0
    private var lastFpsUpdate = System.currentTimeMillis()
    private val processingTimes = mutableListOf<Double>()

    companion object {
        private const val CAMERA_PERMISSION_REQUEST_CODE = 1001
        private const val NAME = "MediaPipePose"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun startCamera(promise: Promise) {
        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "Camera permission not granted")
            return
        }

        val cameraProviderFuture = ProcessCameraProvider.getInstance(reactContext)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                startCameraCapture()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("CAMERA_ERROR", "Failed to start camera: ${e.message}", e)
            }
        }, ContextCompat.getMainExecutor(reactContext))
    }

    @ReactMethod
    fun stopCamera(promise: Promise) {
        // Run on main thread since camera operations need to be on main thread
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        handler.post {
            try {
                cameraProvider?.unbindAll()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("CAMERA_ERROR", "Failed to stop camera: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        processingExecutor.execute {
            try {
                println("MediaPipe Android: Loading model from assets: pose_landmarker_lite.task")
                val baseOptions = BaseOptions.builder()
                    .setModelAssetPath("pose_landmarker_lite.task") // Direct asset path
                    .build()

                val options = PoseLandmarker.PoseLandmarkerOptions.builder()
                    .setBaseOptions(baseOptions)
                    .setRunningMode(RunningMode.LIVE_STREAM)
                    .setMinPoseDetectionConfidence(0.5f)
                    .setMinPosePresenceConfidence(0.5f)
                    .setMinTrackingConfidence(0.5f)
                    .setNumPoses(1)
                    .setResultListener { result: PoseLandmarkerResult, inputImage: MPImage ->
                        handlePoseResult(result, inputImage)
                    }
                    .setErrorListener { error: RuntimeException ->
                        sendEvent("onError", "Pose detection error: ${error.message}")
                    }
                    .build()

                poseLandmarker = PoseLandmarker.createFromOptions(reactContext, options)
                promise.resolve(null)

            } catch (e: Exception) {
                promise.reject("MODEL_LOAD_ERROR", "Failed to load MediaPipe model: ${e.message}", e)
            }
        }
    }

    @ReactMethod
    fun setExerciseMode(exercise: String) {
        currentExerciseMode = exercise
    }

    fun setCameraPreviewView(previewView: CameraPreviewView) {
        this.cameraPreviewView = previewView
    }

    private fun startCameraCapture() {
        val preview = Preview.Builder().build()
        val imageAnalyzer = ImageAnalysis.Builder()
            .setTargetResolution(android.util.Size(1280, 720))
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        imageAnalyzer.setAnalyzer(cameraExecutor) { imageProxy ->
            processImage(imageProxy)
        }

        // Bind preview to the camera preview view
        cameraPreviewView?.let { previewView ->
            preview.setSurfaceProvider(previewView.surfaceProvider)
        }

        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        try {
            cameraProvider?.unbindAll()
            camera = cameraProvider?.bindToLifecycle(
                reactContext.currentActivity as androidx.lifecycle.LifecycleOwner,
                cameraSelector,
                preview,
                imageAnalyzer
            )
        } catch (e: Exception) {
            sendEvent("onError", "Failed to bind camera: ${e.message}")
        }
    }

    private fun processImage(imageProxy: ImageProxy) {
        if (isProcessing || poseLandmarker == null) {
            imageProxy.close()
            return
        }

        isProcessing = true
        val startTime = System.currentTimeMillis()

        try {
            val bitmap = imageProxy.toBitmap()
            val mpImage = BitmapImageBuilder(bitmap).build()
            val timestampMs = System.currentTimeMillis()

            poseLandmarker?.detectAsync(mpImage, timestampMs)

        } catch (e: Exception) {
            sendEvent("onError", "Failed to process frame: ${e.message}")
        } finally {
            val processingTime = (System.currentTimeMillis() - startTime).toDouble()
            updatePerformanceMetrics(processingTime)
            isProcessing = false
            imageProxy.close()
        }
    }

    private fun handlePoseResult(result: PoseLandmarkerResult, inputImage: MPImage) {
        val landmarks = result.landmarks()
        if (landmarks.isEmpty()) return

        val firstPoseLandmarks = landmarks[0]

        // Convert landmarks to WritableArray for React Native
        val landmarksArray = Arguments.createArray()
        for (landmark in firstPoseLandmarks) {
            val landmarkMap = Arguments.createMap().apply {
                putDouble("x", landmark.x().toDouble())
                putDouble("y", landmark.y().toDouble())
                putDouble("z", landmark.z().toDouble())
                putDouble("visibility", landmark.visibility().orElse(0.0f).toDouble())
            }
            landmarksArray.pushMap(landmarkMap)
        }

        // Create pose landmarks data
        val poseLandmarksData = Arguments.createMap().apply {
            putArray("landmarks", landmarksArray)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
            putDouble("processingTime", 0.0) // Will be calculated on JS side
            putDouble("confidence", firstPoseLandmarks.firstOrNull()?.visibility()?.orElse(0.0f)?.toDouble() ?: 0.0)
        }

        // Classify pose
        val (poseType, confidence) = classifyPose(firstPoseLandmarks)

        // Send events
        sendEvent("onLandmarksDetected", poseLandmarksData)

        val poseData = Arguments.createMap().apply {
            putString("pose", poseType)
            putDouble("confidence", confidence.toDouble())
        }
        sendEvent("onPoseClassified", poseData)
    }

    private fun classifyPose(landmarks: List<NormalizedLandmark>): Pair<String, Float> {
        if (landmarks.size < 33) {
            return Pair("Unknown", 0.0f)
        }

        // Key landmarks for pose classification
        val leftShoulder = landmarks[11]  // Left shoulder
        val rightShoulder = landmarks[12] // Right shoulder
        val leftElbow = landmarks[13]     // Left elbow
        val rightElbow = landmarks[14]    // Right elbow
        val leftWrist = landmarks[15]     // Left wrist
        val rightWrist = landmarks[16]    // Right wrist
        val leftHip = landmarks[23]       // Left hip
        val rightHip = landmarks[24]      // Right hip
        val leftKnee = landmarks[25]      // Left knee
        val rightKnee = landmarks[26]     // Right knee

        return when (currentExerciseMode) {
            "pushup" -> classifyPushupPose(leftShoulder, rightShoulder, leftElbow, rightElbow, leftWrist, rightWrist)
            "squat" -> classifySquatPose(leftHip, rightHip, leftKnee, rightKnee)
            else -> Pair("Standing", 0.7f)
        }
    }

    private fun classifyPushupPose(
        leftShoulder: NormalizedLandmark,
        rightShoulder: NormalizedLandmark,
        leftElbow: NormalizedLandmark,
        rightElbow: NormalizedLandmark,
        leftWrist: NormalizedLandmark,
        rightWrist: NormalizedLandmark
    ): Pair<String, Float> {
        val avgElbowY = (leftElbow.y() + rightElbow.y()) / 2
        val avgShoulderY = (leftShoulder.y() + rightShoulder.y()) / 2
        val avgWristY = (leftWrist.y() + rightWrist.y()) / 2

        return when {
            avgElbowY < avgShoulderY - 0.1f && avgWristY < avgShoulderY -> Pair("TopOfPushup", 0.8f)
            avgElbowY > avgShoulderY + 0.05f -> Pair("BottomOfPushup", 0.8f)
            else -> Pair("MidPushup", 0.7f)
        }
    }

    private fun classifySquatPose(
        leftHip: NormalizedLandmark,
        rightHip: NormalizedLandmark,
        leftKnee: NormalizedLandmark,
        rightKnee: NormalizedLandmark
    ): Pair<String, Float> {
        val avgHipY = (leftHip.y() + rightHip.y()) / 2
        val avgKneeY = (leftKnee.y() + rightKnee.y()) / 2
        val kneeHipDiff = avgKneeY - avgHipY

        return when {
            kneeHipDiff < 0.05f -> Pair("BottomOfSquat", 0.8f)
            kneeHipDiff < 0.15f -> Pair("MidSquat", 0.7f)
            else -> Pair("Standing", 0.8f)
        }
    }

    private fun updatePerformanceMetrics(processingTime: Double) {
        processingTimes.add(processingTime)
        if (processingTimes.size > 30) {
            processingTimes.removeAt(0)
        }

        frameCount++
        val now = System.currentTimeMillis()
        if (now - lastFpsUpdate >= 1000) {
            val fps = frameCount.toDouble() / ((now - lastFpsUpdate) / 1000.0)
            val avgProcessingTime = processingTimes.average()

            println("MediaPipe Performance - FPS: ${"%.1f".format(fps)}, Avg Processing: ${"%.1f".format(avgProcessingTime)}ms")

            frameCount = 0
            lastFpsUpdate = now
        }
    }

    private fun sendEvent(eventName: String, data: Any?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    // Extension function to convert ImageProxy to Bitmap
    private fun ImageProxy.toBitmap(): android.graphics.Bitmap {
        val buffer = planes[0].buffer
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        return android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        cameraExecutor.shutdown()
        processingExecutor.shutdown()
        poseLandmarker?.close()
    }
}