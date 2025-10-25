import { ApolloClient, InMemoryCache, HttpLink, gql } from '@apollo/client';
import { CONFIG } from '../constants/config';

// Create Apollo Client
const httpLink = new HttpLink({
  uri: CONFIG.API_URL, // Should be something like 'http://192.168.1.x:4000/graphql'
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

// ==================== SYNC MUTATIONS ====================

export const SYNC_WORKOUT_SESSION = gql`
  mutation SyncWorkoutSession($input: SyncWorkoutSessionInput!) {
    syncWorkoutSession(input: $input) {
      success
      message
      results {
        id
        success
        error
        conflict {
          entityType
          entityId
          conflictFields
          resolution
          message
        }
      }
      synced
      failed
      conflicts
    }
  }
`;

export const SYNC_ML_TRAINING_DATA = gql`
  mutation SyncMLTrainingData($data: [SyncMLTrainingDataInput!]!) {
    syncMLTrainingData(data: $data) {
      success
      message
      results {
        id
        success
        error
      }
      synced
      failed
    }
  }
`;

export const BULK_SYNC = gql`
  mutation BulkSync($input: BulkSyncInput!) {
    bulkSync(input: $input) {
      success
      message
      sessions {
        success
        message
        synced
        failed
        conflicts
      }
      mlData {
        success
        message
        synced
        failed
      }
      totalSynced
      totalFailed
      totalConflicts
    }
  }
`;

// ==================== SYNC SERVICE HELPERS ====================

export interface SyncWorkoutSessionInput {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseType: string;
  totalReps: number;
  validReps: number;
  invalidReps: number;
  points: number;
  duration: number;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deviceId?: string; // Device that created this session
  deviceName?: string; // Human-readable device name
}

export interface SyncMLTrainingDataInput {
  sessionId: string;
  frameNumber: number;
  timestamp: number;
  landmarksCompressed: string;
  repNumber: number;
  phaseLabel: string;
  isValidRep: boolean;
  createdAt: Date;
}

export interface BulkSyncInput {
  sessions: SyncWorkoutSessionInput[];
  mlData: SyncMLTrainingDataInput[];
}

/**
 * Sync a single workout session to backend
 */
export async function syncWorkoutSession(input: SyncWorkoutSessionInput) {
  try {
    const response = await apolloClient.mutate({
      mutation: SYNC_WORKOUT_SESSION,
      variables: { input },
    });

    return response.data?.syncWorkoutSession;
  } catch (error) {
    console.error('❌ GraphQL Error - syncWorkoutSession:', error);
    throw error;
  }
}

/**
 * Sync ML training data batch to backend
 */
export async function syncMLTrainingData(data: SyncMLTrainingDataInput[]) {
  try {
    const response = await apolloClient.mutate({
      mutation: SYNC_ML_TRAINING_DATA,
      variables: { data },
    });

    return response.data?.syncMLTrainingData;
  } catch (error) {
    console.error('❌ GraphQL Error - syncMLTrainingData:', error);
    throw error;
  }
}

/**
 * Bulk sync - sync both sessions and ML data together
 */
export async function bulkSync(input: BulkSyncInput) {
  try {
    const response = await apolloClient.mutate({
      mutation: BULK_SYNC,
      variables: { input },
    });

    return response.data?.bulkSync;
  } catch (error) {
    console.error('❌ GraphQL Error - bulkSync:', error);
    throw error;
  }
}
