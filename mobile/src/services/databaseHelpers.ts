import { getDatabase } from './database';
import { v4 as uuidv4 } from 'react-native-uuid';

// Types matching backend schema
export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseId: string;
  totalReps: number;
  validReps: number;
  totalPoints: number;
  deviceOrientation: string;
  startedAt: number;
  completedAt?: number;
  durationSeconds?: number;
  isCompleted: boolean;
  synced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutRep {
  id: string;
  sessionId: string;
  repNumber: number;
  isValid: boolean;
  confidenceScore: number;
  validationErrors?: string;
  landmarkFrames?: string; // JSON string
  poseSequence?: string; // JSON string
  calculatedAngles?: string; // JSON string
  durationMs?: number;
  startedAt?: number;
  completedAt?: number;
  synced: boolean;
  createdAt: number;
}

export interface MLTrainingData {
  id?: number;
  sessionId: string;
  frameNumber: number;
  timestamp: number;
  exerciseType: string;
  landmarks: string; // JSON string
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
  synced: boolean;
  createdAt: number;
}

// Workout Session helpers
export const createWorkoutSession = async (session: Omit<WorkoutSession, 'id' | 'createdAt' | 'updatedAt' | 'synced'>): Promise<string> => {
  const db = getDatabase();
  const id = uuidv4();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO workout_sessions (
      id, user_id, exercise_id, total_reps, valid_reps, total_points,
      device_orientation, started_at, completed_at, duration_seconds,
      is_completed, synced, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      session.userId,
      session.exerciseId,
      session.totalReps,
      session.validReps,
      session.totalPoints,
      session.deviceOrientation,
      session.startedAt,
      session.completedAt ?? null,
      session.durationSeconds ?? null,
      session.isCompleted ? 1 : 0,
      0, // not synced initially
      now,
      now,
    ]
  );

  console.log(`✅ Created workout session: ${id}`);
  return id;
};

export const updateWorkoutSession = async (
  id: string,
  updates: Partial<Omit<WorkoutSession, 'id' | 'userId' | 'exerciseId' | 'createdAt'>>
): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.totalReps !== undefined) {
    fields.push('total_reps = ?');
    values.push(updates.totalReps);
  }
  if (updates.validReps !== undefined) {
    fields.push('valid_reps = ?');
    values.push(updates.validReps);
  }
  if (updates.totalPoints !== undefined) {
    fields.push('total_points = ?');
    values.push(updates.totalPoints);
  }
  if (updates.completedAt !== undefined) {
    fields.push('completed_at = ?');
    values.push(updates.completedAt);
  }
  if (updates.durationSeconds !== undefined) {
    fields.push('duration_seconds = ?');
    values.push(updates.durationSeconds);
  }
  if (updates.isCompleted !== undefined) {
    fields.push('is_completed = ?');
    values.push(updates.isCompleted ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(id);

  await db.runAsync(
    `UPDATE workout_sessions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );

  console.log(`✅ Updated workout session: ${id}`);
};

export const getWorkoutSession = async (id: string): Promise<WorkoutSession | null> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<any>(
    'SELECT * FROM workout_sessions WHERE id = ?',
    [id]
  );

  if (!result) return null;

  return {
    id: result.id,
    userId: result.user_id,
    exerciseId: result.exercise_id,
    totalReps: result.total_reps,
    validReps: result.valid_reps,
    totalPoints: result.total_points,
    deviceOrientation: result.device_orientation,
    startedAt: result.started_at,
    completedAt: result.completed_at,
    durationSeconds: result.duration_seconds,
    isCompleted: result.is_completed === 1,
    synced: result.synced === 1,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
};

export const getUnsyncedWorkoutSessions = async (): Promise<WorkoutSession[]> => {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM workout_sessions WHERE synced = 0 ORDER BY created_at ASC'
  );

  return results.map((result) => ({
    id: result.id,
    userId: result.user_id,
    exerciseId: result.exercise_id,
    totalReps: result.total_reps,
    validReps: result.valid_reps,
    totalPoints: result.total_points,
    deviceOrientation: result.device_orientation,
    startedAt: result.started_at,
    completedAt: result.completed_at,
    durationSeconds: result.duration_seconds,
    isCompleted: result.is_completed === 1,
    synced: result.synced === 1,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  }));
};

// ML Training Data helpers
export const saveMLTrainingData = async (data: Omit<MLTrainingData, 'id' | 'createdAt' | 'synced'>): Promise<number> => {
  const db = getDatabase();
  const now = Date.now();

  const result = await db.runAsync(
    `INSERT INTO ml_training_data (
      session_id, frame_number, timestamp, exercise_type, landmarks,
      arm_angle, leg_angle, torso_angle, shoulder_drop_percentage,
      knee_drop_distance, foot_stability, current_phase, is_valid_form,
      confidence, labeled_phase, labeled_form_quality, synced, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.sessionId,
      data.frameNumber,
      data.timestamp,
      data.exerciseType,
      data.landmarks,
      data.armAngle ?? null,
      data.legAngle ?? null,
      data.torsoAngle ?? null,
      data.shoulderDropPercentage ?? null,
      data.kneeDropDistance ?? null,
      data.footStability ?? null,
      data.currentPhase,
      data.isValidForm ? 1 : 0,
      data.confidence,
      data.labeledPhase,
      data.labeledFormQuality,
      0, // not synced initially
      now,
    ]
  );

  console.log(`✅ Saved ML training data frame: ${data.frameNumber}`);
  return result.lastInsertRowId;
};

export const bulkSaveMLTrainingData = async (dataArray: Omit<MLTrainingData, 'id' | 'createdAt' | 'synced'>[]): Promise<void> => {
  const db = getDatabase();

  await db.withTransactionAsync(async () => {
    for (const data of dataArray) {
      await saveMLTrainingData(data);
    }
  });

  console.log(`✅ Bulk saved ${dataArray.length} ML training data frames`);
};

export const getMLTrainingDataBySession = async (sessionId: string): Promise<MLTrainingData[]> => {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM ml_training_data WHERE session_id = ? ORDER BY frame_number ASC',
    [sessionId]
  );

  return results.map((result) => ({
    id: result.id,
    sessionId: result.session_id,
    frameNumber: result.frame_number,
    timestamp: result.timestamp,
    exerciseType: result.exercise_type,
    landmarks: result.landmarks,
    armAngle: result.arm_angle,
    legAngle: result.leg_angle,
    torsoAngle: result.torso_angle,
    shoulderDropPercentage: result.shoulder_drop_percentage,
    kneeDropDistance: result.knee_drop_distance,
    footStability: result.foot_stability,
    currentPhase: result.current_phase,
    isValidForm: result.is_valid_form === 1,
    confidence: result.confidence,
    labeledPhase: result.labeled_phase,
    labeledFormQuality: result.labeled_form_quality,
    synced: result.synced === 1,
    createdAt: result.created_at,
  }));
};

