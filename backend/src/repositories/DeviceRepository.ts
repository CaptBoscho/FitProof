import { DataSource, Repository } from 'typeorm';
import { Device } from '../entities/Device';

export class DeviceRepository {
  private repository: Repository<Device>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(Device);
  }

  /**
   * Register or update a device
   */
  async registerDevice(data: {
    userId: string;
    deviceId: string;
    deviceName: string;
    deviceType: string;
    osVersion: string;
    model: string;
    manufacturer?: string;
    appVersion?: string;
    isTablet: boolean;
  }): Promise<Device> {
    // Check if device already exists
    const existing = await this.repository.findOne({
      where: {
        userId: data.userId,
        deviceId: data.deviceId,
      },
    });

    if (existing) {
      // Update existing device
      existing.deviceName = data.deviceName;
      existing.deviceType = data.deviceType;
      existing.osVersion = data.osVersion;
      existing.model = data.model;
      existing.manufacturer = data.manufacturer;
      existing.appVersion = data.appVersion;
      existing.isTablet = data.isTablet;
      existing.lastActiveAt = new Date();

      return await this.repository.save(existing);
    }

    // Create new device
    const device = this.repository.create({
      ...data,
      lastActiveAt: new Date(),
    });

    return await this.repository.save(device);
  }

  /**
   * Update device last active time
   */
  async updateLastActive(userId: string, deviceId: string): Promise<void> {
    await this.repository.update(
      { userId, deviceId },
      { lastActiveAt: new Date() }
    );
  }

  /**
   * Get all devices for a user
   */
  async findByUserId(userId: string): Promise<Device[]> {
    return await this.repository.find({
      where: { userId },
      order: { lastActiveAt: 'DESC' },
    });
  }

  /**
   * Get a specific device
   */
  async findByDeviceId(userId: string, deviceId: string): Promise<Device | null> {
    return await this.repository.findOne({
      where: { userId, deviceId },
    });
  }

  /**
   * Remove a device
   */
  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    const result = await this.repository.delete({ userId, deviceId });
    return (result.affected ?? 0) > 0;
  }

  /**
   * Get device count for user
   */
  async getDeviceCount(userId: string): Promise<number> {
    return await this.repository.count({ where: { userId } });
  }

  /**
   * Clean up inactive devices (not active for 90+ days)
   */
  async cleanupInactiveDevices(days: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.repository
      .createQueryBuilder()
      .delete()
      .where('last_active_at < :cutoffDate', { cutoffDate })
      .execute();

    return result.affected ?? 0;
  }
}
