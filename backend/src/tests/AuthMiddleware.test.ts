import { Request, Response, NextFunction } from 'express';
import { authenticateToken, optionalAuth, createAuthContext, requireAuth, requireOwnership, getCurrentUserId, getCurrentUserIdOptional } from '../middleware/AuthMiddleware';
import { JwtService } from '../services/JwtService';

// Mock user data
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

// Mock Express request/response
const createMockRequest = (authHeader?: string): Partial<Request> => ({
  headers: authHeader ? { authorization: authHeader } : {}
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('AuthMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret-key',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key',
      JWT_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and add user to request', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const req = createMockRequest(`Bearer ${token}`) as Request;
      const res = createMockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user!.userId).toBe(mockUser.id);
      expect(req.user!.email).toBe(mockUser.email);
      expect(req.user!.username).toBe(mockUser.username);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request with no token', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const req = createMockRequest('Bearer invalid-token') as Request;
      const res = createMockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid access token',
          code: 'INVALID_TOKEN'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      // Create an expired token
      const expiredToken = JwtService.generateAccessToken(mockUser);
      // Mock the verification to return expired
      jest.spyOn(JwtService, 'verifyAccessToken').mockReturnValue({
        payload: {} as any,
        isValid: false,
        isExpired: true,
        error: 'Token expired'
      });

      const req = createMockRequest(`Bearer ${expiredToken}`) as Request;
      const res = createMockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle malformed Bearer header', () => {
      const req = createMockRequest('InvalidBearer token') as Request;
      const res = createMockResponse() as Response;

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'NO_TOKEN'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should add user to request if valid token provided', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const req = createMockRequest(`Bearer ${token}`) as Request;
      const res = createMockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeDefined();
      expect(req.user!.userId).toBe(mockUser.id);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without error if no token provided', () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without error if invalid token provided', () => {
      const req = createMockRequest('Bearer invalid-token') as Request;
      const res = createMockResponse() as Response;

      optionalAuth(req, res, mockNext);

      expect(req.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('createAuthContext', () => {
    it('should create authenticated context for valid token', () => {
      const token = JwtService.generateAccessToken(mockUser);
      const req = createMockRequest(`Bearer ${token}`) as Request;

      const context = createAuthContext(req);

      expect(context.isAuthenticated).toBe(true);
      expect(context.user).toBeDefined();
      expect(context.user!.userId).toBe(mockUser.id);
      expect(context.user!.email).toBe(mockUser.email);
      expect(context.user!.username).toBe(mockUser.username);
    });

    it('should create unauthenticated context for no token', () => {
      const req = createMockRequest() as Request;

      const context = createAuthContext(req);

      expect(context.isAuthenticated).toBe(false);
      expect(context.user).toBeUndefined();
    });

    it('should create unauthenticated context for invalid token', () => {
      const req = createMockRequest('Bearer invalid-token') as Request;

      const context = createAuthContext(req);

      expect(context.isAuthenticated).toBe(false);
      expect(context.user).toBeUndefined();
    });
  });

  describe('requireAuth', () => {
    it('should not throw for authenticated context', () => {
      const context = {
        isAuthenticated: true,
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      };

      expect(() => requireAuth(context)).not.toThrow();
    });

    it('should throw for unauthenticated context', () => {
      const context = {
        isAuthenticated: false
      };

      expect(() => requireAuth(context)).toThrow('Authentication required');
    });

    it('should throw for context without user', () => {
      const context = {
        isAuthenticated: true
      };

      expect(() => requireAuth(context)).toThrow('Authentication required');
    });
  });

  describe('requireOwnership', () => {
    it('should not throw for authenticated user accessing own resource', () => {
      const context = {
        isAuthenticated: true,
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      };

      expect(() => requireOwnership(context, mockUser.id)).not.toThrow();
    });

    it('should throw for authenticated user accessing other user resource', () => {
      const context = {
        isAuthenticated: true,
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      };

      expect(() => requireOwnership(context, 'other-user-id')).toThrow('Access denied: You can only access your own resources');
    });

    it('should throw for unauthenticated user', () => {
      const context = {
        isAuthenticated: false
      };

      expect(() => requireOwnership(context, mockUser.id)).toThrow('Authentication required');
    });
  });

  describe('getCurrentUserId', () => {
    it('should return user ID for authenticated context', () => {
      const context = {
        isAuthenticated: true,
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      };

      const userId = getCurrentUserId(context);

      expect(userId).toBe(mockUser.id);
    });

    it('should throw for unauthenticated context', () => {
      const context = {
        isAuthenticated: false
      };

      expect(() => getCurrentUserId(context)).toThrow('Authentication required');
    });
  });

  describe('getCurrentUserIdOptional', () => {
    it('should return user ID for authenticated context', () => {
      const context = {
        isAuthenticated: true,
        user: {
          userId: mockUser.id,
          email: mockUser.email,
          username: mockUser.username
        }
      };

      const userId = getCurrentUserIdOptional(context);

      expect(userId).toBe(mockUser.id);
    });

    it('should return null for unauthenticated context', () => {
      const context = {
        isAuthenticated: false
      };

      const userId = getCurrentUserIdOptional(context);

      expect(userId).toBeNull();
    });

    it('should return null for context without user', () => {
      const context = {
        isAuthenticated: true
      };

      const userId = getCurrentUserIdOptional(context);

      expect(userId).toBeNull();
    });
  });
});