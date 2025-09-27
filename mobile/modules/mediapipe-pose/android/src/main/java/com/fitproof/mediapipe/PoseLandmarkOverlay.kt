package com.fitproof.mediapipe

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult

class PoseLandmarkOverlay @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var results: PoseLandmarkerResult? = null
    private var pointPaint = Paint()
    private var exerciseType: String = "pushup"

    companion object {
        private const val LANDMARK_STROKE_WIDTH = 12f
        private const val LANDMARK_RADIUS = 8f
    }

    init {
        initPaints()
    }

    private fun initPaints() {
        pointPaint.apply {
            color = Color.RED
            strokeWidth = LANDMARK_STROKE_WIDTH
            style = Paint.Style.FILL
            isAntiAlias = true
        }
    }

    fun setResults(
        poseLandmarkerResult: PoseLandmarkerResult?,
        imageHeight: Int,
        imageWidth: Int,
        exerciseType: String = "pushup"
    ) {
        results = poseLandmarkerResult
        this.exerciseType = exerciseType

        println("Overlay: viewSize=${width}x${height}, imageSize=${imageWidth}x${imageHeight}")

        invalidate()
    }

    fun clear() {
        results = null
        invalidate()
    }

    override fun draw(canvas: Canvas) {
        super.draw(canvas)

        results?.let { poseLandmarkerResult ->
            // Get exercise-specific landmarks to display
            val relevantLandmarks = getRelevantLandmarks(exerciseType)

            // Draw individual landmark points
            for (landmark in poseLandmarkerResult.landmarks()) {
                for ((index, normalizedLandmark) in landmark.withIndex()) {
                    // Only draw relevant landmarks for this exercise with good visibility
                    if (relevantLandmarks.contains(index) &&
                        normalizedLandmark.visibility().isPresent &&
                        normalizedLandmark.visibility().get() > 0.5f) {

                        // Convert normalized coordinates to view coordinates
                        // Handle different orientations
                        val isLandscape = width > height

                        val normalizedX: Float
                        val normalizedY: Float

                        if (isLandscape) {
                            // In landscape mode: direct mapping with mirroring for front camera
                            normalizedX = 1.0f - normalizedLandmark.x() // Mirror X for front camera
                            normalizedY = normalizedLandmark.y()
                        } else {
                            // In portrait mode: swap X and Y due to camera rotation + mirror
                            normalizedX = 1.0f - normalizedLandmark.y() // Swap and mirror: camera Y becomes screen X
                            normalizedY = 1.0f - normalizedLandmark.x() // Swap and mirror: camera X becomes screen Y
                        }

                        // Scale to view dimensions
                        val x = normalizedX * width
                        val y = normalizedY * height

                        // Log first few landmarks for debugging
                        if (index < 3) {
                            println("Overlay Draw Landmark $index: landscape=$isLandscape, normalized(${normalizedLandmark.x()}, ${normalizedLandmark.y()}) -> mirrored($normalizedX, $normalizedY) -> screen($x, $y)")
                        }

                        // Draw landmark as a circle
                        canvas.drawCircle(x, y, LANDMARK_RADIUS, pointPaint)
                    }
                }
            }
        }
    }

    private fun getRelevantLandmarks(exerciseType: String): Set<Int> {
        return when (exerciseType) {
            "pushup" -> setOf(7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32)
            "squat" -> setOf(11, 12, 23, 24, 25, 26, 27, 28, 31, 32)
            "situp" -> setOf(7, 8, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30)
            else -> setOf() // Show no landmarks for unknown exercises
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        println("Overlay: Size changed to ${w}x${h}")
    }
}