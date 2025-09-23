import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { useAuth } from '../contexts/AuthContext';

// Mock the auth context
jest.mock('../contexts/AuthContext');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = {};

// Mock user data
const mockUser = {
  id: '1',
  email: 'test@example.com',
  username: 'testuser',
  totalPoints: 150,
  currentStreak: 5,
  lastWorkoutDate: '2023-09-20T10:00:00Z',
  isActive: true,
  createdAt: '2023-09-01T10:00:00Z',
  updatedAt: '2023-09-20T10:00:00Z',
};

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders edit profile form with user data', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByDisplayValue, getByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('Edit Profile')).toBeTruthy();
    expect(getByDisplayValue('testuser')).toBeTruthy();
    expect(getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('validates username input correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByDisplayValue, getByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    const usernameInput = getByDisplayValue('testuser');

    // Clear username to trigger validation
    fireEvent.changeText(usernameInput, '');

    // Try to save
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Username is required')).toBeTruthy();
    });
  });

  it('validates email input correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByDisplayValue, getByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    const emailInput = getByDisplayValue('test@example.com');

    // Enter invalid email
    fireEvent.changeText(emailInput, 'invalid-email');

    // Try to save
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('goes back when cancel button is pressed', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockNavigation.goBack).toHaveBeenCalled();
  });

  it('shows error message when user is not found', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      logout: jest.fn(),
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('User not found')).toBeTruthy();
  });

  it('clears validation errors when user starts typing', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      refreshToken: jest.fn(),
      clearError: jest.fn(),
      tokens: null,
      error: null,
    });

    const { getByDisplayValue, getByText, queryByText } = render(
      <EditProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    const usernameInput = getByDisplayValue('testuser');

    // Clear username to trigger validation
    fireEvent.changeText(usernameInput, '');

    // Try to save to show error
    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => {
      expect(getByText('Username is required')).toBeTruthy();
    });

    // Start typing to clear error
    fireEvent.changeText(usernameInput, 'newusername');

    await waitFor(() => {
      expect(queryByText('Username is required')).toBeFalsy();
    });
  });
});