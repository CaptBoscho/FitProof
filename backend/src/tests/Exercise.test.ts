import { DataSource } from 'typeorm';
import { Exercise } from '../entities/Exercise';

describe('Exercise Entity', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Exercise],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.getRepository(Exercise).clear();
  });

  describe('Exercise creation', () => {
    it('should create exercise with required fields', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exercise = repository.create({
        name: 'Test Exercise',
        pointsPerRep: 2,
      });

      const saved = await repository.save(exercise);

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Test Exercise');
      expect(saved.pointsPerRep).toBe(2);
      expect(saved.isActive).toBe(true); // Default value
      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it('should create exercise with all fields', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exerciseData = {
        name: 'Complete Exercise',
        pointsPerRep: 3,
        description: 'A complete exercise description',
        validationRules: ['proper_form', 'full_range'],
        category: 'Upper Body',
        iconColor: '#FF6B6B',
        instructionText: 'Detailed instructions',
        isActive: false,
      };

      const exercise = repository.create(exerciseData);
      const saved = await repository.save(exercise);

      expect(saved.name).toBe(exerciseData.name);
      expect(saved.pointsPerRep).toBe(exerciseData.pointsPerRep);
      expect(saved.description).toBe(exerciseData.description);
      expect(saved.validationRules).toEqual(exerciseData.validationRules);
      expect(saved.category).toBe(exerciseData.category);
      expect(saved.iconColor).toBe(exerciseData.iconColor);
      expect(saved.instructionText).toBe(exerciseData.instructionText);
      expect(saved.isActive).toBe(exerciseData.isActive);
    });

    it('should enforce unique constraint on name', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exercise1 = repository.create({
        name: 'Unique Exercise',
        pointsPerRep: 1,
      });
      await repository.save(exercise1);

      const exercise2 = repository.create({
        name: 'Unique Exercise',
        pointsPerRep: 2,
      });

      await expect(repository.save(exercise2)).rejects.toThrow();
    });

    it('should handle validation rules as array', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exercise = repository.create({
        name: 'Exercise with Rules',
        pointsPerRep: 2,
        validationRules: ['rule1', 'rule2', 'rule3'],
      });

      const saved = await repository.save(exercise);

      expect(saved.validationRules).toEqual(['rule1', 'rule2', 'rule3']);
    });

    it('should auto-generate timestamps', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exercise = repository.create({
        name: 'Timestamp Test',
        pointsPerRep: 1,
      });

      const saved = await repository.save(exercise);

      expect(saved.createdAt).toBeInstanceOf(Date);
      expect(saved.updatedAt).toBeInstanceOf(Date);

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update the exercise
      saved.description = 'Updated description';
      const updated = await repository.save(saved);

      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(saved.createdAt.getTime());
    });
  });

  describe('Exercise queries', () => {
    beforeEach(async () => {
      const repository = dataSource.getRepository(Exercise);

      // Create test data
      await repository.save([
        {
          name: 'Pushup',
          pointsPerRep: 2,
          category: 'Upper Body',
          isActive: true,
        },
        {
          name: 'Squat',
          pointsPerRep: 1,
          category: 'Lower Body',
          isActive: true,
        },
        {
          name: 'Inactive Exercise',
          pointsPerRep: 1,
          isActive: false,
        },
      ]);
    });

    it('should find exercises by category', async () => {
      const repository = dataSource.getRepository(Exercise);

      const upperBodyExercises = await repository.find({
        where: { category: 'Upper Body' }
      });

      expect(upperBodyExercises).toHaveLength(1);
      expect(upperBodyExercises[0].name).toBe('Pushup');
    });

    it('should find active exercises', async () => {
      const repository = dataSource.getRepository(Exercise);

      const activeExercises = await repository.find({
        where: { isActive: true }
      });

      expect(activeExercises).toHaveLength(2);
      expect(activeExercises.every(ex => ex.isActive)).toBe(true);
    });

    it('should find exercise by name', async () => {
      const repository = dataSource.getRepository(Exercise);

      const exercise = await repository.findOne({
        where: { name: 'Pushup' }
      });

      expect(exercise).toBeDefined();
      expect(exercise?.name).toBe('Pushup');
    });
  });
});