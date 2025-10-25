import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateDevicesTable1234567890005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create devices table
    await queryRunner.createTable(
      new Table({
        name: 'devices',
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
            name: 'device_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'device_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'os_version',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'app_version',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'is_tablet',
            type: 'boolean',
            default: false,
          },
          {
            name: 'last_active_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'registered_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'devices',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Create unique index on user_id + device_id
    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_user_device',
        columnNames: ['user_id', 'device_id'],
        isUnique: true,
      })
    );

    // Create index on last_active_at for cleanup queries
    await queryRunner.createIndex(
      'devices',
      new TableIndex({
        name: 'IDX_devices_last_active',
        columnNames: ['last_active_at'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('devices', 'IDX_devices_last_active');
    await queryRunner.dropIndex('devices', 'IDX_devices_user_device');

    // Drop foreign keys
    const table = await queryRunner.getTable('devices');
    const foreignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf('user_id') !== -1);
    if (foreignKey) {
      await queryRunner.dropForeignKey('devices', foreignKey);
    }

    // Drop table
    await queryRunner.dropTable('devices');
  }
}
