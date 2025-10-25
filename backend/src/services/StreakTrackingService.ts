/**
 * Streak Tracking Service
 * Handles daily workout streak calculations with rest day allowances
 */

import { User } from '../entities/User';
import { WorkoutSession } from '../entities/WorkoutSession';
import { Between, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../config/database';

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  streakStartDate: Date | null;
  lastWorkoutDate: Date | null;
  restDaysUsed: number;
  restDaysAvailable: number;
  streakStatus: 'active' | 'broken' | 'at_risk' | 'new';
  daysUntilBreak: number;
  streakHistory: StreakPeriod[];
}

export interface StreakPeriod {
  startDate: Date;
  endDate: Date;
  length: number;
  wasBroken: boolean;
  breakReason?: string;
}

export interface StreakUpdateResult {
  previousStreak: number;
  newStreak: number;
  streakIncreased: boolean;
  streakBroken: boolean;
  restDayUsed: boolean;
  milestoneReached?: number;
}

/**
 * Streak configuration
 */
export const STREAK_CONFIG = {
  REST_DAYS_PER_CYCLE: 1, // 1 rest day allowed
  CYCLE_LENGTH_DAYS: 6, // Per 6 days of activity
  GRACE_PERIOD_HOURS: 48, // 48 hours to maintain streak
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100, 365], // Days
};

/**
 * Streak Tracking Service
 */
export class StreakTrackingService {
  /**
   * Calculate current streak for a user
   */
  async calculateStreak(userId: string): Promise<StreakInfo> {
    const userRepo = AppDataSource.getRepository(User);
    const sessionRepo = AppDataSource.getRepository(WorkoutSession);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Get all completed workouts ordered by date
    const workouts = await sessionRepo.find({
      where: {
        userId,
        isCompleted: true,
      },
      order: { completedAt: 'DESC' },
    });

    if (workouts.length === 0) {
      return this.getEmptyStreakInfo();
    }

    const streakData = this.calculateStreakFromWorkouts(workouts);

    return {
      currentStreak: streakData.currentStreak,
      longestStreak: user.longestStreak || streakData.currentStreak,
      streakStartDate: streakData.streakStartDate,
      lastWorkoutDate: streakData.lastWorkoutDate,
      restDaysUsed: streakData.restDaysUsed,
      restDaysAvailable: streakData.restDaysAvailable,
      streakStatus: streakData.streakStatus,
      daysUntilBreak: streakData.daysUntilBreak,
      streakHistory: streakData.streakHistory,
    };
  }

  /**
   * Update streak after a workout completion
   */
  async updateStreakAfterWorkout(userId: string, workoutDate: Date): Promise<StreakUpdateResult> {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const previousStreak = user.currentStreak || 0;
    const lastWorkoutDate = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;

    // Calculate new streak
    const result = this.calculateStreakUpdate(
      previousStreak,
      lastWorkoutDate,
      workoutDate,
      user.restDaysUsed || 0
    );

    // Update user
    await userRepo.update(userId, {
      currentStreak: result.newStreak,
      longestStreak: Math.max(user.longestStreak || 0, result.newStreak),
      lastWorkoutDate: workoutDate,
      restDaysUsed: result.restDayUsed
        ? (user.restDaysUsed || 0) + 1
        : this.resetRestDaysIfNeeded(user.restDaysUsed || 0, result.newStreak),
    });

    return result;
  }

