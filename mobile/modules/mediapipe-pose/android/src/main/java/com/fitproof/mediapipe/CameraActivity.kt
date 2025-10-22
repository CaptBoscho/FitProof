package com.fitproof.mediapipe

import android.Manifest
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.view.Gravity
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
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
import android.os.Handler
import android.os.Looper

class CameraActivity : AppCompatActivity() {

    private lateinit var previewView: PreviewView
    private lateinit var overlayView: PoseLandmarkOverlay
    private lateinit var backButton: ImageButton
    private lateinit var repCountText: TextView
    private lateinit var poseStatusText: TextView
    private lateinit var confidenceText: TextView
    private lateinit var feedbackMessageText: TextView
    private lateinit var formFeedbackView: FrameLayout
    private lateinit var countdownText: TextView
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
    private lateinit var poseDetector: PoseDetector

    // Session tracking
    private var sessionStartTime: Long = 0
    private var validReps = 0
    private var invalidReps = 0
    private val formErrors = mutableListOf<String>()
    private var lastRepWasValid = true

    // Countdown state
    private var countdownValue = 5
    private var isCountdownActive = true
    private val countdownHandler = Handler(Looper.getMainLooper())

    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted: Boolean ->
        if (isGranted) {
            startCamera()
        } else {
            showPermissionDeniedDialog()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Get exercise type from intent
        exerciseType = intent.getStringExtra("EXERCISE_TYPE") ?: "pushup"

        // Initialize pose detector for this exercise
        poseDetector = PoseDetector(exerciseType)

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
                printSessionSummary()
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

        // Create pose status text
        poseStatusText = TextView(this).apply {
            text = "Pose: --"
            textSize = 20f
            setTextColor(Color.WHITE)
            setPadding(24)
            setBackgroundColor(Color.parseColor("#80000000")) // Semi-transparent black
        }

        // Create confidence text
        confidenceText = TextView(this).apply {
            text = "Confidence: --"
            textSize = 16f
            setTextColor(Color.WHITE)
            setPadding(20)
            setBackgroundColor(Color.parseColor("#80000000")) // Semi-transparent black
        }

        // Create feedback message text (bottom center)
        feedbackMessageText = TextView(this).apply {
            text = ""
            textSize = 18f
            setTextColor(Color.WHITE)
            setPadding(32)
            setBackgroundColor(Color.parseColor("#E6FF9800")) // Orange with high opacity
            gravity = Gravity.CENTER
            maxLines = 2
            visibility = android.view.View.GONE
        }

        // Create form feedback overlay (colored border)
        formFeedbackView = FrameLayout(this).apply {
            background = null
            setBackgroundResource(android.R.drawable.dialog_frame) // Will be changed dynamically
            isClickable = false
            isFocusable = false
        }

        // Create countdown text
        countdownText = TextView(this).apply {
            text = "$countdownValue"
            textSize = 72f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
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

        // Layout parameters for pose status (below rep counter)
        val poseStatusParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, 80, 32, 0) // Below rep counter
        }

