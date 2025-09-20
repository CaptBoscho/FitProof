import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ExercisesScreen } from '../screens/ExercisesScreen';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

// Placeholder screens for navigation
const WorkoutScreen = () => null; // TODO: Implement workout screen
const ProfileScreen = () => null; // TODO: Implement profile screen

export const AppNavigator: React.FC = () => {
  // TODO: Add authentication state management
  const isAuthenticated = false; // This will be managed by auth context

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Main" component={HomeScreen} />
            <Stack.Screen
              name="Exercises"
              component={ExercisesScreen}
              options={{
                headerShown: true,
                title: 'Exercises',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="Workout"
              component={WorkoutScreen}
              options={{
                headerShown: true,
                title: 'Workout',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                headerBackTitleVisible: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