  /**
   * Calculate streak from workout history
   */
  private calculateStreakFromWorkouts(workouts: WorkoutSession[]): {
    currentStreak: number;
    streakStartDate: Date | null;
    lastWorkoutDate: Date | null;
    restDaysUsed: number;
    restDaysAvailable: number;
    streakStatus: 'active' | 'broken' | 'at_risk' | 'new';
    daysUntilBreak: number;
    streakHistory: StreakPeriod[];
  } {
    if (workouts.length === 0) {
      return {
        currentStreak: 0,
        streakStartDate: null,
        lastWorkoutDate: null,
        restDaysUsed: 0,
        restDaysAvailable: STREAK_CONFIG.REST_DAYS_PER_CYCLE,
        streakStatus: 'new',
        daysUntilBreak: 0,
        streakHistory: [],
      };
    }

    const now = new Date();
    const lastWorkout = workouts[0];
    const lastWorkoutDate = new Date(lastWorkout.completedAt!);

    // Check if streak is still active
    const hoursSinceLastWorkout = (now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60);

    let currentStreak = 0;
    let streakStartDate: Date | null = null;
    let restDaysUsed = 0;
    let streakStatus: 'active' | 'broken' | 'at_risk' | 'new' = 'new';

    // Calculate current streak by going backwards from most recent workout
    let consecutiveDays = 0;
    let lastCheckedDate = this.normalizeDate(lastWorkoutDate);
    let restDaysInCurrentCycle = 0;
    let activeDaysInCurrentCycle = 0;

    for (const workout of workouts) {
      const workoutDate = this.normalizeDate(new Date(workout.completedAt!));
      const daysDiff = this.getDaysDifference(workoutDate, lastCheckedDate);

      if (daysDiff === 0) {
        // Same day, continue
        continue;
      } else if (daysDiff === 1) {
        // Consecutive day
        consecutiveDays++;
        activeDaysInCurrentCycle++;
        lastCheckedDate = workoutDate;

        // Reset rest day counter every 6 active days
        if (activeDaysInCurrentCycle === STREAK_CONFIG.CYCLE_LENGTH_DAYS) {
          activeDaysInCurrentCycle = 0;
          restDaysInCurrentCycle = 0;
        }
      } else if (daysDiff <= 2 && restDaysInCurrentCycle < STREAK_CONFIG.REST_DAYS_PER_CYCLE) {
        // Rest day used (1 day gap allowed per 6 active days)
        restDaysUsed++;
        restDaysInCurrentCycle++;
        consecutiveDays += daysDiff; // Include the rest day(s) in streak
        lastCheckedDate = workoutDate;
      } else {
        // Streak broken
        break;
      }

      streakStartDate = workoutDate;
    }

    currentStreak = consecutiveDays;

    // Determine streak status
    if (hoursSinceLastWorkout > STREAK_CONFIG.GRACE_PERIOD_HOURS) {
      streakStatus = 'broken';
      currentStreak = 0;
      streakStartDate = null;
    } else if (hoursSinceLastWorkout > 24 && hoursSinceLastWorkout <= STREAK_CONFIG.GRACE_PERIOD_HOURS) {
      streakStatus = 'at_risk';
    } else if (currentStreak > 0) {
      streakStatus = 'active';
    } else {
      streakStatus = 'new';
    }

    const daysUntilBreak = this.calculateDaysUntilBreak(lastWorkoutDate);
    const restDaysAvailable = Math.max(
      0,
      STREAK_CONFIG.REST_DAYS_PER_CYCLE - (restDaysUsed % STREAK_CONFIG.REST_DAYS_PER_CYCLE)
    );

    return {
      currentStreak,
      streakStartDate,
      lastWorkoutDate,
      restDaysUsed,
      restDaysAvailable,
      streakStatus,
      daysUntilBreak,
      streakHistory: [], // Could be implemented to track historical streaks
    };
  }

  /**
   * Calculate streak update after a new workout
   */
  private calculateStreakUpdate(
    previousStreak: number,
    lastWorkoutDate: Date | null,
    newWorkoutDate: Date,
    restDaysUsed: number
  ): StreakUpdateResult {
    if (!lastWorkoutDate) {
      // First workout ever
      return {
        previousStreak: 0,
        newStreak: 1,
        streakIncreased: true,
        streakBroken: false,
        restDayUsed: false,
      };
    }

    const daysSinceLastWorkout = this.getDaysDifference(
      this.normalizeDate(lastWorkoutDate),
      this.normalizeDate(newWorkoutDate)
    );

    // Same day workout (doesn't increase streak)
    if (daysSinceLastWorkout === 0) {
      return {
        previousStreak,
        newStreak: previousStreak,
        streakIncreased: false,
        streakBroken: false,
        restDayUsed: false,
      };
    }

    // Next day workout (streak continues)
    if (daysSinceLastWorkout === 1) {
      const newStreak = previousStreak + 1;
      const milestone = this.checkMilestone(newStreak);

      return {
        previousStreak,
        newStreak,
        streakIncreased: true,
        streakBroken: false,
        restDayUsed: false,
        milestoneReached: milestone,
      };
    }

    // Check if rest day can be used (1 day gap, and rest days available)
    const restDaysAvailable = this.getRestDaysAvailable(restDaysUsed, previousStreak);
    if (daysSinceLastWorkout === 2 && restDaysAvailable > 0) {
      const newStreak = previousStreak + 2; // Include the rest day
      const milestone = this.checkMilestone(newStreak);

      return {
        previousStreak,
        newStreak,
        streakIncreased: true,
        streakBroken: false,
        restDayUsed: true,
        milestoneReached: milestone,
      };
    }

    // Streak broken
    return {
      previousStreak,
      newStreak: 1, // Start new streak
      streakIncreased: false,
      streakBroken: true,
      restDayUsed: false,
    };
  }

