import { StreakTrackingService, STREAK_CONFIG } from '../services/StreakTrackingService';

describe('StreakTrackingService', () => {
  let service: StreakTrackingService;

  beforeEach(() => {
    service = new StreakTrackingService();
  });

  describe('Streak Update Calculation', () => {
    it('should start a new streak on first workout', () => {
      const result = (service as any).calculateStreakUpdate(
        0, // previousStreak
        null, // lastWorkoutDate
        new Date(), // newWorkoutDate
        0 // restDaysUsed
      );

      expect(result.newStreak).toBe(1);
      expect(result.streakIncreased).toBe(true);
      expect(result.streakBroken).toBe(false);
      expect(result.restDayUsed).toBe(false);
    });

    it('should not increase streak for same-day workout', () => {
      const today = new Date();
      const result = (service as any).calculateStreakUpdate(
        5, // previousStreak
        today, // lastWorkoutDate
        today, // newWorkoutDate (same day)
        0 // restDaysUsed
      );

      expect(result.newStreak).toBe(5);
      expect(result.streakIncreased).toBe(false);
      expect(result.streakBroken).toBe(false);
    });

    it('should increase streak for next-day workout', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const today = new Date();

      const result = (service as any).calculateStreakUpdate(
        5, // previousStreak
        yesterday,
        today,
        0
      );

      expect(result.newStreak).toBe(6);
      expect(result.streakIncreased).toBe(true);
      expect(result.streakBroken).toBe(false);
      expect(result.restDayUsed).toBe(false);
    });

    it('should use rest day for 2-day gap when available', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const today = new Date();

      const result = (service as any).calculateStreakUpdate(
        6, // previousStreak (just completed a cycle)
        twoDaysAgo,
        today,
        0 // No rest days used yet
      );

      expect(result.newStreak).toBe(8); // 6 + 2 (includes rest day)
      expect(result.streakIncreased).toBe(true);
      expect(result.streakBroken).toBe(false);
      expect(result.restDayUsed).toBe(true);
    });

    it('should break streak for 2-day gap when no rest days available', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const today = new Date();

      const result = (service as any).calculateStreakUpdate(
        3, // previousStreak (haven't completed a full cycle)
        twoDaysAgo,
        today,
        0 // No rest days earned yet
      );

      expect(result.newStreak).toBe(1);
      expect(result.streakIncreased).toBe(false);
      expect(result.streakBroken).toBe(true);
      expect(result.restDayUsed).toBe(false);
    });

    it('should break streak for 3+ day gap', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const today = new Date();

      const result = (service as any).calculateStreakUpdate(
        10,
        threeDaysAgo,
        today,
        1
      );

      expect(result.newStreak).toBe(1);
      expect(result.streakBroken).toBe(true);
    });
  });

  describe('Rest Day Availability', () => {
    it('should have 0 rest days available at start', () => {
      const available = (service as any).getRestDaysAvailable(0, 3);
      expect(available).toBe(0);
    });

    it('should have 1 rest day available after 6 active days', () => {
      const available = (service as any).getRestDaysAvailable(0, 6);
      expect(available).toBe(1);
    });

    it('should have 2 rest days available after 12 active days', () => {
      const available = (service as any).getRestDaysAvailable(0, 12);
      expect(available).toBe(2);
    });

    it('should calculate available rest days correctly after some are used', () => {
      const available = (service as any).getRestDaysAvailable(1, 12);
      expect(available).toBe(1); // 2 earned - 1 used = 1 available
    });

    it('should not go negative on available rest days', () => {
      const available = (service as any).getRestDaysAvailable(3, 12);
      expect(available).toBe(0); // Can't be negative
    });
  });

  describe('Streak Milestones', () => {
    it('should detect 3-day milestone', () => {
      const milestone = (service as any).checkMilestone(3);
      expect(milestone).toBe(3);
    });

    it('should detect 7-day milestone', () => {
      const milestone = (service as any).checkMilestone(7);
      expect(milestone).toBe(7);
    });

    it('should detect 30-day milestone', () => {
      const milestone = (service as any).checkMilestone(30);
      expect(milestone).toBe(30);
    });

    it('should detect 100-day milestone', () => {
      const milestone = (service as any).checkMilestone(100);
      expect(milestone).toBe(100);
    });

    it('should detect 365-day milestone', () => {
      const milestone = (service as any).checkMilestone(365);
      expect(milestone).toBe(365);
    });

    it('should return undefined for non-milestone days', () => {
      const milestone = (service as any).checkMilestone(15);
      expect(milestone).toBeUndefined();
    });

    it('should include milestone in streak update result', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const result = (service as any).calculateStreakUpdate(
        6, // Will become 7
        yesterday,
        new Date(),
        0
      );

      expect(result.milestoneReached).toBe(7);
    });
  });

  describe('Date Calculations', () => {
    it('should normalize dates correctly', () => {
      const date1 = new Date('2024-01-15T14:30:00');
      const date2 = new Date('2024-01-15T22:45:00');

      const normalized1 = (service as any).normalizeDate(date1);
      const normalized2 = (service as any).normalizeDate(date2);

      expect(normalized1.getTime()).toBe(normalized2.getTime());
      expect(normalized1.getHours()).toBe(0);
      expect(normalized1.getMinutes()).toBe(0);
    });

    it('should calculate days difference correctly', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-18');

      const diff = (service as any).getDaysDifference(date1, date2);
      expect(diff).toBe(3);
    });

    it('should calculate 0 days for same date', () => {
      const date = new Date('2024-01-15');

      const diff = (service as any).getDaysDifference(date, date);
      expect(diff).toBe(0);
    });
  });

  describe('Rest Day Reset', () => {
    it('should reset rest days at multiples of 6', () => {
      const reset = (service as any).resetRestDaysIfNeeded(2, 6);
      expect(reset).toBe(0);
    });

    it('should not reset rest days between cycles', () => {
      const reset = (service as any).resetRestDaysIfNeeded(2, 8);
      expect(reset).toBe(2);
    });

    it('should reset at 12 days', () => {
      const reset = (service as any).resetRestDaysIfNeeded(3, 12);
      expect(reset).toBe(0);
    });
  });

  describe('Streak Messages', () => {
    it('should return encouraging message for broken streak', () => {
      const streakInfo = {
        currentStreak: 0,
        longestStreak: 10,
        streakStartDate: null,
        lastWorkoutDate: null,
        restDaysUsed: 0,
        restDaysAvailable: 1,
        streakStatus: 'broken' as const,
        daysUntilBreak: 0,
        streakHistory: [],
      };

      const message = service.getStreakMessage(streakInfo);
      expect(message).toContain('streak ended');
    });

    it('should return warning message for at-risk streak', () => {
      const streakInfo = {
        currentStreak: 10,
        longestStreak: 10,
        streakStartDate: new Date(),
        lastWorkoutDate: new Date(),
        restDaysUsed: 0,
        restDaysAvailable: 1,
        streakStatus: 'at_risk' as const,
        daysUntilBreak: 1,
        streakHistory: [],
      };

      const message = service.getStreakMessage(streakInfo);
      expect(message).toContain('at risk');
      expect(message).toContain('10');
    });

    it('should return motivational message for new streak', () => {
      const streakInfo = {
        currentStreak: 0,
        longestStreak: 0,
        streakStartDate: null,
        lastWorkoutDate: null,
        restDaysUsed: 0,
        restDaysAvailable: 1,
        streakStatus: 'new' as const,
        daysUntilBreak: 0,
        streakHistory: [],
      };

      const message = service.getStreakMessage(streakInfo);
      expect(message).toContain('Start your streak');
    });

    it('should return escalating messages for longer streaks', () => {
      const streak5 = {
        currentStreak: 5,
        longestStreak: 5,
        streakStartDate: new Date(),
        lastWorkoutDate: new Date(),
        restDaysUsed: 0,
        restDaysAvailable: 0,
        streakStatus: 'active' as const,
        daysUntilBreak: 2,
        streakHistory: [],
      };

      const streak15 = { ...streak5, currentStreak: 15, longestStreak: 15 };
      const streak50 = { ...streak5, currentStreak: 50, longestStreak: 50 };

      const message5 = service.getStreakMessage(streak5);
      const message15 = service.getStreakMessage(streak15);
      const message50 = service.getStreakMessage(streak50);

      expect(message5).toContain('🔥');
      expect(message15).toContain('🔥🔥');
      expect(message50).toContain('legend');
    });
  });

  describe('Can Use Rest Day', () => {
    it('should return false when no rest days available', () => {
      const canUse = service.canUseRestDay(0, 3);
      expect(canUse).toBe(false);
    });

    it('should return true after completing a cycle', () => {
      const canUse = service.canUseRestDay(0, 6);
      expect(canUse).toBe(true);
    });

    it('should return true with unused rest days', () => {
      const canUse = service.canUseRestDay(0, 12);
      expect(canUse).toBe(true);
    });

    it('should return false when all earned rest days are used', () => {
      const canUse = service.canUseRestDay(2, 12);
      expect(canUse).toBe(false);
    });
  });
});
