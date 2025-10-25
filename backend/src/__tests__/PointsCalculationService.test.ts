import {
  PointsCalculationService,
  DEFAULT_POINTS_CONFIG,
  PointsConfig,
} from '../services/PointsCalculationService';
import { Exercise } from '../entities/Exercise';

describe('PointsCalculationService', () => {
  let service: PointsCalculationService;
  let mockExercise: Exercise;

  beforeEach(() => {
    service = new PointsCalculationService();

    // Mock pushup exercise (2 points per rep)
    mockExercise = {
      id: '123',
      name: 'Pushups',
      pointsPerRep: 2,
      description: 'Test',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Exercise;
  });

  describe('Base Points Calculation', () => {
    it('should calculate correct base points for pushups', () => {
      const result = service.calculatePoints(mockExercise, 10, 10);

      expect(result.basePoints).toBe(20); // 10 reps * 2 points
      expect(result.bonusPoints).toBe(0);
      expect(result.totalPoints).toBe(20);
    });

    it('should calculate correct base points for squats', () => {
      const squatExercise = { ...mockExercise, name: 'Squats', pointsPerRep: 1 };
      const result = service.calculatePoints(squatExercise, 20, 20);

      expect(result.basePoints).toBe(20); // 20 reps * 1 point
    });

    it('should handle zero reps', () => {
      const result = service.calculatePoints(mockExercise, 0, 0);

      expect(result.basePoints).toBe(0);
      expect(result.totalPoints).toBe(0);
    });
  });

  describe('Streak Bonus', () => {
    it('should apply tier 1 streak bonus (3+ days, 10%)', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 3,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.basePoints).toBe(20);
      expect(result.breakdown.streakBonus).toBe(2); // 10% of 20 = 2
      expect(result.breakdown.appliedBonuses).toContain('3-day streak');
    });

    it('should apply tier 2 streak bonus (7+ days, 25%)', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 7,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 10,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.streakBonus).toBe(5); // 25% of 20 = 5
      expect(result.breakdown.appliedBonuses).toContain('7-day streak');
    });

    it('should apply tier 3 streak bonus (30+ days, 50%)', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 30,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 50,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.streakBonus).toBe(10); // 50% of 20 = 10
      expect(result.breakdown.appliedBonuses).toContain('30-day streak');
    });

    it('should not apply streak bonus below threshold', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 2,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.streakBonus).toBe(0);
    });
  });

  describe('Perfect Form Bonus', () => {
    it('should apply perfect form bonus for 100% valid reps', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.perfectFormBonus).toBe(4); // 20% of 20 = 4
      expect(result.breakdown.appliedBonuses).toContain('Perfect form');
    });

    it('should not apply perfect form bonus for less than 100% valid reps', () => {
      const result = service.calculatePoints(mockExercise, 9, 10, {
        validReps: 9,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.perfectFormBonus).toBe(0);
    });
  });

  describe('First Workout Bonus', () => {
    it('should apply first workout bonus', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: true,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.firstWorkoutBonus).toBe(50);
      expect(result.breakdown.appliedBonuses).toContain('First workout today');
    });

    it('should not apply first workout bonus if not first', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 5,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.firstWorkoutBonus).toBe(0);
    });
  });

  describe('Milestone Bonus', () => {
    it('should apply 10-workout milestone bonus', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 10,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.milestoneBonus).toBe(100);
      expect(result.breakdown.appliedBonuses).toContain('10 workouts milestone');
    });

    it('should apply 100-workout milestone bonus', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 100,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.milestoneBonus).toBe(1000);
    });

    it('should not apply milestone bonus between milestones', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 0,
        isFirstWorkoutToday: false,
        totalWorkoutsCompleted: 15,
        exerciseType: 'pushup',
      });

      expect(result.breakdown.milestoneBonus).toBe(0);
    });
  });

  describe('Combined Bonuses', () => {
    it('should combine all bonuses correctly', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 7,
        isFirstWorkoutToday: true,
        totalWorkoutsCompleted: 50,
        exerciseType: 'pushup',
      });

      // Base: 20 (10 reps * 2 pts)
      // Streak (7 days): +5 (25% of 20)
      // Perfect form: +4 (20% of 20)
      // First workout: +50
      // Milestone (50 workouts): +500
      // Total bonus: 559

      expect(result.basePoints).toBe(20);
      expect(result.breakdown.streakBonus).toBe(5);
      expect(result.breakdown.perfectFormBonus).toBe(4);
      expect(result.breakdown.firstWorkoutBonus).toBe(50);
      expect(result.breakdown.milestoneBonus).toBe(500);
      expect(result.bonusPoints).toBe(559);
      expect(result.breakdown.appliedBonuses.length).toBeGreaterThan(0);
    });
  });

  describe('Weekend Multiplier', () => {
    it('should apply 1.5x multiplier on weekends', () => {
      // Mock Date to be Saturday (day 6)
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        getDay() {
          return 6; // Saturday
        }
      } as any;

      const result = service.calculatePoints(mockExercise, 10, 10);

      // Base: 20
      // Weekend multiplier: 1.5x
      // Total: 30

      expect(result.totalPoints).toBe(30);
      expect(result.breakdown.multiplier).toBe(1.5);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('Points Validation', () => {
    it('should validate reasonable points', () => {
      const result = service.calculatePoints(mockExercise, 10, 10);
      const validation = service.validatePoints(result, 10);

      expect(validation.isValid).toBe(true);
    });

    it('should reject negative total points', () => {
      const invalidResult = {
        basePoints: 20,
        bonusPoints: 0,
        totalPoints: -10,
        breakdown: {} as any,
      };

      const validation = service.validatePoints(invalidResult, 10);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('negative');
    });

    it('should reject absurdly high points', () => {
      const invalidResult = {
        basePoints: 100000,
        bonusPoints: 0,
        totalPoints: 100000,
        breakdown: {} as any,
      };

      const validation = service.validatePoints(invalidResult, 10);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toContain('exceeded');
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating configuration', () => {
      const newConfig: Partial<PointsConfig> = {
        exercisePoints: {
          pushup: 5,
          situp: 5,
          squat: 3,
        },
      };

      service.updateConfig(newConfig);
      const config = service.getConfig();

      expect(config.exercisePoints.pushup).toBe(5);
      expect(config.exercisePoints.situp).toBe(5);
      expect(config.exercisePoints.squat).toBe(3);
    });
  });

  describe('Breakdown Formatting', () => {
    it('should format breakdown correctly', () => {
      const result = service.calculatePoints(mockExercise, 10, 10, {
        validReps: 10,
        totalReps: 10,
        currentStreak: 7,
        isFirstWorkoutToday: true,
        totalWorkoutsCompleted: 10,
        exerciseType: 'pushup',
      });

      const formatted = service.formatBreakdown(result);

      expect(formatted).toContain('Base Points: 20');
      expect(formatted).toContain('Streak Bonus: +5');
      expect(formatted).toContain('Perfect Form Bonus: +4');
      expect(formatted).toContain('First Workout Bonus: +50');
      expect(formatted).toContain('Milestone Bonus: +100');
    });
  });
});
