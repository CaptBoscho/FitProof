import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetup1700000000000 implements MigrationInterface {
  name = 'InitialSetup1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This is a placeholder initial migration
    // Entity-specific tables will be created when we add models
    await queryRunner.query(`
      -- Create extension for UUID generation if not exists
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Create a simple health check table for testing database connectivity
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "health_check" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" character varying NOT NULL DEFAULT 'healthy',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_health_check" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "health_check"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
