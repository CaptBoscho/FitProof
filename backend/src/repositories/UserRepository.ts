import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/User';
import { PasswordService } from '../services/PasswordService';

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  password?: string;
  passwordHash?: string;
  totalPoints?: number;
  currentStreak?: number;
  lastWorkoutDate?: Date;
  isActive?: boolean;
}

export class UserRepository {
  private repository: Repository<User>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(User);
  }

  async create(userData: CreateUserData): Promise<User> {
    const { email, username, password } = userData;

    // Check if email already exists
    const existingEmailUser = await this.findByEmail(email);
    if (existingEmailUser) {
      throw new Error('Email already exists');
    }

    // Check if username already exists
    const existingUsernameUser = await this.findByUsername(username);
    if (existingUsernameUser) {
      throw new Error('Username already exists');
    }

    // Create user (password should already be hashed by the resolver)
    const user = this.repository.create({
      email: email.toLowerCase().trim(),
      username: username.trim(),
      passwordHash: password, // Password is already hashed from resolver
    });

    return await this.repository.save(user);
  }

  async findAll(options?: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<User[]> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    if (options?.activeOnly) {
      queryBuilder.where('user.isActive = :isActive', { isActive: true });
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  async findById(id: string): Promise<User | null> {
    return await this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { email: email.toLowerCase().trim() }
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.repository.findOne({
      where: { username: username.trim() }
    });
  }

  async update(id: string, updateData: UpdateUserData): Promise<User | null> {
    // If updating email, check for uniqueness
    if (updateData.email) {
      const existingUser = await this.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already exists');
      }
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // If updating username, check for uniqueness
    if (updateData.username) {
      const existingUser = await this.findByUsername(updateData.username);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Username already exists');
      }
      updateData.username = updateData.username.trim();
    }

    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.repository.findOne({
      where: { email: email.toLowerCase().trim(), isActive: true }
    });

    if (!user) {
      return null;
    }

    const isValidPassword = await PasswordService.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async updatePassword(id: string, newPassword: string): Promise<boolean> {
    // Validate password strength
    const passwordValidation = PasswordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    const passwordHash = await PasswordService.hashPassword(newPassword);
    const result = await this.repository.update(id, { passwordHash });
    return (result.affected ?? 0) > 0;
  }

  async count(options?: { activeOnly?: boolean }): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    if (options?.activeOnly) {
      queryBuilder.where('user.isActive = :isActive', { isActive: true });
    }

    return await queryBuilder.getCount();
  }

  async searchByUsernameOrEmail(searchTerm: string, activeOnly: boolean = true): Promise<User[]> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    queryBuilder.where(
      '(LOWER(user.username) LIKE LOWER(:searchTerm) OR LOWER(user.email) LIKE LOWER(:searchTerm))',
      { searchTerm: `%${searchTerm}%` }
    );

    if (activeOnly) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
    }

    queryBuilder.orderBy('user.username', 'ASC');

    return await queryBuilder.getMany();
  }

  async addPoints(id: string, points: number): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    const newTotalPoints = user.totalPoints + points;
    await this.repository.update(id, { totalPoints: newTotalPoints });
    return await this.findById(id);
  }

  async updateStreak(id: string, newStreak: number): Promise<User | null> {
    await this.repository.update(id, {
      currentStreak: newStreak,
      lastWorkoutDate: new Date()
    });
    return await this.findById(id);
  }

  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    return await this.repository.findOne({
      where: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() }
      ]
    });
  }

  async findAllWithCount(options?: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    if (options?.activeOnly) {
      queryBuilder.where('user.isActive = :isActive', { isActive: true });
    }

    const total = await queryBuilder.getCount();

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    queryBuilder.orderBy('user.createdAt', 'DESC');

    const users = await queryBuilder.getMany();

    return { users, total };
  }

  async getUserStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    totalReps: number;
    totalPoints: number;
    averageSessionDuration: number;
  } | null> {
    const user = await this.findById(userId);
    if (!user) {
      return null;
    }

    // This would typically require joins with workout session and rep tables
    // For now, return basic stats from the user entity
    return {
      totalSessions: 0, // TODO: Calculate from workout sessions
      completedSessions: 0, // TODO: Calculate from completed workout sessions
      totalReps: 0, // TODO: Calculate from workout reps
      totalPoints: user.totalPoints,
      averageSessionDuration: 0 // TODO: Calculate from workout sessions
    };
  }
}