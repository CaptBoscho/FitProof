/**
 * Points Calculation Service
 * Handles all point calculation logic with configurable rules and bonuses
 */

import { Exercise } from '../entities/Exercise';
import { WorkoutSession } from '../entities/WorkoutSession';
import { User } from '../entities/User';

/**
 * Point calculation result
 */
export interface PointsCalculationResult {
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: PointsBreakdown;
}

/**
 * Detailed breakdown of points
 */
export interface PointsBreakdown {
  repPoints: number;
  streakBonus: number;
  perfectFormBonus: number;
  firstWorkoutBonus: number;
  milestoneBonus: number;
  multiplier: number;
  appliedBonuses: string[];
}

/**
 * Bonus calculation input
 */
export interface BonusCalculationInput {
  validReps: number;
  totalReps: number;
  currentStreak: number;
  isFirstWorkoutToday: boolean;
  totalWorkoutsCompleted: number;
  exerciseType: string;
}

/**
 * Points configuration (can be loaded from database)
 */
export interface PointsConfig {
  // Base points per rep for each exercise
  exercisePoints: {
    pushup: number;
    situp: number;
    squat: number;
  };

  // Bonus thresholds and multipliers
  bonuses: {
    // Streak bonuses
    streakBonus: {
      enabled: boolean;
      tier1: { days: number; bonus: number }; // 3+ days: +10%
      tier2: { days: number; bonus: number }; // 7+ days: +25%
      tier3: { days: number; bonus: number }; // 30+ days: +50%
    };

    // Perfect form bonus (100% valid reps)
    perfectFormBonus: {
      enabled: boolean;
      threshold: number; // 1.0 = 100% valid
      bonus: number; // +20%
    };

    // First workout of the day bonus
    firstWorkoutBonus: {
      enabled: boolean;
      points: number; // +50 points
    };

    // Milestone bonuses
    milestoneBonus: {
      enabled: boolean;
      milestones: {
        workouts: number;
        bonus: number;
      }[];
    };
  };

  // Multipliers for special events
  multipliers: {
    weekendMultiplier: number; // 1.5x on weekends
    eventMultiplier: number; // 2x during special events
  };
}

/**
 * Default points configuration
 * Based on TODO.md: Pushups/Situps: 2pts, Squats: 1pt
 */
export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  exercisePoints: {
    pushup: 2,
    situp: 2,
    squat: 1,
  },

  bonuses: {
    streakBonus: {
      enabled: true,
      tier1: { days: 3, bonus: 0.1 }, // 10% bonus
      tier2: { days: 7, bonus: 0.25 }, // 25% bonus
      tier3: { days: 30, bonus: 0.5 }, // 50% bonus
    },

    perfectFormBonus: {
      enabled: true,
      threshold: 1.0, // 100% valid reps
      bonus: 0.2, // 20% bonus
    },

    firstWorkoutBonus: {
      enabled: true,
      points: 50,
    },

    milestoneBonus: {
      enabled: true,
      milestones: [
        { workouts: 10, bonus: 100 },
        { workouts: 50, bonus: 500 },
        { workouts: 100, bonus: 1000 },
        { workouts: 250, bonus: 2500 },
        { workouts: 500, bonus: 5000 },
        { workouts: 1000, bonus: 10000 },
      ],
    },
  },

  multipliers: {
    weekendMultiplier: 1.5,
    eventMultiplier: 1.0, // Default to 1.0 (no event)
  },
};

/**
 * Points Calculation Service
 */
export class PointsCalculationService {
  private config: PointsConfig;

  constructor(config?: PointsConfig) {
    this.config = config || DEFAULT_POINTS_CONFIG;
  }

