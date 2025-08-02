import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddReactionsToRoomComments1733856567000
    implements MigrationInterface
{
    name = 'AddReactionsToRoomComments1733856567000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "room_comments"
            ADD COLUMN "reactions" jsonb DEFAULT '{}'::jsonb
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "room_comments"
            DROP COLUMN "reactions"
        `)
    }
}
