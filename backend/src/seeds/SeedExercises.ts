import { AppDataSource } from '../config/database';
import { Exercise } from '../entities/Exercise';

/**
 * Seed exercises with correct point values
 * Based on TODO.md: Pushups/Situps: 2pts, Squats: 1pt
 */
export async function seedExercises() {
  console.log('🌱 Seeding exercises...');

  try {
    await AppDataSource.initialize();
    const exerciseRepository = AppDataSource.getRepository(Exercise);

    const exercises = [
      {
        name: 'Pushups',
        pointsPerRep: 2,
        description: 'Traditional pushups targeting chest, shoulders, and triceps',
        category: 'Upper Body',
        iconColor: '#FF5722',
        instructionText: 'Keep your body straight, lower until chest nearly touches ground, push back up',
        validationRules: ['chest_depth', 'arm_extension', 'body_alignment'],
        isActive: true,
      },
      {
        name: 'Situps',
        pointsPerRep: 2,
        description: 'Core strengthening exercise targeting abdominal muscles',
        category: 'Core',
        iconColor: '#2196F3',
        instructionText: 'Lie on back, lift torso to knees, lower back down with control',
        validationRules: ['torso_angle', 'controlled_movement', 'full_range'],
        isActive: true,
      },
      {
        name: 'Squats',
        pointsPerRep: 1,
        description: 'Fundamental lower body exercise for legs and glutes',
        category: 'Lower Body',
        iconColor: '#4CAF50',
        instructionText: 'Stand with feet shoulder-width apart, lower hips back and down, rise back up',
        validationRules: ['hip_depth', 'knee_alignment', 'back_angle'],
        isActive: true,
      },
    ];

    for (const exerciseData of exercises) {
      // Check if exercise already exists
      const existing = await exerciseRepository.findOne({
        where: { name: exerciseData.name },
      });

      if (existing) {
        // Update existing exercise
        await exerciseRepository.update(existing.id, exerciseData);
        console.log(`✅ Updated exercise: ${exerciseData.name} (${exerciseData.pointsPerRep} pts/rep)`);
      } else {
        // Create new exercise
        const exercise = exerciseRepository.create(exerciseData);
        await exerciseRepository.save(exercise);
        console.log(`✅ Created exercise: ${exerciseData.name} (${exerciseData.pointsPerRep} pts/rep)`);
      }
    }

    console.log('🎉 Exercise seeding complete!');
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedExercises()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
