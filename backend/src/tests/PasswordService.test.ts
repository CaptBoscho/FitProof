import { PasswordService } from '../services/PasswordService';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
      expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true); // bcrypt format
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await PasswordService.hashPassword(password);
      const hash2 = await PasswordService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Due to salt
    });

    it('should throw error for password shorter than 8 characters', async () => {
      const shortPassword = '1234567';

      await expect(PasswordService.hashPassword(shortPassword))
        .rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for empty password', async () => {
      await expect(PasswordService.hashPassword(''))
        .rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for null password', async () => {
      await expect(PasswordService.hashPassword(null as any))
        .rejects.toThrow('Password must be at least 8 characters long');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);

      const isValid = await PasswordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await PasswordService.hashPassword(password);

      const isValid = await PasswordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);

      const isValid = await PasswordService.verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should reject null password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hashPassword(password);

      const isValid = await PasswordService.verifyPassword(null as any, hash);
      expect(isValid).toBe(false);
    });

    it('should reject empty hash', async () => {
      const password = 'TestPassword123!';

      const isValid = await PasswordService.verifyPassword(password, '');
      expect(isValid).toBe(false);
    });

    it('should reject null hash', async () => {
      const password = 'TestPassword123!';

      const isValid = await PasswordService.verifyPassword(password, null as any);
      expect(isValid).toBe(false);
    });

    it('should reject invalid hash format', async () => {
      const password = 'TestPassword123!';
      const invalidHash = 'invalid-hash-format';

      const isValid = await PasswordService.verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = PasswordService.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without lowercase letter', () => {
      const password = 'STRONGPASS123!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const password = 'strongpass123!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const password = 'StrongPass!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const password = 'StrongPass123';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password shorter than 8 characters', () => {
      const password = 'Short1!';
      const result = PasswordService.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'A'.repeat(121) + '1234567!'; // 129 characters
      const result = PasswordService.validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be less than 128 characters');
    });

    it('should reject empty password', () => {
      const result = PasswordService.validatePasswordStrength('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject null password', () => {
      const result = PasswordService.validatePasswordStrength(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should return multiple validation errors', () => {
      const weakPassword = 'weak'; // Missing: length, uppercase, number, special char
      const result = PasswordService.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should accept various special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

      for (const char of specialChars) {
        const password = `StrongPass123${char}`;
        const result = PasswordService.validatePasswordStrength(password);
        expect(result.isValid).toBe(true);
      }
    });

    it('should accept password at minimum length', () => {
      const minPassword = 'Strong1!'; // Exactly 8 characters
      const result = PasswordService.validatePasswordStrength(minPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password at maximum length', () => {
      const maxPassword = 'Aa1!' + 'A'.repeat(124); // Exactly 128 characters with all requirements
      const result = PasswordService.validatePasswordStrength(maxPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});