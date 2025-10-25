import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddStreakFields1234567890007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add longest_streak column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'longest_streak',
        type: 'int',
        default: 0,
      })
    );

    // Add rest_days_used column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'rest_days_used',
        type: 'int',
        default: 0,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'rest_days_used');
    await queryRunner.dropColumn('users', 'longest_streak');
  }
}