  /**
   * Calculate points for a workout session
   */
  calculatePoints(
    exercise: Exercise,
    validReps: number,
    totalReps: number,
    bonusInput?: BonusCalculationInput
  ): PointsCalculationResult {
    // Calculate base points
    const basePoints = this.calculateBasePoints(exercise, validReps);

    // Calculate bonus points if bonus input provided
    let bonusPoints = 0;
    let breakdown: PointsBreakdown = {
      repPoints: basePoints,
      streakBonus: 0,
      perfectFormBonus: 0,
      firstWorkoutBonus: 0,
      milestoneBonus: 0,
      multiplier: 1.0,
      appliedBonuses: [],
    };

    if (bonusInput) {
      const bonusResult = this.calculateBonuses(basePoints, bonusInput);
      bonusPoints = bonusResult.totalBonus;
      breakdown = bonusResult.breakdown;
    }

    // Apply multipliers
    const multiplier = this.getMultiplier();
    const totalBeforeMultiplier = basePoints + bonusPoints;
    const totalPoints = Math.floor(totalBeforeMultiplier * multiplier);

    breakdown.multiplier = multiplier;

    return {
      basePoints,
      bonusPoints,
      totalPoints,
      breakdown,
    };
  }

  /**
   * Calculate base points from reps
   */
  private calculateBasePoints(exercise: Exercise, validReps: number): number {
    // Use exercise's configured points per rep
    const pointsPerRep = exercise.pointsPerRep || this.getDefaultPointsPerRep(exercise.name);
    return validReps * pointsPerRep;
  }

  /**
   * Get default points per rep for an exercise
   */
  private getDefaultPointsPerRep(exerciseName: string): number {
    const exerciseType = exerciseName.toLowerCase();

    if (exerciseType.includes('pushup')) {
      return this.config.exercisePoints.pushup;
    } else if (exerciseType.includes('situp')) {
      return this.config.exercisePoints.situp;
    } else if (exerciseType.includes('squat')) {
      return this.config.exercisePoints.squat;
    }

    // Default fallback
    return 1;
  }

  /**
   * Calculate all bonuses
   */
  private calculateBonuses(
    basePoints: number,
    input: BonusCalculationInput
  ): {
    totalBonus: number;
    breakdown: PointsBreakdown;
  } {
    const breakdown: PointsBreakdown = {
      repPoints: basePoints,
      streakBonus: 0,
      perfectFormBonus: 0,
      firstWorkoutBonus: 0,
      milestoneBonus: 0,
      multiplier: 1.0,
      appliedBonuses: [],
    };

    // 1. Streak Bonus
    if (this.config.bonuses.streakBonus.enabled) {
      const streakBonus = this.calculateStreakBonus(basePoints, input.currentStreak);
      if (streakBonus > 0) {
        breakdown.streakBonus = streakBonus;
        breakdown.appliedBonuses.push(`${input.currentStreak}-day streak`);
      }
    }

    // 2. Perfect Form Bonus
    if (this.config.bonuses.perfectFormBonus.enabled) {
      const formBonus = this.calculatePerfectFormBonus(basePoints, input.validReps, input.totalReps);
      if (formBonus > 0) {
        breakdown.perfectFormBonus = formBonus;
        breakdown.appliedBonuses.push('Perfect form');
      }
    }

    // 3. First Workout Bonus
    if (this.config.bonuses.firstWorkoutBonus.enabled && input.isFirstWorkoutToday) {
      breakdown.firstWorkoutBonus = this.config.bonuses.firstWorkoutBonus.points;
      breakdown.appliedBonuses.push('First workout today');
    }

    // 4. Milestone Bonus
    if (this.config.bonuses.milestoneBonus.enabled) {
      const milestoneBonus = this.calculateMilestoneBonus(input.totalWorkoutsCompleted);
      if (milestoneBonus > 0) {
        breakdown.milestoneBonus = milestoneBonus;
        breakdown.appliedBonuses.push(`${input.totalWorkoutsCompleted} workouts milestone`);
      }
    }

    const totalBonus =
      breakdown.streakBonus +
      breakdown.perfectFormBonus +
      breakdown.firstWorkoutBonus +
      breakdown.milestoneBonus;

    return { totalBonus, breakdown };
  }

