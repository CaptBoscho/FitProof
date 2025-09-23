import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../services/JwtService';
import { PasswordResetService } from '../services/PasswordResetService';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        username: string;
      };
    }
  }
}

export interface AuthContext {
  user?: {
    userId: string;
    email: string;
    username: string;
  };
  isAuthenticated: boolean;
}

/**
 * Express middleware for JWT authentication
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(401).json({
      error: 'Access token required',
      code: 'NO_TOKEN'
    });
    return;
  }

  const decodedToken = JwtService.verifyAccessToken(token);

  if (!decodedToken.isValid) {
    if (decodedToken.isExpired) {
      res.status(401).json({
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else {
      res.status(401).json({
        error: 'Invalid access token',
        code: 'INVALID_TOKEN',
        details: decodedToken.error
      });
    }
    return;
  }

  // Add user information to request
  req.user = {
    userId: decodedToken.payload.userId,
    email: decodedToken.payload.email,
    username: decodedToken.payload.username
  };

  next();
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    next();
    return;
  }

  const decodedToken = JwtService.verifyAccessToken(token);

  if (decodedToken.isValid) {
    req.user = {
      userId: decodedToken.payload.userId,
      email: decodedToken.payload.email,
      username: decodedToken.payload.username
    };
  }

  next();
};

/**
 * GraphQL context creator with authentication
 */
export const createAuthContext = (req: Request): AuthContext => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return {
      isAuthenticated: false
    };
  }

  const decodedToken = JwtService.verifyAccessToken(token);

  if (!decodedToken.isValid) {
    return {
      isAuthenticated: false
    };
  }

  return {
    user: {
      userId: decodedToken.payload.userId,
      email: decodedToken.payload.email,
      username: decodedToken.payload.username
    },
    isAuthenticated: true
  };
};

/**
 * GraphQL authentication decorator/function
 */
export const requireAuth = (context: AuthContext): void => {
  if (!context.isAuthenticated || !context.user) {
    throw new Error('Authentication required');
  }
};

/**
 * GraphQL user ownership check
 */
export const requireOwnership = (context: AuthContext, resourceUserId: string): void => {
  requireAuth(context);

  if (context.user!.userId !== resourceUserId) {
    throw new Error('Access denied: You can only access your own resources');
  }
};

/**
 * Extract user ID from context (throws if not authenticated)
 */
export const getCurrentUserId = (context: AuthContext): string => {
  requireAuth(context);
  return context.user!.userId;
};

/**
 * Extract user ID from context (returns null if not authenticated)
 */
export const getCurrentUserIdOptional = (context: AuthContext): string | null => {
  return context.isAuthenticated && context.user ? context.user.userId : null;
};

/**
 * Refresh token endpoint handler
 */
export const refreshTokenHandler = (req: Request, res: Response): void => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({
      error: 'Refresh token required',
      code: 'NO_REFRESH_TOKEN'
    });
    return;
  }

  const result = JwtService.refreshAccessToken(refreshToken);

  if (!result) {
    res.status(401).json({
      error: 'Invalid or expired refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
    return;
  }

  res.json({
    accessToken: result.accessToken,
    expiresIn: result.expiresIn,
    tokenType: 'Bearer'
  });
};

/**
 * Token validation endpoint handler
 */
export const validateTokenHandler = (req: Request, res: Response): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    res.status(400).json({
      error: 'Token required',
      code: 'NO_TOKEN'
    });
    return;
  }

  const decodedToken = JwtService.verifyAccessToken(token);

  res.json({
    isValid: decodedToken.isValid,
    isExpired: decodedToken.isExpired,
    payload: decodedToken.isValid ? decodedToken.payload : null,
    error: decodedToken.error || null
  });
};

/**
 * Password reset request endpoint handler
 */
export const passwordResetRequestHandler = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      success: false,
      message: 'Email is required',
      code: 'NO_EMAIL'
    });
    return;
  }

  try {
    const requestIp = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await PasswordResetService.requestPasswordReset({
      email,
      requestIp,
      userAgent
    });

    res.json({
      success: result.success,
      message: result.message,
      token: process.env.NODE_ENV === 'development' ? result.token : undefined
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing your request',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Password reset confirmation endpoint handler
 */
export const passwordResetConfirmHandler = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  if (!token) {
    res.status(400).json({
      success: false,
      message: 'Reset token is required',
      code: 'NO_TOKEN'
    });
    return;
  }

  if (!newPassword) {
    res.status(400).json({
      success: false,
      message: 'New password is required',
      code: 'NO_PASSWORD'
    });
    return;
  }

  try {
    const requestIp = req.ip || req.connection?.remoteAddress;

    const result = await PasswordResetService.confirmPasswordReset({
      token,
      newPassword,
      requestIp
    });

    if (result.success) {
      res.json({
        success: result.success,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: result.success,
        message: result.message,
        code: 'RESET_FAILED'
      });
    }
  } catch (error) {
    console.error('Password reset confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while resetting your password',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Password reset token validation endpoint handler
 */
export const passwordResetValidateHandler = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({
      isValid: false,
      message: 'Reset token is required',
      code: 'NO_TOKEN'
    });
    return;
  }

  try {
    const result = await PasswordResetService.validateResetToken(token);

    res.json({
      isValid: result.isValid,
      message: result.message
    });
  } catch (error) {
    console.error('Password reset validation error:', error);
    res.status(500).json({
      isValid: false,
      message: 'An error occurred while validating the token',
      code: 'INTERNAL_ERROR'
    });
  }
};