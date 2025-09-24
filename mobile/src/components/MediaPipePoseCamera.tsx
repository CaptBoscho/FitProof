import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import mediaPipePose, {
  PoseLandmarks,
  PoseType,
  ExerciseType,
} from 'mediapipe-pose';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaPipePoseCameraProps {
  exerciseType: ExerciseType;
  onPoseDetected?: (pose: PoseType, confidence: number) => void;
  onLandmarksDetected?: (landmarks: PoseLandmarks) => void;
  onError?: (error: string) => void;
  isActive?: boolean;
}

export const MediaPipePoseCamera: React.FC<MediaPipePoseCameraProps> = ({
  exerciseType,
  onPoseDetected,
  onLandmarksDetected,
  onError,
  isActive = true,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPose, setCurrentPose] = useState<PoseType>('Unknown');
  const [confidence, setConfidence] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Performance monitoring
  const frameCount = useRef(0);
  const lastFpsUpdate = useRef(Date.now());

  // Event listener cleanup functions
  const landmarksUnsubscribe = useRef<(() => void) | null>(null);
  const poseUnsubscribe = useRef<(() => void) | null>(null);
  const errorUnsubscribe = useRef<(() => void) | null>(null);

  const handleLandmarksDetected = useCallback((landmarks: PoseLandmarks) => {
    // Update FPS counter
    frameCount.current++;
    const now = Date.now();
    if (now - lastFpsUpdate.current >= 1000) {
      const currentFps = frameCount.current / ((now - lastFpsUpdate.current) / 1000);
      setFps(Math.round(currentFps));
      frameCount.current = 0;
      lastFpsUpdate.current = now;
    }

    onLandmarksDetected?.(landmarks);
  }, [onLandmarksDetected]);

  const handlePoseDetected = useCallback((pose: PoseType, poseConfidence: number) => {
    setCurrentPose(pose);
    setConfidence(poseConfidence);
    onPoseDetected?.(pose, poseConfidence);
  }, [onPoseDetected]);

  const handleError = useCallback((errorMessage: string) => {
    console.error('MediaPipe Error:', errorMessage);
    setError(errorMessage);
    onError?.(errorMessage);
  }, [onError]);

  const initializeCamera = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Setup event listeners
      landmarksUnsubscribe.current = mediaPipePose.onLandmarksDetected(handleLandmarksDetected);
      poseUnsubscribe.current = mediaPipePose.onPoseClassified(handlePoseDetected);
      errorUnsubscribe.current = mediaPipePose.onError(handleError);

      // Load the MediaPipe model
      await mediaPipePose.loadModel('pose_landmarker_lite.task');

      // Set exercise mode
      mediaPipePose.setExerciseMode(exerciseType);

      // Start camera
      await mediaPipePose.startCamera();

      setIsInitialized(true);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsLoading(false);
      Alert.alert('Initialization Error', errorMessage);
    }
  }, [exerciseType, handleLandmarksDetected, handlePoseDetected, handleError]);

  const stopCamera = useCallback(async () => {
    try {
      await mediaPipePose.stopCamera();

      // Cleanup event listeners
      landmarksUnsubscribe.current?.();
      poseUnsubscribe.current?.();
      errorUnsubscribe.current?.();

      setIsInitialized(false);
      setCurrentPose('Unknown');
      setConfidence(0);
      setFps(0);
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (isInitialized) {
      await stopCamera();
    } else {
      await initializeCamera();
    }
  }, [isInitialized, initializeCamera, stopCamera]);

  // Initialize camera when component mounts and isActive is true
  useEffect(() => {
    if (isActive && !isInitialized && !isLoading) {
      initializeCamera();
    } else if (!isActive && isInitialized) {
      stopCamera();
    }

    return () => {
      // Cleanup on unmount
      if (isInitialized) {
        stopCamera();
      }
    };
  }, [isActive, isInitialized, isLoading, initializeCamera, stopCamera]);

  // Update exercise mode when it changes
  useEffect(() => {
    if (isInitialized) {
      mediaPipePose.setExerciseMode(exerciseType);
    }
  }, [exerciseType, isInitialized]);

  const getPoseDisplayColor = (pose: PoseType): string => {
    switch (pose) {
      case 'TopOfPushup':
      case 'Standing':
        return '#4CAF50'; // Green
      case 'BottomOfPushup':
      case 'BottomOfSquat':
        return '#2196F3'; // Blue
      case 'MidPushup':
      case 'MidSquat':
        return '#FF9800'; // Orange
      case 'Unknown':
      default:
        return '#9E9E9E'; // Gray
    }
  };

  return (
    <View style={styles.container}>
      {/* Camera placeholder - native camera will be rendered here */}
      <View style={styles.cameraContainer}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.cameraText}>
            {isLoading ? 'Initializing Camera...' :
             error ? 'Camera Error' :
             isInitialized ? 'Camera Active' : 'Camera Inactive'}
          </Text>
        </View>

        {/* Pose detection overlay */}
        {isInitialized && (
          <View style={styles.overlay}>
            <View style={styles.topInfo}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>FPS:</Text>
                <Text style={styles.infoValue}>{fps}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Exercise:</Text>
                <Text style={styles.infoValue}>{exerciseType}</Text>
              </View>
            </View>

            <View style={styles.bottomInfo}>
              <View style={[styles.poseInfo, { borderColor: getPoseDisplayColor(currentPose) }]}>
                <Text style={[styles.poseText, { color: getPoseDisplayColor(currentPose) }]}>
                  {currentPose}
                </Text>
                <Text style={styles.confidenceText}>
                  {(confidence * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isInitialized ? styles.stopButton : styles.startButton]}
          onPress={toggleCamera}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : isInitialized ? 'Stop Camera' : 'Start Camera'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initializeCamera}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  cameraText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  infoValue: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  poseInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  poseText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
  },
  controls: {
    padding: 20,
    backgroundColor: '#000',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: 'bold',
  },
});