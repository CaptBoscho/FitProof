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

        print("iOS Overlay: viewSize=\(bounds.width)x\(bounds.height), imageSize=\(imageWidth)x\(imageHeight)")

        setNeedsDisplay()
    }

    func clear() {
        results = nil
        setNeedsDisplay()
    }

    // MARK: - Drawing

    override func draw(_ rect: CGRect) {
        super.draw(rect)

        guard let context = UIGraphicsGetCurrentContext(),
              let results = results else { return }

        // Get exercise-specific landmarks to display
        let relevantLandmarks = getRelevantLandmarks(exerciseType: exerciseType)

        // Draw individual landmark points
        for landmarks in results.landmarks {
            for (index, normalizedLandmark) in landmarks.enumerated() {
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
                        // In landscape mode: direct mapping with mirroring for front camera
                        normalizedX = 1.0 - normalizedLandmark.x  // Mirror X for front camera
                        normalizedY = normalizedLandmark.y
                    } else {
                        // In portrait mode: swap X and Y due to camera rotation + mirror
                        normalizedX = 1.0 - normalizedLandmark.y  // Swap and mirror: camera Y becomes screen X
                        normalizedY = 1.0 - normalizedLandmark.x  // Swap and mirror: camera X becomes screen Y
                    }

                    // Scale to view dimensions
                    let x = CGFloat(normalizedX) * bounds.width
                    let y = CGFloat(normalizedY) * bounds.height

                    // Log first few landmarks for debugging
                    if index < 3 {
                        print("iOS Overlay Draw Landmark \(index): landscape=\(isLandscape), normalized(\(normalizedLandmark.x), \(normalizedLandmark.y)) -> mirrored(\(normalizedX), \(normalizedY)) -> screen(\(x), \(y))")
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
            return Set([7, 8, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32])
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
        print("iOS Overlay: Size changed to \(bounds.width)x\(bounds.height)")
    }
}