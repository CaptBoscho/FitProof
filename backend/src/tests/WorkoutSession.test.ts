import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

// Test-specific entities for SQLite compatibility
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

@ObjectType()
@Entity('exercises')
class TestExercise {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Field(() => Int)
  @Column({ type: 'int', name: 'points_per_rep' })
  pointsPerRep: number;

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

@ObjectType()
@Entity('workout_sessions')
class TestWorkoutSession {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => ID)
  @Column({ type: 'varchar', name: 'user_id' })
  @Index()
  userId: string;

  @Field(() => TestUser)
  @ManyToOne(() => TestUser, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: TestUser;

  @Field(() => ID)
  @Column({ type: 'varchar', name: 'exercise_id' })
  @Index()
  exerciseId: string;

  @Field(() => TestExercise)
  @ManyToOne(() => TestExercise, { eager: true })
  @JoinColumn({ name: 'exercise_id' })
  exercise: TestExercise;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_reps', default: 0 })
  totalReps: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'valid_reps', default: 0 })
  validReps: number;

  @Field(() => Int)
  @Column({ type: 'int', name: 'total_points', default: 0 })
  totalPoints: number;

  @Field()
  @Column({ type: 'varchar', length: 20, name: 'device_orientation', default: 'portrait' })
  deviceOrientation: string;

  @Field(() => Date)
  @Column({ type: 'datetime', name: 'started_at' })
  startedAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds: number | null;

  @Field()
  @Column({ type: 'boolean', name: 'is_completed', default: false })
  isCompleted: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Field(() => Number)
  get completionRate(): number {
    if (this.totalReps === 0) return 0;
    return (this.validReps / this.totalReps) * 100;
  }
}

