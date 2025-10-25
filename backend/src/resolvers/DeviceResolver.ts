import { Query, Mutation, Arg, Resolver, ID, InputType, Field, ObjectType } from 'type-graphql';
import { Device } from '../entities/Device';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { AppDataSource } from '../config/database';
import { IsUUID, IsString, IsBoolean, MaxLength } from 'class-validator';

@InputType()
class RegisterDeviceInput {
  @Field(() => ID)
  @IsUUID()
  userId!: string;

  @Field()
  @IsString()
  @MaxLength(255)
  deviceId!: string;

  @Field()
  @IsString()
  @MaxLength(255)
  deviceName!: string;

  @Field()
  @IsString()
  @MaxLength(50)
  deviceType!: string;

  @Field()
  @IsString()
  @MaxLength(50)
  osVersion!: string;

  @Field()
  @IsString()
  @MaxLength(100)
  model!: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(50)
  appVersion?: string;

  @Field()
  @IsBoolean()
  isTablet!: boolean;
}

@ObjectType()
class DeviceResponse {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => Device, { nullable: true })
  device?: Device;
}

@ObjectType()
class DevicesResponse {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [Device])
  devices!: Device[];

  @Field()
  total!: number;
}

@Resolver()
export class DeviceResolver {
  private deviceRepository: DeviceRepository;

  constructor() {
    this.deviceRepository = new DeviceRepository(AppDataSource);
  }

  /**
   * Register or update a device
   */
  @Mutation(() => DeviceResponse)
  async registerDevice(@Arg('input') input: RegisterDeviceInput): Promise<DeviceResponse> {
    try {
      const device = await this.deviceRepository.registerDevice(input);

      return {
        success: true,
        message: 'Device registered successfully',
        device,
      };
    } catch (error) {
      console.error('Failed to register device:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to register device',
      };
    }
  }

  /**
   * Get all devices for a user
   */
  @Query(() => DevicesResponse)
  async getUserDevices(@Arg('userId', () => ID) userId: string): Promise<DevicesResponse> {
    try {
      const devices = await this.deviceRepository.findByUserId(userId);

      return {
        success: true,
        devices,
        total: devices.length,
      };
    } catch (error) {
      console.error('Failed to get user devices:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get devices',
        devices: [],
        total: 0,
      };
    }
  }

  /**
   * Update device last active time
   */
  @Mutation(() => DeviceResponse)
  async updateDeviceActivity(
    @Arg('userId', () => ID) userId: string,
    @Arg('deviceId') deviceId: string
  ): Promise<DeviceResponse> {
    try {
      await this.deviceRepository.updateLastActive(userId, deviceId);

      return {
        success: true,
        message: 'Device activity updated',
      };
    } catch (error) {
      console.error('Failed to update device activity:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update activity',
      };
    }
  }

  /**
   * Remove a device
   */
  @Mutation(() => DeviceResponse)
  async removeDevice(
    @Arg('userId', () => ID) userId: string,
    @Arg('deviceId') deviceId: string
  ): Promise<DeviceResponse> {
    try {
      const removed = await this.deviceRepository.removeDevice(userId, deviceId);

      if (!removed) {
        return {
          success: false,
          message: 'Device not found',
        };
      }

      return {
        success: true,
        message: 'Device removed successfully',
      };
    } catch (error) {
      console.error('Failed to remove device:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove device',
      };
    }
  }

  /**
   * Get device count for user
   */
  @Query(() => Number)
  async getDeviceCount(@Arg('userId', () => ID) userId: string): Promise<number> {
    try {
      return await this.deviceRepository.getDeviceCount(userId);
    } catch (error) {
      console.error('Failed to get device count:', error);
      return 0;
    }
  }
}
