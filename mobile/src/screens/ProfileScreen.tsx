import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';

interface ProfileScreenProps extends BaseScreenProps {}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.username ? user.username[0].toUpperCase() : user.email[0].toUpperCase()}
            </Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Text style={styles.editAvatarText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.totalPoints || 0}</Text>
          <Text style={styles.statLabel}>Total Points</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.currentStreak || 0}</Text>
          <Text style={styles.statLabel}>Current Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {user.lastWorkoutDate
              ? new Date(user.lastWorkoutDate).toLocaleDateString()
              : 'Never'
            }
          </Text>
          <Text style={styles.statLabel}>Last Workout</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
          <Text style={styles.actionButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleSettings}>
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
            {isLoading ? 'Logging out...' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Account Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Account Status</Text>
          <Text style={[styles.infoValue, { color: user.isActive ? CONFIG.COLORS.SUCCESS : CONFIG.COLORS.ERROR }]}>
            {user.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: CONFIG.COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: CONFIG.COLORS.WHITE,
  },
  editAvatarButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: CONFIG.COLORS.BORDER,
    borderRadius: 16,
  },
  editAvatarText: {
    fontSize: 14,
    color: CONFIG.COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CONFIG.COLORS.PRIMARY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: CONFIG.COLORS.BORDER,
    marginHorizontal: 16,
  },
  actionSection: {
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  logoutButton: {
    backgroundColor: CONFIG.COLORS.ERROR,
  },
  logoutButtonText: {
    color: CONFIG.COLORS.WHITE,
  },
  infoSection: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: CONFIG.COLORS.BORDER,
  },
  infoLabel: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: CONFIG.COLORS.TEXT_PRIMARY,
  },
  errorText: {
    fontSize: 18,
    color: CONFIG.COLORS.ERROR,
    textAlign: 'center',
    marginTop: 50,
  },
});