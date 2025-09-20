import { Repository, DataSource } from 'typeorm';
import { Exercise } from '../entities/Exercise';

export class ExerciseRepository {
  private repository: Repository<Exercise>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Exercise);
  }

  // Create a new exercise
  async create(exerciseData: Partial<Exercise>): Promise<Exercise> {
    const exercise = this.repository.create(exerciseData);
    return await this.repository.save(exercise);
  }

  // Find all exercises
  async findAll(options?: {
    activeOnly?: boolean;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Exercise[]> {
    const queryBuilder = this.repository.createQueryBuilder('exercise');

    if (options?.activeOnly) {
      queryBuilder.where('exercise.isActive = :isActive', { isActive: true });
    }

    if (options?.category) {
      queryBuilder.andWhere('exercise.category = :category', { category: options.category });
    }

    if (options?.limit) {
      queryBuilder.limit(options.limit);
    }

    if (options?.offset) {
      queryBuilder.offset(options.offset);
    }

    queryBuilder.orderBy('exercise.name', 'ASC');

    return await queryBuilder.getMany();
  }

  // Find exercise by ID
  async findById(id: string): Promise<Exercise | null> {
    return await this.repository.findOne({ where: { id } });
  }

  // Find exercise by name
  async findByName(name: string): Promise<Exercise | null> {
    return await this.repository.findOne({ where: { name } });
  }

  // Update exercise
  async update(id: string, updateData: Partial<Exercise>): Promise<Exercise | null> {
    await this.repository.update(id, updateData);
    return await this.findById(id);
  }

  // Delete exercise (soft delete by setting isActive to false)
  async softDelete(id: string): Promise<boolean> {
    const result = await this.repository.update(id, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  // Hard delete exercise
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // Count exercises
  async count(options?: { activeOnly?: boolean; category?: string }): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('exercise');

    if (options?.activeOnly) {
      queryBuilder.where('exercise.isActive = :isActive', { isActive: true });
    }

    if (options?.category) {
      queryBuilder.andWhere('exercise.category = :category', { category: options.category });
    }

    return await queryBuilder.getCount();
  }

  // Find exercises by category
  async findByCategory(category: string, activeOnly: boolean = true): Promise<Exercise[]> {
    const conditions: any = { category };
    if (activeOnly) {
      conditions.isActive = true;
    }

    return await this.repository.find({
      where: conditions,
      order: { name: 'ASC' }
    });
  }

  // Search exercises by name
  async searchByName(searchTerm: string, activeOnly: boolean = true): Promise<Exercise[]> {
    const queryBuilder = this.repository.createQueryBuilder('exercise');

    queryBuilder.where('LOWER(exercise.name) LIKE LOWER(:searchTerm)', {
      searchTerm: `%${searchTerm}%`
    });

    if (activeOnly) {
      queryBuilder.andWhere('exercise.isActive = :isActive', { isActive: true });
    }

    queryBuilder.orderBy('exercise.name', 'ASC');

    return await queryBuilder.getMany();
  }

  // Get unique categories
  async getCategories(): Promise<string[]> {
    const result = await this.repository
      .createQueryBuilder('exercise')
      .select('DISTINCT exercise.category', 'category')
      .where('exercise.category IS NOT NULL')
      .andWhere('exercise.isActive = :isActive', { isActive: true })
      .orderBy('exercise.category', 'ASC')
      .getRawMany();

    return result.map(row => row.category);
  }
}