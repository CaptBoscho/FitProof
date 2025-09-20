import { AppDataSource } from '../../config/database';
import { seedExercises } from './exerciseSeeds';

async function runSeeds(): Promise<void> {
  try {
    console.log('🚀 Starting database seeding...');

    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Database connected');
    }

    // Run all seeds
    await seedExercises(AppDataSource);

    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('✅ Database connection closed');
    }
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  runSeeds();
}