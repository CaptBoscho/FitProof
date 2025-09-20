import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'fitproof_user',
  password: process.env.DB_PASSWORD || 'fitproof_password',
  database: isTest ? 'fitproof_test' : (process.env.DB_NAME || 'fitproof_dev'),
  entities: ['src/models/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: isDevelopment, // Auto-sync in development only
  logging: isDevelopment ? ['query', 'error'] : ['error'],
  dropSchema: isTest, // Drop schema for test database
  migrationsRun: !isDevelopment, // Run migrations in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create DataSource instance
export const AppDataSource = new DataSource(databaseConfig);

// Database connection function
export async function connectToDatabase(): Promise<DataSource> {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected successfully');
    }
    return AppDataSource;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Database health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    if (!AppDataSource.isInitialized) {
      return false;
    }

    // Simple query to check connection
    await AppDataSource.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}