package com.fitproof.mediapipe

import android.Manifest
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.setPadding
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.*
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class CameraActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var overlayView: PoseLandmarkOverlay
    private lateinit var backButton: ImageButton
    private lateinit var repCountText: TextView
    private var camera: Camera? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val processingExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private var poseLandmarker: PoseLandmarker? = null
    private var isProcessing = false
    private var currentImageWidth = 0
    private var currentImageHeight = 0
    private var exerciseType: String = "pushup"
    private var repCount = 0

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            startCamera()
        } else {
            Toast.makeText(this, "Camera permission is required", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

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

        // Make activity fullscreen using modern approach
        window.decorView.systemUiVisibility = (
            android.view.View.SYSTEM_UI_FLAG_FULLSCREEN or
            android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        // Create the camera preview and overlay layout
        val frameLayout = FrameLayout(this)

        // Create a fullscreen PreviewView
        previewView = PreviewView(this).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }

        // Create the pose landmark overlay
        overlayView = PoseLandmarkOverlay(this)

        // Create back button
        backButton = ImageButton(this).apply {
            setImageResource(android.R.drawable.ic_menu_close_clear_cancel)
            background = null
            setColorFilter(Color.WHITE)
            setPadding(24)
            setOnClickListener {
                finish()
            }
        }

        // Create rep counter
        repCountText = TextView(this).apply {
            text = "Reps: $repCount"
            textSize = 24f
            setTextColor(Color.WHITE)
            setPadding(32)
            setBackgroundColor(Color.parseColor("#80000000")) // Semi-transparent black
        }

        // Layout parameters for back button (top-left)
        val backButtonParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            setMargins(32, 32, 0, 0)
        }

        // Layout parameters for rep counter (top-right)
        val repCountParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, 32, 32, 0)
        }

        // Add views to frame layout
        frameLayout.addView(previewView)
        frameLayout.addView(overlayView)
        frameLayout.addView(backButton, backButtonParams)
        frameLayout.addView(repCountText, repCountParams)

        setContentView(frameLayout)

        // Hide action bar for fullscreen
        supportActionBar?.hide()

        // Load MediaPipe model
        loadMediaPipeModel()

        // Check camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera()
        } else {
            requestPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    private fun loadMediaPipeModel() {
        processingExecutor.execute {
            try {
                val baseOptions = BaseOptions.builder()
                    .setModelAssetPath("pose_landmarker_lite.task")
                    .build()

                val options = PoseLandmarker.PoseLandmarkerOptions.builder()
                    .setBaseOptions(baseOptions)
                    .setRunningMode(RunningMode.LIVE_STREAM)
                    .setMinPoseDetectionConfidence(0.5f)
                    .setMinPosePresenceConfidence(0.5f)
                    .setMinTrackingConfidence(0.5f)
                    .setNumPoses(1)
                    .setResultListener { result: PoseLandmarkerResult, inputImage: MPImage ->
                        handlePoseResult(result)
                    }
                    .setErrorListener { error: RuntimeException ->
                        runOnUiThread {
                            Toast.makeText(this, "Pose detection error: ${error.message}", Toast.LENGTH_SHORT).show()
                        }
                    }
                    .build()

                poseLandmarker = PoseLandmarker.createFromOptions(this, options)
            } catch (e: Exception) {
                runOnUiThread {
                    Toast.makeText(this, "Failed to load MediaPipe model: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
            } catch (e: Exception) {
                Toast.makeText(this, "Failed to start camera: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun bindCameraUseCases() {
        val preview = Preview.Builder().build()
        val imageAnalyzer = ImageAnalysis.Builder()
            .setResolutionSelector(
                androidx.camera.core.resolutionselector.ResolutionSelector.Builder()
                    .setAspectRatioStrategy(androidx.camera.core.resolutionselector.AspectRatioStrategy.RATIO_16_9_FALLBACK_AUTO_STRATEGY)
                    .build()
            )
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        imageAnalyzer.setAnalyzer(cameraExecutor) { imageProxy ->
            processImage(imageProxy)
        }

        preview.setSurfaceProvider(previewView.surfaceProvider)

        val cameraSelector = CameraSelector.DEFAULT_FRONT_CAMERA

        try {
            cameraProvider?.unbindAll()
            camera = cameraProvider?.bindToLifecycle(
                this,
                cameraSelector,
                preview,
                imageAnalyzer
            )

            // Set camera to maximum zoom out for widest field of view
            camera?.let { cam ->
                val cameraControl = cam.cameraControl
                val cameraInfo = cam.cameraInfo

                // Set zoom to minimum (maximum zoom out)
                val minZoomRatio = cameraInfo.zoomState.value?.minZoomRatio ?: 0.1f
                cameraControl.setZoomRatio(minZoomRatio)
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to bind camera: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun processImage(imageProxy: ImageProxy) {
        if (isProcessing || poseLandmarker == null) {
            imageProxy.close()
            return
        }

        isProcessing = true
        try {
            val bitmap = imageProxy.toBitmap()

            // Store current image dimensions
            currentImageWidth = bitmap.width
            currentImageHeight = bitmap.height

            // Log actual image dimensions
            println("MediaPipe: Processing image - ImageProxy size: ${imageProxy.width}x${imageProxy.height}, Bitmap size: ${bitmap.width}x${bitmap.height}")

            val mpImage = BitmapImageBuilder(bitmap).build()
            val timestampMs = System.currentTimeMillis()

            poseLandmarker?.detectAsync(mpImage, timestampMs)
        } catch (e: Exception) {
            runOnUiThread {
                Toast.makeText(this, "Failed to process frame: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        } finally {
            isProcessing = false
            imageProxy.close()
        }
    }

    private fun handlePoseResult(result: PoseLandmarkerResult) {
        val landmarks = result.landmarks()
        if (landmarks.isNotEmpty()) {
            val firstPose = landmarks[0]
            println("MediaPipe: Detected pose with ${firstPose.size} landmarks")

            // Log first few landmarks for debugging
            for (i in 0 until minOf(5, firstPose.size)) {
                val landmark = firstPose[i]
                println("MediaPipe Landmark $i: x=${landmark.x()}, y=${landmark.y()}, z=${landmark.z()}, visibility=${landmark.visibility().orElse(0.0f)}")
            }

            // Update the overlay with new pose results
            runOnUiThread {
                overlayView.setResults(
                    result,
                    imageHeight = currentImageHeight,
                    imageWidth = currentImageWidth
                )
            }
        } else {
            println("MediaPipe: No poses detected")
            // Clear overlay if no poses detected
            runOnUiThread {
                overlayView.clear()
            }
        }
    }

    private fun updateRepCount(newCount: Int) {
        repCount = newCount
        runOnUiThread {
            repCountText.text = "Reps: $repCount"
        }
    }

    // toBitmap() extension is now built into ImageProxy, so we don't need our own implementation

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        processingExecutor.shutdown()
        poseLandmarker?.close()
    }
}