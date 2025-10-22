import {
  createWorkoutSession,
  updateWorkoutSession,
  bulkSaveMLTrainingData,
  type MLTrainingData,
} from './databaseHelpers';
import { v4 as uuidv4 } from 'react-native-uuid';

// Compression utilities for landmark data
export const compressLandmarkData = (landmarks: any[]): string => {
  // Convert landmarks to a more compact format
  // Store as array of [x, y, z, visibility] instead of objects
  const compressed = landmarks.map(lm => [
    Math.round(lm.x * 10000) / 10000, // Round to 4 decimal places
    Math.round(lm.y * 10000) / 10000,
    Math.round((lm.z ?? 0) * 10000) / 10000,
    Math.round((lm.visibility ?? 0) * 100) / 100, // Round visibility to 2 decimal places
  ]);
  return JSON.stringify(compressed);
};

export const decompressLandmarkData = (compressed: string): any[] => {
  const data = JSON.parse(compressed);
  return data.map((lm: number[]) => ({
    x: lm[0],
    y: lm[1],
    z: lm[2],
    visibility: lm[3],
  }));
};

// Workout Session Manager
export class WorkoutSessionManager {
  private sessionId: string | null = null;
  private userId: string;
  private exerciseId: string;
  private exerciseType: string;
  private startTime: number;
  private mlFrameDataBuffer: Omit<MLTrainingData, 'id' | 'createdAt' | 'synced'>[] = [];

  constructor(userId: string, exerciseId: string, exerciseType: string) {
    this.userId = userId;
    this.exerciseId = exerciseId;
    this.exerciseType = exerciseType;
    this.startTime = Date.now();
  }

  // Start a new workout session
  async startSession(): Promise<string> {
    try {
      this.sessionId = await createWorkoutSession({
        userId: this.userId,
        exerciseId: this.exerciseId,
        totalReps: 0,
        validReps: 0,
        totalPoints: 0,
        deviceOrientation: 'portrait', // TODO: Get actual device orientation
        startedAt: this.startTime,
        isCompleted: false,
      });

      console.log(`✅ Workout session started: ${this.sessionId}`);
      return this.sessionId;
    } catch (error) {
      console.error('❌ Failed to start workout session:', error);
      throw error;
    }
  }

  // Add ML training frame data to buffer
  addMLFrameData(frameData: {
    frameNumber: number;
    timestamp: number;
    landmarks: any[];
    armAngle?: number;
    legAngle?: number;
    torsoAngle?: number;
    shoulderDropPercentage?: number;
    kneeDropDistance?: number;
    footStability?: number;
    currentPhase: string;
    isValidForm: boolean;
    confidence: number;
    labeledPhase: string;
    labeledFormQuality: string;
  }): void {
    if (!this.sessionId) {
      console.warn('⚠️ Cannot add ML frame data: session not started');
      return;
    }

    // Compress landmarks before storing
    const compressedLandmarks = compressLandmarkData(frameData.landmarks);

    this.mlFrameDataBuffer.push({
      sessionId: this.sessionId,
      frameNumber: frameData.frameNumber,
      timestamp: frameData.timestamp,
      exerciseType: this.exerciseType,
      landmarks: compressedLandmarks,
      armAngle: frameData.armAngle,
      legAngle: frameData.legAngle,
      torsoAngle: frameData.torsoAngle,
      shoulderDropPercentage: frameData.shoulderDropPercentage,
      kneeDropDistance: frameData.kneeDropDistance,
      footStability: frameData.footStability,
      currentPhase: frameData.currentPhase,
      isValidForm: frameData.isValidForm,
      confidence: frameData.confidence,
      labeledPhase: frameData.labeledPhase,
      labeledFormQuality: frameData.labeledFormQuality,
    });

    // Save in batches of 10 to avoid too many database writes
    if (this.mlFrameDataBuffer.length >= 10) {
      this.flushMLFrameData();
    }
  }

  // Flush ML frame data buffer to database
  private async flushMLFrameData(): Promise<void> {
    if (this.mlFrameDataBuffer.length === 0) return;

    try {
      await bulkSaveMLTrainingData(this.mlFrameDataBuffer);
      console.log(`✅ Flushed ${this.mlFrameDataBuffer.length} ML frames to database`);
      this.mlFrameDataBuffer = [];
    } catch (error) {
      console.error('❌ Failed to flush ML frame data:', error);
      // Keep data in buffer to retry later
    }
  }

  // Complete the workout session
  async completeSession(
    totalReps: number,
    validReps: number,
    pointsPerRep: number = 10
  ): Promise<void> {
    if (!this.sessionId) {
      console.warn('⚠️ Cannot complete session: session not started');
      return;
    }

    try {
      // Flush any remaining ML frame data
      await this.flushMLFrameData();

      const completedAt = Date.now();
      const durationSeconds = Math.floor((completedAt - this.startTime) / 1000);
      const totalPoints = validReps * pointsPerRep;

      await updateWorkoutSession(this.sessionId, {
        totalReps,
        validReps,
        totalPoints,
        completedAt,
        durationSeconds,
        isCompleted: true,
      });

      console.log(`✅ Workout session completed: ${this.sessionId}`);
      console.log(`   Duration: ${durationSeconds}s, Total Reps: ${totalReps}, Valid Reps: ${validReps}, Points: ${totalPoints}`);
    } catch (error) {
      console.error('❌ Failed to complete workout session:', error);
      throw error;
    }
  }

  // Get session ID
  getSessionId(): string | null {
    return this.sessionId;
  }

  // Get session stats
  getSessionStats() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      exerciseId: this.exerciseId,
      exerciseType: this.exerciseType,
      startTime: this.startTime,
      mlFramesBuffered: this.mlFrameDataBuffer.length,
    };
  }
}

// Helper function to create and manage a workout session
export const createWorkoutSessionManager = (
  userId: string,
  exerciseId: string,
  exerciseType: string
): WorkoutSessionManager => {
  return new WorkoutSessionManager(userId, exerciseId, exerciseType);
};
