/**
 * Device Identification and Registration Service
 * Manages unique device IDs and metadata for multi-device sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@FitProof:deviceId';
const DEVICE_INFO_KEY = '@FitProof:deviceInfo';

export interface DeviceMetadata {
  deviceId: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'unknown';
  osVersion: string;
  appVersion: string;
  model: string;
  manufacturer: string;
  isTablet: boolean;
  lastActiveAt: Date;
  registeredAt: Date;
}

export interface RegisteredDevice {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  osVersion: string;
  model: string;
  lastActiveAt: Date;
  registeredAt: Date;
  isCurrentDevice: boolean;
}

/**
 * Device Service
 * Handles device identification and registration
 */
export class DeviceService {
  private static instance: DeviceService;
  private deviceId: string | null = null;
  private deviceMetadata: DeviceMetadata | null = null;

  private constructor() {}

  static getInstance(): DeviceService {
    if (!DeviceService.instance) {
      DeviceService.instance = new DeviceService();
    }
    return DeviceService.instance;
  }

  /**
   * Initialize device service
   * Gets or creates device ID and collects device metadata
   */
  async initialize(): Promise<DeviceMetadata> {
    // Get or create device ID
    this.deviceId = await this.getOrCreateDeviceId();

    // Collect device metadata
    this.deviceMetadata = await this.collectDeviceMetadata();

    // Save device info
    await this.saveDeviceInfo(this.deviceMetadata);

    console.log('📱 Device initialized:', {
      id: this.deviceId,
      name: this.deviceMetadata.deviceName,
      type: this.deviceMetadata.deviceType,
    });

    return this.deviceMetadata;
  }

  /**
   * Get or create a persistent device ID
   */
  private async getOrCreateDeviceId(): Promise<string> {
    try {
      // Try to get existing device ID
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);

      if (deviceId) {
        console.log('📱 Found existing device ID');
        return deviceId;
      }

      // Create new device ID using unique device identifier
      const uniqueId = await DeviceInfo.getUniqueId();
      deviceId = `device_${uniqueId}_${Date.now()}`;

      // Save device ID
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('📱 Created new device ID');

      return deviceId;
    } catch (error) {
      console.error('Failed to get/create device ID:', error);
      // Fallback to timestamp-based ID
      const fallbackId = `device_fallback_${Date.now()}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, fallbackId);
      return fallbackId;
    }
  }

  /**
   * Collect device metadata
   */
  private async collectDeviceMetadata(): Promise<DeviceMetadata> {
    try {
      const [
        deviceName,
        systemVersion,
        appVersion,
        model,
        manufacturer,
        isTablet,
      ] = await Promise.all([
        DeviceInfo.getDeviceName(),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getVersion(),
        DeviceInfo.getModel(),
        DeviceInfo.getManufacturer(),
        DeviceInfo.isTablet(),
      ]);

      const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown';

      return {
        deviceId: this.deviceId!,
        deviceName,
        deviceType,
        osVersion: systemVersion,
        appVersion,
        model,
        manufacturer,
        isTablet,
        lastActiveAt: new Date(),
        registeredAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to collect device metadata:', error);

      // Fallback metadata
      return {
        deviceId: this.deviceId!,
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
        deviceType: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
        osVersion: 'unknown',
        appVersion: '1.0.0',
        model: 'unknown',
        manufacturer: 'unknown',
        isTablet: false,
        lastActiveAt: new Date(),
        registeredAt: new Date(),
      };
    }
  }

  /**
   * Save device info to local storage
   */
  private async saveDeviceInfo(metadata: DeviceMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to save device info:', error);
    }
  }

  /**
   * Load device info from local storage
   */
  private async loadDeviceInfo(): Promise<DeviceMetadata | null> {
    try {
      const data = await AsyncStorage.getItem(DEVICE_INFO_KEY);
      if (data) {
        const metadata = JSON.parse(data);
        // Convert date strings back to Date objects
        metadata.lastActiveAt = new Date(metadata.lastActiveAt);
        metadata.registeredAt = new Date(metadata.registeredAt);
        return metadata;
      }
      return null;
    } catch (error) {
      console.error('Failed to load device info:', error);
      return null;
    }
  }

  /**
   * Get current device ID
   */
  getDeviceId(): string {
    if (!this.deviceId) {
      throw new Error('Device service not initialized. Call initialize() first.');
    }
    return this.deviceId;
  }

  /**
   * Get device metadata
   */
  async getDeviceMetadata(): Promise<DeviceMetadata> {
    if (!this.deviceMetadata) {
      // Try to load from storage
      this.deviceMetadata = await this.loadDeviceInfo();

      if (!this.deviceMetadata) {
        // Initialize if not found
        return await this.initialize();
      }
    }

    // Update last active time
    this.deviceMetadata.lastActiveAt = new Date();
    await this.saveDeviceInfo(this.deviceMetadata);

    return this.deviceMetadata;
  }

  /**
   * Get device name for display
   */
  async getDeviceName(): Promise<string> {
    const metadata = await this.getDeviceMetadata();
    return metadata.deviceName;
  }

  /**
   * Get formatted device description
   */
  async getDeviceDescription(): Promise<string> {
    const metadata = await this.getDeviceMetadata();
    return `${metadata.deviceName} (${metadata.model}) - ${metadata.deviceType.toUpperCase()} ${metadata.osVersion}`;
  }

  /**
   * Check if this is the current device
   */
  isCurrentDevice(deviceId: string): boolean {
    return deviceId === this.deviceId;
  }

  /**
   * Reset device ID (for testing or troubleshooting)
   */
  async resetDeviceId(): Promise<void> {
    console.warn('🔄 Resetting device ID...');
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    await AsyncStorage.removeItem(DEVICE_INFO_KEY);
    this.deviceId = null;
    this.deviceMetadata = null;
    await this.initialize();
    console.log('✅ Device ID reset complete');
  }

  /**
   * Get device info summary for logging
   */
  async getDeviceSummary(): Promise<{
    id: string;
    name: string;
    type: string;
    model: string;
  }> {
    const metadata = await this.getDeviceMetadata();
    return {
      id: metadata.deviceId,
      name: metadata.deviceName,
      type: metadata.deviceType,
      model: metadata.model,
    };
  }
}

// Export singleton instance
export const deviceService = DeviceService.getInstance();
