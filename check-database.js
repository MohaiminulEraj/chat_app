/**
 * Check all participant records in the database
 */

require('dotenv').config()
const { Client } = require('pg')

async function checkParticipants() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'kitty',
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password'
    })

    try {
        await client.connect()
        console.log('✅ Connected to database\n')

        // Get all participants
        const allParticipantsQuery = `
            SELECT
                id,
                "roomId",
                "userId",
                "seatNumber",
                "createdAt",
                "updatedAt"
            FROM room_participants
            ORDER BY "roomId", "userId", "seatNumber";
        `

        const result = await client.query(allParticipantsQuery)

        console.log(`Total participant records: ${result.rows.length}\n`)

        if (result.rows.length > 0) {
            console.log('All participant records:')
            console.table(result.rows)
        } else {
            console.log('No participant records found in database.')
        }

        // Check for potential duplicates by user
        const duplicateCheckQuery = `
            SELECT
                "roomId",
                "userId",
                COUNT(*) as count,
                STRING_AGG("seatNumber"::text, ', ') as seats,
                STRING_AGG(id::text, ', ') as ids
            FROM room_participants
            GROUP BY "roomId", "userId"
            ORDER BY count DESC, "roomId", "userId";
        `

        const duplicateResult = await client.query(duplicateCheckQuery)

        console.log('\n\nParticipant summary by room and user:')
        console.table(duplicateResult.rows)

        // Check if unique constraint exists
        const constraintQuery = `
            SELECT
                conname as constraint_name,
                contype as constraint_type
            FROM pg_constraint
            WHERE conrelid = 'room_participants'::regclass
            AND conname LIKE '%unique%' OR conname LIKE '%room%user%';
        `

        const constraintResult = await client.query(constraintQuery)

        console.log('\n\nUnique constraints on room_participants table:')
        if (constraintResult.rows.length > 0) {
            console.table(constraintResult.rows)
        } else {
            console.log('⚠️  No unique constraints found!')
        }
    } catch (error) {
        console.error('❌ Error:', error.message)
    } finally {
        await client.end()
    }
}

checkParticipants()
