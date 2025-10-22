import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Button,
} from 'react-native';
import { BaseScreenProps } from '../types';
import { CONFIG } from '../constants/config';
import { useAuth } from '../contexts/AuthContext';

interface AuthScreenProps extends BaseScreenProps {}

interface ValidationErrors {
  email?: string;
  username?: string;
  password?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Clear error when switching modes
  useEffect(() => {
    clearError();
    setValidationErrors({});
  }, [isLogin, clearError]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    return errors;
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Email validation
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation (registration only)
    if (!isLogin) {
      if (!username.trim()) {
        errors.username = 'Username is required';
      } else if (username.length < 3) {
        errors.username = 'Username must be at least 3 characters long';
      } else if (username.length > 30) {
        errors.username = 'Username must be less than 30 characters';
      }
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required';
    } else if (!isLogin) {
      const passwordErrors = validatePassword(password);
      if (passwordErrors.length > 0) {
        errors.password = passwordErrors[0]; // Show first error
      }

      // Confirm password validation
      if (password !== confirmPassword) {
        errors.password = 'Passwords do not match';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAuth = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), username.trim(), password);
      }
    } catch (error) {
      // Error handling is done in the auth context
      console.error('Auth error:', error);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setValidationErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>💪 FitProof</Text>
          <Text style={styles.tagline}>Prove your fitness journey</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{isLogin ? 'Welcome Back!' : 'Join FitProof'}</Text>

          {/* Global Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button title="Corbin login" onPress={toggleAuthMode} />
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, validationErrors.email && styles.inputError]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: undefined }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {validationErrors.email && (
              <Text style={styles.validationError}>{validationErrors.email}</Text>
            )}
          </View>

          {/* Username Input (Registration only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, validationErrors.username && styles.inputError]}
                placeholder="Username"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (validationErrors.username) {
                    setValidationErrors(prev => ({ ...prev, username: undefined }));
                  }
                }}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {validationErrors.username && (
                <Text style={styles.validationError}>{validationErrors.username}</Text>
              )}
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, validationErrors.password && styles.inputError]}
              placeholder="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (validationErrors.password) {
                  setValidationErrors(prev => ({ ...prev, password: undefined }));
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            {validationErrors.password && (
              <Text style={styles.validationError}>{validationErrors.password}</Text>
            )}
          </View>

          {/* Confirm Password Input (Registration only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, validationErrors.password && styles.inputError]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>
          )}

          {/* Auth Button */}
          <TouchableOpacity
            style={[styles.authButton, isLoading && styles.authButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={CONFIG.COLORS.WHITE} />
            ) : (
              <Text style={styles.authButtonText}>
                {isLogin ? 'Login' : 'Sign Up'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Switch Auth Mode */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={toggleAuthMode} disabled={isLoading}>
              <Text style={[styles.switchLink, isLoading && styles.switchLinkDisabled]}>
                {isLogin ? 'Sign Up' : 'Login'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Password Reset Link (Login only) */}
          {isLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => Alert.alert('Password Reset', 'Password reset functionality coming soon!')}
              disabled={isLoading}
            >
              <Text style={[styles.forgotPasswordText, isLoading && styles.switchLinkDisabled]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Social Login Placeholder */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialTitle}>Or continue with</Text>

          <TouchableOpacity
            style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
            disabled={isLoading}
            onPress={() => Alert.alert('Social Login', 'Social login coming soon!')}
          >
            <Text style={styles.socialButtonText}>🔍 Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
            disabled={isLoading}
            onPress={() => Alert.alert('Social Login', 'Social login coming soon!')}
          >
            <Text style={styles.socialButtonText}>🍎 Apple</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CONFIG.COLORS.BACKGROUND,
  },
  scrollContainer: {
    flexGrow: 1,
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
  errorContainer: {
    backgroundColor: `${CONFIG.COLORS.ERROR}15`,
    borderColor: CONFIG.COLORS.ERROR,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: CONFIG.COLORS.ERROR,
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: CONFIG.COLORS.WHITE,
    borderWidth: 1,
    borderColor: CONFIG.COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  inputError: {
    borderColor: CONFIG.COLORS.ERROR,
  },
  validationError: {
    color: CONFIG.COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  authButton: {
    backgroundColor: CONFIG.COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 56,
    justifyContent: 'center',
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
  switchLinkDisabled: {
    opacity: 0.5,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  forgotPasswordText: {
    color: CONFIG.COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '500',
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
  socialButtonDisabled: {
    opacity: 0.5,
  },
  socialButtonText: {
    fontSize: 16,
    color: CONFIG.COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
});
