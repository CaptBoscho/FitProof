import { gql } from '@apollo/client';

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

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      success
      message
      validationErrors {
        field
        message
      }
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
`;