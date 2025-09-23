import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { CONFIG } from '../constants/config';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
  requireAuth = true,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CONFIG.COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <View style={styles.unauthorizedContainer}>
        <Text style={styles.unauthorizedText}>Access Denied</Text>
        <Text style={styles.unauthorizedSubtext}>
          You need to be logged in to access this content.
        </Text>
      </View>
    );
  }

  // If authentication is not required but user is authenticated (e.g., auth screens)
  if (!requireAuth && isAuthenticated) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <View style={styles.redirectContainer}>
        <Text style={styles.redirectText}>Already authenticated</Text>
        <Text style={styles.redirectSubtext}>
          You are already logged in as {user?.username || user?.email}.
        </Text>
      </View>
    );
  }

  // Render children if authorization checks pass
  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.BACKGROUND,
    padding: 20,
  },
  unauthorizedText: {
    fontSize: 24,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  unauthorizedSubtext: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
  redirectContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CONFIG.COLORS.BACKGROUND,
    padding: 20,
  },
  redirectText: {
    fontSize: 24,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  redirectSubtext: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
});