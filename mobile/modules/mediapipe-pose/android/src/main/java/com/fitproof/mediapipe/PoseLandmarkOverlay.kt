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
        imageWidth: Int
    ) {
        results = poseLandmarkerResult

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
            // Draw individual landmark points
            for (landmark in poseLandmarkerResult.landmarks()) {
                for ((index, normalizedLandmark) in landmark.withIndex()) {
                    // Only draw landmarks with good visibility
                    if (normalizedLandmark.visibility().isPresent &&
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

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        println("Overlay: Size changed to ${w}x${h}")
    }
}