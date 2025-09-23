import jwt, { SignOptions, TokenExpiredError } from 'jsonwebtoken';
import { User } from '../entities/User';

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

export interface DecodedToken {
  payload: JwtPayload;
  isValid: boolean;
  isExpired: boolean;
  error?: string;
}

export class JwtService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
  private static readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  /**
   * Generate access and refresh token pair for a user
   */
  static generateTokenPair(user: User): TokenPair {
    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      type: 'access'
    };

    const refreshPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      type: 'refresh'
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'fitproof-api',
      audience: 'fitproof-app'
    } as SignOptions);

    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
      issuer: 'fitproof-api',
      audience: 'fitproof-app'
    } as SignOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.JWT_EXPIRES_IN,
      refreshExpiresIn: this.JWT_REFRESH_EXPIRES_IN
    };
  }

  /**
   * Generate only access token (for backward compatibility)
   */
  static generateAccessToken(user: User): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      type: 'access'
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'fitproof-api',
      audience: 'fitproof-app'
    } as SignOptions);
  }

  /**
   * Verify and decode access token
   */
  static verifyAccessToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'fitproof-api',
        audience: 'fitproof-app'
      }) as JwtPayload;

      if (decoded.type !== 'access') {
        return {
          payload: decoded,
          isValid: false,
          isExpired: false,
          error: 'Invalid token type'
        };
      }

      return {
        payload: decoded,
        isValid: true,
        isExpired: false
      };
    } catch (error) {
      const isExpired = error instanceof TokenExpiredError;

      // Try to decode without verification to get payload for expired tokens
      let payload: JwtPayload | undefined;
      try {
        payload = jwt.decode(token) as JwtPayload;
      } catch {
        // Token is malformed
      }

      return {
        payload: payload || {} as JwtPayload,
        isValid: false,
        isExpired,
        error: error instanceof Error ? error.message : 'Token verification failed'
      };
    }
  }

  /**
   * Verify and decode refresh token
   */
  static verifyRefreshToken(token: string): DecodedToken {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'fitproof-api',
        audience: 'fitproof-app'
      }) as JwtPayload;

      if (decoded.type !== 'refresh') {
        return {
          payload: decoded,
          isValid: false,
          isExpired: false,
          error: 'Invalid token type'
        };
      }

      return {
        payload: decoded,
        isValid: true,
        isExpired: false
      };
    } catch (error) {
      const isExpired = error instanceof TokenExpiredError;

      let payload: JwtPayload | undefined;
      try {
        payload = jwt.decode(token) as JwtPayload;
      } catch {
        // Token is malformed
      }

      return {
        payload: payload || {} as JwtPayload,
        isValid: false,
        isExpired,
        error: error instanceof Error ? error.message : 'Refresh token verification failed'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static refreshAccessToken(refreshToken: string): { accessToken: string; expiresIn: string } | null {
    const decodedRefresh = this.verifyRefreshToken(refreshToken);

    if (!decodedRefresh.isValid) {
      return null;
    }

    const accessPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: decodedRefresh.payload.userId,
      email: decodedRefresh.payload.email,
      username: decodedRefresh.payload.username,
      type: 'access'
    };

    const accessToken = jwt.sign(accessPayload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'fitproof-api',
      audience: 'fitproof-app'
    } as SignOptions);

    return {
      accessToken,
      expiresIn: this.JWT_EXPIRES_IN
    };
  }

  /**
   * Decode token without verification (useful for getting user info from expired tokens)
   */
  static decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired without verification
   */
  static isTokenExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  }

  /**
   * Validate JWT configuration
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret') {
      errors.push('JWT_SECRET is not properly configured');
    }

    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'fallback-refresh-secret') {
      errors.push('JWT_REFRESH_SECRET is not properly configured');
    }

    if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
      errors.push('JWT_SECRET and JWT_REFRESH_SECRET should be different');
    }

    if (!process.env.JWT_EXPIRES_IN) {
      errors.push('JWT_EXPIRES_IN is not configured');
    }

    if (!process.env.JWT_REFRESH_EXPIRES_IN) {
      errors.push('JWT_REFRESH_EXPIRES_IN is not configured');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}