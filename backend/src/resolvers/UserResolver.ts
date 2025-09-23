import { Query, Mutation, Arg, Resolver, ID, Int } from 'type-graphql';
import { User } from '../entities/User';
import { UserRepository } from '../repositories/UserRepository';
import { AppDataSource } from '../config/database';
import { CreateUserInput, UpdateUserInput, LoginInput, ChangePasswordInput, UserFiltersInput, UserSearchInput } from '../types/UserTypes';
import { AuthResponse, GenericResponse, UserStatsResponse, PaginatedUsersResponse } from '../types/ResponseTypes';
import { PasswordService } from '../services/PasswordService';
import jwt from 'jsonwebtoken';

@Resolver(() => User)
export class UserResolver {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository(AppDataSource);
  }

  @Query(() => [User])
  async users(
    @Arg('filters', { nullable: true }) filters?: UserFiltersInput
  ): Promise<User[]> {
    return await this.userRepository.findAll(filters || { activeOnly: true });
  }

  @Query(() => User, { nullable: true })
  async user(@Arg('id', () => ID) id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  @Query(() => User, { nullable: true })
  async userByEmail(@Arg('email') email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  @Query(() => User, { nullable: true })
  async userByUsername(@Arg('username') username: string): Promise<User | null> {
    return await this.userRepository.findByUsername(username);
  }

  @Query(() => [User])
  async searchUsers(@Arg('input') input: UserSearchInput): Promise<User[]> {
    return await this.userRepository.searchByUsernameOrEmail(input.searchTerm, input.activeOnly);
  }

  @Query(() => PaginatedUsersResponse)
  async paginatedUsers(
    @Arg('filters', { nullable: true }) filters?: UserFiltersInput
  ): Promise<PaginatedUsersResponse> {
    const result = await this.userRepository.findAllWithCount(filters || {});
    return {
      users: result.users,
      total: result.total,
      page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
      limit: filters?.limit || 50
    };
  }

  @Query(() => UserStatsResponse)
  async userStats(@Arg('userId', () => ID) userId: string): Promise<UserStatsResponse> {
    const stats = await this.userRepository.getUserStats(userId);
    if (!stats) {
      throw new Error('User not found');
    }
    return stats;
  }

  @Mutation(() => AuthResponse)
  async register(@Arg('input') input: CreateUserInput): Promise<AuthResponse> {
    try {
      const existingUser = await this.userRepository.findByEmailOrUsername(input.email, input.username);
      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      const hashedPassword = await PasswordService.hashPassword(input.password);
      const user = await this.userRepository.create({
        ...input,
        password: hashedPassword
      });

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return {
        token,
        user,
        message: 'User registered successfully'
      };
    } catch (error) {
      throw new Error(`Failed to register user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => AuthResponse)
  async login(@Arg('input') input: LoginInput): Promise<AuthResponse> {
    try {
      const user = await this.userRepository.findByEmail(input.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isValidPassword = await PasswordService.verifyPassword(input.password, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '7d' }
      );

      return {
        token,
        user,
        message: 'Login successful'
      };
    } catch (error) {
      throw new Error(`Failed to login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => User)
  async updateUser(
    @Arg('id', () => ID) id: string,
    @Arg('input') input: UpdateUserInput
  ): Promise<User> {
    try {
      if (input.email) {
        const existingUser = await this.userRepository.findByEmail(input.email);
        if (existingUser && existingUser.id !== id) {
          throw new Error('Email already in use');
        }
      }

      if (input.username) {
        const existingUser = await this.userRepository.findByUsername(input.username);
        if (existingUser && existingUser.id !== id) {
          throw new Error('Username already in use');
        }
      }

      const user = await this.userRepository.update(id, input);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  @Mutation(() => GenericResponse)
  async changePassword(
    @Arg('userId', () => ID) userId: string,
    @Arg('input') input: ChangePasswordInput
  ): Promise<GenericResponse> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isValidPassword = await PasswordService.verifyPassword(input.currentPassword, user.passwordHash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      const hashedPassword = await PasswordService.hashPassword(input.newPassword);
      await this.userRepository.update(userId, { passwordHash: hashedPassword });

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  @Mutation(() => GenericResponse)
  async deleteUser(@Arg('id', () => ID) id: string): Promise<GenericResponse> {
    try {
      const deleted = await this.userRepository.softDelete(id);
      return {
        success: deleted,
        message: deleted ? 'User deleted successfully' : 'User not found'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  @Mutation(() => GenericResponse)
  async updateUserPoints(
    @Arg('userId', () => ID) userId: string,
    @Arg('points', () => Int) points: number
  ): Promise<GenericResponse> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      await this.userRepository.update(userId, {
        totalPoints: user.totalPoints + points
      });

      return {
        success: true,
        message: `Added ${points} points to user`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update points: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  @Mutation(() => GenericResponse)
  async updateUserStreak(
    @Arg('userId', () => ID) userId: string,
    @Arg('streak', () => Int) streak: number
  ): Promise<GenericResponse> {
    try {
      const updated = await this.userRepository.update(userId, {
        currentStreak: streak,
        lastWorkoutDate: new Date()
      });

      if (!updated) {
        throw new Error('User not found');
      }

      return {
        success: true,
        message: `Updated user streak to ${streak}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update streak: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}