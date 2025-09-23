import { Query, Mutation, Arg, Resolver, ID, Int } from 'type-graphql';
import { WorkoutSession } from '../entities/WorkoutSession';
import { WorkoutRep } from '../entities/WorkoutRep';
import { WorkoutSessionRepository } from '../repositories/WorkoutSessionRepository';
import { WorkoutRepRepository } from '../repositories/WorkoutRepRepository';
import { AppDataSource } from '../config/database';
import { CreateWorkoutSessionInput, UpdateWorkoutSessionInput, CompleteWorkoutSessionInput, CreateWorkoutRepInput, WorkoutSessionFiltersInput, WorkoutRepFiltersInput } from '../types/WorkoutTypes';
import { GenericResponse, ExerciseStatsResponse, SessionStatsResponse, FormAnalysisResponse, PaginatedSessionsResponse } from '../types/ResponseTypes';

@Resolver(() => WorkoutSession)
export class WorkoutSessionResolver {
  private sessionRepository: WorkoutSessionRepository;
  private repRepository: WorkoutRepRepository;

  constructor() {
    this.sessionRepository = new WorkoutSessionRepository(AppDataSource);
    this.repRepository = new WorkoutRepRepository(AppDataSource);
  }

  @Query(() => [WorkoutSession])
  async workoutSessions(
    @Arg('filters', { nullable: true }) filters?: WorkoutSessionFiltersInput
  ): Promise<WorkoutSession[]> {
    return await this.sessionRepository.findAll(filters || {});
  }

  @Query(() => WorkoutSession, { nullable: true })
  async workoutSession(@Arg('id', () => ID) id: string): Promise<WorkoutSession | null> {
    return await this.sessionRepository.findById(id);
  }

  @Query(() => [WorkoutSession])
  async userWorkoutSessions(
    @Arg('userId', () => ID) userId: string,
    @Arg('filters', { nullable: true }) filters?: WorkoutSessionFiltersInput
  ): Promise<WorkoutSession[]> {
    return await this.sessionRepository.findByUserId(userId, filters);
  }

  @Query(() => [WorkoutSession])
  async exerciseWorkoutSessions(
    @Arg('exerciseId', () => ID) exerciseId: string,
    @Arg('filters', { nullable: true }) filters?: WorkoutSessionFiltersInput
  ): Promise<WorkoutSession[]> {
    return await this.sessionRepository.findByExerciseId(exerciseId, filters);
  }

  @Query(() => PaginatedSessionsResponse)
  async paginatedWorkoutSessions(
    @Arg('filters', { nullable: true }) filters?: WorkoutSessionFiltersInput
  ): Promise<PaginatedSessionsResponse> {
    const result = await this.sessionRepository.findAllWithCount(filters || {});
    return {
      sessions: result.sessions,
      total: result.total,
      page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
      limit: filters?.limit || 50
    };
  }

  @Query(() => [WorkoutRep])
  async workoutReps(
    @Arg('filters', { nullable: true }) filters?: WorkoutRepFiltersInput
  ): Promise<WorkoutRep[]> {
    return await this.repRepository.findAll(filters || {});
  }

  @Query(() => [WorkoutRep])
  async sessionReps(@Arg('sessionId', () => ID) sessionId: string): Promise<WorkoutRep[]> {
    return await this.repRepository.findBySessionId(sessionId);
  }

  @Query(() => ExerciseStatsResponse)
  async exerciseStats(
    @Arg('userId', () => ID) userId: string,
    @Arg('exerciseId', () => ID) exerciseId: string
  ): Promise<ExerciseStatsResponse> {
    const stats = await this.sessionRepository.getExerciseStats(userId, exerciseId);
    if (!stats) {
      throw new Error('No workout data found for this user and exercise');
    }
    return stats;
  }

  @Query(() => SessionStatsResponse)
  async sessionStats(@Arg('sessionId', () => ID) sessionId: string): Promise<SessionStatsResponse> {
    const stats = await this.sessionRepository.getSessionStats(sessionId);
    if (!stats) {
      throw new Error('Session not found');
    }
    return stats;
  }

  @Query(() => FormAnalysisResponse)
  async formAnalysis(@Arg('sessionId', () => ID) sessionId: string): Promise<FormAnalysisResponse> {
    const analysis = await this.repRepository.getFormAnalysis(sessionId);
    if (!analysis) {
      throw new Error('Session not found or no reps data available');
    }
    return analysis;
  }

  @Query(() => Int)
  async workoutSessionCount(
    @Arg('filters', { nullable: true }) filters?: WorkoutSessionFiltersInput
  ): Promise<number> {
    return await this.sessionRepository.count(filters);
  }

  @Mutation(() => WorkoutSession)
  async createWorkoutSession(@Arg('input') input: CreateWorkoutSessionInput): Promise<WorkoutSession> {
    try {
      return await this.sessionRepository.create(input);
    } catch (error) {
      throw new Error(`Failed to create workout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => WorkoutSession)
  async updateWorkoutSession(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateWorkoutSessionInput
  ): Promise<WorkoutSession> {
    try {
      const session = await this.sessionRepository.update(id, input);
      if (!session) {
        throw new Error('Workout session not found');
      }
      return session;
    } catch (error) {
      throw new Error(`Failed to update workout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => WorkoutSession)
  async completeWorkoutSession(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: CompleteWorkoutSessionInput
  ): Promise<WorkoutSession> {
    try {
      const session = await this.sessionRepository.complete(id, input);
      if (!session) {
        throw new Error('Workout session not found');
      }
      return session;
    } catch (error) {
      throw new Error(`Failed to complete workout session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => GenericResponse)
  async deleteWorkoutSession(@Arg('id', () => ID) id: string): Promise<GenericResponse> {
    try {
      const deleted = await this.sessionRepository.softDelete(id);
      return {
        success: deleted,
        message: deleted ? 'Workout session deleted successfully' : 'Workout session not found'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete workout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  @Mutation(() => WorkoutRep)
  async createWorkoutRep(@Arg('input') input: CreateWorkoutRepInput): Promise<WorkoutRep> {
    try {
      return await this.repRepository.create(input);
    } catch (error) {
      throw new Error(`Failed to create workout rep: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => GenericResponse)
  async deleteWorkoutRep(@Arg('id', () => ID) id: string): Promise<GenericResponse> {
    try {
      const deleted = await this.repRepository.delete(id);
      return {
        success: deleted,
        message: deleted ? 'Workout rep deleted successfully' : 'Workout rep not found'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete workout rep: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  @Mutation(() => GenericResponse)
  async bulkCreateWorkoutReps(
    @Arg('sessionId', () => ID) sessionId: string,
    @Arg('reps', () => [CreateWorkoutRepInput]) reps: CreateWorkoutRepInput[]
  ): Promise<GenericResponse> {
    try {
      const repsWithSessionId = reps.map(rep => ({ ...rep, sessionId }));
      await this.repRepository.bulkCreate(repsWithSessionId);
      return {
        success: true,
        message: `Successfully created ${reps.length} workout reps`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create workout reps: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}