import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { MediaPipePoseCamera } from '../components/MediaPipePoseCamera';
import { PoseLandmarks, PoseType, ExerciseType } from 'mediapipe-pose';
import { BaseScreenProps } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaPipeDemoScreenProps extends BaseScreenProps {}

export const MediaPipeDemoScreen: React.FC<MediaPipeDemoScreenProps> = ({ navigation, route }) => {
  // Get exercise type from route params
  const exerciseId = route.params?.exerciseId || '1';
  const getExerciseTypeFromId = (id: string): ExerciseType => {
    switch (id) {
      case '1': return 'pushup';
      case '2': return 'situp';
      case '3': return 'squat';
      default: return 'pushup';
    }
  };

  const getExerciseDisplayName = (id: string): string => {
    switch (id) {
      case '1': return 'Push-ups';
      case '2': return 'Sit-ups';
      case '3': return 'Squats';
      default: return 'Exercise';
    }
  };

  const [exerciseType, setExerciseType] = useState<ExerciseType>(getExerciseTypeFromId(exerciseId));
  const [currentPose, setCurrentPose] = useState<PoseType>('Unknown');
  const [confidence, setConfidence] = useState(0);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [isInRepState, setIsInRepState] = useState(false);
  const [lastPoseChange, setLastPoseChange] = useState(Date.now());
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const exerciseName = getExerciseDisplayName(exerciseId);

  // Simple rep counting logic
  const handlePoseDetected = useCallback((pose: PoseType, poseConfidence: number) => {
    setCurrentPose(pose);
    setConfidence(poseConfidence);

    const now = Date.now();

    // Basic rep counting for pushups
    if (exerciseType === 'pushup') {
      if (pose === 'BottomOfPushup' && !isInRepState && now - lastPoseChange > 500) {
        setIsInRepState(true);
        setLastPoseChange(now);
      } else if (pose === 'TopOfPushup' && isInRepState && now - lastPoseChange > 500) {
        setRepCount(prev => prev + 1);
        setIsInRepState(false);
        setLastPoseChange(now);
      }
    }

    // Basic rep counting for squats
    if (exerciseType === 'squat') {
      if (pose === 'BottomOfSquat' && !isInRepState && now - lastPoseChange > 500) {
        setIsInRepState(true);
        setLastPoseChange(now);
      } else if (pose === 'Standing' && isInRepState && now - lastPoseChange > 500) {
        setRepCount(prev => prev + 1);
        setIsInRepState(false);
        setLastPoseChange(now);
      }
    }
  }, [exerciseType, isInRepState, lastPoseChange]);

  const handleLandmarksDetected = useCallback((landmarks: PoseLandmarks) => {
    setLandmarksCount(landmarks.landmarks.length);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('MediaPipe Demo Error:', error);
  }, []);

  const resetRepCount = useCallback(() => {
    setRepCount(0);
    setIsInRepState(false);
  }, []);

  // Handle orientation changes based on exercise type
  const setOrientation = useCallback(async (exerciseType: ExerciseType) => {
    try {
      console.log('Setting orientation for exercise:', exerciseType);
      if (exerciseType === 'pushup' || exerciseType === 'situp') {
        console.log('Locking to landscape for', exerciseType);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      } else {
        console.log('Locking to portrait for', exerciseType);
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      }
      console.log('Orientation set successfully');
    } catch (error) {
      console.warn('Failed to set orientation:', error);
    }
  }, []);

  // Handle back navigation and restore orientation
  const handleGoBack = useCallback(async () => {
    try {
      await ScreenOrientation.unlockAsync();
      navigation.goBack();
    } catch (error) {
      console.warn('Failed to unlock orientation:', error);
      navigation.goBack();
    }
  }, [navigation]);

  // Set orientation on mount and when exercise type changes
  useEffect(() => {
    setOrientation(exerciseType);

    // Track dimension changes
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => {
      subscription?.remove();
      // Restore orientation on unmount
      ScreenOrientation.unlockAsync().catch(console.warn);
    };
  }, [exerciseType, setOrientation]);

  const isLandscape = dimensions.width > dimensions.height;

  return (
    <View style={styles.fullscreenContainer}>
      <StatusBar hidden={true} />

      {/* Full-screen Camera */}
      <View style={styles.fullscreenCameraContainer}>
        <MediaPipePoseCamera
          exerciseType={exerciseType}
          onPoseDetected={handlePoseDetected}
          onLandmarksDetected={handleLandmarksDetected}
          onError={handleError}
          isActive={true}
        />
      </View>

      {/* Overlay Controls */}
      <View style={[styles.overlay, isLandscape && styles.overlayLandscape]}>
        {/* Back Button - Top Left */}
        <TouchableOpacity
          style={[
            styles.backButtonOverlay,
            isLandscape && styles.backButtonLandscape
          ]}
          onPress={handleGoBack}
        >
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>

        {/* Rep Counter - Top Right */}
        <View style={[
          styles.repCounter,
          isLandscape && styles.repCounterLandscape
        ]}>
          <Text style={styles.repCountValue}>{repCount}</Text>
          <Text style={styles.repCountLabel}>REPS</Text>
        </View>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenCameraContainer: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  overlayLandscape: {
    // Additional styles for landscape if needed
  },
  backButtonLandscape: {
    top: 20,
    left: 30,
  },
  repCounterLandscape: {
    top: 20,
    right: 30,
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 11,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  repCounter: {
    position: 'absolute',
    top: 50,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 80,
    zIndex: 11,
  },
  repCountValue: {
    color: '#4CAF50',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  repCountLabel: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});