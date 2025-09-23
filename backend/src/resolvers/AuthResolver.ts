import { Resolver, Mutation, Arg, Ctx, Query } from 'type-graphql';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import {
  RegisterInput,
  LoginInput,
  RegisterResponse,
  LoginResponse,
  UserResponse,
  RefreshTokenResponse,
  AuthValidationError,
  PasswordResetRequestInput,
  PasswordResetConfirmInput,
  PasswordResetResponse,
  UpdateProfileInput,
  UpdateProfileResponse
} from '../types/AuthTypes';
import { PasswordService } from '../services/PasswordService';
import { JwtService } from '../services/JwtService';
import { PasswordResetService } from '../services/PasswordResetService';
import { AuthContext, requireAuth, getCurrentUserId } from '../middleware/AuthMiddleware';

@Resolver()
export class AuthResolver {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  @Mutation(() => RegisterResponse)
  async register(
    @Arg('input') input: RegisterInput
  ): Promise<RegisterResponse> {
    try {
      // Validate password strength
      const passwordValidation = PasswordService.validatePasswordStrength(input.password);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: 'Password does not meet security requirements',
          validationErrors: passwordValidation.errors.map(error => {
            const validationError = new AuthValidationError();
            validationError.field = 'password';
            validationError.message = error;
            return validationError;
          })
        };
      }

      // Check if user already exists
      const existingUserByEmail = await this.userRepository.findOne({
        where: { email: input.email }
      });

      if (existingUserByEmail) {
        return {
          success: false,
          message: 'Registration failed',
          validationErrors: (() => {
            const validationError = new AuthValidationError();
            validationError.field = 'email';
            validationError.message = 'An account with this email already exists';
            return [validationError];
          })()
        };
      }

      const existingUserByUsername = await this.userRepository.findOne({
        where: { username: input.username }
      });

      if (existingUserByUsername) {
        return {
          success: false,
          message: 'Registration failed',
          validationErrors: (() => {
            const validationError = new AuthValidationError();
            validationError.field = 'username';
            validationError.message = 'This username is already taken';
            return [validationError];
          })()
        };
      }

      // Hash password
      const hashedPassword = await PasswordService.hashPassword(input.password);

      // Create new user
      const user = this.userRepository.create({
        email: input.email,
        username: input.username,
        passwordHash: hashedPassword,
        totalPoints: 0,
        currentStreak: 0,
        lastWorkoutDate: null,
        isActive: true
      });

      const savedUser = await this.userRepository.save(user);

      // Generate tokens
      const tokens = JwtService.generateTokenPair(savedUser);

