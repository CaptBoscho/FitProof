import { DataSource } from 'typeorm';
import { databaseConfig } from './database';

// DataSource for TypeORM CLI
export default new DataSource(databaseConfig);