import 'reflect-metadata';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema } from 'type-graphql';
import { connectToDatabase, checkDatabaseHealth } from './config/database';
import { HealthResolver } from './resolvers/HealthResolver';
import { ExerciseResolver } from './resolvers/ExerciseResolver';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();

    // Build schema with all resolvers
    const schema = await buildSchema({
      resolvers: [HealthResolver, ExerciseResolver],
      validate: false
    });

    const server = new ApolloServer({
      schema,
      introspection: true, // Enable for development
    });

    // Start the server using standalone server for simplicity
    const { url } = await startStandaloneServer(server, {
      listen: { port: PORT as number },
      context: async () => {
        // Will add authentication context later
        return {};
      },
    });

    console.log(`🚀 GraphQL server ready at ${url}`);
    console.log(`💚 Health check available in GraphQL playground`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Also create Express app for health check
export function createExpressApp() {
  const app = express();

  app.get('/health', async (_req, res) => {
    const dbHealthy = await checkDatabaseHealth();

    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'OK' : 'Unhealthy',
      timestamp: new Date().toISOString(),
      service: 'FitProof Backend',
      database: dbHealthy ? 'Connected' : 'Disconnected'
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