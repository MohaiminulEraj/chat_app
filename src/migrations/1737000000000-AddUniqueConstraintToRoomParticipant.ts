import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUniqueConstraintToRoomParticipant1737000000000
    implements MigrationInterface
{
    name = 'AddUniqueConstraintToRoomParticipant1737000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Step 1: Log current state
        console.log('🔍 Checking for duplicate participant records...')

        const duplicates = await queryRunner.query(`
            SELECT
                "roomId",
                "userId",
                COUNT(*) as duplicate_count,
                STRING_AGG("seatNumber"::text, ', ') as seat_numbers
            FROM room_participant
            GROUP BY "roomId", "userId"
            HAVING COUNT(*) > 1
            ORDER BY duplicate_count DESC
        `)

        if (duplicates.length > 0) {
            console.log(
                `⚠️ Found ${duplicates.length} users with duplicate records:`
            )
            duplicates.forEach((dup: any) => {
                console.log(
                    `   - Room: ${dup.roomId}, User: ${dup.userId}, ` +
                        `Duplicates: ${dup.duplicate_count}, Seats: ${dup.seat_numbers}`
                )
            })
        } else {
            console.log('✅ No duplicate records found')
        }

        // Step 2: Remove duplicates - keep only the most recent record
        console.log('🧹 Removing duplicate records (keeping most recent)...')

        await queryRunner.query(`
            DELETE FROM room_participant
            WHERE id NOT IN (
                SELECT DISTINCT ON ("roomId", "userId") id
                FROM room_participant
                ORDER BY "roomId", "userId", "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
            )
        `)

        // Step 3: Verify cleanup
        const remainingDuplicates = await queryRunner.query(`
            SELECT COUNT(*) as count
            FROM (
                SELECT "roomId", "userId", COUNT(*) as dup_count
                FROM room_participant
                GROUP BY "roomId", "userId"
                HAVING COUNT(*) > 1
            ) duplicates
        `)

        if (remainingDuplicates[0]?.count > 0) {
            throw new Error(
                `❌ Failed to clean up duplicates. ${remainingDuplicates[0].count} duplicates still exist.`
            )
        }

        console.log('✅ All duplicate records removed successfully')

        // Step 4: Add unique constraint
        console.log('🔒 Adding unique constraint...')

        await queryRunner.query(`
            ALTER TABLE "room_participant"
            ADD CONSTRAINT "unique_room_participant" UNIQUE ("roomId", "userId")
        `)

        console.log('✅ Unique constraint added successfully')
        console.log(
            '✅ Migration complete - users can now only occupy ONE seat per room'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the unique constraint
        console.log('🔓 Removing unique constraint...')

        await queryRunner.query(`
            ALTER TABLE "room_participant"
            DROP CONSTRAINT IF EXISTS "unique_room_participant"
        `)

        console.log('✅ Unique constraint removed')
    }
}
