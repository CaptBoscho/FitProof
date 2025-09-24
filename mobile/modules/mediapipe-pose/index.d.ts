export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseLandmarks {
  landmarks: PoseLandmark[];
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

declare class MediaPipePoseManager {
  startCamera(): Promise<void>;
  stopCamera(): Promise<void>;
  loadModel(modelPath: string): Promise<void>;
  setExerciseMode(exercise: ExerciseType): void;

  onLandmarksDetected(callback: (landmarks: PoseLandmarks) => void): () => void;
  onPoseClassified(callback: (pose: PoseType, confidence: number) => void): () => void;
  onError(callback: (error: string) => void): () => void;

  removeAllListeners(): void;
}

declare const mediaPipePoseManager: MediaPipePoseManager;
export default mediaPipePoseManager;