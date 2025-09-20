import { DataSource } from 'typeorm';
import { Exercise } from '../../entities/Exercise';

export const exerciseSeeds = [
  {
    name: 'Pushup',
    pointsPerRep: 2,
    description: 'Standard pushup exercise targeting chest, shoulders, and triceps',
    validationRules: ['proper_form', 'full_range_of_motion', 'chest_to_ground'],
    category: 'Upper Body',
    iconColor: '#FF6B6B',
    instructionText: 'Start in plank position. Lower body until chest nearly touches ground. Push back up.',
    isActive: true,
  },
  {
    name: 'Situp',
    pointsPerRep: 2,
    description: 'Standard situp exercise targeting core and abdominal muscles',
    validationRules: ['proper_form', 'full_range_of_motion', 'shoulders_to_knees'],
    category: 'Core',
    iconColor: '#4ECDC4',
    instructionText: 'Lie on back with knees bent. Sit up bringing chest toward knees. Lower back down.',
    isActive: true,
  },
  {
    name: 'Squat',
    pointsPerRep: 1,
    description: 'Bodyweight squat exercise targeting legs and glutes',
    validationRules: ['proper_depth', 'knee_tracking', 'back_straight'],
    category: 'Lower Body',
    iconColor: '#45B7D1',
    instructionText: 'Stand with feet shoulder-width apart. Lower hips back and down. Return to standing.',
    isActive: true,
  },
];

export async function seedExercises(dataSource: DataSource): Promise<void> {
  const exerciseRepository = dataSource.getRepository(Exercise);

  console.log('🌱 Seeding exercises...');

  for (const exerciseData of exerciseSeeds) {
    // Check if exercise already exists
    const existingExercise = await exerciseRepository.findOne({
      where: { name: exerciseData.name }
    });

    if (!existingExercise) {
      const exercise = exerciseRepository.create(exerciseData);
      await exerciseRepository.save(exercise);
      console.log(`✅ Created exercise: ${exerciseData.name}`);
    } else {
      console.log(`⏭️  Exercise already exists: ${exerciseData.name}`);
    }
  }

  console.log('✅ Exercise seeding completed');
}