import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildSchema } from 'type-graphql';
import { graphql, GraphQLSchema } from 'graphql';
import { TestUser as User } from './entities/TestUser';
import { TestExercise as Exercise } from './entities/TestExercise';
import { TestWorkoutSession as WorkoutSession } from './entities/TestWorkoutSession';
import { TestWorkoutRep as WorkoutRep } from './entities/TestWorkoutRep';
import { UserResolver } from '../resolvers/UserResolver';
import { ExerciseResolver } from '../resolvers/ExerciseResolver';
import { WorkoutSessionResolver } from '../resolvers/WorkoutSessionResolver';
import { PasswordService } from '../services/PasswordService';

describe('GraphQL Resolvers Integration Tests', () => {
  let dataSource: DataSource;
  let schema: GraphQLSchema;

  beforeAll(async () => {
    // Create in-memory database for testing
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Exercise, WorkoutSession, WorkoutRep],
      synchronize: true,
      logging: false
    });

    await dataSource.initialize();

    // Build GraphQL schema
    schema = await buildSchema({
      resolvers: [UserResolver, ExerciseResolver, WorkoutSessionResolver],
      validate: false
    });
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await dataSource.getRepository(WorkoutRep).clear();
    await dataSource.getRepository(WorkoutSession).clear();
    await dataSource.getRepository(Exercise).clear();
    await dataSource.getRepository(User).clear();
  });

  describe('ExerciseResolver', () => {
    it('should create an exercise', async () => {
      const mutation = `
        mutation CreateExercise($input: CreateExerciseInput!) {
          createExercise(input: $input) {
            id
            name
            pointsPerRep
            description
            category
            isActive
          }
        }
      `;

      const variables = {
        input: {
          name: 'Push-ups',
          pointsPerRep: 1,
          description: 'Standard push-up exercise',
          category: 'Upper Body',
          isActive: true
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.createExercise).toMatchObject({
        name: 'Push-ups',
        pointsPerRep: 1,
        description: 'Standard push-up exercise',
        category: 'Upper Body',
        isActive: true
      });
      expect((result.data as any)?.createExercise.id).toBeDefined();
    });

    it('should query exercises', async () => {
      // First create an exercise
      const exerciseRepo = dataSource.getRepository(Exercise);
      await exerciseRepo.save({
        name: 'Squats',
        pointsPerRep: 2,
        description: 'Standard squat exercise',
        category: 'Lower Body',
        isActive: true
      });

      const query = `
        query {
          exercises {
            id
            name
            pointsPerRep
            category
            isActive
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.exercises).toHaveLength(1);
      expect((result.data as any)?.exercises[0]).toMatchObject({
        name: 'Squats',
        pointsPerRep: 2,
        category: 'Lower Body',
        isActive: true
      });
    });

    it('should search exercises by name', async () => {
      const exerciseRepo = dataSource.getRepository(Exercise);
      await exerciseRepo.save([
        { name: 'Push-ups', pointsPerRep: 1, category: 'Upper Body', isActive: true },
        { name: 'Pull-ups', pointsPerRep: 2, category: 'Upper Body', isActive: true },
        { name: 'Squats', pointsPerRep: 1, category: 'Lower Body', isActive: true }
      ]);

      const query = `
        query SearchExercises($input: ExerciseSearchInput!) {
          searchExercises(input: $input) {
            id
            name
            category
          }
        }
      `;

      const variables = {
        input: {
          searchTerm: 'up',
          activeOnly: true
        }
      };

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.searchExercises).toHaveLength(2);
      expect((result.data as any)?.searchExercises.map((e: any) => e.name)).toEqual(
        expect.arrayContaining(['Push-ups', 'Pull-ups'])
      );
    });
  });

  describe('UserResolver', () => {
    it('should register a new user', async () => {
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
            user {
              id
              email
              username
              totalPoints
              isActive
            }
            message
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123!'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.register.token).toBeDefined();
      expect((result.data as any)?.register.user).toMatchObject({
        email: 'test@example.com',
        username: 'testuser',
        totalPoints: 0,
        isActive: true
      });
      expect((result.data as any)?.register.message).toBe('User registered successfully');
    });

    it('should login existing user', async () => {
      // First create a user
      const userRepo = dataSource.getRepository(User);
      const hashedPassword = await PasswordService.hashPassword('Password123!');
      await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: hashedPassword,
        isActive: true
      });

      const mutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
            user {
              id
              email
              username
            }
            message
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          password: 'Password123!'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.login.token).toBeDefined();
      expect((result.data as any)?.login.user).toMatchObject({
        email: 'test@example.com',
        username: 'testuser'
      });
      expect((result.data as any)?.login.message).toBe('Login successful');
    });

    it('should query users', async () => {
      const userRepo = dataSource.getRepository(User);
      await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        totalPoints: 100,
        isActive: true
      });

      const query = `
        query {
          users {
            id
            email
            username
            totalPoints
            isActive
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.users).toHaveLength(1);
      expect((result.data as any)?.users[0]).toMatchObject({
        email: 'test@example.com',
        username: 'testuser',
        totalPoints: 100,
        isActive: true
      });
    });

    it('should update user points', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        totalPoints: 100,
        isActive: true
      });

      const mutation = `
        mutation UpdateUserPoints($userId: ID!, $points: Int!) {
          updateUserPoints(userId: $userId, points: $points) {
            success
            message
          }
        }
      `;

      const variables = {
        userId: user.id,
        points: 50
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.updateUserPoints.success).toBe(true);

      // Verify points were updated
      const updatedUser = await userRepo.findOne({ where: { id: user.id } });
      expect(updatedUser?.totalPoints).toBe(150);
    });
  });

  describe('WorkoutSessionResolver', () => {
    let user: User;
    let exercise: Exercise;

    beforeEach(async () => {
      const userRepo = dataSource.getRepository(User);
      const exerciseRepo = dataSource.getRepository(Exercise);

      user = await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        isActive: true
      });

      exercise = await exerciseRepo.save({
        name: 'Push-ups',
        pointsPerRep: 1,
        category: 'Upper Body',
        isActive: true
      });
    });

    it('should create a workout session', async () => {
      const mutation = `
        mutation CreateWorkoutSession($input: CreateWorkoutSessionInput!) {
          createWorkoutSession(input: $input) {
            id
            userId
            exerciseId
            deviceOrientation
            isCompleted
            totalReps
            validReps
          }
        }
      `;

      const variables = {
        input: {
          userId: user.id,
          exerciseId: exercise.id,
          deviceOrientation: 'portrait'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.createWorkoutSession).toMatchObject({
        userId: user.id,
        exerciseId: exercise.id,
        deviceOrientation: 'portrait',
        isCompleted: false,
        totalReps: 0,
        validReps: 0
      });
      expect((result.data as any)?.createWorkoutSession.id).toBeDefined();
    });

    it('should complete a workout session', async () => {
      const sessionRepo = dataSource.getRepository(WorkoutSession);
      const session = await sessionRepo.save({
        userId: user.id,
        exerciseId: exercise.id,
        deviceOrientation: 'portrait',
        startedAt: new Date(),
        isCompleted: false
      });

      const mutation = `
        mutation CompleteWorkoutSession($id: ID!, $input: CompleteWorkoutSessionInput!) {
          completeWorkoutSession(id: $id, input: $input) {
            id
            isCompleted
            totalReps
            validReps
            totalPoints
            completedAt
          }
        }
      `;

      const variables = {
        id: session.id,
        input: {
          totalReps: 10,
          validReps: 8,
          totalPoints: 8
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.completeWorkoutSession).toMatchObject({
        id: session.id,
        isCompleted: true,
        totalReps: 10,
        validReps: 8,
        totalPoints: 8
      });
      expect((result.data as any)?.completeWorkoutSession.completedAt).toBeDefined();
    });

    it('should query workout sessions by user', async () => {
      const sessionRepo = dataSource.getRepository(WorkoutSession);
      await sessionRepo.save([
        {
          userId: user.id,
          exerciseId: exercise.id,
          startedAt: new Date(),
          isCompleted: true,
          totalReps: 10,
          validReps: 8
        },
        {
          userId: user.id,
          exerciseId: exercise.id,
          startedAt: new Date(),
          isCompleted: false,
          totalReps: 0,
          validReps: 0
        }
      ]);

      const query = `
        query UserWorkoutSessions($userId: ID!) {
          userWorkoutSessions(userId: $userId) {
            id
            userId
            exerciseId
            isCompleted
            totalReps
            validReps
          }
        }
      `;

      const variables = {
        userId: user.id
      };

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.userWorkoutSessions).toHaveLength(2);
      expect((result.data as any)?.userWorkoutSessions[0].userId).toBe(user.id);
      expect((result.data as any)?.userWorkoutSessions[1].userId).toBe(user.id);
    });

    it('should get session stats', async () => {
      const sessionRepo = dataSource.getRepository(WorkoutSession);
      const session = await sessionRepo.save({
        userId: user.id,
        exerciseId: exercise.id,
        startedAt: new Date(),
        isCompleted: true,
        totalReps: 15,
        validReps: 12,
        durationSeconds: 120
      });

      const query = `
        query SessionStats($sessionId: ID!) {
          sessionStats(sessionId: $sessionId) {
            totalReps
            validReps
            averageConfidence
            completionRate
            averageDuration
          }
        }
      `;

      const variables = {
        sessionId: session.id
      };

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.sessionStats).toMatchObject({
        totalReps: 15,
        validReps: 12,
        completionRate: 0.8,
        averageDuration: 120
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate email format in user registration', async () => {
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
            user {
              id
              email
            }
          }
        }
      `;

      const variables = {
        input: {
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123!'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('email');
    });

    it('should validate password strength', async () => {
      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
            user {
              id
            }
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          username: 'testuser',
          password: '123'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('at least 8 characters');
    });

    it('should validate exercise name length', async () => {
      const mutation = `
        mutation CreateExercise($input: CreateExerciseInput!) {
          createExercise(input: $input) {
            id
            name
          }
        }
      `;

      const variables = {
        input: {
          name: '',
          pointsPerRep: 1
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeDefined();
    });

    it('should validate positive points per rep', async () => {
      const mutation = `
        mutation CreateExercise($input: CreateExerciseInput!) {
          createExercise(input: $input) {
            id
            pointsPerRep
          }
        }
      `;

      const variables = {
        input: {
          name: 'Test Exercise',
          pointsPerRep: 0
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found error', async () => {
      const query = `
        query GetUser($id: ID!) {
          user(id: $id) {
            id
            email
          }
        }
      `;

      const variables = {
        id: 'non-existent-id'
      };

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.user).toBeNull();
    });

    it('should handle exercise not found error', async () => {
      const query = `
        query GetExercise($id: ID!) {
          exercise(id: $id) {
            id
            name
          }
        }
      `;

      const variables = {
        id: 'non-existent-id'
      };

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.exercise).toBeNull();
    });

    it('should handle duplicate user registration', async () => {
      // First create a user
      const userRepo = dataSource.getRepository(User);
      await userRepo.save({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashedpassword',
        isActive: true
      });

      const mutation = `
        mutation Register($input: CreateUserInput!) {
          register(input: $input) {
            token
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          username: 'testuser2',
          password: 'Password123!'
        }
      };

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('already exists');
    });
  });
});