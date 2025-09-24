import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { MediaPipePoseCamera } from '../components/MediaPipePoseCamera';

// Mock the native module
jest.mock('mediapipe-pose', () => ({
  __esModule: true,
  default: {
    startCamera: jest.fn(() => Promise.resolve()),
    stopCamera: jest.fn(() => Promise.resolve()),
    loadModel: jest.fn(() => Promise.resolve()),
    setExerciseMode: jest.fn(),
    onLandmarksDetected: jest.fn(() => jest.fn()), // Returns unsubscribe function
    onPoseClassified: jest.fn(() => jest.fn()), // Returns unsubscribe function
    onError: jest.fn(() => jest.fn()), // Returns unsubscribe function
    removeAllListeners: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('MediaPipePoseCamera', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with initial state', () => {
    const { getByText } = render(
      <MediaPipePoseCamera exerciseType="pushup" />
    );

    expect(getByText('Camera Inactive')).toBeTruthy();
    expect(getByText('Start Camera')).toBeTruthy();
  });

  it('renders with different exercise types', () => {
    const { getByText } = render(
      <MediaPipePoseCamera exerciseType="squat" />
    );

    expect(getByText('Camera Inactive')).toBeTruthy();
  });

  it('shows loading state when initializing', async () => {
    const mediaPipePose = require('mediapipe-pose').default;

    // Mock a delayed resolution
    mediaPipePose.loadModel.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { getByText } = render(
      <MediaPipePoseCamera exerciseType="pushup" isActive={true} />
    );

    // Should show loading immediately when isActive is true
    await waitFor(() => {
      expect(getByText('Initializing Camera...')).toBeTruthy();
    });
  });

  it('calls initialization when start camera button is pressed', async () => {
    const mediaPipePose = require('mediapipe-pose').default;

    const { getByText } = render(
      <MediaPipePoseCamera exerciseType="pushup" isActive={false} />
    );

    const startButton = getByText('Start Camera');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(mediaPipePose.loadModel).toHaveBeenCalledWith('pose_landmarker_lite.task');
      expect(mediaPipePose.setExerciseMode).toHaveBeenCalledWith('pushup');
      expect(mediaPipePose.startCamera).toHaveBeenCalled();
    });
  });

  it('handles initialization errors gracefully', async () => {
    const mediaPipePose = require('mediapipe-pose').default;
    const errorMessage = 'Failed to load model';

    mediaPipePose.loadModel.mockRejectedValue(new Error(errorMessage));

    const { getByText } = render(
      <MediaPipePoseCamera exerciseType="pushup" isActive={false} />
    );

    const startButton = getByText('Start Camera');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Initialization Error', errorMessage);
    });
  });

  it('calls onPoseDetected callback when provided', () => {
    const onPoseDetected = jest.fn();
    const mediaPipePose = require('mediapipe-pose').default;

    render(
      <MediaPipePoseCamera
        exerciseType="pushup"
        onPoseDetected={onPoseDetected}
      />
    );

    // Get the callback that was registered
    const poseCallback = mediaPipePose.onPoseClassified.mock.calls[0][0];

    // Simulate pose detection
    poseCallback('TopOfPushup', 0.85);

    expect(onPoseDetected).toHaveBeenCalledWith('TopOfPushup', 0.85);
  });

  it('calls onLandmarksDetected callback when provided', () => {
    const onLandmarksDetected = jest.fn();
    const mediaPipePose = require('mediapipe-pose').default;

    render(
      <MediaPipePoseCamera
        exerciseType="pushup"
        onLandmarksDetected={onLandmarksDetected}
      />
    );

    // Get the callback that was registered
    const landmarksCallback = mediaPipePose.onLandmarksDetected.mock.calls[0][0];

    // Simulate landmarks detection
    const mockLandmarks = {
      landmarks: [{ x: 0.5, y: 0.5, z: 0.1, visibility: 0.9 }],
      timestamp: Date.now(),
      processingTime: 15,
      confidence: 0.9,
    };

    landmarksCallback(mockLandmarks);

    expect(onLandmarksDetected).toHaveBeenCalledWith(mockLandmarks);
  });

  it('updates exercise mode when exerciseType prop changes', () => {
    const mediaPipePose = require('mediapipe-pose').default;

    const { rerender } = render(
      <MediaPipePoseCamera exerciseType="pushup" />
    );

    // Simulate camera being initialized
    mediaPipePose.onLandmarksDetected.mockReturnValue(jest.fn());
    mediaPipePose.onPoseClassified.mockReturnValue(jest.fn());
    mediaPipePose.onError.mockReturnValue(jest.fn());

    rerender(
      <MediaPipePoseCamera exerciseType="squat" />
    );

    // Should be called during initial render and when prop changes
    expect(mediaPipePose.setExerciseMode).toHaveBeenLastCalledWith('squat');
  });

  it('cleans up properly on unmount', () => {
    const mediaPipePose = require('mediapipe-pose').default;
    const mockUnsubscribe = jest.fn();

    mediaPipePose.onLandmarksDetected.mockReturnValue(mockUnsubscribe);
    mediaPipePose.onPoseClassified.mockReturnValue(mockUnsubscribe);
    mediaPipePose.onError.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <MediaPipePoseCamera exerciseType="pushup" isActive={true} />
    );

    unmount();

    expect(mediaPipePose.stopCamera).toHaveBeenCalled();
  });
});