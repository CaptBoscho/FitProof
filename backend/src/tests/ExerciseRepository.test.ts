import { DataSource } from 'typeorm';
import { Exercise } from '../entities/Exercise';
import { ExerciseRepository } from '../repositories/ExerciseRepository';

describe('ExerciseRepository', () => {
  let dataSource: DataSource;
  let exerciseRepository: ExerciseRepository;

  beforeAll(async () => {
    // Create in-memory database for testing
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Exercise],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
    exerciseRepository = new ExerciseRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await dataSource.getRepository(Exercise).clear();
  });

  describe('create', () => {
    it('should create a new exercise', async () => {
      const exerciseData = {
        name: 'Test Exercise',
        pointsPerRep: 2,
        description: 'Test description',
        category: 'Test Category',
      };

      const exercise = await exerciseRepository.create(exerciseData);

      expect(exercise).toBeDefined();
      expect(exercise.id).toBeDefined();
      expect(exercise.name).toBe(exerciseData.name);
      expect(exercise.pointsPerRep).toBe(exerciseData.pointsPerRep);
      expect(exercise.description).toBe(exerciseData.description);
      expect(exercise.category).toBe(exerciseData.category);
      expect(exercise.isActive).toBe(true);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Create test exercises
      await exerciseRepository.create({
        name: 'Pushup',
        pointsPerRep: 2,
        category: 'Upper Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Squat',
        pointsPerRep: 1,
        category: 'Lower Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Inactive Exercise',
        pointsPerRep: 1,
        isActive: false,
      });
    });

    it('should find all exercises', async () => {
      const exercises = await exerciseRepository.findAll();

      expect(exercises).toHaveLength(3);
    });

    it('should find only active exercises when activeOnly is true', async () => {
      const exercises = await exerciseRepository.findAll({ activeOnly: true });

      expect(exercises).toHaveLength(2);
      expect(exercises.every(ex => ex.isActive)).toBe(true);
    });

    it('should filter by category', async () => {
      const exercises = await exerciseRepository.findAll({ category: 'Upper Body' });

      expect(exercises).toHaveLength(1);
      expect(exercises[0].name).toBe('Pushup');
    });

    it('should respect limit and offset', async () => {
      const exercises = await exerciseRepository.findAll({ limit: 1, offset: 1 });

      expect(exercises).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should find exercise by ID', async () => {
      const created = await exerciseRepository.create({
        name: 'Test Exercise',
        pointsPerRep: 2,
      });

      const found = await exerciseRepository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test Exercise');
    });

    it('should return null for non-existent ID', async () => {
      const found = await exerciseRepository.findById('non-existent-id');

      expect(found).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should find exercise by name', async () => {
      await exerciseRepository.create({
        name: 'Unique Exercise',
        pointsPerRep: 2,
      });

      const found = await exerciseRepository.findByName('Unique Exercise');

      expect(found).toBeDefined();
      expect(found?.name).toBe('Unique Exercise');
    });

    it('should return null for non-existent name', async () => {
      const found = await exerciseRepository.findByName('Non-existent Exercise');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update exercise', async () => {
      const exercise = await exerciseRepository.create({
        name: 'Original Name',
        pointsPerRep: 1,
      });

      const updated = await exerciseRepository.update(exercise.id, {
        name: 'Updated Name',
        pointsPerRep: 3,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.pointsPerRep).toBe(3);
    });

    it('should return null for non-existent exercise', async () => {
      const updated = await exerciseRepository.update('non-existent-id', {
        name: 'Updated Name',
      });

      expect(updated).toBeNull();
    });
  });

  describe('softDelete', () => {
    it('should soft delete exercise', async () => {
      const exercise = await exerciseRepository.create({
        name: 'To Be Deleted',
        pointsPerRep: 1,
      });

      const deleted = await exerciseRepository.softDelete(exercise.id);

      expect(deleted).toBe(true);

      const found = await exerciseRepository.findById(exercise.id);
      expect(found?.isActive).toBe(false);
    });
  });

  describe('count', () => {
    beforeEach(async () => {
      await exerciseRepository.create({
        name: 'Active Exercise 1',
        pointsPerRep: 1,
        category: 'Upper Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Active Exercise 2',
        pointsPerRep: 1,
        category: 'Lower Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Inactive Exercise',
        pointsPerRep: 1,
        isActive: false,
      });
    });

    it('should count all exercises', async () => {
      const count = await exerciseRepository.count();

      expect(count).toBe(3);
    });

    it('should count only active exercises', async () => {
      const count = await exerciseRepository.count({ activeOnly: true });

      expect(count).toBe(2);
    });

    it('should count exercises by category', async () => {
      const count = await exerciseRepository.count({ category: 'Upper Body' });

      expect(count).toBe(1);
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      await exerciseRepository.create({
        name: 'Exercise 1',
        pointsPerRep: 1,
        category: 'Upper Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Exercise 2',
        pointsPerRep: 1,
        category: 'Lower Body',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Exercise 3',
        pointsPerRep: 1,
        category: 'Core',
        isActive: true,
      });
      await exerciseRepository.create({
        name: 'Inactive Exercise',
        pointsPerRep: 1,
        category: 'Inactive Category',
        isActive: false,
      });
    });

    it('should return unique categories for active exercises', async () => {
      const categories = await exerciseRepository.getCategories();

      expect(categories).toHaveLength(3);
      expect(categories).toContain('Upper Body');
      expect(categories).toContain('Lower Body');
      expect(categories).toContain('Core');
      expect(categories).not.toContain('Inactive Category');
    });
  });
});