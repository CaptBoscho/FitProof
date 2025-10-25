import { DataSource, Repository } from 'typeorm';
import { MLTrainingData } from '../entities/MLTrainingData';

export class MLTrainingDataRepository {
  private repository: Repository<MLTrainingData>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(MLTrainingData);
  }

  /**
   * Create a single ML training data record
   */
  async create(data: Partial<MLTrainingData>): Promise<MLTrainingData> {
    const mlData = this.repository.create(data);
    return await this.repository.save(mlData);
  }

  /**
   * Bulk create ML training data records
   */
  async bulkCreate(dataArray: Partial<MLTrainingData>[]): Promise<MLTrainingData[]> {
    const mlDataRecords = this.repository.create(dataArray);
    return await this.repository.save(mlDataRecords);
  }

  /**
   * Find ML data by session ID
   */
  async findBySessionId(sessionId: string): Promise<MLTrainingData[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { frameNumber: 'ASC' }
    });
  }

  /**
   * Find ML data by ID
   */
  async findById(id: string): Promise<MLTrainingData | null> {
    return await this.repository.findOne({
      where: { id }
    });
  }

  /**
   * Delete ML data by session ID
   */
  async deleteBySessionId(sessionId: string): Promise<boolean> {
    const result = await this.repository.delete({ sessionId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Delete single ML data record
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Count ML data frames for a session
   */
  async countBySessionId(sessionId: string): Promise<number> {
    return await this.repository.count({
      where: { sessionId }
    });
  }

  /**
   * Get ML data statistics for a session
   */
  async getSessionStats(sessionId: string): Promise<{
    totalFrames: number;
    validReps: number;
    invalidReps: number;
    phases: { [key: string]: number };
  } | null> {
    const data = await this.findBySessionId(sessionId);

    if (data.length === 0) {
      return null;
    }

    const validReps = data.filter(d => d.isValidRep).length;
    const invalidReps = data.filter(d => !d.isValidRep).length;

    const phases = data.reduce((acc, d) => {
      acc[d.phaseLabel] = (acc[d.phaseLabel] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return {
      totalFrames: data.length,
      validReps,
      invalidReps,
      phases
    };
  }

  /**
   * Check if ML data exists for a session
   */
  async existsBySessionId(sessionId: string): Promise<boolean> {
    const count = await this.countBySessionId(sessionId);
    return count > 0;
  }
}
