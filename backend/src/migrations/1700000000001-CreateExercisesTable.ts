import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExercisesTable1700000000001 implements MigrationInterface {
  name = 'CreateExercisesTable1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "exercises" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "points_per_rep" integer NOT NULL,
        "description" text,
        "validation_rules" text,
        "category" character varying(50),
        "icon_color" character varying(7),
        "instruction_text" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_exercises" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_exercises_name" UNIQUE ("name")
      )
    `);

    // Create index for faster queries
    await queryRunner.query(`
      CREATE INDEX "IDX_exercises_category" ON "exercises" ("category");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_exercises_is_active" ON "exercises" ("is_active");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercises_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_exercises_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exercises"`);
  }
}