import { Repository, DataSource } from 'typeorm';
import { WorkoutSession } from '../entities/WorkoutSession';

export interface CreateWorkoutSessionData {
  userId: string;
  exerciseId: string;
  deviceOrientation?: string;
  startedAt?: Date;
}

export interface UpdateWorkoutSessionData {
  totalReps?: number;
  validReps?: number;
  totalPoints?: number;
  completedAt?: Date;
  durationSeconds?: number;
  isCompleted?: boolean;
}

export interface WorkoutSessionFilters {
  userId?: string;
  exerciseId?: string;
  isCompleted?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class WorkoutSessionRepository {
  private repository: Repository<WorkoutSession>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(WorkoutSession);
  }

  async create(sessionData: CreateWorkoutSessionData): Promise<WorkoutSession> {
    const session = this.repository.create({
      ...sessionData,
      startedAt: sessionData.startedAt || new Date(),
    });

    return await this.repository.save(session);
  }

  async findById(id: string): Promise<WorkoutSession | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['user', 'exercise']
    });
  }

  async findAll(filters?: WorkoutSessionFilters): Promise<WorkoutSession[]> {
    const queryBuilder = this.repository.createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('session.exercise', 'exercise');

    if (filters?.userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId: filters.userId });
    }

    if (filters?.exerciseId) {
      queryBuilder.andWhere('session.exerciseId = :exerciseId', { exerciseId: filters.exerciseId });
    }

    if (filters?.isCompleted !== undefined) {
      queryBuilder.andWhere('session.isCompleted = :isCompleted', { isCompleted: filters.isCompleted });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    } else if (filters?.startDate) {
      queryBuilder.andWhere('session.startedAt >= :startDate', { startDate: filters.startDate });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('session.startedAt <= :endDate', { endDate: filters.endDate });
    }

    queryBuilder.orderBy('session.startedAt', 'DESC');

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getMany();
  }

  async update(id: string, updateData: UpdateWorkoutSessionData): Promise<WorkoutSession | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async completeSession(id: string, totalReps: number, validReps: number, totalPoints: number): Promise<WorkoutSession | null> {
    const session = await this.findById(id);
    if (!session) return null;

    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - session.startedAt.getTime()) / 1000);

    return await this.update(id, {
      totalReps,
      validReps,
      totalPoints,
      completedAt,
      durationSeconds,
      isCompleted: true
    });
  }

  async getActiveSession(userId: string): Promise<WorkoutSession | null> {
    return await this.repository.findOne({
      where: {
        userId,
        isCompleted: false
      },
      relations: ['exercise'],
      order: { startedAt: 'DESC' }
    });
  }

  async getUserStats(userId: string, days?: number): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalReps: number;
    totalPoints: number;
    averageSessionDuration: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      queryBuilder.andWhere('session.startedAt >= :startDate', { startDate });
    }

    const sessions = await queryBuilder.getMany();
    const completedSessions = sessions.filter(s => s.isCompleted);

    const totalReps = completedSessions.reduce((sum, s) => sum + (s.totalReps || 0), 0);
    const totalPoints = completedSessions.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
    const totalDuration = completedSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      totalReps,
      totalPoints,
      averageSessionDuration: completedSessions.length > 0 ? totalDuration / completedSessions.length : 0
    };
  }

  async getExerciseStats(userId: string, exerciseId: string, days?: number): Promise<{
    totalSessions: number;
    bestSession: WorkoutSession | null;
    averageReps: number;
    improvementTrend: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('session')
      .where('session.userId = :userId AND session.exerciseId = :exerciseId', { userId, exerciseId })
      .andWhere('session.isCompleted = true');

    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      queryBuilder.andWhere('session.startedAt >= :startDate', { startDate });
    }

    queryBuilder.orderBy('session.startedAt', 'ASC');

    const sessions = await queryBuilder.getMany();

    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        bestSession: null,
        averageReps: 0,
        improvementTrend: 0
      };
    }

    const bestSession = sessions.reduce((best, current) =>
      (current.validReps || 0) > (best.validReps || 0) ? current : best
    );

    const averageReps = sessions.reduce((sum, s) => sum + (s.validReps || 0), 0) / sessions.length;

    // Calculate improvement trend (simple linear trend)
    let improvementTrend = 0;
    if (sessions.length >= 2) {
      const firstHalf = sessions.slice(0, Math.floor(sessions.length / 2));
      const secondHalf = sessions.slice(-Math.floor(sessions.length / 2));

      const firstHalfAvg = firstHalf.reduce((sum, s) => sum + (s.validReps || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, s) => sum + (s.validReps || 0), 0) / secondHalf.length;

      improvementTrend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    }

    return {
      totalSessions: sessions.length,
      bestSession,
      averageReps,
      improvementTrend
    };
  }

  async getStreakData(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    workoutDays: Date[];
  }> {
    const sessions = await this.repository.find({
      where: {
        userId,
        isCompleted: true
      },
      order: { startedAt: 'DESC' }
    });

    const workoutDays: Date[] = [];
    const dateSet = new Set<string>();

    sessions.forEach(session => {
      const dateStr = session.startedAt.toISOString().split('T')[0];
      if (!dateSet.has(dateStr)) {
        dateSet.add(dateStr);
        workoutDays.push(new Date(dateStr));
      }
    });

    workoutDays.sort((a, b) => b.getTime() - a.getTime());

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const workoutDay of workoutDays) {
      const daysDiff = Math.floor((today.getTime() - workoutDay.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === currentStreak) {
        currentStreak++;
      } else if (daysDiff === currentStreak + 1 && currentStreak === 0) {
        // Allow for missing today if we're starting the streak calculation
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let previousDate: Date | null = null;

    workoutDays.reverse().forEach(workoutDay => {
      if (previousDate) {
        const daysDiff = Math.floor((workoutDay.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      previousDate = workoutDay;
    });

    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      currentStreak,
      longestStreak,
      workoutDays: workoutDays.reverse()
    };
  }

  async findByUserId(userId: string, filters?: WorkoutSessionFilters): Promise<WorkoutSession[]> {
    return await this.findAll({ ...filters, userId });
  }

  async findByExerciseId(exerciseId: string, filters?: WorkoutSessionFilters): Promise<WorkoutSession[]> {
    return await this.findAll({ ...filters, exerciseId });
  }

  async findAllWithCount(filters?: WorkoutSessionFilters): Promise<{ sessions: WorkoutSession[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('session')
      .leftJoinAndSelect('session.user', 'user')
      .leftJoinAndSelect('session.exercise', 'exercise');

    if (filters?.userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId: filters.userId });
    }

    if (filters?.exerciseId) {
      queryBuilder.andWhere('session.exerciseId = :exerciseId', { exerciseId: filters.exerciseId });
    }

    if (filters?.isCompleted !== undefined) {
      queryBuilder.andWhere('session.isCompleted = :isCompleted', { isCompleted: filters.isCompleted });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    } else if (filters?.startDate) {
      queryBuilder.andWhere('session.startedAt >= :startDate', { startDate: filters.startDate });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('session.startedAt <= :endDate', { endDate: filters.endDate });
    }

    const total = await queryBuilder.getCount();

    queryBuilder.orderBy('session.startedAt', 'DESC');

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    const sessions = await queryBuilder.getMany();

    return { sessions, total };
  }

  async getSessionStats(sessionId: string): Promise<{
    totalReps: number;
    validReps: number;
    averageConfidence: number;
    completionRate: number;
    averageDuration: number;
  } | null> {
    const session = await this.findById(sessionId);
    if (!session) {
      return null;
    }

    // This would typically require joining with workout reps
    // For now, return basic stats from the session
    return {
      totalReps: session.totalReps || 0,
      validReps: session.validReps || 0,
      averageConfidence: 0, // TODO: Calculate from workout reps
      completionRate: session.totalReps ? (session.validReps || 0) / session.totalReps : 0,
      averageDuration: session.durationSeconds || 0
    };
  }

  async count(filters?: WorkoutSessionFilters): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('session');

    if (filters?.userId) {
      queryBuilder.andWhere('session.userId = :userId', { userId: filters.userId });
    }

    if (filters?.exerciseId) {
      queryBuilder.andWhere('session.exerciseId = :exerciseId', { exerciseId: filters.exerciseId });
    }

    if (filters?.isCompleted !== undefined) {
      queryBuilder.andWhere('session.isCompleted = :isCompleted', { isCompleted: filters.isCompleted });
    }

    if (filters?.startDate && filters?.endDate) {
      queryBuilder.andWhere('session.startedAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate
      });
    } else if (filters?.startDate) {
      queryBuilder.andWhere('session.startedAt >= :startDate', { startDate: filters.startDate });
    } else if (filters?.endDate) {
      queryBuilder.andWhere('session.startedAt <= :endDate', { endDate: filters.endDate });
    }

    return await queryBuilder.getCount();
  }

  async complete(id: string, data: { totalReps: number; validReps: number; totalPoints: number }): Promise<WorkoutSession | null> {
    return await this.completeSession(id, data.totalReps, data.validReps, data.totalPoints);
  }

  async softDelete(id: string): Promise<boolean> {
    // For now, we'll use hard delete. In a real app, you might want to add a deletedAt field
    return await this.delete(id);
  }
}