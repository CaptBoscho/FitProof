import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { MediaPipePoseCamera } from '../components/MediaPipePoseCamera';
import { PoseLandmarks, PoseType, ExerciseType } from 'mediapipe-pose';
import { BaseScreenProps } from '../types';

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

  const [exerciseType, setExerciseType] = useState<ExerciseType>(getExerciseTypeFromId(exerciseId));
  const [currentPose, setCurrentPose] = useState<PoseType>('Unknown');
  const [confidence, setConfidence] = useState(0);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [isInRepState, setIsInRepState] = useState(false);
  const [lastPoseChange, setLastPoseChange] = useState(Date.now());

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

  const exerciseOptions: { type: ExerciseType; label: string }[] = [
    { type: 'pushup', label: 'Push-ups' },
    { type: 'squat', label: 'Squats' },
    { type: 'situp', label: 'Sit-ups' },
  ];

  const currentExerciseLabel = exerciseOptions.find(ex => ex.type === exerciseType)?.label || 'Exercise';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{currentExerciseLabel} Workout</Text>
        <Text style={styles.subtitle}>AI-powered form detection</Text>
      </View>

      {/* Exercise Selection */}
      <View style={styles.exerciseSelection}>
        {exerciseOptions.map((option) => (
          <TouchableOpacity
            key={option.type}
            style={[
              styles.exerciseButton,
              exerciseType === option.type && styles.exerciseButtonActive,
            ]}
            onPress={() => {
              setExerciseType(option.type);
              resetRepCount();
            }}
          >
            <Text
              style={[
                styles.exerciseButtonText,
                exerciseType === option.type && styles.exerciseButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Panel */}
      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rep Count</Text>
          <Text style={styles.statValue}>{repCount}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetRepCount}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current Pose</Text>
          <Text style={[styles.statValue, { fontSize: 16 }]}>{currentPose}</Text>
          <Text style={styles.confidenceText}>{(confidence * 100).toFixed(1)}%</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Landmarks</Text>
          <Text style={styles.statValue}>{landmarksCount}</Text>
          <Text style={styles.landmarksText}>detected</Text>
        </View>
      </View>

      {/* Camera Component */}
      <View style={styles.cameraContainer}>
        <MediaPipePoseCamera
          exerciseType={exerciseType}
          onPoseDetected={handlePoseDetected}
          onLandmarksDetected={handleLandmarksDetected}
          onError={handleError}
          isActive={true}
        />
      </View>

      {/* Debug Info */}
      <ScrollView style={styles.debugPanel} contentContainerStyle={styles.debugContent}>
        <Text style={styles.debugTitle}>Debug Information</Text>
        <Text style={styles.debugText}>Exercise: {exerciseType}</Text>
        <Text style={styles.debugText}>In Rep State: {isInRepState ? 'Yes' : 'No'}</Text>
        <Text style={styles.debugText}>Landmarks Count: {landmarksCount}</Text>
        <Text style={styles.debugText}>Current Pose: {currentPose}</Text>
        <Text style={styles.debugText}>Confidence: {(confidence * 100).toFixed(2)}%</Text>
        <Text style={styles.debugText}>Rep Count: {repCount}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  exerciseSelection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  exerciseButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  exerciseButtonActive: {
    backgroundColor: '#4CAF50',
  },
  exerciseButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  exerciseButtonTextActive: {
    color: '#fff',
  },
  statsPanel: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  confidenceText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  landmarksText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resetButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f44336',
    borderRadius: 4,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  debugPanel: {
    maxHeight: 120,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  debugContent: {
    padding: 16,
  },
  debugTitle: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});