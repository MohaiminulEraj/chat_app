import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixRoomTableUuidTypes1733858000000 implements MigrationInterface {
    name = 'FixRoomTableUuidTypes1733858000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable UUID extension if not already enabled
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)

        // Check and fix room_waiting_list table
        const waitingListColumns = await queryRunner.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'room_waiting_list' AND column_name = 'roomId'
        `)

        if (
            waitingListColumns.length > 0 &&
            waitingListColumns[0].data_type === 'integer'
        ) {
            console.log('Fixing room_waiting_list.roomId column type...')

            // Drop constraints
            await queryRunner.query(
                `ALTER TABLE room_waiting_list DROP CONSTRAINT IF EXISTS "UQ_room_waiting_list_roomId_userId"`
            )
            await queryRunner.query(
                `ALTER TABLE room_waiting_list DROP CONSTRAINT IF EXISTS "FK_room_waiting_list_roomId"`
            )

            // Since we can't directly convert integer to UUID, we need to clear and recreate
            await queryRunner.query(`TRUNCATE TABLE room_waiting_list`)

            // Add new UUID column
            await queryRunner.query(
                `ALTER TABLE room_waiting_list ADD COLUMN roomId_new uuid`
            )

            // Drop old column
            await queryRunner.query(
                `ALTER TABLE room_waiting_list DROP COLUMN "roomId"`
            )

            // Rename new column
            await queryRunner.query(
                `ALTER TABLE room_waiting_list RENAME COLUMN roomId_new TO "roomId"`
            )

            // Set NOT NULL
            await queryRunner.query(
                `ALTER TABLE room_waiting_list ALTER COLUMN "roomId" SET NOT NULL`
            )

            // Recreate constraints
            await queryRunner.query(
                `ALTER TABLE room_waiting_list ADD CONSTRAINT "UQ_room_waiting_list_roomId_userId" UNIQUE ("roomId", "userId")`
            )
        }

        // Check and fix room_participants table
        const participantsColumns = await queryRunner.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'room_participants' AND column_name = 'roomId'
        `)

        if (
            participantsColumns.length > 0 &&
            participantsColumns[0].data_type === 'integer'
        ) {
            console.log('Fixing room_participants.roomId column type...')

            // Drop constraints
            await queryRunner.query(
                `ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS "UQ_room_participants_userId_roomId"`
            )
            await queryRunner.query(
                `ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS "FK_room_participants_roomId"`
            )

            // Since we can't directly convert integer to UUID, we need to clear and recreate
            await queryRunner.query(`TRUNCATE TABLE room_participants`)

            // Add new UUID column
            await queryRunner.query(
                `ALTER TABLE room_participants ADD COLUMN roomId_new uuid`
            )

            // Drop old column
            await queryRunner.query(
                `ALTER TABLE room_participants DROP COLUMN "roomId"`
            )

            // Rename new column
            await queryRunner.query(
                `ALTER TABLE room_participants RENAME COLUMN roomId_new TO "roomId"`
            )

            // Set NOT NULL
            await queryRunner.query(
                `ALTER TABLE room_participants ALTER COLUMN "roomId" SET NOT NULL`
            )

            // Recreate constraints
            await queryRunner.query(
                `ALTER TABLE room_participants ADD CONSTRAINT "UQ_room_participants_userId_roomId" UNIQUE ("userId", "roomId")`
            )
        }

        console.log('Room table UUID type fixes completed')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: This is a destructive migration, down migration would lose data
        console.log(
            'Warning: Cannot safely revert UUID type fixes without data loss'
        )
    }
}
