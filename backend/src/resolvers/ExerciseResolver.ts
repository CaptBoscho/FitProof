import { Query, Mutation, Arg, Resolver, ID, Int } from 'type-graphql';
import { Exercise } from '../entities/Exercise';
import { ExerciseRepository } from '../repositories/ExerciseRepository';
import { AppDataSource } from '../config/database';
import { CreateExerciseInput, UpdateExerciseInput, ExerciseFiltersInput, ExerciseSearchInput } from '../types/ExerciseTypes';
import { GenericResponse } from '../types/ResponseTypes';

@Resolver(() => Exercise)
export class ExerciseResolver {
  private exerciseRepository: ExerciseRepository;

  constructor() {
    this.exerciseRepository = new ExerciseRepository(AppDataSource);
  }

  @Query(() => [Exercise])
  async exercises(
    @Arg('filters', { nullable: true }) filters?: ExerciseFiltersInput
  ): Promise<Exercise[]> {
    return await this.exerciseRepository.findAll(filters || { activeOnly: true });
  }

  @Query(() => Exercise, { nullable: true })
  async exercise(@Arg('id', () => ID) id: string): Promise<Exercise | null> {
    return await this.exerciseRepository.findById(id);
  }

  @Query(() => [String])
  async exerciseCategories(): Promise<string[]> {
    return await this.exerciseRepository.getCategories();
  }

  @Query(() => [Exercise])
  async exercisesByCategory(@Arg('category') category: string): Promise<Exercise[]> {
    return await this.exerciseRepository.findByCategory(category);
  }

  @Query(() => [Exercise])
  async searchExercises(@Arg('input') input: ExerciseSearchInput): Promise<Exercise[]> {
    return await this.exerciseRepository.searchByName(input.searchTerm, input.activeOnly);
  }

  @Query(() => Int)
  async exerciseCount(
    @Arg('filters', { nullable: true }) filters?: ExerciseFiltersInput
  ): Promise<number> {
    return await this.exerciseRepository.count(filters);
  }

  @Mutation(() => Exercise)
  async createExercise(@Arg('input') input: CreateExerciseInput): Promise<Exercise> {
    try {
      return await this.exerciseRepository.create(input);
    } catch (error) {
      throw new Error(`Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => Exercise)
  async updateExercise(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateExerciseInput
  ): Promise<Exercise> {
    try {
      const exercise = await this.exerciseRepository.update(id, input);
      if (!exercise) {
        throw new Error('Exercise not found');
      }
      return exercise;
    } catch (error) {
      throw new Error(`Failed to update exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => GenericResponse)
  async deleteExercise(@Arg('id', () => ID) id: string): Promise<GenericResponse> {
    try {
      const deleted = await this.exerciseRepository.softDelete(id);
      return {
        success: deleted,
        message: deleted ? 'Exercise deleted successfully' : 'Exercise not found'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
