import { MigrationInterface, QueryRunner } from 'typeorm'

export class RemoveCapacityFromRooms1722631800000
    implements MigrationInterface
{
    name = 'RemoveCapacityFromRooms1722631800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove the capacity column from the rooms table
        await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "capacity"`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add back the capacity column with default value 100
        await queryRunner.query(
            `ALTER TABLE "rooms" ADD "capacity" integer NOT NULL DEFAULT '100'`
        )
    }
}
