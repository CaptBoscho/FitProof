import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateMLTrainingDataTable1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'ml_training_data',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'frame_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'timestamp',
            type: 'float',
            isNullable: false,
          },
          {
            name: 'landmarks_compressed',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'rep_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'phase_label',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'is_valid_rep',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create foreign key to workout_sessions
    await queryRunner.createForeignKey(
      'ml_training_data',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'workout_sessions',
        onDelete: 'CASCADE',
      })
    );

    // Create index on session_id for faster queries
    await queryRunner.query(
      `CREATE INDEX "IDX_ml_training_data_session_id" ON "ml_training_data" ("session_id")`
    );

    // Create index on frame_number for ordering
    await queryRunner.query(
      `CREATE INDEX "IDX_ml_training_data_frame_number" ON "ml_training_data" ("frame_number")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_ml_training_data_frame_number"`);
    await queryRunner.query(`DROP INDEX "IDX_ml_training_data_session_id"`);

    // Drop foreign key
    const table = await queryRunner.getTable('ml_training_data');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        fk => fk.columnNames.indexOf('session_id') !== -1
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('ml_training_data', foreignKey);
      }
    }

    // Drop table
    await queryRunner.dropTable('ml_training_data');
  }
}
