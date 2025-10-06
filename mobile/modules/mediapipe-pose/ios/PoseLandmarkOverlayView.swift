import UIKit
import MediaPipeTasksVision

class PoseLandmarkOverlayView: UIView {

    // MARK: - Properties
    private var results: PoseLandmarkerResult?
    private var exerciseType: String = "pushup"

    // Constants for drawing
    private let landmarkRadius: CGFloat = 8.0
    private let landmarkColor = UIColor.red

    // MARK: - Initialization

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        backgroundColor = .clear
    }

    // MARK: - Public Methods

    func setResults(_ poseLandmarkerResult: PoseLandmarkerResult?, imageHeight: Int, imageWidth: Int, exerciseType: String = "pushup") {
        self.results = poseLandmarkerResult
        self.exerciseType = exerciseType

        setNeedsDisplay()
    }

    func clear() {
        results = nil
        setNeedsDisplay()
    }

    // MARK: - Drawing

    override func draw(_ rect: CGRect) {
        super.draw(rect)

        guard let context = UIGraphicsGetCurrentContext() else { return }

        // Draw test landmarks if no results
        if results == nil {
            // Draw test dots at corners and center to verify coordinate system
            let testPoints = [
                CGPoint(x: bounds.width * 0.25, y: bounds.height * 0.25), // Top-left area
                CGPoint(x: bounds.width * 0.75, y: bounds.height * 0.25), // Top-right area
                CGPoint(x: bounds.width * 0.5, y: bounds.height * 0.5),   // Center
                CGPoint(x: bounds.width * 0.25, y: bounds.height * 0.75), // Bottom-left area
                CGPoint(x: bounds.width * 0.75, y: bounds.height * 0.75), // Bottom-right area
            ]

            context.setFillColor(UIColor.cyan.cgColor)
            for point in testPoints {
                context.fillEllipse(in: CGRect(
                    x: point.x - landmarkRadius,
                    y: point.y - landmarkRadius,
                    width: landmarkRadius * 2,
                    height: landmarkRadius * 2
                ))
            }
            return
        }

        // Get exercise-specific landmarks to display
        let relevantLandmarks = getRelevantLandmarks(exerciseType: exerciseType)

        // Draw individual landmark points - safely unwrap results
        guard let results = results else { return }

        for landmarks in results.landmarks {
            for (index, normalizedLandmark) in landmarks.enumerated() {
                // Log face landmarks and low visibility relevant landmarks for debugging
                if index < 5 || (relevantLandmarks.contains(index) && (normalizedLandmark.visibility?.floatValue ?? 0.0) < 0.7) {
                    NSLog("Debug_Media: 👁️ Landmark %d: visibility=%.3f, relevant=%@", index, normalizedLandmark.visibility?.floatValue ?? 0.0, relevantLandmarks.contains(index) ? "YES" : "NO")
                }

                // Only draw relevant landmarks for this exercise with good visibility
                if relevantLandmarks.contains(index) &&
                   normalizedLandmark.visibility != nil &&
                   normalizedLandmark.visibility!.floatValue > 0.5 {

                    // Convert normalized coordinates to view coordinates
                    // Handle different orientations
                    let isLandscape = bounds.width > bounds.height

                    let normalizedX: Float
                    let normalizedY: Float

                    if isLandscape {
                        // In landscape mode: front camera needs 180 degree rotation + mirror
                        normalizedX = normalizedLandmark.x        // No mirror on X
                        normalizedY = 1.0 - normalizedLandmark.y  // Mirror Y (flip upside down)
                    } else {
                        // In portrait mode: swap X and Y + 180 degree rotation for front camera
                        normalizedX = 1.0 - normalizedLandmark.y  // Rotate 180: swap and mirror Y
                        normalizedY = normalizedLandmark.x        // Rotate 180: swap X (no mirror on Y)
                    }

                    // Scale to view dimensions
                    let x = CGFloat(normalizedX) * bounds.width
                    let y = CGFloat(normalizedY) * bounds.height

                    // Log coordinate mapping for face landmarks to debug landscape/portrait positioning
                    if index < 5 {
                        NSLog("Debug_Media: 🎯 DRAWING Landmark %d: landscape=%@, normalized(%.3f, %.3f) -> mirrored(%.3f, %.3f) -> screen(%.1f, %.1f), bounds(%.0fx%.0f)", index, isLandscape ? "YES" : "NO", normalizedLandmark.x, normalizedLandmark.y, normalizedX, normalizedY, Float(x), Float(y), bounds.width, bounds.height)
                    }

                    // Draw landmark as a circle
                    context.setFillColor(landmarkColor.cgColor)
                    context.fillEllipse(in: CGRect(
                        x: x - landmarkRadius,
                        y: y - landmarkRadius,
                        width: landmarkRadius * 2,
                        height: landmarkRadius * 2
                    ))
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func getRelevantLandmarks(exerciseType: String) -> Set<Int> {
        switch exerciseType {
        case "pushup":
            // Adding face landmarks (0-4) for testing landscape coordinate mapping
            return Set([0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
        case "squat":
            return Set([11, 12, 23, 24, 25, 26, 27, 28, 31, 32])
        case "situp":
            return Set([7, 8, 11, 12, 23, 24, 25, 26, 27, 28, 29, 30])
        default:
            return Set() // Show no landmarks for unknown exercises
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Size change logging disabled for normal operation
        // NSLog("Debug_Media: iOS Overlay: Size changed to %.0fx%.0f", bounds.width, bounds.height)
    }
}