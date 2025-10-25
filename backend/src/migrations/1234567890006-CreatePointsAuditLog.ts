import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreatePointsAuditLog1234567890006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create points_audit_log table
    await queryRunner.createTable(
      new Table({
        name: 'points_audit_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'session_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'points_change',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'points_before',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'points_after',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'points_audit_log',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Create foreign key to workout_sessions table
    await queryRunner.createForeignKey(
      'points_audit_log',
      new TableForeignKey({
        columnNames: ['session_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'workout_sessions',
        onDelete: 'SET NULL',
      })
    );

    // Create index on user_id and created_at for efficient queries
    await queryRunner.createIndex(
      'points_audit_log',
      new TableIndex({
        name: 'IDX_points_audit_user_date',
        columnNames: ['user_id', 'created_at'],
      })
    );

    // Create index on session_id
    await queryRunner.createIndex(
      'points_audit_log',
      new TableIndex({
        name: 'IDX_points_audit_session',
        columnNames: ['session_id'],
      })
    );

    // Create index on action for analytics
    await queryRunner.createIndex(
      'points_audit_log',
      new TableIndex({
        name: 'IDX_points_audit_action',
        columnNames: ['action'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('points_audit_log', 'IDX_points_audit_action');
    await queryRunner.dropIndex('points_audit_log', 'IDX_points_audit_session');
    await queryRunner.dropIndex('points_audit_log', 'IDX_points_audit_user_date');

    // Drop foreign keys
    const table = await queryRunner.getTable('points_audit_log');
    if (table) {
      const userFk = table.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
      const sessionFk = table.foreignKeys.find(fk => fk.columnNames.indexOf('session_id') !== -1);

      if (userFk) await queryRunner.dropForeignKey('points_audit_log', userFk);
      if (sessionFk) await queryRunner.dropForeignKey('points_audit_log', sessionFk);
    }

    // Drop table
    await queryRunner.dropTable('points_audit_log');
  }
}
