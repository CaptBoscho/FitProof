import { Query, Resolver } from 'type-graphql';
import { HealthStatus } from '../types/common';
import { checkDatabaseHealth } from '../config/database';

@Resolver()
export class HealthResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from FitProof GraphQL API!';
  }

  @Query(() => HealthStatus)
  async health(): Promise<HealthStatus> {
    const dbHealthy = await checkDatabaseHealth();

    return {
      status: dbHealthy ? 'OK' : 'Unhealthy',
      timestamp: new Date(),
      service: 'FitProof Backend',
      database: dbHealthy ? 'Connected' : 'Disconnected',
    };
  }
}
