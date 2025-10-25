/**
 * Network Monitor Service
 * Monitors network quality and adapts sync behavior
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'unknown' | 'none';

export interface NetworkStatus {
  isConnected: boolean;
  quality: NetworkQuality;
  connectionType: ConnectionType;
  isMetered: boolean;
  canSync: boolean;
  recommendedBatchSize: number;
  recommendedRetryDelay: number;
}

type NetworkChangeListener = (status: NetworkStatus) => void;

/**
 * Network Monitor Service
 * Tracks network quality and provides adaptive sync recommendations
 */
export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private currentStatus: NetworkStatus = {
    isConnected: false,
    quality: 'offline',
    connectionType: 'none',
    isMetered: false,
    canSync: false,
    recommendedBatchSize: 10,
    recommendedRetryDelay: 5000,
  };
  private listeners: NetworkChangeListener[] = [];

  private constructor() {
    this.initialize();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * Initialize network monitoring
   */
  private initialize(): void {
    NetInfo.addEventListener(state => {
      this.handleNetworkChange(state);
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      this.handleNetworkChange(state);
    });
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange(state: NetInfoState): void {
    const previousStatus = { ...this.currentStatus };
    this.currentStatus = this.analyzeNetworkState(state);

    // Log significant changes
    if (previousStatus.isConnected !== this.currentStatus.isConnected) {
      console.log(`📡 Network: ${this.currentStatus.isConnected ? 'ONLINE' : 'OFFLINE'}`);
    }

    if (previousStatus.quality !== this.currentStatus.quality) {
      console.log(`📊 Network quality: ${this.currentStatus.quality.toUpperCase()}`);
    }

    if (previousStatus.connectionType !== this.currentStatus.connectionType) {
      console.log(`🌐 Connection type: ${this.currentStatus.connectionType.toUpperCase()}`);
    }

    // Notify listeners
    this.notifyListeners(this.currentStatus);
  }

  /**
   * Analyze network state and determine quality
   */
  private analyzeNetworkState(state: NetInfoState): NetworkStatus {
    const isConnected = state.isConnected ?? false;

    if (!isConnected) {
      return {
        isConnected: false,
        quality: 'offline',
        connectionType: 'none',
        isMetered: false,
        canSync: false,
        recommendedBatchSize: 0,
        recommendedRetryDelay: 30000, // Wait 30s before retry when offline
      };
    }

    // Determine connection type
    const connectionType = this.getConnectionType(state);
    const isMetered = state.details?.isConnectionExpensive ?? false;

    // Determine quality based on connection type and details
    const quality = this.determineQuality(state, connectionType);

    // Get adaptive sync settings based on quality
    const syncSettings = this.getAdaptiveSyncSettings(quality, connectionType, isMetered);

    return {
      isConnected: true,
      quality,
      connectionType,
      isMetered,
      ...syncSettings,
    };
  }

  /**
   * Get connection type from NetInfo state
   */
  private getConnectionType(state: NetInfoState): ConnectionType {
    switch (state.type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      default:
        return 'unknown';
    }
  }

  /**
   * Determine network quality
   */
  private determineQuality(state: NetInfoState, connectionType: ConnectionType): NetworkQuality {
    // WiFi and Ethernet are generally excellent
    if (connectionType === 'wifi' || connectionType === 'ethernet') {
      return 'excellent';
    }

    // For cellular, check generation
    if (state.type === 'cellular' && state.details?.cellularGeneration) {
      const generation = state.details.cellularGeneration;

      if (generation === '5g') {
        return 'excellent';
      } else if (generation === '4g') {
        return 'good';
      } else if (generation === '3g') {
        return 'fair';
      } else {
        return 'poor';
      }
    }

    // Unknown cellular or other connection types
    return 'good';
  }

  /**
   * Get adaptive sync settings based on network quality
   */
  private getAdaptiveSyncSettings(
    quality: NetworkQuality,
    connectionType: ConnectionType,
    isMetered: boolean
  ): {
    canSync: boolean;
    recommendedBatchSize: number;
    recommendedRetryDelay: number;
  } {
    // Don't sync on poor connections or metered connections
    if (quality === 'poor' || (isMetered && connectionType === 'cellular')) {
      return {
        canSync: false,
        recommendedBatchSize: 1,
        recommendedRetryDelay: 60000, // Wait 1 minute
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          canSync: true,
          recommendedBatchSize: 20, // Sync more items at once
          recommendedRetryDelay: 2000, // Retry quickly
        };

      case 'good':
        return {
          canSync: true,
          recommendedBatchSize: 10, // Standard batch size
          recommendedRetryDelay: 5000, // Standard retry delay
        };

      case 'fair':
        return {
          canSync: true,
          recommendedBatchSize: 5, // Smaller batches
          recommendedRetryDelay: 10000, // Wait longer between retries
        };

      default:
        return {
          canSync: false,
          recommendedBatchSize: 1,
          recommendedRetryDelay: 30000,
        };
    }
  }

  /**
   * Add network change listener
   */
  addEventListener(listener: NetworkChangeListener): () => void {
    this.listeners.push(listener);

    // Immediately call with current status
    listener(this.currentStatus);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of network change
   */
  private notifyListeners(status: NetworkStatus): void {
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if sync is recommended
   */
  canSync(): boolean {
    return this.currentStatus.canSync;
  }

  /**
   * Get recommended batch size for current network
   */
  getRecommendedBatchSize(): number {
    return this.currentStatus.recommendedBatchSize;
  }

  /**
   * Get recommended retry delay for current network
   */
  getRecommendedRetryDelay(): number {
    return this.currentStatus.recommendedRetryDelay;
  }

  /**
   * Check if on WiFi
   */
  isOnWiFi(): boolean {
    return this.currentStatus.connectionType === 'wifi';
  }

  /**
   * Check if on cellular
   */
  isOnCellular(): boolean {
    return this.currentStatus.connectionType === 'cellular';
  }

  /**
   * Check if connection is metered
   */
  isMetered(): boolean {
    return this.currentStatus.isMetered;
  }

  /**
   * Get network quality description
   */
  getQualityDescription(): string {
    switch (this.currentStatus.quality) {
      case 'excellent':
        return 'Excellent connection - Full sync enabled';
      case 'good':
        return 'Good connection - Normal sync';
      case 'fair':
        return 'Fair connection - Reduced sync speed';
      case 'poor':
        return 'Poor connection - Sync paused';
      case 'offline':
        return 'No connection - Sync disabled';
    }
  }
}

// Export singleton instance
export const networkMonitor = NetworkMonitor.getInstance();
