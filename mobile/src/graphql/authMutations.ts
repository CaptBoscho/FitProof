import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      success
      message
      validationErrors {
        field
        message
      }
      authData {
        accessToken
        refreshToken
        expiresIn
        refreshExpiresIn
        tokenType
        user {
          id
          email
          username
          totalPoints
          currentStreak
          lastWorkoutDate
          isActive
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      success
      message
      authData {
        accessToken
        refreshToken
        expiresIn
        refreshExpiresIn
        tokenType
        user {
          id
          email
          username
          totalPoints
          currentStreak
          lastWorkoutDate
          isActive
          createdAt
          updatedAt
        }
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      expiresIn
      tokenType
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const PASSWORD_RESET_REQUEST_MUTATION = gql`
  mutation RequestPasswordReset($input: PasswordResetRequestInput!) {
    requestPasswordReset(input: $input) {
      success
      message
      token
    }
  }
`;

export const PASSWORD_RESET_CONFIRM_MUTATION = gql`
  mutation ConfirmPasswordReset($input: PasswordResetConfirmInput!) {
    confirmPasswordReset(input: $input) {
      success
      message
    }
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      username
      totalPoints
      currentStreak
      lastWorkoutDate
      isActive
      createdAt
      updatedAt
    }
  }
`;