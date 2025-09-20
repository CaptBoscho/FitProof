import { CONFIG } from '../constants/config';

describe('CONFIG', () => {
  it('should have correct app configuration', () => {
    expect(CONFIG.APP_NAME).toBe('FitProof');
    expect(CONFIG.VERSION).toBe('1.0.0');
  });

  it('should have exercise configurations with correct points', () => {
    expect(CONFIG.EXERCISES.PUSHUP.pointsPerRep).toBe(2);
    expect(CONFIG.EXERCISES.SITUP.pointsPerRep).toBe(2);
    expect(CONFIG.EXERCISES.SQUAT.pointsPerRep).toBe(1);
  });

  it('should have color configuration', () => {
    expect(CONFIG.COLORS.PRIMARY).toBe('#6C5CE7');
    expect(CONFIG.COLORS.WHITE).toBe('#FFFFFF');
  });

  it('should have workout configuration', () => {
    expect(CONFIG.WORKOUT.COUNTDOWN_SECONDS).toBe(10);
    expect(CONFIG.WORKOUT.MIN_REP_CONFIDENCE).toBe(0.8);
  });
});
