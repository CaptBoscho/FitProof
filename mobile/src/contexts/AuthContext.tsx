import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { useMutation } from '@apollo/client/react';
import { SecureStorageService } from '../services/SecureStorageService';
import { REGISTER_MUTATION, LOGIN_MUTATION } from '../graphql/authMutations';

export interface User {
  id: string;
  email: string;
  username: string;
  totalPoints: number;
  currentStreak: number;
  lastWorkoutDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
  tokenType: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGOUT' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType extends AuthState {
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  tokens: null,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  console.log('🔄 [AuthReducer] Action dispatched:', action.type, 'Current state:', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    hasUser: !!state.user,
    hasTokens: !!state.tokens,
    hasError: !!state.error
  });

  switch (action.type) {
    case 'SET_LOADING':
      console.log('🔄 [AuthReducer] SET_LOADING:', action.payload);
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      console.log('🔄 [AuthReducer] LOGIN_SUCCESS for user:', action.payload.user.username);
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        tokens: action.payload.tokens,
        error: null,
      };
    case 'LOGOUT':
      console.log('🔄 [AuthReducer] LOGOUT');
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      };
    case 'SET_ERROR':
      console.log('🔄 [AuthReducer] SET_ERROR:', action.payload);
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_ERROR':
      console.log('🔄 [AuthReducer] CLEAR_ERROR');
      return { ...state, error: null };
    case 'UPDATE_USER':
      console.log('🔄 [AuthReducer] UPDATE_USER for user:', action.payload.username);
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  console.log('🏗️ [AuthProvider] Component rendering...');
  const [state, dispatch] = useReducer(authReducer, initialState);
  const stateRef = useRef(state);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  console.log('🏗️ [AuthProvider] Current state:', {
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    hasUser: !!state.user,
    hasTokens: !!state.tokens,
    hasError: !!state.error
  });

  const [registerMutation] = useMutation(REGISTER_MUTATION);
  const [loginMutation] = useMutation(LOGIN_MUTATION);

  // Update ref when state changes
  useEffect(() => {
    console.log('🔄 [AuthProvider] useEffect: updating stateRef, new state:', {
      isAuthenticated: state.isAuthenticated,
      isLoading: state.isLoading,
      hasUser: !!state.user,
      hasTokens: !!state.tokens
    });
    stateRef.current = state;
  }, [state]);

  const checkAuthState = useCallback(async () => {
    console.log('🔍 [AuthContext] checkAuthState called');
    try {
      console.log('🔄 [AuthContext] Setting loading to true');
      dispatch({ type: 'SET_LOADING', payload: true });

      console.log('🔐 [AuthContext] Getting tokens from SecureStorage...');
      const tokens = await SecureStorageService.getTokens();

      if (tokens) {
        console.log('✅ [AuthContext] Tokens found, validating...');
        // Validate token with backend
        const isValid = await SecureStorageService.validateToken(tokens.accessToken);

        if (isValid) {
          console.log('✅ [AuthContext] Token is valid, restoring user...');
          // TODO: Fetch user profile with GraphQL query using ME_QUERY
          // For now, we'll simulate a user based on stored tokens
          const mockUser: User = {
            id: 'stored-user',
            email: 'restored@user.com',
            username: 'restoreduser',
            totalPoints: 150,
            currentStreak: 3,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          console.log('🎉 [AuthContext] Authentication state restored from secure storage');
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: mockUser, tokens },
          });
        } else {
          console.log('❌ [AuthContext] Token is invalid, clearing storage...');
          // Token is invalid, clear storage
          await SecureStorageService.clearTokens();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        console.log('📭 [AuthContext] No tokens found, setting loading to false');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } catch (error) {
      console.error('❌ [AuthContext] Auth state check failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
    console.log('✅ [AuthContext] checkAuthState completed');
  }, []);

  // Check for existing authentication on app start
  useEffect(() => {
    console.log('🚀 [AuthContext] useEffect: initial checkAuthState triggered');
    console.log('🚀 [AuthContext] checkAuthState function reference:', typeof checkAuthState);
    checkAuthState();
  }, [checkAuthState]);

  // Set up automatic token refresh - only when authentication status changes
  useEffect(() => {
    console.log(`🕐 [AuthContext] useEffect: token refresh setup triggered`);
    console.log(`🕐 [AuthContext] - isAuthenticated: ${state.isAuthenticated}`);
    console.log(`🕐 [AuthContext] - hasTokens: ${!!state.tokens}`);
    console.log(`🕐 [AuthContext] - refreshToken function reference: ${typeof refreshToken}`);

    if (refreshIntervalRef.current) {
      console.log('🧹 [AuthContext] Clearing existing refresh interval');
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }

    if (state.isAuthenticated && state.tokens) {
      console.log('⏰ [AuthContext] Setting up token refresh interval');
      // Set up token refresh timer
      refreshIntervalRef.current = setInterval(async () => {
        console.log('🔄 [AuthContext] Interval triggered - checking if user still authenticated...');
        if (stateRef.current.isAuthenticated) {
          console.log('🔄 [AuthContext] Performing automatic token refresh...');
          const refreshSuccess = await refreshToken();
          if (!refreshSuccess) {
            console.log('❌ [AuthContext] Automatic token refresh failed, user logged out');
          } else {
            console.log('✅ [AuthContext] Automatic token refresh successful');
          }
        } else {
          console.log('⏭️ [AuthContext] User no longer authenticated, skipping refresh');
        }
      }, 15 * 60 * 1000); // Refresh every 15 minutes
    } else {
      console.log('❌ [AuthContext] Not setting up interval - user not authenticated or no tokens');
    }

    return () => {
      if (refreshIntervalRef.current) {
        console.log('🧹 [AuthContext] Cleanup: clearing refresh interval');
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [state.isAuthenticated, refreshToken]); // Include refreshToken in dependencies for safety

  // Handle app state changes (background/foreground)
  useEffect(() => {
    console.log('📱 [AuthContext] useEffect: app state listener setup');
    console.log('📱 [AuthContext] refreshToken function reference:', typeof refreshToken);

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`📱 [AuthContext] App state changed to: ${nextAppState}`);
      console.log(`📱 [AuthContext] Current auth state: ${stateRef.current.isAuthenticated}`);
      if (nextAppState === 'active' && stateRef.current.isAuthenticated) {
        // App is coming to foreground, refresh token if needed
        console.log('📱 [AuthContext] App coming to foreground, checking token validity...');
        const refreshSuccess = await refreshToken();
        if (!refreshSuccess) {
          console.log('❌ [AuthContext] Token validation failed on app resume');
        } else {
          console.log('✅ [AuthContext] Token validation successful on app resume');
        }
      } else {
        console.log('⏭️ [AuthContext] Skipping token refresh - app not active or user not authenticated');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      console.log('🧹 [AuthContext] Cleanup: removing app state listener');
      subscription?.remove();
    };
  }, [refreshToken]); // Include refreshToken in dependencies


  const register = async (email: string, username: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const { data } = await registerMutation({
        variables: {
          input: { email, username, password },
        },
      });

      if (data?.register?.success && data.register.authData) {
        const { user: userData, ...tokens } = data.register.authData;

        // Store tokens securely
        await SecureStorageService.storeTokens(tokens);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: userData,
            tokens,
          },
        });
      } else {
        const errorMessage = data?.register?.message || 'Registration failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });

        // Show validation errors if available
        if (data?.register?.validationErrors?.length > 0) {
          const errors = data.register.validationErrors
            .map((err: any) => err.message)
            .join('\n');
          Alert.alert('Registration Error', errors);
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'An unexpected error occurred during registration';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      Alert.alert('Registration Error', errorMessage);
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const { data } = await loginMutation({
        variables: {
          input: { emailOrUsername, password },
        },
      });

      if (data?.login?.success && data.login.authData) {
        const { user: userData, ...tokens } = data.login.authData;

        // Store tokens securely
        await SecureStorageService.storeTokens(tokens);

        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: userData,
            tokens,
          },
        });
      } else {
        const errorMessage = data?.login?.message || 'Login failed';
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
        Alert.alert('Login Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'An unexpected error occurred during login';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      Alert.alert('Login Error', errorMessage);
    }
  };

  const logout = useCallback(async () => {
    try {
      // TODO: Call logout mutation to invalidate tokens on server
      // await logoutMutation();

      // Clear secure storage
      await SecureStorageService.clearTokens();

      // Clear user preferences if needed
      await SecureStorageService.clearUserPreferences();

      // Update state
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Even if clearing storage fails, we should still logout the user
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const newTokens = await SecureStorageService.refreshAccessToken();

      if (newTokens && stateRef.current.user) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: stateRef.current.user, tokens: newTokens },
        });
        return true;
      } else {
        // Refresh failed, logout user
        await logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  }, [logout]);

  const clearError = useCallback(() => {
    console.log('🧹 [AuthContext] clearError called');
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};