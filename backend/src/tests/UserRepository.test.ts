import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserRepository } from '../repositories/UserRepository';
import { ObjectType, Field, ID, Int } from 'type-graphql';

// Test-specific User entity for SQLite compatibility
@ObjectType()
@Entity('users')
class TestUser {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Field()
  @Column({ type: 'varchar', length: 50, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_points', default: 0 })
  totalPoints: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'current_streak', default: 0 })
  currentStreak: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', name: 'last_workout_date', nullable: true })
  lastWorkoutDate: Date | null;

  @Field()
  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

describe('UserRepository', () => {
  let dataSource: DataSource;
  let userRepository: UserRepository;

  beforeAll(async () => {
    // Create in-memory database for testing
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TestUser],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
    userRepository = new UserRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await dataSource.getRepository(TestUser).clear();
  });

  describe('create', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'StrongPassword123!',
      };

      const user = await userRepository.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe(userData.password); // Should be hashed
      expect(user.totalPoints).toBe(0);
      expect(user.currentStreak).toBe(0);
      expect(user.isActive).toBe(true);
    });

    it('should normalize email to lowercase and trim spaces', async () => {
      const userData = {
        email: '  TEST@EXAMPLE.COM  ',
        username: ' testuser ',
        password: 'StrongPassword123!',
      };

      const user = await userRepository.create(userData);

      expect(user.email).toBe('test@example.com');
      expect(user.username).toBe('testuser');
    });

    it('should throw error for duplicate email', async () => {
      const userData1 = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'StrongPassword123!',
      };

      const userData2 = {
        email: 'duplicate@example.com',
        username: 'user2',
        password: 'StrongPassword123!',
      };

      await userRepository.create(userData1);

      await expect(userRepository.create(userData2))
        .rejects.toThrow('Email already exists');
    });

    it('should throw error for duplicate username', async () => {
      const userData1 = {
        email: 'user1@example.com',
        username: 'duplicateuser',
        password: 'StrongPassword123!',
      };

      const userData2 = {
        email: 'user2@example.com',
        username: 'duplicateuser',
        password: 'StrongPassword123!',
      };

      await userRepository.create(userData1);

      await expect(userRepository.create(userData2))
        .rejects.toThrow('Username already exists');
    });

    it('should throw error for weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        username: 'weakuser',
        password: 'weak',
      };

      await expect(userRepository.create(userData))
        .rejects.toThrow('Password validation failed');
    });
  });

  describe('findByEmail', () => {
    beforeEach(async () => {
      await userRepository.create({
        email: 'find@example.com',
        username: 'finduser',
        password: 'StrongPassword123!',
      });
    });

    it('should find user by email', async () => {
      const user = await userRepository.findByEmail('find@example.com');

      expect(user).toBeDefined();
      expect(user?.username).toBe('finduser');
    });

    it('should find user by email case insensitive', async () => {
      const user = await userRepository.findByEmail('FIND@EXAMPLE.COM');

      expect(user).toBeDefined();
      expect(user?.username).toBe('finduser');
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('notfound@example.com');

      expect(user).toBeNull();
    });

    it('should trim email spaces', async () => {
      const user = await userRepository.findByEmail('  find@example.com  ');

      expect(user).toBeDefined();
      expect(user?.username).toBe('finduser');
    });
  });

  describe('findByUsername', () => {
    beforeEach(async () => {
      await userRepository.create({
        email: 'username@example.com',
        username: 'uniqueusername',
        password: 'StrongPassword123!',
      });
    });

    it('should find user by username', async () => {
      const user = await userRepository.findByUsername('uniqueusername');

      expect(user).toBeDefined();
      expect(user?.email).toBe('username@example.com');
    });

    it('should return null for non-existent username', async () => {
      const user = await userRepository.findByUsername('notfound');

      expect(user).toBeNull();
    });

    it('should trim username spaces', async () => {
      const user = await userRepository.findByUsername('  uniqueusername  ');

      expect(user).toBeDefined();
      expect(user?.email).toBe('username@example.com');
    });
  });

  describe('verifyPassword', () => {
    beforeEach(async () => {
      await userRepository.create({
        email: 'verify@example.com',
        username: 'verifyuser',
        password: 'CorrectPassword123!',
      });
    });

    it('should verify correct password', async () => {
      const user = await userRepository.verifyPassword('verify@example.com', 'CorrectPassword123!');

      expect(user).toBeDefined();
      expect(user?.username).toBe('verifyuser');
    });

    it('should reject incorrect password', async () => {
      const user = await userRepository.verifyPassword('verify@example.com', 'WrongPassword123!');

      expect(user).toBeNull();
    });

    it('should reject non-existent email', async () => {
      const user = await userRepository.verifyPassword('notfound@example.com', 'CorrectPassword123!');

      expect(user).toBeNull();
    });

    it('should verify with case insensitive email', async () => {
      const user = await userRepository.verifyPassword('VERIFY@EXAMPLE.COM', 'CorrectPassword123!');

      expect(user).toBeDefined();
      expect(user?.username).toBe('verifyuser');
    });

    it('should not verify inactive user', async () => {
      // First deactivate the user
      const existingUser = await userRepository.findByEmail('verify@example.com');
      await userRepository.update(existingUser!.id, { isActive: false });

      const user = await userRepository.verifyPassword('verify@example.com', 'CorrectPassword123!');

      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepository.create({
        email: 'update@example.com',
        username: 'updateuser',
        password: 'StrongPassword123!',
      });
      userId = user.id;
    });

    it('should update user fields', async () => {
      const updated = await userRepository.update(userId, {
        totalPoints: 150,
        currentStreak: 5,
      });

      expect(updated).toBeDefined();
      expect(updated?.totalPoints).toBe(150);
      expect(updated?.currentStreak).toBe(5);
    });

    it('should update email with uniqueness check', async () => {
      const updated = await userRepository.update(userId, {
        email: 'newemail@example.com',
      });

      expect(updated).toBeDefined();
      expect(updated?.email).toBe('newemail@example.com');
    });

    it('should throw error when updating to existing email', async () => {
      // Create another user
      await userRepository.create({
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'StrongPassword123!',
      });

      await expect(userRepository.update(userId, { email: 'existing@example.com' }))
        .rejects.toThrow('Email already exists');
    });

    it('should update username with uniqueness check', async () => {
      const updated = await userRepository.update(userId, {
        username: 'newusername',
      });

      expect(updated).toBeDefined();
      expect(updated?.username).toBe('newusername');
    });

    it('should throw error when updating to existing username', async () => {
      // Create another user
      await userRepository.create({
        email: 'existing2@example.com',
        username: 'existingusername',
        password: 'StrongPassword123!',
      });

      await expect(userRepository.update(userId, { username: 'existingusername' }))
        .rejects.toThrow('Username already exists');
    });

    it('should return null for non-existent user', async () => {
      const updated = await userRepository.update('non-existent-id', {
        totalPoints: 100,
      });

      expect(updated).toBeNull();
    });
  });

  describe('updatePassword', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepository.create({
        email: 'password@example.com',
        username: 'passworduser',
        password: 'OldPassword123!',
      });
      userId = user.id;
    });

    it('should update password with valid new password', async () => {
      const result = await userRepository.updatePassword(userId, 'NewPassword123!');

      expect(result).toBe(true);

      // Verify old password doesn't work
      const oldVerify = await userRepository.verifyPassword('password@example.com', 'OldPassword123!');
      expect(oldVerify).toBeNull();

      // Verify new password works
      const newVerify = await userRepository.verifyPassword('password@example.com', 'NewPassword123!');
      expect(newVerify).toBeDefined();
    });

    it('should throw error for weak new password', async () => {
      await expect(userRepository.updatePassword(userId, 'weak'))
        .rejects.toThrow('Password validation failed');
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test users
      await userRepository.create({
        email: 'active1@example.com',
        username: 'active1',
        password: 'StrongPassword123!',
      });
      await userRepository.create({
        email: 'active2@example.com',
        username: 'active2',
        password: 'StrongPassword123!',
      });

      const inactiveUser = await userRepository.create({
        email: 'inactive@example.com',
        username: 'inactive',
        password: 'StrongPassword123!',
      });
      // Deactivate one user
      await userRepository.update(inactiveUser.id, { isActive: false });
    });

    it('should find all users', async () => {
      const users = await userRepository.findAll();

      expect(users).toHaveLength(3);
    });

    it('should find only active users when activeOnly is true', async () => {
      const users = await userRepository.findAll({ activeOnly: true });

      expect(users).toHaveLength(2);
      expect(users.every(user => user.isActive)).toBe(true);
    });

    it('should respect limit and offset', async () => {
      const users = await userRepository.findAll({ limit: 1, offset: 1 });

      expect(users).toHaveLength(1);
    });
  });

  describe('addPoints', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepository.create({
        email: 'points@example.com',
        username: 'pointsuser',
        password: 'StrongPassword123!',
      });
      userId = user.id;
    });

    it('should add points to user', async () => {
      const updated = await userRepository.addPoints(userId, 100);

      expect(updated).toBeDefined();
      expect(updated?.totalPoints).toBe(100);

      // Add more points
      const updated2 = await userRepository.addPoints(userId, 50);
      expect(updated2?.totalPoints).toBe(150);
    });

    it('should return null for non-existent user', async () => {
      const result = await userRepository.addPoints('non-existent-id', 100);

      expect(result).toBeNull();
    });
  });

  describe('updateStreak', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepository.create({
        email: 'streak@example.com',
        username: 'streakuser',
        password: 'StrongPassword123!',
      });
      userId = user.id;
    });

    it('should update user streak and workout date', async () => {
      const beforeDate = new Date();
      const updated = await userRepository.updateStreak(userId, 7);
      const afterDate = new Date();

      expect(updated).toBeDefined();
      expect(updated?.currentStreak).toBe(7);
      expect(updated?.lastWorkoutDate).toBeInstanceOf(Date);
      expect(updated?.lastWorkoutDate!.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(updated?.lastWorkoutDate!.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    it('should return null for non-existent user', async () => {
      const result = await userRepository.updateStreak('non-existent-id', 5);

      expect(result).toBeNull();
    });
  });

  describe('searchByUsernameOrEmail', () => {
    beforeEach(async () => {
      await userRepository.create({
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'StrongPassword123!',
      });
      await userRepository.create({
        email: 'jane.smith@example.com',
        username: 'janesmith',
        password: 'StrongPassword123!',
      });

      const inactiveUser = await userRepository.create({
        email: 'inactive.user@example.com',
        username: 'inactiveuser',
        password: 'StrongPassword123!',
      });
      await userRepository.update(inactiveUser.id, { isActive: false });
    });

    it('should search by partial username', async () => {
      const users = await userRepository.searchByUsernameOrEmail('john');

      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('johndoe');
    });

    it('should search by partial email', async () => {
      const users = await userRepository.searchByUsernameOrEmail('jane.smith');

      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('jane.smith@example.com');
    });

    it('should search case insensitive', async () => {
      const users = await userRepository.searchByUsernameOrEmail('JANE');

      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('janesmith');
    });

    it('should exclude inactive users by default', async () => {
      const users = await userRepository.searchByUsernameOrEmail('inactive');

      expect(users).toHaveLength(0);
    });

    it('should include inactive users when activeOnly is false', async () => {
      const users = await userRepository.searchByUsernameOrEmail('inactive', false);

      expect(users).toHaveLength(1);
      expect(users[0].username).toBe('inactiveuser');
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await userRepository.create({
        email: 'count1@example.com',
        username: 'count1',
        password: 'StrongPassword123!',
      });
      await userRepository.create({
        email: 'count2@example.com',
        username: 'count2',
        password: 'StrongPassword123!',
      });

      const inactiveUser = await userRepository.create({
        email: 'countinactive@example.com',
        username: 'countinactive',
        password: 'StrongPassword123!',
      });
      await userRepository.update(inactiveUser.id, { isActive: false });
    });

    it('should count all users', async () => {
      const count = await userRepository.count();

      expect(count).toBe(3);
    });

    it('should count only active users when activeOnly is true', async () => {
      const count = await userRepository.count({ activeOnly: true });

      expect(count).toBe(2);
    });
  });

  describe('softDelete', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await userRepository.create({
        email: 'delete@example.com',
        username: 'deleteuser',
        password: 'StrongPassword123!',
      });
      userId = user.id;
    });

    it('should soft delete user', async () => {
      const deleted = await userRepository.softDelete(userId);

      expect(deleted).toBe(true);

      const user = await userRepository.findById(userId);
      expect(user?.isActive).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const deleted = await userRepository.softDelete('non-existent-id');

      expect(deleted).toBe(false);
    });
  });
});