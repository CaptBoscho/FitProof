import { Repository, DataSource } from 'typeorm';
import { WorkoutRep, LandmarkFrame, PoseSequenceEntry, CalculatedAngles } from '../entities/WorkoutRep';

export interface CreateWorkoutRepData {
  sessionId: string;
  repNumber: number;
  isValid: boolean;
  confidenceScore?: number;
  validationErrors?: string[];
  landmarkFrames?: LandmarkFrame[];
  poseSequence?: PoseSequenceEntry[];
  calculatedAngles?: CalculatedAngles;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface WorkoutRepFilters {
  sessionId?: string;
  isValid?: boolean;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

export class WorkoutRepRepository {
  private repository: Repository<WorkoutRep>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(WorkoutRep);
  }

  async create(repData: CreateWorkoutRepData): Promise<WorkoutRep> {
    const rep = this.repository.create({
      ...repData,
      validationErrors: repData.validationErrors ? JSON.stringify(repData.validationErrors) : null
    });

    return await this.repository.save(rep);
  }

  async findById(id: string): Promise<WorkoutRep | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['session']
    });
  }

  async findBySessionId(sessionId: string, filters?: WorkoutRepFilters): Promise<WorkoutRep[]> {
    const queryBuilder = this.repository.createQueryBuilder('rep')
      .where('rep.sessionId = :sessionId', { sessionId });

    if (filters?.isValid !== undefined) {
      queryBuilder.andWhere('rep.isValid = :isValid', { isValid: filters.isValid });
    }

    if (filters?.minConfidence !== undefined) {
      queryBuilder.andWhere('rep.confidenceScore >= :minConfidence', { minConfidence: filters.minConfidence });
    }

    queryBuilder.orderBy('rep.repNumber', 'ASC');

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getMany();
  }

  async update(id: string, updateData: Partial<CreateWorkoutRepData>): Promise<WorkoutRep | null> {
    const updateObject: any = { ...updateData };

    if (updateData.validationErrors) {
      updateObject.validationErrors = JSON.stringify(updateData.validationErrors);
    }

    await this.repository.update(id, updateObject);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async getSessionStats(sessionId: string): Promise<{
    totalReps: number;
    validReps: number;
    averageConfidence: number;
    completionRate: number;
    averageDuration: number;
  }> {
    const reps = await this.findBySessionId(sessionId);

    const validReps = reps.filter(rep => rep.isValid);
    const totalConfidence = reps.reduce((sum, rep) => sum + rep.confidenceScore, 0);
    const totalDuration = reps
      .filter(rep => rep.durationMs)
      .reduce((sum, rep) => sum + (rep.durationMs || 0), 0);
    const repsWithDuration = reps.filter(rep => rep.durationMs).length;

    return {
      totalReps: reps.length,
      validReps: validReps.length,
      averageConfidence: reps.length > 0 ? totalConfidence / reps.length : 0,
      completionRate: reps.length > 0 ? (validReps.length / reps.length) * 100 : 0,
      averageDuration: repsWithDuration > 0 ? totalDuration / repsWithDuration : 0
    };
  }

  async addLandmarkFrame(repId: string, frame: LandmarkFrame): Promise<WorkoutRep | null> {
    const rep = await this.findById(repId);
    if (!rep) return null;

    rep.addLandmarkFrame(frame);
    await this.repository.save(rep);
    return rep;
  }

  async addPoseSequenceEntry(repId: string, entry: PoseSequenceEntry): Promise<WorkoutRep | null> {
    const rep = await this.findById(repId);
    if (!rep) return null;

    rep.addPoseSequenceEntry(entry);
    await this.repository.save(rep);
    return rep;
  }

  async setCalculatedAngles(repId: string, angles: CalculatedAngles): Promise<WorkoutRep | null> {
    const rep = await this.findById(repId);
    if (!rep) return null;

    rep.setCalculatedAngles(angles);
    await this.repository.save(rep);
    return rep;
  }

  async validateRep(repId: string, isValid: boolean, confidenceScore: number, validationErrors?: string[]): Promise<WorkoutRep | null> {
    return await this.update(repId, {
      isValid,
      confidenceScore,
      validationErrors,
      completedAt: new Date()
    });
  }

  async getRepsByTimeRange(sessionId: string, startTime: Date, endTime: Date): Promise<WorkoutRep[]> {
    return await this.repository.createQueryBuilder('rep')
      .where('rep.sessionId = :sessionId', { sessionId })
      .andWhere('rep.startedAt BETWEEN :startTime AND :endTime', { startTime, endTime })
      .orderBy('rep.repNumber', 'ASC')
      .getMany();
  }

  async getFormAnalysis(sessionId: string): Promise<{
    commonErrors: { error: string; frequency: number }[];
    averageConfidenceByRep: { repNumber: number; confidence: number }[];
    validationTrend: { repNumber: number; isValid: boolean; confidence: number }[];
  }> {
    const reps = await this.findBySessionId(sessionId);

    // Analyze common validation errors
    const errorMap = new Map<string, number>();
    reps.forEach(rep => {
      const errors = rep.getValidationErrorsArray();
      errors.forEach(error => {
        errorMap.set(error, (errorMap.get(error) || 0) + 1);
      });
    });

    const commonErrors = Array.from(errorMap.entries())
      .map(([error, frequency]) => ({ error, frequency }))
      .sort((a, b) => b.frequency - a.frequency);

    // Calculate average confidence by rep number
    const confidenceByRep = new Map<number, number[]>();
    reps.forEach(rep => {
      if (!confidenceByRep.has(rep.repNumber)) {
        confidenceByRep.set(rep.repNumber, []);
      }
      confidenceByRep.get(rep.repNumber)!.push(rep.confidenceScore);
    });

    const averageConfidenceByRep = Array.from(confidenceByRep.entries())
      .map(([repNumber, confidences]) => ({
        repNumber,
        confidence: confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      }))
      .sort((a, b) => a.repNumber - b.repNumber);

    // Validation trend
    const validationTrend = reps.map(rep => ({
      repNumber: rep.repNumber,
      isValid: rep.isValid,
      confidence: rep.confidenceScore
    })).sort((a, b) => a.repNumber - b.repNumber);

    return {
      commonErrors,
      averageConfidenceByRep,
      validationTrend
    };
  }

  async bulkCreate(repsData: CreateWorkoutRepData[]): Promise<WorkoutRep[]> {
    const reps = repsData.map(repData =>
      this.repository.create({
        ...repData,
        validationErrors: repData.validationErrors ? JSON.stringify(repData.validationErrors) : null
      })
    );

    return await this.repository.save(reps);
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await this.repository.delete({ sessionId });
    return result.affected ?? 0;
  }

  async getLatestRepForSession(sessionId: string): Promise<WorkoutRep | null> {
    return await this.repository.findOne({
      where: { sessionId },
      order: { repNumber: 'DESC' }
    });
  }

  async count(filters?: WorkoutRepFilters): Promise<number> {
    const queryBuilder = this.repository.createQueryBuilder('rep');

    if (filters?.sessionId) {
      queryBuilder.where('rep.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    if (filters?.isValid !== undefined) {
      queryBuilder.andWhere('rep.isValid = :isValid', { isValid: filters.isValid });
    }

    if (filters?.minConfidence !== undefined) {
      queryBuilder.andWhere('rep.confidenceScore >= :minConfidence', { minConfidence: filters.minConfidence });
    }

    return await queryBuilder.getCount();
  }

  async findAll(filters?: WorkoutRepFilters): Promise<WorkoutRep[]> {
    const queryBuilder = this.repository.createQueryBuilder('rep')
      .leftJoinAndSelect('rep.session', 'session');

    if (filters?.sessionId) {
      queryBuilder.where('rep.sessionId = :sessionId', { sessionId: filters.sessionId });
    }

    if (filters?.isValid !== undefined) {
      queryBuilder.andWhere('rep.isValid = :isValid', { isValid: filters.isValid });
    }

    if (filters?.minConfidence !== undefined) {
      queryBuilder.andWhere('rep.confidenceScore >= :minConfidence', { minConfidence: filters.minConfidence });
    }

    queryBuilder.orderBy('rep.repNumber', 'ASC');

    if (filters?.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getMany();
  }
}