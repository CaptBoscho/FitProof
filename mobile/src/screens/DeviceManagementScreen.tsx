import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deviceService, type RegisteredDevice } from '../services/deviceService';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../constants/config';
import { apolloClient } from '../services/apolloClient';
import { gql } from '@apollo/client';

const GET_USER_DEVICES = gql`
  query GetUserDevices($userId: ID!) {
    getUserDevices(userId: $userId) {
      success
      message
      devices {
        id
        deviceId
        deviceName
        deviceType
        osVersion
        model
        manufacturer
        lastActiveAt
        registeredAt
      }
      total
    }
  }
`;

const REMOVE_DEVICE = gql`
  mutation RemoveDevice($userId: ID!, $deviceId: String!) {
    removeDevice(userId: $userId, deviceId: $deviceId) {
      success
      message
    }
  }
`;

export const DeviceManagementScreen: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<RegisteredDevice[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
    loadCurrentDevice();
  }, []);

  const loadCurrentDevice = async () => {
    try {
      const metadata = await deviceService.getDeviceMetadata();
      setCurrentDeviceId(metadata.deviceId);
    } catch (error) {
      console.error('Failed to load current device:', error);
    }
  };

  const loadDevices = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data } = await apolloClient.query({
        query: GET_USER_DEVICES,
        variables: { userId: user.id },
        fetchPolicy: 'network-only',
      });

      if (data.getUserDevices.success) {
        const devicesWithFlag = data.getUserDevices.devices.map((device: any) => ({
          ...device,
          isCurrentDevice: device.deviceId === currentDeviceId,
        }));
        setDevices(devicesWithFlag);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    setRefreshing(false);
  };

  const handleRemoveDevice = async (device: RegisteredDevice) => {
    if (device.isCurrentDevice) {
      Alert.alert(
        'Cannot Remove',
        'You cannot remove the current device. To remove this device, use another device or sign out.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Device',
      `Are you sure you want to remove "${device.deviceName}"? This will sign out this device and require re-authentication.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await apolloClient.mutate({
                mutation: REMOVE_DEVICE,
                variables: {
                  userId: user?.id,
                  deviceId: device.deviceId,
                },
              });

              if (data.removeDevice.success) {
                Alert.alert('Success', 'Device removed successfully');
                await loadDevices();
              } else {
                Alert.alert('Error', data.removeDevice.message || 'Failed to remove device');
              }
            } catch (error) {
              console.error('Failed to remove device:', error);
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getDeviceIcon = (deviceType: string, isTablet: boolean): string => {
    if (isTablet) return '📱';
    switch (deviceType.toLowerCase()) {
      case 'ios':
        return '📱';
      case 'android':
        return '📱';
      case 'web':
        return '💻';
      default:
        return '📱';
    }
  };

  const getDeviceTypeLabel = (deviceType: string): string => {
    switch (deviceType.toLowerCase()) {
      case 'ios':
        return 'iOS';
      case 'android':
        return 'Android';
      case 'web':
        return 'Web';
      default:
        return deviceType.toUpperCase();
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={CONFIG.COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Your Devices</Text>
          <Text style={styles.subtitle}>
            {devices.length} device{devices.length !== 1 ? 's' : ''} registered
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📱 Multi-Device Sync</Text>
          <Text style={styles.infoText}>
            Your workout data syncs automatically across all your devices. Remove devices you no
            longer use to keep your account secure.
          </Text>
        </View>

        {/* Devices List */}
        {devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyTitle}>No Devices Found</Text>
            <Text style={styles.emptyText}>
              Devices will appear here once you sign in on them.
            </Text>
          </View>
        ) : (
          <View style={styles.devicesList}>
            {devices.map((device) => (
              <View
                key={device.id}
                style={[
                  styles.deviceCard,
                  device.isCurrentDevice && styles.currentDeviceCard,
                ]}
              >
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceIcon}>
                      {getDeviceIcon(device.deviceType, false)}
                    </Text>
                    <View style={styles.deviceDetails}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>{device.deviceName}</Text>
                        {device.isCurrentDevice && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Current</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.deviceModel}>
                        {device.model}
                        {device.manufacturer && ` · ${device.manufacturer}`}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.deviceMeta}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={styles.metaValue}>
                      {getDeviceTypeLabel(device.deviceType)} {device.osVersion}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Last Active:</Text>
                    <Text style={styles.metaValue}>
                      {formatDate(device.lastActiveAt.toString())}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Registered:</Text>
                    <Text style={styles.metaValue}>
                      {formatDate(device.registeredAt.toString())}
                    </Text>
                  </View>
                </View>

                {!device.isCurrentDevice && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveDevice(device)}
                  >
                    <Text style={styles.removeButtonText}>Remove Device</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
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
  infoCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: CONFIG.COLORS.PRIMARY,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  devicesList: {
    padding: 16,
  },
  deviceCard: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentDeviceCard: {
    borderWidth: 2,
    borderColor: CONFIG.COLORS.PRIMARY,
  },
  deviceHeader: {
    marginBottom: 12,
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deviceIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 11,
    fontWeight: '600',
  },
  deviceModel: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  deviceMeta: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  removeButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CONFIG.COLORS.ERROR,
    alignItems: 'center',
  },
  removeButtonText: {
    color: CONFIG.COLORS.ERROR,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
});
