/**
 * ====================================================================
 * CLEANUP DUPLICATE PARTICIPANTS - Node.js Script
 * ====================================================================
 * This script will clean up duplicate participant records from the database
 * using your existing TypeORM connection.
 * ====================================================================
 */

require('dotenv').config()
const { Client } = require('pg')

async function cleanupDuplicates() {
    console.log(
        '====================================================================='
    )
    console.log('  DUPLICATE PARTICIPANTS CLEANUP')
    console.log(
        '====================================================================='
    )
    console.log('')

    // Create database connection
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'kitty',
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    })

    try {
        console.log('Connecting to database...')
        console.log(`  Host: ${client.host}`)
        console.log(`  Port: ${client.port}`)
        console.log(`  Database: ${client.database}`)
        console.log(`  User: ${client.user}`)
        console.log('')

        await client.connect()
        console.log('✅ Connected successfully!\n')

        // Step 1: Check for duplicates
        console.log('Step 1: Checking for duplicate records...')
        console.log('')

        const checkQuery = `
            SELECT
                COUNT(*) as duplicate_groups,
                SUM(cnt - 1) as records_to_delete
            FROM (
                SELECT "roomId", "userId", COUNT(*) as cnt
                FROM room_participants
                GROUP BY "roomId", "userId"
                HAVING COUNT(*) > 1
            ) duplicates;
        `

        const checkResult = await client.query(checkQuery)
        const duplicateGroups = parseInt(
            checkResult.rows[0]?.duplicate_groups || 0
        )
        const recordsToDelete = parseInt(
            checkResult.rows[0]?.records_to_delete || 0
        )

        console.log(`Found ${duplicateGroups} groups of duplicates`)
        console.log(`Will delete ${recordsToDelete} duplicate records`)
        console.log('')

        if (duplicateGroups === 0) {
            console.log('✅ No duplicates found! Database is clean.')
            await client.end()
            return
        }

        // Step 2: Show sample duplicates
        console.log('Step 2: Sample duplicate records:')
        console.log('')

        const showDuplicatesQuery = `
            SELECT
                "roomId",
                "userId",
                COUNT(*) as duplicate_count,
                STRING_AGG("seatNumber"::text, ', ') as seat_numbers
            FROM room_participants
            GROUP BY "roomId", "userId"
            HAVING COUNT(*) > 1
            LIMIT 5;
        `

        const samplesResult = await client.query(showDuplicatesQuery)
        console.table(samplesResult.rows)
        console.log('')

        // Step 3: Clean up duplicates
        console.log('Step 3: Cleaning up duplicates...')
        console.log('')

        // Remove duplicates keeping the most recent record
        const cleanupQuery = `
            DELETE FROM room_participants
            WHERE id NOT IN (
                SELECT DISTINCT ON ("roomId", "userId") id
                FROM room_participants
                ORDER BY "roomId", "userId", "updatedAt" DESC NULLS LAST
            );
        `

        const deleteResult = await client.query(cleanupQuery)
        console.log(`✅ Deleted ${deleteResult.rowCount} duplicate records`)
        console.log('')

        // Step 4: Add unique constraint
        console.log('Step 4: Adding UNIQUE constraint...')
        console.log('')

        const constraintQuery = `
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'unique_room_participant'
                ) THEN
                    ALTER TABLE room_participants
                    ADD CONSTRAINT unique_room_participant UNIQUE ("roomId", "userId");
                    RAISE NOTICE 'UNIQUE constraint added successfully';
                ELSE
                    RAISE NOTICE 'UNIQUE constraint already exists';
                END IF;
            END $$;
        `

        await client.query(constraintQuery)
        console.log('✅ UNIQUE constraint is in place')
        console.log('')

        // Step 5: Verify cleanup
        console.log('Step 5: Verifying cleanup...')
        console.log('')

        const verifyResult = await client.query(checkQuery)
        const remainingDuplicates = parseInt(
            verifyResult.rows[0]?.duplicate_groups || 0
        )

        if (remainingDuplicates === 0) {
            console.log('✅ Verification passed: No duplicates remain!')
        } else {
            console.log(
                `⚠️  Warning: ${remainingDuplicates} duplicates still found!`
            )
        }
        console.log('')

        // Step 6: Verify constraint
        console.log('Step 6: Verifying constraint...')
        console.log('')

        const verifyConstraintQuery = `
            SELECT
                conname as constraint_name,
                contype as constraint_type
            FROM pg_constraint
            WHERE conname = 'unique_room_participant';
        `

        const constraintResult = await client.query(verifyConstraintQuery)
        if (constraintResult.rows.length > 0) {
            console.log('✅ UNIQUE constraint verified:')
            console.table(constraintResult.rows)
        }
        console.log('')

        console.log(
            '====================================================================='
        )
        console.log('✅ CLEANUP COMPLETED SUCCESSFULLY!')
        console.log(
            '====================================================================='
        )
        console.log('')
        console.log('Next steps:')
        console.log('  1. Restart your NestJS application')
        console.log('  2. Test seat movements in your app')
        console.log('  3. Verify users can only sit in one seat at a time')
        console.log('')
    } catch (error) {
        console.error('❌ Error during cleanup:')
        console.error(error.message)
        console.error(error.stack)
    } finally {
        await client.end()
        console.log('Database connection closed.')
    }
}

// Run the cleanup
cleanupDuplicates()
    .then(() => {
        console.log('\n✅ Script completed.')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Script failed:', error)
        process.exit(1)
    })
