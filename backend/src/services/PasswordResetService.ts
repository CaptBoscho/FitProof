import crypto from 'crypto';
import { Repository, LessThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { User } from '../entities/User';

export interface PasswordResetRequest {
  email: string;
  requestIp?: string;
  userAgent?: string;
}

export interface PasswordResetConfirmation {
  token: string;
  newPassword: string;
  requestIp?: string;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  token?: string;
}

export class PasswordResetService {
  private static passwordResetTokenRepository: Repository<PasswordResetToken>;
  private static userRepository: Repository<User>;

  private static getRepositories() {
    if (!this.passwordResetTokenRepository) {
      this.passwordResetTokenRepository = AppDataSource.getRepository(PasswordResetToken);
    }
    if (!this.userRepository) {
      this.userRepository = AppDataSource.getRepository(User);
    }
  }

  /**
   * Generate a secure random token for password reset
   */
  private static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request a password reset token
   */
  static async requestPasswordReset(request: PasswordResetRequest): Promise<PasswordResetResult> {
    this.getRepositories();

    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email: request.email }
      });

      // Always return success to prevent email enumeration
      if (!user) {
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent'
        };
      }

      // Invalidate any existing unused tokens for this user
      await this.passwordResetTokenRepository.update(
        { userId: user.id, isUsed: false },
        { isUsed: true }
      );

      // Generate new token
      const resetToken = this.generateResetToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Create password reset token record
      const passwordResetToken = this.passwordResetTokenRepository.create({
        token: resetToken,
        userId: user.id,
        expiresAt,
        requestIp: request.requestIp,
        userAgent: request.userAgent,
        isUsed: false
      });

      await this.passwordResetTokenRepository.save(passwordResetToken);

      return {
        success: true,
        message: 'Password reset token generated successfully',
        token: resetToken
      };

    } catch (error) {
      console.error('Error requesting password reset:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request'
      };
    }
  }

  /**
   * Confirm password reset with token and new password
   */
  static async confirmPasswordReset(confirmation: PasswordResetConfirmation): Promise<PasswordResetResult> {
    this.getRepositories();

    try {
      // Find the reset token
      const resetTokenRecord = await this.passwordResetTokenRepository.findOne({
        where: {
          token: confirmation.token,
          isUsed: false
        },
        relations: ['user']
      });

      if (!resetTokenRecord) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Check if token has expired
      if (new Date() > resetTokenRecord.expiresAt) {
        // Mark token as used to prevent reuse
        await this.passwordResetTokenRepository.update(
          { id: resetTokenRecord.id },
          { isUsed: true }
        );

        return {
          success: false,
          message: 'Reset token has expired'
        };
      }

      // Validate password strength
      const PasswordService = require('./PasswordService').PasswordService;
      const passwordValidation = PasswordService.validatePasswordStrength(confirmation.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'Password does not meet security requirements'
        };
      }

      // Hash the new password
      const hashedPassword = await PasswordService.hashPassword(confirmation.newPassword);

      // Update user's password
      await this.userRepository.update(
        { id: resetTokenRecord.userId },
        { passwordHash: hashedPassword }
      );

      // Mark token as used
      await this.passwordResetTokenRepository.update(
        { id: resetTokenRecord.id },
        { isUsed: true }
      );

      return {
        success: true,
        message: 'Password has been reset successfully'
      };

    } catch (error) {
      console.error('Error confirming password reset:', error);
      return {
        success: false,
        message: 'An error occurred while resetting your password'
      };
    }
  }

  /**
   * Validate a reset token (without using it)
   */
  static async validateResetToken(token: string): Promise<{ isValid: boolean; message: string }> {
    this.getRepositories();

    try {
      const resetTokenRecord = await this.passwordResetTokenRepository.findOne({
        where: {
          token,
          isUsed: false
        }
      });

      if (!resetTokenRecord) {
        return {
          isValid: false,
          message: 'Invalid reset token'
        };
      }

      if (new Date() > resetTokenRecord.expiresAt) {
        return {
          isValid: false,
          message: 'Reset token has expired'
        };
      }

      return {
        isValid: true,
        message: 'Reset token is valid'
      };

    } catch (error) {
      console.error('Error validating reset token:', error);
      return {
        isValid: false,
        message: 'Error validating token'
      };
    }
  }

  /**
   * Clean up expired tokens (can be run as a scheduled job)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    this.getRepositories();

    try {
      const result = await this.passwordResetTokenRepository.delete({
        expiresAt: LessThan(new Date())
      });

      return result.affected || 0;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}