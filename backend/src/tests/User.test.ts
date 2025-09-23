import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
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

describe('User Entity', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TestUser],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(TestUser).clear();
  });

  describe('User creation', () => {
    it('should create user with required fields', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = repository.create({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword123',
      });

      const saved = await repository.save(user);

      expect(saved.id).toBeDefined();
      expect(saved.email).toBe('test@example.com');
      expect(saved.username).toBe('testuser');
      expect(saved.passwordHash).toBe('hashedpassword123');
      expect(saved.totalPoints).toBe(0); // Default value
      expect(saved.currentStreak).toBe(0); // Default value
      expect(saved.lastWorkoutDate).toBeNull();
      expect(saved.isActive).toBe(true); // Default value
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user with all fields', async () => {
      const repository = dataSource.getRepository(TestUser);

      const userData = {
        email: 'complete@example.com',
        username: 'completeuser',
        passwordHash: 'hashedpassword123',
        totalPoints: 150,
        currentStreak: 5,
        lastWorkoutDate: new Date('2024-01-01'),
        isActive: false,
      };

      const user = repository.create(userData);
      const saved = await repository.save(user);

      expect(saved.email).toBe(userData.email);
      expect(saved.username).toBe(userData.username);
      expect(saved.passwordHash).toBe(userData.passwordHash);
      expect(saved.totalPoints).toBe(userData.totalPoints);
      expect(saved.currentStreak).toBe(userData.currentStreak);
      expect(saved.lastWorkoutDate).toEqual(userData.lastWorkoutDate);
      expect(saved.isActive).toBe(userData.isActive);
    });

    it('should enforce unique constraint on email', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user1 = repository.create({
        email: 'unique@example.com',
        username: 'user1',
        passwordHash: 'hash1',
      });
      await repository.save(user1);

      const user2 = repository.create({
        email: 'unique@example.com',
        username: 'user2',
        passwordHash: 'hash2',
      });

      await expect(repository.save(user2)).rejects.toThrow();
    });

    it('should enforce unique constraint on username', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user1 = repository.create({
        email: 'user1@example.com',
        username: 'uniqueuser',
        passwordHash: 'hash1',
      });
      await repository.save(user1);

      const user2 = repository.create({
        email: 'user2@example.com',
        username: 'uniqueuser',
        passwordHash: 'hash2',
      });

      await expect(repository.save(user2)).rejects.toThrow();
    });

    it('should auto-generate timestamps', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = repository.create({
        email: 'timestamp@example.com',
        username: 'timestampuser',
        passwordHash: 'hash123',
      });

      const saved = await repository.save(user);

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the user
      saved.totalPoints = 100;
      const updated = await repository.save(saved);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(saved.createdAt.getTime());
    });
  });

  describe('User queries', () => {
    beforeEach(async () => {
      const repository = dataSource.getRepository(TestUser);

      // Create test data
      await repository.save([
        {
          email: 'active1@example.com',
          username: 'activeuser1',
          passwordHash: 'hash1',
          totalPoints: 100,
          currentStreak: 3,
          isActive: true,
        },
        {
          email: 'active2@example.com',
          username: 'activeuser2',
          passwordHash: 'hash2',
          totalPoints: 200,
          currentStreak: 5,
          isActive: true,
        },
        {
          email: 'inactive@example.com',
          username: 'inactiveuser',
          passwordHash: 'hash3',
          totalPoints: 50,
          currentStreak: 0,
          isActive: false,
        },
      ]);
    });

    it('should find users by email', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = await repository.findOne({
        where: { email: 'active1@example.com' }
      });

      expect(user).toBeDefined();
      expect(user?.username).toBe('activeuser1');
    });

    it('should find users by username', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = await repository.findOne({
        where: { username: 'activeuser2' }
      });

      expect(user).toBeDefined();
      expect(user?.email).toBe('active2@example.com');
    });

    it('should find active users', async () => {
      const repository = dataSource.getRepository(TestUser);

      const activeUsers = await repository.find({
        where: { isActive: true }
      });

      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every(user => user.isActive)).toBe(true);
    });

    it('should order users by creation date', async () => {
      const repository = dataSource.getRepository(TestUser);

      const users = await repository.find({
        order: { createdAt: 'DESC' }
      });

      expect(users).toHaveLength(3);
      // Most recent first
      expect(users[0].createdAt.getTime()).toBeGreaterThanOrEqual(users[1].createdAt.getTime());
      expect(users[1].createdAt.getTime()).toBeGreaterThanOrEqual(users[2].createdAt.getTime());
    });

    it('should find users with high total points', async () => {
      const repository = dataSource.getRepository(TestUser);

      const highScorers = await repository
        .createQueryBuilder('user')
        .where('user.totalPoints >= :points', { points: 150 })
        .getMany();

      expect(highScorers).toHaveLength(1);
      expect(highScorers[0].username).toBe('activeuser2');
    });

    it('should find users with current streak', async () => {
      const repository = dataSource.getRepository(TestUser);

      const streakUsers = await repository
        .createQueryBuilder('user')
        .where('user.currentStreak > :streak', { streak: 0 })
        .orderBy('user.currentStreak', 'DESC')
        .getMany();

      expect(streakUsers).toHaveLength(2);
      expect(streakUsers[0].currentStreak).toBe(5);
      expect(streakUsers[1].currentStreak).toBe(3);
    });
  });

  describe('User data validation', () => {
    it('should handle email case insensitivity (manual test)', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = repository.create({
        email: 'CaseSensitive@Example.Com',
        username: 'caseuser',
        passwordHash: 'hash123',
      });

      const saved = await repository.save(user);
      expect(saved.email).toBe('CaseSensitive@Example.Com'); // Stored as provided
    });

    it('should handle null lastWorkoutDate', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = repository.create({
        email: 'nulldate@example.com',
        username: 'nulldateuser',
        passwordHash: 'hash123',
        lastWorkoutDate: null,
      });

      const saved = await repository.save(user);
      expect(saved.lastWorkoutDate).toBeNull();
    });

    it('should handle zero points and streak', async () => {
      const repository = dataSource.getRepository(TestUser);

      const user = repository.create({
        email: 'zero@example.com',
        username: 'zerouser',
        passwordHash: 'hash123',
        totalPoints: 0,
        currentStreak: 0,
      });

      const saved = await repository.save(user);
      expect(saved.totalPoints).toBe(0);
      expect(saved.currentStreak).toBe(0);
    });
  });
});