import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { syncService, SyncEvent, SyncProgressData } from '../services/syncService';
import { CONFIG } from '../constants/config';

interface SyncStatusIndicatorProps {
  position?: 'top' | 'bottom';
  showWhenIdle?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  position = 'top',
  showWhenIdle = false,
}) => {
  const [syncState, setSyncState] = useState<{
    isSyncing: boolean;
    phase?: 'queueing' | 'processing' | 'completed';
    progress?: SyncProgressData;
    error?: string;
    isOnline: boolean;
  }>({
    isSyncing: false,
    isOnline: true,
  });

  const [slideAnim] = useState(new Animated.Value(position === 'top' ? -100 : 100));

  useEffect(() => {
    // Subscribe to sync events
    const unsubscribe = syncService.addEventListener((event: SyncEvent) => {
      handleSyncEvent(event);
    });

    // Get initial status
    syncService.getSyncStatus().then(status => {
      setSyncState(prev => ({
        ...prev,
        isOnline: status.isOnline,
      }));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Animate in/out based on sync state
    const shouldShow = syncState.isSyncing || syncState.error || !syncState.isOnline || showWhenIdle;

    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : (position === 'top' ? -100 : 100),
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [syncState.isSyncing, syncState.error, syncState.isOnline, showWhenIdle, position, slideAnim]);

  const handleSyncEvent = (event: SyncEvent): void => {
    switch (event.type) {
      case 'sync_started':
        setSyncState(prev => ({ ...prev, isSyncing: true, error: undefined }));
        break;

      case 'sync_queueing':
        setSyncState(prev => ({ ...prev, phase: 'queueing' }));
        break;

      case 'sync_processing':
        setSyncState(prev => ({ ...prev, phase: 'processing' }));
        break;

      case 'sync_progress':
        setSyncState(prev => ({
          ...prev,
          progress: event.data as SyncProgressData,
        }));
        break;

      case 'sync_completed':
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          phase: 'completed',
          progress: event.data,
        }));
        // Clear completed state after 3 seconds
        setTimeout(() => {
          setSyncState(prev => ({
            ...prev,
            phase: undefined,
            progress: undefined,
          }));
        }, 3000);
        break;

      case 'sync_failed':
        setSyncState(prev => ({
          ...prev,
          isSyncing: false,
          error: event.error,
        }));
        // Clear error after 5 seconds
        setTimeout(() => {
          setSyncState(prev => ({ ...prev, error: undefined }));
        }, 5000);
        break;

      case 'sync_conflict':
        // Conflicts are handled by ConflictResolutionModal
        break;
    }
  };

  const getStatusText = (): string => {
    if (!syncState.isOnline) {
      return 'Offline - Changes will sync when online';
    }

    if (syncState.error) {
      return `Sync failed: ${syncState.error}`;
    }

    if (!syncState.isSyncing && syncState.phase === 'completed' && syncState.progress) {
      const { synced, failed, conflicts } = syncState.progress;
      if (failed === 0 && conflicts === 0) {
        return `Synced ${synced} item${synced !== 1 ? 's' : ''}`;
      }
      return `Synced ${synced}, ${failed} failed, ${conflicts} conflicts`;
    }

    if (syncState.phase === 'queueing') {
      return 'Preparing sync...';
    }

    if (syncState.phase === 'processing' && syncState.progress) {
      const { current, total, currentItem, estimatedTimeRemaining } = syncState.progress;
      let text = `Syncing ${current}/${total}`;

      if (currentItem) {
        const itemType = currentItem.type === 'workout_session' ? 'session' : 'ML data';
        text += ` (${itemType})`;
      }

      if (estimatedTimeRemaining && estimatedTimeRemaining > 1000) {
        const seconds = Math.ceil(estimatedTimeRemaining / 1000);
        text += ` - ${seconds}s remaining`;
      }

      return text;
    }

    if (syncState.isSyncing) {
      return 'Syncing...';
    }

    return 'All changes synced';
  };

  const getStatusColor = (): string => {
    if (!syncState.isOnline) {
      return CONFIG.COLORS.TEXT_SECONDARY;
    }

    if (syncState.error) {
      return CONFIG.COLORS.ERROR;
    }

    if (syncState.phase === 'completed') {
      return CONFIG.COLORS.SUCCESS;
    }

    return CONFIG.COLORS.PRIMARY;
  };

  const getProgressPercentage = (): number => {
    if (!syncState.progress || syncState.progress.total === 0) {
      return 0;
    }

    return (syncState.progress.current / syncState.progress.total) * 100;
  };

  const positionStyle = position === 'top' ? styles.containerTop : styles.containerBottom;

  return (
    <Animated.View
      style={[
        positionStyle,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        {syncState.isSyncing && (
          <ActivityIndicator
            size="small"
            color={getStatusColor()}
            style={styles.spinner}
          />
        )}

        {!syncState.isOnline && (
          <View style={[styles.dot, styles.dotOffline]} />
        )}

        {!syncState.isSyncing && syncState.phase === 'completed' && (
          <View style={[styles.dot, styles.dotSuccess]} />
        )}

        {syncState.error && (
          <View style={[styles.dot, styles.dotError]} />
        )}

        <Text style={[styles.text, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>

      {syncState.isSyncing && syncState.progress && syncState.progress.total > 0 && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${getProgressPercentage()}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  containerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: CONFIG.COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  containerBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: CONFIG.COLORS.WHITE,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  spinner: {
    marginRight: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotOffline: {
    backgroundColor: CONFIG.COLORS.TEXT_SECONDARY,
  },
  dotSuccess: {
    backgroundColor: CONFIG.COLORS.SUCCESS,
  },
  dotError: {
    backgroundColor: CONFIG.COLORS.ERROR,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#E5E5E5',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
});
