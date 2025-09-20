import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';

interface AuthScreenProps extends BaseScreenProps {}

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !username)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implement actual authentication with Apollo Client
      // For now, simulate successful login
      setTimeout(() => {
        setLoading(false);
        navigation.replace('Main');
      }, 1000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Authentication failed');
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setUsername('');
    setPassword('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>💪 FitProof</Text>
        <Text style={styles.tagline}>Prove your fitness journey</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>{isLogin ? 'Welcome Back!' : 'Join FitProof'}</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.authButton, loading && styles.authButtonDisabled]}
          onPress={handleAuth}
          disabled={loading}
        >
          <Text style={styles.authButtonText}>
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <TouchableOpacity onPress={toggleAuthMode}>
            <Text style={styles.switchLink}>{isLogin ? 'Sign Up' : 'Login'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.socialContainer}>
        <Text style={styles.socialTitle}>Or continue with</Text>

        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialButtonText}>🔍 Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialButtonText}>🍎 Apple</Text>
        </TouchableOpacity>
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
    marginTop: 60,
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: CONFIG.COLORS.PRIMARY,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
  },
  formContainer: {
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderWidth: 1,
    borderColor: CONFIG.COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  authButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonText: {
    color: CONFIG.COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: CONFIG.COLORS.TEXT_SECONDARY,
    fontSize: 16,
  },
  switchLink: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  socialContainer: {
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: 20,
  },
  socialButton: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderWidth: 1,
    borderColor: CONFIG.COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  socialButtonText: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
});