describe('WorkoutSession Entity', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TestWorkoutSession, TestUser, TestExercise],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(TestWorkoutSession).clear();
    await dataSource.getRepository(TestUser).clear();
    await dataSource.getRepository(TestExercise).clear();
  });

  describe('WorkoutSession creation', () => {
    it('should create workout session with required fields', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      // Create test user and exercise
      const user = await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Pushup',
        pointsPerRep: 2
      });

      const session = sessionRepo.create({
        userId: user.id,
        exerciseId: exercise.id,
        startedAt: new Date()
      });

      const saved = await sessionRepo.save(session);

      expect(saved.id).toBeDefined();
      expect(saved.userId).toBe(user.id);
      expect(saved.exerciseId).toBe(exercise.id);
      expect(saved.totalReps).toBe(0);
      expect(saved.validReps).toBe(0);
      expect(saved.totalPoints).toBe(0);
      expect(saved.deviceOrientation).toBe('portrait');
      expect(saved.isCompleted).toBe(false);
      expect(saved.completedAt).toBeNull();
      expect(saved.durationSeconds).toBeNull();
      expect(saved.startedAt).toBeInstanceOf(Date);
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should create workout session with all fields', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const user = await userRepo.save({
        email: 'complete@example.com',
        username: 'completeuser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Squat',
        pointsPerRep: 1
      });

      const startedAt = new Date('2024-01-01T10:00:00Z');
      const completedAt = new Date('2024-01-01T10:05:00Z');

      const sessionData = {
        userId: user.id,
        exerciseId: exercise.id,
        totalReps: 20,
        validReps: 18,
        totalPoints: 18,
        deviceOrientation: 'landscape',
        startedAt,
        completedAt,
        durationSeconds: 300,
        isCompleted: true
      };

      const session = sessionRepo.create(sessionData);
      const saved = await sessionRepo.save(session);

      expect(saved.totalReps).toBe(20);
      expect(saved.validReps).toBe(18);
      expect(saved.totalPoints).toBe(18);
      expect(saved.deviceOrientation).toBe('landscape');
      expect(saved.startedAt).toEqual(startedAt);
      expect(saved.completedAt).toEqual(completedAt);
      expect(saved.durationSeconds).toBe(300);
      expect(saved.isCompleted).toBe(true);
    });

    it('should calculate completion rate correctly', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const user = await userRepo.save({
        email: 'rate@example.com',
        username: 'rateuser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Situp',
        pointsPerRep: 2
      });

      const session = sessionRepo.create({
        userId: user.id,
        exerciseId: exercise.id,
        totalReps: 10,
        validReps: 8,
        startedAt: new Date()
      });

      const saved = await sessionRepo.save(session);

      expect(saved.completionRate).toBe(80);
    });

    it('should handle zero total reps for completion rate', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const user = await userRepo.save({
        email: 'zero@example.com',
        username: 'zerouser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Pushup',
        pointsPerRep: 2
      });

      const session = sessionRepo.create({
        userId: user.id,
        exerciseId: exercise.id,
        totalReps: 0,
        validReps: 0,
        startedAt: new Date()
      });

      const saved = await sessionRepo.save(session);

      expect(saved.completionRate).toBe(0);
    });

    it('should auto-generate timestamps', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const user = await userRepo.save({
        email: 'timestamp@example.com',
        username: 'timestampuser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Pushup',
        pointsPerRep: 2
      });

      const session = sessionRepo.create({
        userId: user.id,
        exerciseId: exercise.id,
        startedAt: new Date()
      });

      const saved = await sessionRepo.save(session);

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the session
      saved.totalReps = 5;
      const updated = await sessionRepo.save(saved);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(saved.createdAt.getTime());
    });
  });

  describe('WorkoutSession relationships', () => {
    it('should load user and exercise relationships', async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const user = await userRepo.save({
        email: 'relation@example.com',
        username: 'relationuser',
        passwordHash: 'hash123'
      });

      const exercise = await exerciseRepo.save({
        name: 'Test Exercise',
        pointsPerRep: 3
      });

      const session = await sessionRepo.save({
        userId: user.id,
        exerciseId: exercise.id,
        startedAt: new Date()
      });

      const loadedSession = await sessionRepo.findOne({
        where: { id: session.id },
        relations: ['user', 'exercise']
      });

      expect(loadedSession).toBeDefined();
      expect(loadedSession!.user).toBeDefined();
      expect(loadedSession!.user.username).toBe('relationuser');
      expect(loadedSession!.exercise).toBeDefined();
      expect(loadedSession!.exercise.name).toBe('Test Exercise');
    });
  });

  describe('WorkoutSession queries', () => {
    beforeEach(async () => {
      const userRepo = dataSource.getRepository(TestUser);
      const exerciseRepo = dataSource.getRepository(TestExercise);
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      // Create test data
      const user1 = await userRepo.save({
        email: 'user1@example.com',
        username: 'user1',
        passwordHash: 'hash123'
      });

      const user2 = await userRepo.save({
        email: 'user2@example.com',
        username: 'user2',
        passwordHash: 'hash123'
      });

      const pushup = await exerciseRepo.save({
        name: 'Pushup',
        pointsPerRep: 2
      });

      const squat = await exerciseRepo.save({
        name: 'Squat',
        pointsPerRep: 1
      });

      // Create sessions
      await sessionRepo.save([
        {
          userId: user1.id,
          exerciseId: pushup.id,
          totalReps: 10,
          validReps: 8,
          isCompleted: true,
          startedAt: new Date('2024-01-01T10:00:00Z')
        },
        {
          userId: user1.id,
          exerciseId: squat.id,
          totalReps: 15,
          validReps: 12,
          isCompleted: true,
          startedAt: new Date('2024-01-02T10:00:00Z')
        },
        {
          userId: user2.id,
          exerciseId: pushup.id,
          totalReps: 0,
          validReps: 0,
          isCompleted: false,
          startedAt: new Date('2024-01-03T10:00:00Z')
        }
      ]);
    });

    it('should find sessions by user', async () => {
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);
      const userRepo = dataSource.getRepository(TestUser);

      const user1 = await userRepo.findOne({ where: { username: 'user1' } });

      const userSessions = await sessionRepo.find({
        where: { userId: user1!.id }
      });

      expect(userSessions).toHaveLength(2);
    });

    it('should find completed sessions', async () => {
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const completedSessions = await sessionRepo.find({
        where: { isCompleted: true }
      });

      expect(completedSessions).toHaveLength(2);
      expect(completedSessions.every(session => session.isCompleted)).toBe(true);
    });

    it('should find sessions by exercise', async () => {
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);
      const exerciseRepo = dataSource.getRepository(TestExercise);

      const pushup = await exerciseRepo.findOne({ where: { name: 'Pushup' } });

      const pushupSessions = await sessionRepo.find({
        where: { exerciseId: pushup!.id }
      });

      expect(pushupSessions).toHaveLength(2);
    });

    it('should order sessions by start date', async () => {
      const sessionRepo = dataSource.getRepository(TestWorkoutSession);

      const sessions = await sessionRepo.find({
        order: { startedAt: 'DESC' }
      });

      expect(sessions).toHaveLength(3);
      expect(sessions[0].startedAt.getTime()).toBeGreaterThanOrEqual(sessions[1].startedAt.getTime());
      expect(sessions[1].startedAt.getTime()).toBeGreaterThanOrEqual(sessions[2].startedAt.getTime());
    });
  });
});