  /**
   * Get available rest days based on current streak
   */
  private getRestDaysAvailable(restDaysUsed: number, currentStreak: number): number {
    // Calculate how many complete cycles have been completed
    const activeDays = currentStreak;
    const completedCycles = Math.floor(activeDays / STREAK_CONFIG.CYCLE_LENGTH_DAYS);
    const totalRestDaysEarned = completedCycles * STREAK_CONFIG.REST_DAYS_PER_CYCLE;

    return Math.max(0, totalRestDaysEarned - restDaysUsed);
  }

  /**
   * Reset rest days counter if a new cycle starts
   */
  private resetRestDaysIfNeeded(restDaysUsed: number, newStreak: number): number {
    // Reset rest days every 6 active days
    const activeDays = newStreak;
    if (activeDays % STREAK_CONFIG.CYCLE_LENGTH_DAYS === 0) {
      return 0;
    }
    return restDaysUsed;
  }

  /**
   * Check if a milestone was reached
   */
  private checkMilestone(streak: number): number | undefined {
    for (const milestone of STREAK_CONFIG.STREAK_MILESTONES) {
      if (streak === milestone) {
        return milestone;
      }
    }
    return undefined;
  }

  /**
   * Calculate days until streak breaks
   */
  private calculateDaysUntilBreak(lastWorkoutDate: Date): number {
    const now = new Date();
    const hoursSinceLastWorkout = (now.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = STREAK_CONFIG.GRACE_PERIOD_HOURS - hoursSinceLastWorkout;

    if (hoursRemaining <= 0) {
      return 0;
    }

    return Math.ceil(hoursRemaining / 24);
  }

  /**
   * Normalize date to midnight for comparison
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  /**
   * Get difference in days between two dates
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get empty streak info for new users
   */
  private getEmptyStreakInfo(): StreakInfo {
    return {
      currentStreak: 0,
      longestStreak: 0,
      streakStartDate: null,
      lastWorkoutDate: null,
      restDaysUsed: 0,
      restDaysAvailable: STREAK_CONFIG.REST_DAYS_PER_CYCLE,
      streakStatus: 'new',
      daysUntilBreak: 0,
      streakHistory: [],
    };
  }

  /**
   * Check if user can use a rest day
   */
  canUseRestDay(restDaysUsed: number, currentStreak: number): boolean {
    const restDaysAvailable = this.getRestDaysAvailable(restDaysUsed, currentStreak);
    return restDaysAvailable > 0;
  }

  /**
   * Get streak motivation message
   */
  getStreakMessage(streakInfo: StreakInfo): string {
    if (streakInfo.streakStatus === 'broken') {
      return "Your streak ended, but every champion has setbacks. Start fresh today! 💪";
    }

    if (streakInfo.streakStatus === 'at_risk') {
      return `Your ${streakInfo.currentStreak}-day streak is at risk! Work out soon to keep it alive! 🔥`;
    }

    if (streakInfo.currentStreak === 0) {
      return "Start your streak today! Consistency is the key to success! 🚀";
    }

    if (streakInfo.currentStreak < 7) {
      return `${streakInfo.currentStreak} day streak! Keep building momentum! 🔥`;
    }

    if (streakInfo.currentStreak < 30) {
      return `${streakInfo.currentStreak} day streak! You're unstoppable! 🔥🔥`;
    }

    return `${streakInfo.currentStreak} day streak! You're a legend! 🔥🔥🔥`;
  }
}

// Export singleton instance
export const streakTrackingService = new StreakTrackingService();
