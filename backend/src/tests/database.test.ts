import { databaseConfig } from '../config/database';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

describe('Database Configuration', () => {
  test('should have valid database configuration', () => {
    const config = databaseConfig as PostgresConnectionOptions;
    expect(config.type).toBe('postgres');
    expect(config.host).toBeDefined();
    expect(config.port).toBe(5433);
    expect(config.username).toBeDefined();
    expect(config.password).toBeDefined();
    expect(config.database).toBeDefined();
  });

  test('should include required configuration options', () => {
    expect(databaseConfig.entities).toBeDefined();
    expect(databaseConfig.migrations).toBeDefined();
    expect(databaseConfig.synchronize).toBeDefined();
    expect(databaseConfig.logging).toBeDefined();
  });

  test('should have environment-based configuration', () => {
    // In test environment, we expect certain settings
    if (process.env.NODE_ENV === 'test') {
      expect(databaseConfig.dropSchema).toBe(true);
    }
  });
});