        // Layout parameters for confidence text (below pose status)
        val confidenceParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            setMargins(0, 130, 32, 0) // Below pose status
        }

        // Layout parameters for feedback message (bottom center)
        val feedbackMessageParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            setMargins(64, 0, 64, 150) // Bottom with margins
        }

        // Layout parameters for form feedback overlay (fullscreen with padding)
        val formFeedbackParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ).apply {
            setMargins(48, 120, 48, 48)
        }

        // Layout parameters for countdown (center)
        val countdownParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER
        }

        // Add views to frame layout
        frameLayout.addView(previewView)
        frameLayout.addView(overlayView)
        frameLayout.addView(formFeedbackView, formFeedbackParams)
        frameLayout.addView(backButton, backButtonParams)
        frameLayout.addView(repCountText, repCountParams)
        frameLayout.addView(poseStatusText, poseStatusParams)
        frameLayout.addView(confidenceText, confidenceParams)
        frameLayout.addView(feedbackMessageText, feedbackMessageParams)
        frameLayout.addView(countdownText, countdownParams)

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

        // Start countdown when activity is created
        startCountdown()
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
                            showErrorDialog("Pose Detection Error", "Error during pose detection: ${error.message}")
                        }
                    }
                    .build()

                poseLandmarker = PoseLandmarker.createFromOptions(this, options)
                android.util.Log.d("Debug_Media", "✅ MediaPipe model loaded successfully")
            } catch (e: Exception) {
                runOnUiThread {
                    showErrorDialog("Model Loading Error", "Failed to load MediaPipe model: ${e.message}")
                }
                android.util.Log.e("Debug_Media", "❌ Failed to load model: ${e.message}", e)
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener({
            try {
                cameraProvider = cameraProviderFuture.get()
                bindCameraUseCases()
                android.util.Log.d("Debug_Media", "✅ Camera started successfully")
            } catch (e: Exception) {
                android.util.Log.e("Debug_Media", "❌ Failed to start camera: ${e.message}", e)
                showErrorDialog("Camera Error", "Failed to start camera: ${e.message}\n\nPlease ensure your device has a working front camera.")
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

    private fun startCountdown() {
        countdownHandler.post(object : Runnable {
            override fun run() {
                runOnUiThread {
                    if (countdownValue > 0) {
                        countdownText.text = "$countdownValue"
                        countdownValue--
                        countdownHandler.postDelayed(this, 1000)
                    } else {
                        countdownText.visibility = android.view.View.GONE
                        isCountdownActive = false
                        // Start session tracking
                        sessionStartTime = System.currentTimeMillis()
                        android.util.Log.d("Debug_Session", "Session started at $sessionStartTime")
                        println("Debug_Media: Countdown finished, pose detection enabled")
                    }
                }
            }
        })
    }

    private fun handlePoseResult(result: PoseLandmarkerResult) {
        val landmarks = result.landmarks()
        if (landmarks.isNotEmpty()) {
            val firstPose = landmarks[0]
            println("MediaPipe: Detected pose with ${firstPose.size} landmarks")

            // Only analyze pose if countdown is finished
            if (!isCountdownActive) {
                // Analyze pose for exercise-specific detection
                val poseState = poseDetector.detectPose(firstPose)

                // Only show pose status if all required landmarks are visible (full body visible)
                if (poseDetector.areRequiredLandmarksVisible()) {
                    runOnUiThread {
                        poseStatusText.text = "Pose: ${poseState.currentPhase}"
                    }
                } else {
                    runOnUiThread {
                        poseStatusText.text = "Pose: partial"
                    }
                }

                // Update rep count if it changed
                if (poseState.repCount != repCount) {
                    updateRepCount(poseState.repCount)
                    // Track rep validity for session stats
                    if (poseState.isValidRep) {
                        validReps++
                        android.util.Log.d("Debug_Session", "✅ Valid rep #$validReps")
                    } else {
                        invalidReps++
                        poseState.validationMessage?.let { msg ->
                            if (msg.isNotEmpty()) {
                                formErrors.add(msg)
                            }
                        }
                        android.util.Log.d("Debug_Session", "❌ Invalid rep #$invalidReps - ${poseState.validationMessage ?: "unknown error"}")
                    }
                    lastRepWasValid = poseState.isValidRep
                    // Play success sound on rep completion
                    playSuccessSound()
                }

                // Update form feedback with confidence and validation status
                updateFormFeedback(isValid = poseState.isValidRep, confidence = poseState.confidence)

                // Show feedback message if there's a validation issue
                if (!poseState.isValidRep) {
                    getFeedbackMessage(poseState.validationMessage, poseState.currentPhase)?.let { feedbackMsg ->
                        showFeedbackMessage(feedbackMsg)
                        // Play error sound for form issues
                        playErrorSound()
                    }
                }

                // Log pose analysis results
                println("MediaPipe: Exercise=$exerciseType, Phase=${poseState.currentPhase}, Confidence=${poseState.confidence}, Reps=${poseState.repCount}")
            } else {
                println("Debug_Media: Countdown active, skipping pose analysis")
                runOnUiThread {
                    poseStatusText.text = "Pose: --"
                }
            }

            // Update the overlay with new pose results (always show landmarks)
            runOnUiThread {
                overlayView.setResults(
                    result,
                    imageHeight = currentImageHeight,
                    imageWidth = currentImageWidth,
                    exerciseType = exerciseType
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
        val oldCount = repCount
        repCount = newCount

        runOnUiThread {
            repCountText.text = "Reps: $repCount"

            // Trigger haptic feedback when rep count increases
            if (newCount > oldCount) {
                val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(100)
                }
                android.util.Log.d("Debug_Media", "🎉 Haptic feedback triggered for rep #$newCount")
            }
        }
    }

    private fun updateFormFeedback(isValid: Boolean, confidence: Float) {
        runOnUiThread {
            // Update confidence label
            val confidencePercent = (confidence * 100).toInt()
            confidenceText.text = "Confidence: $confidencePercent%"

            // Update form feedback overlay color
            // Only show feedback after countdown
            if (isCountdownActive) {
                formFeedbackView.setBackgroundColor(Color.TRANSPARENT)
                return@runOnUiThread
            }

            // Create colored border effect using drawable
            val borderDrawable = android.graphics.drawable.GradientDrawable().apply {
                shape = android.graphics.drawable.GradientDrawable.RECTANGLE
                cornerRadius = 32f
                setStroke(16, when {
                    confidence < 0.5f -> Color.parseColor("#80FFFF00") // Yellow - low confidence
                    isValid -> Color.parseColor("#9900FF00") // Green - good form
                    else -> Color.parseColor("#99FF0000") // Red - invalid form
                })
            }
            formFeedbackView.background = borderDrawable
        }
    }

    private fun showFeedbackMessage(message: String, durationMs: Long = 3000) {
        runOnUiThread {
            if (!isCountdownActive) {
                feedbackMessageText.text = message
                feedbackMessageText.visibility = android.view.View.VISIBLE

                // Auto-hide after duration
                Handler(Looper.getMainLooper()).postDelayed({
                    feedbackMessageText.visibility = android.view.View.GONE
                }, durationMs)
            }
        }
    }

    private fun getFeedbackMessage(validationMessage: String?, phase: String): String? {
        // Return null if no validation message or if in valid state
        if (validationMessage.isNullOrEmpty()) return null

        // Map validation messages to user-friendly instructions
        return when (phase) {
            "kneeDown" -> "⚠️ Keep knees off the ground"
            "unknown" -> "⚠️ Position your full body in view"
            "mid" -> {
                if (validationMessage.contains("leg", ignoreCase = true) ||
                    validationMessage.contains("knee", ignoreCase = true)) {
                    "💪 Keep your legs straight"
                } else null // Mid is normal transition
            }
            else -> {
                // Generic feedback for other validation messages
                when {
                    validationMessage.contains("arm", ignoreCase = true) ->
                        "💪 Full range of motion with arms"
                    validationMessage.contains("leg", ignoreCase = true) ->
                        "🦵 Keep legs straight"
                    validationMessage.contains("depth", ignoreCase = true) ->
                        "⬇️ Go lower for full squat"
                    else -> null
                }
            }
        }
    }

    private fun playSuccessSound() {
        try {
            // Play notification sound for success
            val notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val r = RingtoneManager.getRingtone(applicationContext, notification)
            r.play()
        } catch (e: Exception) {
            android.util.Log.e("Debug_Media", "Error playing success sound: ${e.message}")
        }
    }

    private fun playErrorSound() {
        try {
            // Play a short error beep
            val mediaPlayer = MediaPlayer.create(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            mediaPlayer?.start()
            mediaPlayer?.setOnCompletionListener { it.release() }
        } catch (e: Exception) {
            android.util.Log.e("Debug_Media", "Error playing error sound: ${e.message}")
        }
    }

    private fun showPermissionDeniedDialog() {
        AlertDialog.Builder(this)
            .setTitle("Camera Permission Required")
            .setMessage("FitProof needs camera access to track your exercises. Please enable camera access in Settings.")
            .setPositiveButton("Open Settings") { _, _ ->
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.fromParts("package", packageName, null)
                }
                startActivity(intent)
                finish()
            }
            .setNegativeButton("Cancel") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun showErrorDialog(title: String, message: String) {
        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("OK") { _, _ ->
                finish()
            }
            .setCancelable(false)
            .show()
    }

    private fun printSessionSummary() {
        if (sessionStartTime == 0L) {
            android.util.Log.d("Debug_Session", "No session data to summarize")
            return
        }

        val duration = (System.currentTimeMillis() - sessionStartTime) / 1000 // seconds
        val minutes = duration / 60
        val seconds = duration % 60

        android.util.Log.d("Debug_Session", "==================== SESSION SUMMARY ====================")
        android.util.Log.d("Debug_Session", "Exercise: ${exerciseType.replaceFirstChar { it.uppercase() }}")
        android.util.Log.d("Debug_Session", "Duration: ${minutes}m ${seconds}s")
        android.util.Log.d("Debug_Session", "Total Reps: $repCount")
        val validPercentage = if (repCount > 0) validReps.toFloat() / repCount * 100 else 0f
        android.util.Log.d("Debug_Session", "Valid Reps: $validReps (%.1f%%)".format(validPercentage))
        val invalidPercentage = if (repCount > 0) invalidReps.toFloat() / repCount * 100 else 0f
        android.util.Log.d("Debug_Session", "Invalid Reps: $invalidReps (%.1f%%)".format(invalidPercentage))

        if (formErrors.isNotEmpty()) {
            val errorCounts = formErrors.groupingBy { it }.eachCount().toList().sortedByDescending { it.second }
            android.util.Log.d("Debug_Session", "Common Errors:")
            errorCounts.forEach { (error, count) ->
                android.util.Log.d("Debug_Session", "  - $error ($count times)")
            }
        }
        android.util.Log.d("Debug_Session", "=======================================================")
    }

    // toBitmap() extension is now built into ImageProxy, so we don't need our own implementation

    override fun onDestroy() {
        super.onDestroy()
        countdownHandler.removeCallbacksAndMessages(null)
        cameraExecutor.shutdown()
        processingExecutor.shutdown()
        poseLandmarker?.close()
    }
}