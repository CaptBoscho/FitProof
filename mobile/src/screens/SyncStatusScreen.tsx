import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { syncService, SyncEvent, SyncProgressData } from '../services/syncService';
import { backgroundSyncService } from '../services/backgroundSync';
import { networkMonitor } from '../services/networkMonitor';
import { SyncQueueManager } from '../services/syncQueue';
import { CONFIG } from '../constants/config';

interface SyncStats {
  isOnline: boolean;
  isSyncing: boolean;
  queueStats: {
    total: number;
    pending: number;
    retrying: number;
    failed: number;
  };
}

interface NetworkInfo {
  quality: string;
  connectionType: string;
  isMetered: boolean;
  canSync: boolean;
  description: string;
}

interface BackgroundSyncInfo {
  status: string;
  lastRunAt?: Date;
  successCount: number;
  failureCount: number;
  isEnabled: boolean;
}

export const SyncStatusScreen: React.FC = () => {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    isOnline: false,
    isSyncing: false,
    queueStats: { total: 0, pending: 0, retrying: 0, failed: 0 },
  });
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'unknown',
    connectionType: 'unknown',
    isMetered: false,
    canSync: false,
    description: 'Checking network...',
  });
  const [backgroundInfo, setBackgroundInfo] = useState<BackgroundSyncInfo>({
    status: 'unknown',
    successCount: 0,
    failureCount: 0,
    isEnabled: false,
  });
  const [currentProgress, setCurrentProgress] = useState<SyncProgressData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    loadData();

    // Subscribe to sync events
    const unsubscribe = syncService.addEventListener((event: SyncEvent) => {
      handleSyncEvent(event);
    });

    // Subscribe to network changes
    const unsubscribeNetwork = networkMonitor.addEventListener((status) => {
      setNetworkInfo({
        quality: status.quality,
        connectionType: status.connectionType,
        isMetered: status.isMetered,
        canSync: status.canSync,
        description: networkMonitor.getQualityDescription(),
      });
    });

    // Refresh data every 5 seconds
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      unsubscribe();
      unsubscribeNetwork();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const stats = await syncService.getSyncStatus();
      setSyncStats(stats);

      const bgStats = backgroundSyncService.getStats();
      setBackgroundInfo(bgStats);

      const networkStatus = networkMonitor.getStatus();
      setNetworkInfo({
        quality: networkStatus.quality,
        connectionType: networkStatus.connectionType,
        isMetered: networkStatus.isMetered,
        canSync: networkStatus.canSync,
        description: networkMonitor.getQualityDescription(),
      });
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSyncEvent = (event: SyncEvent): void => {
    switch (event.type) {
      case 'sync_progress':
        setCurrentProgress(event.data as SyncProgressData);
        break;

      case 'sync_completed':
        setCurrentProgress(null);
        setLastSyncTime(new Date());
        loadData();
        break;

      case 'sync_failed':
        setCurrentProgress(null);
        loadData();
        break;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualSync = async () => {
    if (!networkInfo.canSync) {
      Alert.alert(
        'Cannot Sync',
        'Network quality is too poor for syncing. Please connect to a better network.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (syncStats.isSyncing) {
      Alert.alert(
        'Sync in Progress',
        'A sync operation is already running. Please wait for it to complete.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await syncService.sync();
    } catch (error) {
      Alert.alert(
        'Sync Failed',
        error instanceof Error ? error.message : 'Unknown error',
        [{ text: 'OK' }]
      );
    }
  };

  const handleRetryFailed = async () => {
    if (syncStats.queueStats.failed === 0) {
      Alert.alert(
        'No Failed Items',
        'There are no failed items to retry.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Retry Failed Items',
      `Do you want to retry syncing ${syncStats.queueStats.failed} failed item${syncStats.queueStats.failed !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry',
          onPress: async () => {
            try {
              await syncService.retryFailed();
            } catch (error) {
              Alert.alert('Error', 'Failed to retry items');
            }
          },
        },
      ]
    );
  };

  const handleClearFailed = async () => {
    if (syncStats.queueStats.failed === 0) {
      Alert.alert(
        'No Failed Items',
        'There are no failed items to clear.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Clear Failed Items',
      `Are you sure you want to permanently delete ${syncStats.queueStats.failed} failed item${syncStats.queueStats.failed !== 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await syncService.clearFailed();
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear items');
            }
          },
        },
      ]
    );
  };

  const handleToggleBackgroundSync = async () => {
    try {
      if (backgroundInfo.isEnabled) {
        await backgroundSyncService.stop();
        Alert.alert('Background Sync Disabled', 'Background sync has been stopped.');
      } else {
        await backgroundSyncService.start();
        Alert.alert('Background Sync Enabled', 'Background sync has been started.');
      }
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle background sync');
    }
  };

  const getNetworkQualityColor = (): string => {
    switch (networkInfo.quality) {
      case 'excellent':
        return CONFIG.COLORS.SUCCESS;
      case 'good':
        return CONFIG.COLORS.PRIMARY;
      case 'fair':
        return '#FFA500'; // Orange
      case 'poor':
        return CONFIG.COLORS.ERROR;
      case 'offline':
        return CONFIG.COLORS.TEXT_SECONDARY;
      default:
        return CONFIG.COLORS.TEXT_SECONDARY;
    }
  };

  const formatTimestamp = (date: Date | null | undefined): string => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sync Status</Text>
          <Text style={styles.subtitle}>
            Last synced: {formatTimestamp(lastSyncTime)}
          </Text>
        </View>

        {/* Current Progress */}
        {syncStats.isSyncing && currentProgress && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Syncing Now</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(currentProgress.current / currentProgress.total) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {currentProgress.current} / {currentProgress.total}
              </Text>
            </View>
            {currentProgress.currentItem && (
              <Text style={styles.currentItemText}>
                Syncing {currentProgress.currentItem.type === 'workout_session' ? 'session' : 'ML data'}...
              </Text>
            )}
            {currentProgress.estimatedTimeRemaining && currentProgress.estimatedTimeRemaining > 1000 && (
              <Text style={styles.etaText}>
                {Math.ceil(currentProgress.estimatedTimeRemaining / 1000)}s remaining
              </Text>
            )}
          </View>
        )}

        {/* Network Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <View style={styles.statusValue}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getNetworkQualityColor() },
                ]}
              />
              <Text style={styles.statusText}>
                {networkInfo.connectionType.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Quality:</Text>
            <Text style={[styles.statusText, { color: getNetworkQualityColor() }]}>
              {networkInfo.quality.toUpperCase()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Can Sync:</Text>
            <Text style={[styles.statusText, { color: networkInfo.canSync ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.ERROR }]}>
              {networkInfo.canSync ? 'YES' : 'NO'}
            </Text>
          </View>
          {networkInfo.isMetered && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Metered connection - Sync may be paused to save data
              </Text>
            </View>
          )}
          <Text style={styles.descriptionText}>{networkInfo.description}</Text>
        </View>

        {/* Sync Queue Statistics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync Queue</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{syncStats.queueStats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: CONFIG.COLORS.PRIMARY }]}>
                {syncStats.queueStats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#FFA500' }]}>
                {syncStats.queueStats.retrying}
              </Text>
              <Text style={styles.statLabel}>Retrying</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: CONFIG.COLORS.ERROR }]}>
                {syncStats.queueStats.failed}
              </Text>
              <Text style={styles.statLabel}>Failed</Text>
            </View>
          </View>
        </View>

        {/* Background Sync */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Background Sync</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={styles.statusText}>
              {backgroundInfo.status.toUpperCase()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Enabled:</Text>
            <Text style={[styles.statusText, { color: backgroundInfo.isEnabled ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.TEXT_SECONDARY }]}>
              {backgroundInfo.isEnabled ? 'YES' : 'NO'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Run:</Text>
            <Text style={styles.statusText}>
              {formatTimestamp(backgroundInfo.lastRunAt)}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Success:</Text>
            <Text style={[styles.statusText, { color: CONFIG.COLORS.SUCCESS }]}>
              {backgroundInfo.successCount}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Failed:</Text>
            <Text style={[styles.statusText, { color: CONFIG.COLORS.ERROR }]}>
              {backgroundInfo.failureCount}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleToggleBackgroundSync}
          >
            <Text style={styles.buttonSecondaryText}>
              {backgroundInfo.isEnabled ? 'Disable' : 'Enable'} Background Sync
            </Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonPrimary,
              (syncStats.isSyncing || !networkInfo.canSync) && styles.buttonDisabled,
            ]}
            onPress={handleManualSync}
            disabled={syncStats.isSyncing || !networkInfo.canSync}
          >
            {syncStats.isSyncing ? (
              <ActivityIndicator color={CONFIG.COLORS.WHITE} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Sync Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonSecondary,
              syncStats.queueStats.failed === 0 && styles.buttonDisabled,
            ]}
            onPress={handleRetryFailed}
            disabled={syncStats.queueStats.failed === 0}
          >
            <Text style={styles.buttonSecondaryText}>
              Retry Failed ({syncStats.queueStats.failed})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonDanger,
              syncStats.queueStats.failed === 0 && styles.buttonDisabled,
            ]}
            onPress={handleClearFailed}
            disabled={syncStats.queueStats.failed === 0}
          >
            <Text style={styles.buttonDangerText}>
              Clear Failed Items
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: CONFIG.COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  card: {
    backgroundColor: CONFIG.COLORS.WHITE,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: CONFIG.COLORS.PRIMARY,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  currentItemText: {
    fontSize: 13,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 4,
  },
  etaText: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  descriptionText: {
    fontSize: 13,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: 8,
    fontStyle: 'italic',
  },
  warningBox: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    padding: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: CONFIG.COLORS.BACKGROUND,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonPrimary: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
  },
  buttonPrimaryText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CONFIG.COLORS.PRIMARY,
  },
  buttonSecondaryText: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: CONFIG.COLORS.ERROR,
  },
  buttonDangerText: {
    color: CONFIG.COLORS.ERROR,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
