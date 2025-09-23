import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
  tokenType: string;
}

const KEYCHAIN_SERVICE = 'FitProofTokens';
const ACCESS_TOKEN_KEY = 'access_token';
const USER_PREFERENCES_KEY = 'user_preferences';

export class SecureStorageService {
  /**
   * Store authentication tokens securely in Keychain
   */
  static async storeTokens(tokens: StoredTokens): Promise<void> {
    try {
      console.log('🔐 [SecureStorage] Attempting to store tokens...');

      // Check if Keychain is available
      if (!Keychain) {
        console.error('❌ [SecureStorage] Keychain module is not available');
        throw new Error('Keychain module not available');
      }

      // Store sensitive tokens in Keychain using correct API
      await Keychain.setGenericPassword(
        ACCESS_TOKEN_KEY,
        JSON.stringify({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),
        { service: KEYCHAIN_SERVICE }
      );

      // Store non-sensitive token metadata in AsyncStorage
      await AsyncStorage.setItem(
        ACCESS_TOKEN_KEY + '_metadata',
        JSON.stringify({
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          tokenType: tokens.tokenType,
          storedAt: new Date().toISOString(),
        })
      );

      console.log('✅ Tokens stored securely');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn('⚠️ Keychain store failed, trying fallback:', errorMessage);

      // Fallback to AsyncStorage for development/testing
      console.log('🔄 [SecureStorage] Attempting fallback storage to AsyncStorage...');
      try {
        await AsyncStorage.setItem('fallback_tokens', JSON.stringify(tokens));
        console.log('✅ Tokens stored in AsyncStorage fallback');
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        console.error('❌ Fallback storage also failed:', fallbackMessage);
        throw new Error('Failed to store authentication tokens');
      }
    }
  }

  /**
   * Retrieve authentication tokens from secure storage
   */
  static async getTokens(): Promise<StoredTokens | null> {
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`🔐 [SecureStorage] ${callId} - getTokens() called`);
    console.log(`🔐 [SecureStorage] ${callId} - Stack trace:`, new Error().stack?.split('\n').slice(1, 6).join('\n'));

    try {
      console.log(`🔐 [SecureStorage] ${callId} - Attempting to retrieve tokens...`);

      // Check if Keychain is available
      if (!Keychain) {
        console.error(`❌ [SecureStorage] ${callId} - Keychain module is not available`);
        return null;
      }

      console.log(`🔐 [SecureStorage] ${callId} - Keychain module is available:`, typeof Keychain);
      console.log(`🔐 [SecureStorage] ${callId} - getGenericPassword function:`, typeof Keychain.getGenericPassword);

      // Get tokens from Keychain using correct API - try directly without checks
      console.log(`🔐 [SecureStorage] ${callId} - Calling getGenericPassword with service: ${KEYCHAIN_SERVICE}`);
      const credentials = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      console.log(`🔐 [SecureStorage] ${callId} - getGenericPassword result:`, typeof credentials, credentials === false ? 'false' : 'object');

      if (!credentials) {
        console.log(`📭 [SecureStorage] ${callId} - No stored credentials found`);
        return null;
      }

      console.log(`✅ [SecureStorage] ${callId} - Credentials retrieved from keychain, parsing...`);
      const tokenData = JSON.parse(credentials.password);
      console.log(`✅ [SecureStorage] ${callId} - Token data parsed successfully`);

      // Get metadata from AsyncStorage
      console.log(`🔐 [SecureStorage] ${callId} - Getting metadata from AsyncStorage...`);
      const metadataString = await AsyncStorage.getItem(ACCESS_TOKEN_KEY + '_metadata');
      const metadata = metadataString ? JSON.parse(metadataString) : {};
      console.log(`🔐 [SecureStorage] ${callId} - Metadata retrieved:`, !!metadataString);

      const result = {
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresIn: metadata.expiresIn || '7d',
        refreshExpiresIn: metadata.refreshExpiresIn || '30d',
        tokenType: metadata.tokenType || 'Bearer',
      };

      console.log(`✅ [SecureStorage] ${callId} - Tokens successfully retrieved and parsed`);
      console.log(`✅ [SecureStorage] ${callId} - Returning result with accessToken length:`, result.accessToken?.length || 0);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

      console.warn(`⚠️ [SecureStorage] ${callId} - Keychain failed, trying fallback:`, errorMessage);
      console.log(`🔍 [SecureStorage] ${callId} - Error type:`, errorType);

      // Fallback to AsyncStorage for development/testing
      console.log(`🔄 [SecureStorage] ${callId} - Attempting fallback to AsyncStorage...`);
      try {
        const fallbackData = await AsyncStorage.getItem('fallback_tokens');
        if (fallbackData) {
          console.log(`✅ [SecureStorage] ${callId} - Found fallback tokens in AsyncStorage`);
          const tokens = JSON.parse(fallbackData);
          return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn || '7d',
            refreshExpiresIn: tokens.refreshExpiresIn || '30d',
            tokenType: tokens.tokenType || 'Bearer',
          };
        }
      } catch (fallbackError: unknown) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        console.error(`❌ [SecureStorage] ${callId} - Fallback also failed:`, fallbackMessage);
      }

