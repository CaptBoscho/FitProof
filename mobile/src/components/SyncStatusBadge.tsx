import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { syncService, SyncEvent } from '../services/syncService';
import { networkMonitor } from '../services/networkMonitor';
import { CONFIG } from '../constants/config';

interface SyncStatusBadgeProps {
  variant?: 'compact' | 'full';
  showWhenSynced?: boolean;
  onPress?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  variant = 'compact',
  showWhenSynced = false,
  onPress,
}) => {
  const navigation = useNavigation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();

    const unsubscribe = syncService.addEventListener((event: SyncEvent) => {
      handleSyncEvent(event);
    });

    const unsubscribeNetwork = networkMonitor.addEventListener((status) => {
      setIsOnline(status.isConnected);
    });

    const interval = setInterval(loadStatus, 10000); // Refresh every 10s

    return () => {
      unsubscribe();
      unsubscribeNetwork();
      clearInterval(interval);
    };
  }, []);

  const loadStatus = async () => {
    try {
      const status = await syncService.getSyncStatus();
      setIsSyncing(status.isSyncing);
      setIsOnline(status.isOnline);
      setQueueCount(status.queueStats.total);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  };

  const handleSyncEvent = (event: SyncEvent): void => {
    switch (event.type) {
      case 'sync_started':
        setIsSyncing(true);
        setSyncError(null);
        break;

      case 'sync_completed':
        setIsSyncing(false);
        setSyncError(null);
        loadStatus();
        break;

      case 'sync_failed':
        setIsSyncing(false);
        setSyncError(event.error || 'Sync failed');
        loadStatus();
        break;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to sync status screen
      navigation.navigate('SyncStatus' as never);
    }
  };

  const getBadgeColor = (): string => {
    if (!isOnline) return CONFIG.COLORS.TEXT_SECONDARY;
    if (syncError) return CONFIG.COLORS.ERROR;
    if (isSyncing) return CONFIG.COLORS.PRIMARY;
    if (queueCount > 0) return '#FFA500'; // Orange
    return CONFIG.COLORS.SUCCESS;
  };

  const getBadgeText = (): string => {
    if (!isOnline) return 'Offline';
    if (syncError) return 'Error';
    if (isSyncing) return 'Syncing...';
    if (queueCount > 0) return `${queueCount} pending`;
    return 'Synced';
  };

  const getIcon = (): string => {
    if (!isOnline) return '📡';
    if (syncError) return '⚠️';
    if (isSyncing) return '🔄';
    if (queueCount > 0) return '⏳';
    return '✅';
  };

  // Don't show if synced and showWhenSynced is false
  if (!showWhenSynced && !isSyncing && !syncError && queueCount === 0 && isOnline) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactBadge, { backgroundColor: getBadgeColor() }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={CONFIG.COLORS.WHITE} />
        ) : (
          <Text style={styles.compactIcon}>{getIcon()}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.fullBadge, { borderColor: getBadgeColor() }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.fullDot, { backgroundColor: getBadgeColor() }]} />
      {isSyncing ? (
        <ActivityIndicator size="small" color={getBadgeColor()} style={styles.fullSpinner} />
      ) : null}
      <Text style={[styles.fullText, { color: getBadgeColor() }]}>
        {getBadgeText()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  compactBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  compactIcon: {
    fontSize: 16,
  },
  fullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: CONFIG.COLORS.WHITE,
  },
  fullDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  fullSpinner: {
    marginRight: 6,
  },
  fullText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
