import { NativeModules, NativeEventEmitter } from 'react-native';

// TypeScript interfaces for MediaPipe data structures
export interface PoseLandmark {
  x: number;        // Normalized 0-1
  y: number;        // Normalized 0-1
  z: number;        // Depth (relative to hips)
  visibility: number; // 0-1 confidence
}

export interface PoseLandmarks {
  landmarks: PoseLandmark[]; // 33 pose points
  timestamp: number;
  processingTime: number;
  confidence: number;
}

export type PoseType =
  | 'TopOfPushup'
  | 'MidPushup'
  | 'BottomOfPushup'
  | 'Standing'
  | 'Plank'
  | 'MidSquat'
  | 'BottomOfSquat'
  | 'Unknown';

export type ExerciseType = 'pushup' | 'situp' | 'squat';

// Native module interface
interface MediaPipePoseModule {
  startCamera(): Promise<void>;
  stopCamera(): Promise<void>;
  loadModel(modelPath: string): Promise<void>;
  setExerciseMode(exercise: ExerciseType): void;
}

const { MediaPipePose } = NativeModules;

if (!MediaPipePose) {
  throw new Error('MediaPipePose native module not found');
}

// Create event emitter for pose detection events
const eventEmitter = new NativeEventEmitter(MediaPipePose);

// Event listener types
type LandmarksCallback = (landmarks: PoseLandmarks) => void;
type PoseClassificationCallback = (pose: PoseType, confidence: number) => void;
type ErrorCallback = (error: string) => void;

class MediaPipePoseManager {
  private landmarksListeners: LandmarksCallback[] = [];
  private poseListeners: PoseClassificationCallback[] = [];
  private errorListeners: ErrorCallback[] = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    eventEmitter.addListener('onLandmarksDetected', (landmarks: PoseLandmarks) => {
      this.landmarksListeners.forEach(listener => listener(landmarks));
    });

    eventEmitter.addListener('onPoseClassified', (data: { pose: PoseType; confidence: number }) => {
      this.poseListeners.forEach(listener => listener(data.pose, data.confidence));
    });

    eventEmitter.addListener('onError', (error: string) => {
      this.errorListeners.forEach(listener => listener(error));
    });
  }

  // Public API methods
  async startCamera(): Promise<void> {
    return MediaPipePose.startCamera();
  }

  async stopCamera(): Promise<void> {
    return MediaPipePose.stopCamera();
  }

  async loadModel(modelPath: string): Promise<void> {
    return MediaPipePose.loadModel(modelPath);
  }

  setExerciseMode(exercise: ExerciseType): void {
    MediaPipePose.setExerciseMode(exercise);
  }

  // Event subscription methods
  onLandmarksDetected(callback: LandmarksCallback): () => void {
    this.landmarksListeners.push(callback);
    return () => {
      const index = this.landmarksListeners.indexOf(callback);
      if (index > -1) {
        this.landmarksListeners.splice(index, 1);
      }
    };
  }

  onPoseClassified(callback: PoseClassificationCallback): () => void {
    this.poseListeners.push(callback);
    return () => {
      const index = this.poseListeners.indexOf(callback);
      if (index > -1) {
        this.poseListeners.splice(index, 1);
      }
    };
  }

  onError(callback: ErrorCallback): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Cleanup method
  removeAllListeners(): void {
    this.landmarksListeners = [];
    this.poseListeners = [];
    this.errorListeners = [];
    eventEmitter.removeAllListeners('onLandmarksDetected');
    eventEmitter.removeAllListeners('onPoseClassified');
    eventEmitter.removeAllListeners('onError');
  }
}

// Export singleton instance
export default new MediaPipePoseManager();