      return null;
    }
  }

  /**
   * Clear all stored authentication tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      console.log('🧹 [SecureStorage] Attempting to clear tokens...');

      // Check if Keychain is available
      if (!Keychain) {
        console.error('❌ [SecureStorage] Keychain module is not available');
        // Still try to clear AsyncStorage
        await AsyncStorage.removeItem(ACCESS_TOKEN_KEY + '_metadata');
        return;
      }

      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY + '_metadata');
      await AsyncStorage.removeItem('fallback_tokens');
      console.log('✅ [SecureStorage] Tokens cleared successfully');
    } catch (error) {
      console.error('❌ [SecureStorage] Failed to clear tokens:', error);
      // Don't throw error, as this might be called during logout
    }
  }

  /**
   * Validate token with backend
   */
  static async validateToken(accessToken: string): Promise<boolean> {
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`🔍 [SecureStorage] ${callId} - validateToken() called`);
    console.log(`🔍 [SecureStorage] ${callId} - Token length:`, accessToken?.length || 0);
    console.log(`🔍 [SecureStorage] ${callId} - API URL:`, CONFIG.API_URL);

    try {
      console.log(`🔍 [SecureStorage] ${callId} - Making validation request...`);
      const response = await fetch(`${CONFIG.API_URL}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log(`🔍 [SecureStorage] ${callId} - Response status:`, response.status);
      const data = await response.json();
      console.log(`🔍 [SecureStorage] ${callId} - Response data:`, data);
      const isValid = data.isValid === true;
      console.log(`🔍 [SecureStorage] ${callId} - Token validation result:`, isValid);
      return isValid;
    } catch (error) {
      console.error(`❌ [SecureStorage] ${callId} - Token validation failed:`, error);
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<StoredTokens | null> {
    try {
      const currentTokens = await this.getTokens();

      if (!currentTokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: currentTokens.refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.accessToken) {
        const newTokens: StoredTokens = {
          accessToken: data.accessToken,
          refreshToken: currentTokens.refreshToken, // Keep existing refresh token
          expiresIn: data.expiresIn,
          refreshExpiresIn: currentTokens.refreshExpiresIn,
          tokenType: data.tokenType || 'Bearer',
        };

        await this.storeTokens(newTokens);
        return newTokens;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      await this.clearTokens(); // Clear invalid tokens
      return null;
    }
  }

  /**
   * Store user preferences (non-sensitive data)
   */
  static async storeUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('❌ Failed to store user preferences:', error);
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(): Promise<Record<string, any> | null> {
    try {
      const preferencesString = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
      return preferencesString ? JSON.parse(preferencesString) : null;
    } catch (error) {
      console.error('❌ Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Clear user preferences
   */
  static async clearUserPreferences(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_PREFERENCES_KEY);
    } catch (error) {
      console.error('❌ Failed to clear user preferences:', error);
    }
  }

  /**
   * Check if biometric authentication is available and enrolled
   */
  static async isBiometricAuthAvailable(): Promise<boolean> {
    try {
      if (!Keychain || !Keychain.getSupportedBiometryType) {
        console.log('🔐 [SecureStorage] Biometry functions not available');
        return false;
      }
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      console.error('❌ Biometric check failed:', error);
      return false;
    }
  }

  /**
   * Get supported biometry type
   */
  static async getBiometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
    try {
      if (!Keychain || !Keychain.getSupportedBiometryType) {
        console.log('🔐 [SecureStorage] getSupportedBiometryType not available');
        return null;
      }
      return await Keychain.getSupportedBiometryType();
    } catch (error) {
      console.error('❌ Failed to get biometry type:', error);
      return null;
    }
  }
}