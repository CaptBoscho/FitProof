import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema } from 'type-graphql';
import { connectToDatabase, checkDatabaseHealth } from './config/database';
import { HealthResolver } from './resolvers/HealthResolver';
import { ExerciseResolver } from './resolvers/ExerciseResolver';
import { UserResolver } from './resolvers/UserResolver';
import { WorkoutSessionResolver } from './resolvers/WorkoutSessionResolver';
import { AuthResolver } from './resolvers/AuthResolver';
import { SyncResolver } from './resolvers/SyncResolver';
import { createAuthContext } from './middleware/AuthMiddleware';
import {
  refreshTokenHandler,
  validateTokenHandler,
  passwordResetRequestHandler,
  passwordResetConfirmHandler,
  passwordResetValidateHandler
} from './middleware/AuthMiddleware';
import { JwtService } from './services/JwtService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Validate JWT configuration
    const jwtValidation = JwtService.validateConfiguration();
    if (!jwtValidation.isValid) {
      console.warn('⚠️  JWT Configuration Issues:');
      jwtValidation.errors.forEach(error => console.warn(`   - ${error}`));
      console.warn('   Using fallback secrets for development');
    }

    // Connect to database first
    await connectToDatabase();

    // Build schema with all resolvers
    const schema = await buildSchema({
      resolvers: [HealthResolver, ExerciseResolver, UserResolver, WorkoutSessionResolver, AuthResolver, SyncResolver],
      validate: false
    });

    const server = new ApolloServer({
      schema,
      introspection: true, // Enable for development
    });

    // Start GraphQL server
    const { url } = await startStandaloneServer(server, {
      listen: { port: PORT as number, host: '0.0.0.0' },
      context: async ({ req }) => {
        // Add authentication context to GraphQL
        const authContext = createAuthContext(req as any);
        return authContext;
      },
    });

    console.log(`🚀 GraphQL server ready at ${url}`);
    console.log(`💚 Health check available in GraphQL playground`);
    console.log(`🔐 Authentication context enabled`);

    // Start separate Express server for REST endpoints on different port
    const restPort = parseInt(PORT as string) + 1;
    const restApp = createExpressApp();

    restApp.listen(restPort, '0.0.0.0', () => {
      console.log(`🔗 REST endpoints available at http://0.0.0.0:${restPort}/auth/*`);
      console.log(`💚 Health check available at http://0.0.0.0:${restPort}/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Also create Express app for REST endpoints
export function createExpressApp() {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint
  app.get('/health', async (_req, res) => {
    const dbHealthy = await checkDatabaseHealth();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'OK' : 'Unhealthy',
      timestamp: new Date().toISOString(),
      service: 'FitProof Backend',
      database: dbHealthy ? 'Connected' : 'Disconnected'
    });
  });

  // JWT endpoints
  app.post('/auth/refresh', refreshTokenHandler);
  app.post('/auth/validate', validateTokenHandler);

  // Password reset endpoints
  app.post('/auth/password-reset/request', passwordResetRequestHandler);
  app.post('/auth/password-reset/confirm', passwordResetConfirmHandler);
  app.post('/auth/password-reset/validate', passwordResetValidateHandler);

  // JWT configuration validation endpoint
  app.get('/auth/config', (_req, res) => {
    const validation = JwtService.validateConfiguration();
    res.json({
      isValid: validation.isValid,
      errors: validation.errors,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  return app;
}

// Start the GraphQL server
if (require.main === module) {
  startServer();
}

// Export for testing
export { startServer };