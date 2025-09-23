import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CONFIG } from '../constants/config';

const Stack = createStackNavigator<RootStackParamList>();

// Placeholder screens for navigation
const WorkoutScreen = () => null; // TODO: Implement workout screen

export const AppNavigator: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

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
          onPress: logout,
        },
      ]
    );
  };

  const LogoutButton = () => (
    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
      <Text style={styles.logoutButtonText}>Logout</Text>
    </TouchableOpacity>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!user ? (
          // Auth Stack - for non-authenticated users
          <Stack.Screen name="Auth">
            {() => (
              <ProtectedRoute requireAuth={false} fallback={<HomeScreen />}>
                <AuthScreen />
              </ProtectedRoute>
            )}
          </Stack.Screen>
        ) : (
          // Main App Stack - for authenticated users
          <>
            <Stack.Screen name="Main">
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <HomeScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Exercises"
              options={{
                headerShown: true,
                title: 'Exercises',
                headerBackTitleVisible: false,
                headerRight: LogoutButton,
              }}
            >
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <ExercisesScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Workout"
              options={{
                headerShown: true,
                title: 'Workout',
                headerBackTitleVisible: false,
                headerRight: LogoutButton,
              }}
            >
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <WorkoutScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Profile"
              options={{
                headerShown: true,
                title: 'Profile',
                headerBackTitleVisible: false,
                headerRight: LogoutButton,
              }}
            >
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <ProfileScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="EditProfile"
              options={{
                headerShown: true,
                title: 'Edit Profile',
                headerBackTitleVisible: false,
              }}
            >
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <EditProfileScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
            <Stack.Screen
              name="Settings"
              options={{
                headerShown: true,
                title: 'Settings',
                headerBackTitleVisible: false,
              }}
            >
              {() => (
                <ProtectedRoute requireAuth={true}>
                  <SettingsScreen />
                </ProtectedRoute>
              )}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: CONFIG.COLORS.ERROR,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
});
