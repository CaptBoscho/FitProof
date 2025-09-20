import { Query, Mutation, Arg, Resolver } from 'type-graphql';
import { Exercise, CreateExerciseInput, UpdateExerciseInput } from '../types/exercise';

@Resolver(() => Exercise)
export class ExerciseResolver {
  @Query(() => [Exercise])
  async exercises(): Promise<Exercise[]> {
    // Mock data for now - will connect to database in future days
    return [
      {
        id: '1',
        name: 'Pushup',
        pointsPerRep: 2,
        description: 'Standard pushup exercise',
        validationRules: ['proper_form', 'full_range_of_motion'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Situp',
        pointsPerRep: 2,
        description: 'Standard situp exercise',
        validationRules: ['proper_form', 'full_range_of_motion'],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Squat',
        pointsPerRep: 1,
        description: 'Bodyweight squat exercise',
        validationRules: ['proper_depth', 'knee_tracking'],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  @Query(() => Exercise, { nullable: true })
  async exercise(@Arg('id') id: string): Promise<Exercise | null> {
    // Mock implementation - will connect to database later
    const exercises = await this.exercises();
    return exercises.find(ex => ex.id === id) || null;
  }

  @Mutation(() => Exercise)
  async createExercise(@Arg('input') input: CreateExerciseInput): Promise<Exercise> {
    // Mock implementation - will connect to database later
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...input,
      validationRules: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  @Mutation(() => Exercise)
  async updateExercise(@Arg('input') input: UpdateExerciseInput): Promise<Exercise> {
    // Mock implementation - will connect to database later
    const exercise = await this.exercise(input.id);
    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return {
      ...exercise,
      ...input,
      updatedAt: new Date()
    };
  }
}