  /**
   * Calculate streak bonus based on current streak
   */
  private calculateStreakBonus(basePoints: number, currentStreak: number): number {
    const config = this.config.bonuses.streakBonus;

    if (currentStreak >= config.tier3.days) {
      return Math.floor(basePoints * config.tier3.bonus);
    } else if (currentStreak >= config.tier2.days) {
      return Math.floor(basePoints * config.tier2.bonus);
    } else if (currentStreak >= config.tier1.days) {
      return Math.floor(basePoints * config.tier1.bonus);
    }

    return 0;
  }

  /**
   * Calculate perfect form bonus
   */
  private calculatePerfectFormBonus(
    basePoints: number,
    validReps: number,
    totalReps: number
  ): number {
    if (totalReps === 0) return 0;

    const formAccuracy = validReps / totalReps;
    const config = this.config.bonuses.perfectFormBonus;

    if (formAccuracy >= config.threshold) {
      return Math.floor(basePoints * config.bonus);
    }

    return 0;
  }

  /**
   * Calculate milestone bonus
   */
  private calculateMilestoneBonus(totalWorkoutsCompleted: number): number {
    const config = this.config.bonuses.milestoneBonus;

    // Check if this workout hits a milestone
    for (const milestone of config.milestones) {
      if (totalWorkoutsCompleted === milestone.workouts) {
        return milestone.bonus;
      }
    }

    return 0;
  }

  /**
   * Get current multiplier (weekend, events, etc.)
   */
  private getMultiplier(): number {
    let multiplier = 1.0;

    // Weekend multiplier
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Sunday or Saturday
      multiplier *= this.config.multipliers.weekendMultiplier;
    }

    // Event multiplier (could be set dynamically)
    multiplier *= this.config.multipliers.eventMultiplier;

    return multiplier;
  }

  /**
   * Validate calculated points against expected range
   */
  validatePoints(result: PointsCalculationResult, validReps: number): {
    isValid: boolean;
    reason?: string;
  } {
    // Points should be >= 0
    if (result.totalPoints < 0) {
      return { isValid: false, reason: 'Total points cannot be negative' };
    }

    // Points should not be absurdly high (prevent exploits)
    const maxReasonablePoints = validReps * 10 * 10; // 10 points per rep * 10x multiplier
    if (result.totalPoints > maxReasonablePoints) {
      return { isValid: false, reason: 'Points exceeded reasonable maximum' };
    }

    // Base points should be >= 0
    if (result.basePoints < 0) {
      return { isValid: false, reason: 'Base points cannot be negative' };
    }

    // Bonus points should be >= 0
    if (result.bonusPoints < 0) {
      return { isValid: false, reason: 'Bonus points cannot be negative' };
    }

    return { isValid: true };
  }

  /**
   * Format points breakdown for display
   */
  formatBreakdown(result: PointsCalculationResult): string {
    const lines: string[] = [];

    lines.push(`Points Breakdown:`);
    lines.push(`  Base Points: ${result.basePoints}`);

    if (result.breakdown.streakBonus > 0) {
      lines.push(`  Streak Bonus: +${result.breakdown.streakBonus}`);
    }

    if (result.breakdown.perfectFormBonus > 0) {
      lines.push(`  Perfect Form Bonus: +${result.breakdown.perfectFormBonus}`);
    }

    if (result.breakdown.firstWorkoutBonus > 0) {
      lines.push(`  First Workout Bonus: +${result.breakdown.firstWorkoutBonus}`);
    }

    if (result.breakdown.milestoneBonus > 0) {
      lines.push(`  Milestone Bonus: +${result.breakdown.milestoneBonus}`);
    }

    if (result.breakdown.multiplier > 1.0) {
      lines.push(`  Multiplier: ${result.breakdown.multiplier}x`);
    }

    lines.push(`  Total: ${result.totalPoints}`);

    if (result.breakdown.appliedBonuses.length > 0) {
      lines.push(`  Applied: ${result.breakdown.appliedBonuses.join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PointsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PointsConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const pointsCalculationService = new PointsCalculationService();
