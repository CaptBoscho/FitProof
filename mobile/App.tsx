import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { ApolloProvider } from '@apollo/client/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { apolloClient } from './src/services/apolloClient';
import { AuthProvider } from './src/contexts/AuthContext';
import { initDatabase } from './src/services/database';
import { syncService } from './src/services/syncService';
import { backgroundSyncService } from './src/services/backgroundSync';
import { deviceService } from './src/services/deviceService';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing FitProof...');

        // Initialize database
        console.log('📦 Initializing database...');
        await initDatabase();
        console.log('✅ Database initialized');

        // Initialize device service
        console.log('📱 Initializing device...');
        await deviceService.initialize();
        console.log('✅ Device initialized');

        // Initialize background sync
        console.log('🔄 Initializing background sync...');
        await backgroundSyncService.initialize();
        await backgroundSyncService.start();
        console.log('✅ Background sync initialized');

        // Start auto-sync
        console.log('⚡ Starting auto-sync...');
        syncService.startAutoSync();
        console.log('✅ Auto-sync started');

        console.log('🎉 FitProof initialized successfully');
        setIsDbReady(true);
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        setDbError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      syncService.stopAutoSync();
      backgroundSyncService.stop().catch(console.error);
    };
  }, []);

  if (dbError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing database...</Text>
      </View>
    );
  }

  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