      return {
        success: true,
        message: 'Registration successful',
        authData: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          tokenType: 'Bearer',
          user: {
            id: savedUser.id,
            email: savedUser.email,
            username: savedUser.username,
            totalPoints: savedUser.totalPoints,
            currentStreak: savedUser.currentStreak,
            lastWorkoutDate: savedUser.lastWorkoutDate || undefined,
            isActive: savedUser.isActive,
            createdAt: savedUser.createdAt,
            updatedAt: savedUser.updatedAt
          }
        }
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred during registration'
      };
    }
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg('input') input: LoginInput
  ): Promise<LoginResponse> {
    try {
      // Find user by email or username
      const user = await this.userRepository.findOne({
        where: [
          { email: input.emailOrUsername },
          { username: input.emailOrUsername }
        ]
      });

      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated'
        };
      }

      // Verify password
      const isPasswordValid = await PasswordService.verifyPassword(
        input.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      // Generate tokens
      const tokens = JwtService.generateTokenPair(user);

      return {
        success: true,
        message: 'Login successful',
        authData: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          tokenType: 'Bearer',
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            totalPoints: user.totalPoints,
            currentStreak: user.currentStreak,
            lastWorkoutDate: user.lastWorkoutDate || undefined,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        }
      };

    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred during login'
      };
    }
  }

  @Mutation(() => RefreshTokenResponse)
  async refreshToken(
    @Arg('refreshToken') refreshToken: string
  ): Promise<RefreshTokenResponse> {
    const result = JwtService.refreshAccessToken(refreshToken);

    if (!result) {
      throw new Error('Invalid or expired refresh token');
    }

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: 'Bearer'
    };
  }

  @Query(() => UserResponse)
  async me(
    @Ctx() context: AuthContext
  ): Promise<UserResponse> {
    requireAuth(context);
    const userId = getCurrentUserId(context);

    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      totalPoints: user.totalPoints,
      currentStreak: user.currentStreak,
      lastWorkoutDate: user.lastWorkoutDate || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  @Mutation(() => Boolean)
  async logout(
    @Ctx() context: AuthContext
  ): Promise<boolean> {
    requireAuth(context);
    // In a real implementation, you might want to blacklist the token
    // For now, we just return true to indicate the client should discard the token
    return true;
  }

  @Mutation(() => PasswordResetResponse)
  async requestPasswordReset(
    @Arg('input') input: PasswordResetRequestInput,
    @Ctx() context: any
  ): Promise<PasswordResetResponse> {
    try {
      // Extract IP and User-Agent from request for security tracking
      const requestIp = context.req?.ip || context.req?.connection?.remoteAddress;
      const userAgent = context.req?.headers?.['user-agent'];

      const result = await PasswordResetService.requestPasswordReset({
        email: input.email,
        requestIp,
        userAgent
      });

      return {
        success: result.success,
        message: result.message,
        token: process.env.NODE_ENV === 'development' ? result.token : undefined
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while processing your request'
      };
    }
  }

  @Mutation(() => PasswordResetResponse)
  async confirmPasswordReset(
    @Arg('input') input: PasswordResetConfirmInput,
    @Ctx() context: any
  ): Promise<PasswordResetResponse> {
    try {
      const requestIp = context.req?.ip || context.req?.connection?.remoteAddress;

      const result = await PasswordResetService.confirmPasswordReset({
        token: input.token,
        newPassword: input.newPassword,
        requestIp
      });

      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while resetting your password'
      };
    }
  }

  @Mutation(() => UpdateProfileResponse)
  async updateProfile(
    @Arg('input') input: UpdateProfileInput,
    @Ctx() context: AuthContext
  ): Promise<UpdateProfileResponse> {
    try {
      requireAuth(context);
      const userId = getCurrentUserId(context);

      // Check if email is already in use by another user
      if (input.email) {
        const existingUserByEmail = await this.userRepository.findOne({
          where: { email: input.email }
        });

        if (existingUserByEmail && existingUserByEmail.id !== userId) {
          return {
            success: false,
            message: 'Profile update failed',
            validationErrors: (() => {
              const validationError = new AuthValidationError();
              validationError.field = 'email';
              validationError.message = 'This email is already in use';
              return [validationError];
            })()
          };
        }
      }

      // Check if username is already in use by another user
      if (input.username) {
        const existingUserByUsername = await this.userRepository.findOne({
          where: { username: input.username }
        });

        if (existingUserByUsername && existingUserByUsername.id !== userId) {
          return {
            success: false,
            message: 'Profile update failed',
            validationErrors: (() => {
              const validationError = new AuthValidationError();
              validationError.field = 'username';
              validationError.message = 'This username is already taken';
              return [validationError];
            })()
          };
        }
      }

      // Get current user
      const currentUser = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Update user with provided fields
      const updateData: Partial<User> = {};
      if (input.email !== undefined) updateData.email = input.email;
      if (input.username !== undefined) updateData.username = input.username;

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        return {
          success: true,
          message: 'No changes to update',
          user: {
            id: currentUser.id,
            email: currentUser.email,
            username: currentUser.username,
            totalPoints: currentUser.totalPoints,
            currentStreak: currentUser.currentStreak,
            lastWorkoutDate: currentUser.lastWorkoutDate || undefined,
            isActive: currentUser.isActive,
            createdAt: currentUser.createdAt,
            updatedAt: currentUser.updatedAt
          }
        };
      }

      // Perform the update
      await this.userRepository.update(userId, updateData);

      // Fetch updated user
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!updatedUser) {
        throw new Error('Failed to fetch updated user');
      }

      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          totalPoints: updatedUser.totalPoints,
          currentStreak: updatedUser.currentStreak,
          lastWorkoutDate: updatedUser.lastWorkoutDate || undefined,
          isActive: updatedUser.isActive,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      };

    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while updating your profile'
      };
    }
  }
}