export const getUnsyncedMLTrainingData = async (): Promise<MLTrainingData[]> => {
  const db = getDatabase();
  const results = await db.getAllAsync<any>(
    'SELECT * FROM ml_training_data WHERE synced = 0 ORDER BY created_at ASC LIMIT 1000'
  );

  return results.map((result) => ({
    id: result.id,
    sessionId: result.session_id,
    frameNumber: result.frame_number,
    timestamp: result.timestamp,
    exerciseType: result.exercise_type,
    landmarks: result.landmarks,
    armAngle: result.arm_angle,
    legAngle: result.leg_angle,
    torsoAngle: result.torso_angle,
    shoulderDropPercentage: result.shoulder_drop_percentage,
    kneeDropDistance: result.knee_drop_distance,
    footStability: result.foot_stability,
    currentPhase: result.current_phase,
    isValidForm: result.is_valid_form === 1,
    confidence: result.confidence,
    labeledPhase: result.labeled_phase,
    labeledFormQuality: result.labeled_form_quality,
    synced: result.synced === 1,
    createdAt: result.created_at,
  }));
};

export const markMLTrainingDataAsSynced = async (ids: number[]): Promise<void> => {
  if (ids.length === 0) return;

  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');

  await db.runAsync(
    `UPDATE ml_training_data SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );

  console.log(`✅ Marked ${ids.length} ML training data frames as synced`);
};

// Mark session as synced
export const markSessionAsSynced = async (id: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync('UPDATE workout_sessions SET synced = 1 WHERE id = ?', [id]);
  console.log(`✅ Marked session ${id} as synced`);
};

// Get database stats
export const getDatabaseStats = async (): Promise<{
  totalSessions: number;
  unsyncedSessions: number;
  totalMLFrames: number;
  unsyncedMLFrames: number;
}> => {
  const db = getDatabase();

  const totalSessions = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_sessions'
  );

  const unsyncedSessions = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_sessions WHERE synced = 0'
  );

  const totalMLFrames = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ml_training_data'
  );

  const unsyncedMLFrames = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ml_training_data WHERE synced = 0'
  );

  return {
    totalSessions: totalSessions?.count ?? 0,
    unsyncedSessions: unsyncedSessions?.count ?? 0,
    totalMLFrames: totalMLFrames?.count ?? 0,
    unsyncedMLFrames: unsyncedMLFrames?.count ?? 0,
  };
};
