import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddRoomAvatarUrl1722640000000 implements MigrationInterface {
    name = 'AddRoomAvatarUrl1722640000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add roomAvatarUrl column to the rooms table
        await queryRunner.query(
            `ALTER TABLE "rooms" ADD "roomAvatarUrl" character varying`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the roomAvatarUrl column from the rooms table
        await queryRunner.query(
            `ALTER TABLE "rooms" DROP COLUMN "roomAvatarUrl"`
        )
    }
}
