// Common types for the FitProof mobile app

export interface User {
  id: string;
  email: string;
  username: string;
  totalPoints: number;
  currentStreak: number;
  lastWorkoutDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  pointsPerRep: number;
  description?: string;
  validationRules?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseId: string;
  totalReps: number;
  totalPoints: number;
  deviceOrientation: string;
  startedAt: string;
  completedAt?: string;
  exercise?: Exercise;
}

export interface WorkoutRep {
  id: string;
  sessionId: string;
  repNumber: number;
  isValid: boolean;
  confidence: number;
  timestamp: string;
}

export interface AuthPayload {
  token: string;
  user: User;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
  database: string;
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Exercises: undefined;
  Workout: {
    exerciseId: string;
  };
  WorkoutSummary: {
    exerciseType: string;
    duration: number;
    totalReps: number;
    validReps: number;
    invalidReps: number;
    formErrors: string[];
  };
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  SyncStatus: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Exercises: undefined;
  Friends: undefined;
  Profile: undefined;
};

// API Response types
export interface ApiResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

// Component Props
export interface BaseScreenProps {
  navigation: any;
  route: any;
}

// Workout types
export type ExerciseType = 'pushup' | 'situp' | 'squat';

export interface PoseDetectionResult {
  landmarks: number[][];
  confidence: number;
  pose: string;
}

export interface RepValidationResult {
  isValid: boolean;
  confidence: number;
  feedback?: string;
}
