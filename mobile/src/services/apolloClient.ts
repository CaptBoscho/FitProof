import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

// HTTP Link to connect to GraphQL server
const httpLink = createHttpLink({
  uri: CONFIG.API_URL,
});

// Auth link to add authentication token to requests
const authLink = setContext(async (_, { headers }) => {
  try {
    const token = await AsyncStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      },
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { headers };
  }
});

// Error link to handle GraphQL and network errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });
  }

  if (networkError) {
    console.error(`Network error: ${networkError}`);

    // Handle specific network errors
    if (networkError.statusCode === 401) {
      // Unauthorized - clear token and redirect to login
      AsyncStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      // TODO: Navigate to login screen
    }
  }
});

// Apollo Client instance
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      User: {
        fields: {
          // Cache user data
          totalPoints: {
            merge: true,
          },
          currentStreak: {
            merge: true,
          },
        },
      },
      Exercise: {
        fields: {
          // Cache exercise data
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

export default apolloClient;
