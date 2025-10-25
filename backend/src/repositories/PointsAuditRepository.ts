import { DataSource, Repository } from 'typeorm';
import { PointsAuditLog } from '../entities/PointsAuditLog';

export class PointsAuditRepository {
  private repository: Repository<PointsAuditLog>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(PointsAuditLog);
  }

  /**
   * Log a points change
   */
  async logPointsChange(data: {
    userId: string;
    sessionId?: string;
    action: string;
    pointsChange: number;
    pointsBefore: number;
    pointsAfter: number;
    reason?: string;
    metadata?: any;
  }): Promise<PointsAuditLog> {
    const log = this.repository.create(data);
    return await this.repository.save(log);
  }

  /**
   * Get audit logs for a user
   */
  async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<PointsAuditLog[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get audit logs for a session
   */
  async findBySessionId(sessionId: string): Promise<PointsAuditLog[]> {
    return await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Get total points gained by user in a time period
   */
  async getTotalPointsGained(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.points_change)', 'total')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.points_change > 0')
      .andWhere('log.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Get points breakdown by action type
   */
  async getPointsBreakdownByAction(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ action: string; total: number }[]> {
    return await this.repository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('SUM(log.points_change)', 'total')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('log.action')
      .orderBy('total', 'DESC')
      .getRawMany();
  }

  /**
   * Detect suspicious point activity
   */
  async detectSuspiciousActivity(userId: string): Promise<{
    isSuspicious: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Check for rapid point gains (more than 10000 points in an hour)
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentPoints = await this.repository
      .createQueryBuilder('log')
      .select('SUM(log.points_change)', 'total')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.created_at >= :oneHourAgo', { oneHourAgo })
      .andWhere('log.points_change > 0')
      .getRawOne();

    const rapidPoints = parseInt(recentPoints?.total || '0', 10);
    if (rapidPoints > 10000) {
      reasons.push(`Rapid point gain: ${rapidPoints} points in 1 hour`);
    }

    // Check for abnormally high points per workout
    const suspiciousLogs = await this.repository
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.points_change > 5000') // More than 5000 points in single action
      .andWhere('log.action = :action', { action: 'workout_completed' })
      .getCount();

    if (suspiciousLogs > 0) {
      reasons.push(`${suspiciousLogs} workouts with abnormally high points (>5000)`);
    }

    return {
      isSuspicious: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Clean up old audit logs (optional, for data retention)
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected ?? 0;
  }
}
