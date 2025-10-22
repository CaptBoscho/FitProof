import * as SQLite from 'expo-sqlite';

// Database configuration
const DB_NAME = 'fitproof.db';
const DB_VERSION = 1;

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

// Initialize database
export const initDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    console.log('✅ Database opened successfully');

    // Create tables
    await createTables();
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Create all tables
const createTables = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  // Workout Sessions table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      total_reps INTEGER DEFAULT 0,
      valid_reps INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      device_orientation TEXT DEFAULT 'portrait',
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      duration_seconds INTEGER,
      is_completed INTEGER DEFAULT 0,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create index on user_id for faster queries
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id
    ON workout_sessions(user_id);
  `);

  // Create index on synced status
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_synced
    ON workout_sessions(synced);
  `);

  // Workout Reps table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workout_reps (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      rep_number INTEGER NOT NULL,
      is_valid INTEGER DEFAULT 0,
      confidence_score REAL DEFAULT 0.0,
      validation_errors TEXT,
      landmark_frames TEXT,
      pose_sequence TEXT,
      calculated_angles TEXT,
      duration_ms INTEGER,
      started_at INTEGER,
      completed_at INTEGER,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );
  `);

  // Create index on session_id for faster queries
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_workout_reps_session_id
    ON workout_reps(session_id);
  `);

  // Create index on synced status
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_workout_reps_synced
    ON workout_reps(synced);
  `);

  // ML Training Data table (for the frame data we're collecting)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ml_training_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      frame_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      landmarks TEXT NOT NULL,
      arm_angle REAL,
      leg_angle REAL,
      torso_angle REAL,
      shoulder_drop_percentage REAL,
      knee_drop_distance REAL,
      foot_stability REAL,
      current_phase TEXT NOT NULL,
      is_valid_form INTEGER NOT NULL,
      confidence REAL NOT NULL,
      labeled_phase TEXT NOT NULL,
      labeled_form_quality TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
    );
  `);

  // Create index on session_id for ML data
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_ml_training_data_session_id
    ON ml_training_data(session_id);
  `);

  // Create index on synced status for ML data
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_ml_training_data_synced
    ON ml_training_data(synced);
  `);

  // Sync Queue table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Create index on entity_type and entity_id
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_sync_queue_entity
    ON sync_queue(entity_type, entity_id);
  `);

  // User cache table (for offline access)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_cache (
      user_id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      total_points INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      last_workout_date INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Exercises cache table (for offline access)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises_cache (
      exercise_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points_per_rep INTEGER NOT NULL,
      description TEXT,
      validation_rules TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  console.log('✅ All tables created successfully');
};

// Get database instance
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

// Close database
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✅ Database closed successfully');
  }
};

// Drop all tables (for testing/development)
export const dropAllTables = async (): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.execAsync(`DROP TABLE IF EXISTS ml_training_data;`);
  await db.execAsync(`DROP TABLE IF EXISTS workout_reps;`);
  await db.execAsync(`DROP TABLE IF EXISTS workout_sessions;`);
  await db.execAsync(`DROP TABLE IF EXISTS sync_queue;`);
  await db.execAsync(`DROP TABLE IF EXISTS user_cache;`);
  await db.execAsync(`DROP TABLE IF EXISTS exercises_cache;`);

  console.log('✅ All tables dropped successfully');
};

// Reset database (drop and recreate)
export const resetDatabase = async (): Promise<void> => {
  await dropAllTables();
  await createTables();
  console.log('✅ Database reset successfully');
};
