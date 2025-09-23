import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileScreen } from '../screens/ProfileScreen';
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

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user profile information correctly', () => {
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
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('testuser')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('150')).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('navigates to edit profile when edit profile button is pressed', () => {
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
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Edit Profile'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
  });

  it('navigates to settings when settings button is pressed', () => {
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
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Settings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
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
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    expect(getByText('User not found')).toBeTruthy();
  });

  it('calls logout function when logout is confirmed', async () => {
    const mockLogout = jest.fn();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout,
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
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Logout'));

    // Confirm logout in alert
    fireEvent.press(getByText('Logout'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});