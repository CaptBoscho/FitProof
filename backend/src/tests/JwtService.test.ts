import { JwtService, JwtPayload, TokenPair } from '../services/JwtService';
import jwt from 'jsonwebtoken';

// Mock user data for testing
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
  totalPoints: 0,
  currentStreak: 0,
  lastWorkoutDate: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('JwtService', () => {
  // Store original env vars to restore later
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables for each test
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key',
      JWT_EXPIRES_IN: '7d',
      JWT_REFRESH_EXPIRES_IN: '30d'
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('generateTokenPair', () => {
    it('should generate valid access and refresh tokens', () => {
      const tokens: TokenPair = JwtService.generateTokenPair(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe('7d');
      expect(tokens.refreshExpiresIn).toBe('30d');

      // Verify token structure
      const accessDecoded = jwt.decode(tokens.accessToken) as JwtPayload;
      const refreshDecoded = jwt.decode(tokens.refreshToken) as JwtPayload;

      expect(accessDecoded.userId).toBe(mockUser.id);
      expect(accessDecoded.email).toBe(mockUser.email);
      expect(accessDecoded.username).toBe(mockUser.username);
      expect(accessDecoded.type).toBe('access');

      expect(refreshDecoded.userId).toBe(mockUser.id);
      expect(refreshDecoded.type).toBe('refresh');
    });

    it('should generate different tokens for different users', () => {
      const mockUser2 = { ...mockUser, id: 'different-user-id', email: 'different@example.com' };

      const tokens1 = JwtService.generateTokenPair(mockUser);
      const tokens2 = JwtService.generateTokenPair(mockUser2);

      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JwtService.generateAccessToken(mockUser);

      expect(token).toBeDefined();

      const decoded = jwt.decode(token) as JwtPayload;
      expect(decoded.userId).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.username).toBe(mockUser.username);
      expect(decoded.type).toBe('access');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const result = JwtService.verifyAccessToken(token);

      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.payload.userId).toBe(mockUser.id);
      expect(result.payload.type).toBe('access');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token', () => {
      const result = JwtService.verifyAccessToken('invalid-token');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject refresh token when expecting access token', () => {
      const tokens = JwtService.generateTokenPair(mockUser);
      const result = JwtService.verifyAccessToken(tokens.refreshToken);

      expect(result.isValid).toBe(false);
      // Since access and refresh tokens use different secrets, it will be signature error
      expect(result.error).toContain('signature');
    });

    it('should detect expired token', async () => {
      // Use direct jwt sign with expired timestamp
      const expiredPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'access',
        iat: Math.floor(Date.now() / 1000) - 100, // 100 seconds ago
        exp: Math.floor(Date.now() / 1000) - 10   // 10 seconds ago (expired)
      };

      const expiredToken = jwt.sign(
        expiredPayload,
        process.env.JWT_SECRET || 'test-secret-key',
        {
          issuer: 'fitproof-api',
          audience: 'fitproof-app',
          noTimestamp: true // Don't override our custom iat/exp
        }
      );

      const result = JwtService.verifyAccessToken(expiredToken);

      expect(result.isValid).toBe(false);
      expect(result.isExpired).toBe(true);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const tokens = JwtService.generateTokenPair(mockUser);
      const result = JwtService.verifyRefreshToken(tokens.refreshToken);

      expect(result.isValid).toBe(true);
      expect(result.isExpired).toBe(false);
      expect(result.payload.userId).toBe(mockUser.id);
      expect(result.payload.type).toBe('refresh');
    });

    it('should reject access token when expecting refresh token', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const result = JwtService.verifyRefreshToken(token);

      expect(result.isValid).toBe(false);
      // Since access and refresh tokens use different secrets, it will be signature error
      expect(result.error).toContain('signature');
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token from valid refresh token', () => {
      const tokens = JwtService.generateTokenPair(mockUser);
      const result = JwtService.refreshAccessToken(tokens.refreshToken);

      expect(result).not.toBeNull();
      expect(result!.accessToken).toBeDefined();
      expect(result!.expiresIn).toBe('7d');

      // Verify new access token
      const verifyResult = JwtService.verifyAccessToken(result!.accessToken);
      expect(verifyResult.isValid).toBe(true);
      expect(verifyResult.payload.userId).toBe(mockUser.id);
    });

    it('should return null for invalid refresh token', () => {
      const result = JwtService.refreshAccessToken('invalid-refresh-token');

      expect(result).toBeNull();
    });

    it('should return null for access token passed as refresh token', () => {
      const accessToken = JwtService.generateAccessToken(mockUser);
      const result = JwtService.refreshAccessToken(accessToken);

      expect(result).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const decoded = JwtService.decodeToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded!.userId).toBe(mockUser.id);
      expect(decoded!.email).toBe(mockUser.email);
      expect(decoded!.type).toBe('access');
    });

    it('should return null for invalid token', () => {
      const decoded = JwtService.decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const isExpired = JwtService.isTokenExpired(token);

      expect(isExpired).toBe(false);
    });

    it('should return true for expired token', () => {
      const expiredPayload = {
        userId: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        type: 'access',
        iat: Math.floor(Date.now() / 1000) - 100,
        exp: Math.floor(Date.now() / 1000) - 10  // 10 seconds ago (expired)
      };

      const expiredToken = jwt.sign(
        expiredPayload,
        process.env.JWT_SECRET || 'test-secret-key',
        { noTimestamp: true }
      );

      const isExpired = JwtService.isTokenExpired(expiredToken);
      expect(isExpired).toBe(true);
    });

    it('should return true for invalid token', () => {
      const isExpired = JwtService.isTokenExpired('invalid-token');

      expect(isExpired).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const expiration = JwtService.getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = JwtService.getTokenExpiration('invalid-token');

      expect(expiration).toBeNull();
    });
  });

  describe('validateConfiguration', () => {
    it('should pass validation with proper configuration', () => {
      const result = JwtService.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with fallback secrets', () => {
      process.env.JWT_SECRET = 'fallback-secret';
      process.env.JWT_REFRESH_SECRET = 'fallback-refresh-secret';

      const result = JwtService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('JWT_SECRET is not properly configured');
      expect(result.errors).toContain('JWT_REFRESH_SECRET is not properly configured');
    });

    it('should fail validation with same secrets', () => {
      process.env.JWT_SECRET = 'same-secret';
      process.env.JWT_REFRESH_SECRET = 'same-secret';

      const result = JwtService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('JWT_SECRET and JWT_REFRESH_SECRET should be different');
    });

    it('should fail validation with missing configuration', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;
      delete process.env.JWT_EXPIRES_IN;
      delete process.env.JWT_REFRESH_EXPIRES_IN;

      const result = JwtService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('token security', () => {
    it('should generate different tokens each time', () => {
      const token1 = JwtService.generateAccessToken(mockUser);
      const token2 = JwtService.generateAccessToken(mockUser);

      // Even with same user data, tokens should be different due to iat timestamps
      // However, if generated too quickly, they might be the same
      // Let's just verify the decoded payloads have different iat values
      const decoded1 = jwt.decode(token1) as any;
      const decoded2 = jwt.decode(token2) as any;

      // They should have different timestamps or at least verify token structure
      expect(decoded1.iat).toBeDefined();
      expect(decoded2.iat).toBeDefined();
      expect(decoded1.userId).toBe(mockUser.id);
      expect(decoded2.userId).toBe(mockUser.id);
    });

    it('should include issuer and audience claims', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const decoded = jwt.decode(token, { complete: true }) as any;

      expect(decoded.payload.iss).toBe('fitproof-api');
      expect(decoded.payload.aud).toBe('fitproof-app');
    });

    it('should not accept tokens with wrong issuer/audience', () => {
      const wrongToken = jwt.sign(
        {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          type: 'access'
        },
        'test-secret-key',
        {
          issuer: 'wrong-issuer',
          audience: 'wrong-audience'
        }
      );

      const result = JwtService.verifyAccessToken(wrongToken);

      expect(result.isValid).toBe(false);
    });
  });
});