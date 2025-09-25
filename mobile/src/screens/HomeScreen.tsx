import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { PermissionsAndroid } from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';

interface HomeScreenProps extends BaseScreenProps {}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'FitProof Camera Permission',
            message: 'FitProof needs access to your camera to detect your exercises and count reps.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setCameraPermissionGranted(true);
        } else {
          setCameraPermissionGranted(false);
          Alert.alert(
            'Camera Permission Required',
            'Camera access is required to use FitProof for exercise detection. Please grant permission in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: requestCameraPermission }
            ]
          );
        }
      } catch (err) {
        console.warn('Camera permission error:', err);
        setCameraPermissionGranted(false);
      }
    } else {
      // iOS permissions are handled in Info.plist and at runtime by the camera module
      setCameraPermissionGranted(true);
    }
  };

  const handleStartWorkout = () => {
    if (!cameraPermissionGranted) {
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required to detect exercises. Please grant permission first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestCameraPermission }
        ]
      );
      return;
    }

    // Navigate to exercise selection
    navigation.navigate('Exercises');
  };

  const handleViewProgress = () => {
    // Navigate to profile/progress screen
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back, {user?.username || 'User'}!</Text>
        <Text style={styles.subtitle}>Ready to crush your fitness goals?</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userInfoText}>Logged in as: {user?.email}</Text>
        <Text style={styles.userInfoText}>Username: {user?.username}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user?.totalPoints || 0}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user?.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStartWorkout}>
          <Text style={styles.primaryButtonText}>Start Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleViewProgress}>
          <Text style={styles.secondaryButtonText}>View Progress</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No workouts yet</Text>
          <Text style={styles.emptyStateSubtext}>Start your first workout!</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CONFIG.COLORS.ERROR,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfoText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.WHITE,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: CONFIG.COLORS.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  actionsContainer: {
    marginBottom: 30,
  },
  primaryButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: CONFIG.COLORS.PRIMARY,
  },
  secondaryButtonText: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },
  quickStatsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
});
