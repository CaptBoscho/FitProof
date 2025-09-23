// App configuration constants
export const CONFIG = {
  // Backend API URLs - adjust based on your backend server
  GRAPHQL_URL: process.env.NODE_ENV === 'development' ? 'http://localhost:4001/graphql' : 'https://your-production-api.com/graphql',
  API_URL: process.env.NODE_ENV === 'development' ? 'http://localhost:4001' : 'https://your-production-api.com',

  // App information
  APP_NAME: 'FitProof',
  VERSION: '1.0.0',

  // Exercise configuration
  EXERCISES: {
    PUSHUP: { name: 'Pushup', pointsPerRep: 2, color: '#FF6B6B' },
    SITUP: { name: 'Situp', pointsPerRep: 2, color: '#4ECDC4' },
    SQUAT: { name: 'Squat', pointsPerRep: 1, color: '#45B7D1' },
  },

  // UI Constants
  COLORS: {
    PRIMARY: '#6C5CE7',
    SECONDARY: '#A29BFE',
    SUCCESS: '#00B894',
    ERROR: '#E17055',
    WARNING: '#FDCB6E',
    BACKGROUND: '#F8F9FA',
    TEXT_PRIMARY: '#2D3436',
    TEXT_SECONDARY: '#636E72',
    WHITE: '#FFFFFF',
    BORDER: '#DDD',
  },

  // Workout configuration
  WORKOUT: {
    COUNTDOWN_SECONDS: 10,
    MAX_WORKOUT_DURATION: 30 * 60, // 30 minutes in seconds
    MIN_REP_CONFIDENCE: 0.8,
  },

  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: '@fitproof_auth_token',
    USER_DATA: '@fitproof_user_data',
    WORKOUT_QUEUE: '@fitproof_workout_queue',
    SETTINGS: '@fitproof_settings',
  },
};
