/**
 * Add UNIQUE constraint to room_participants table
 */

require('dotenv').config()
const { Client } = require('pg')

async function addConstraint() {
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

        console.log('Adding UNIQUE constraint to room_participants table...')

        const addConstraintQuery = `
            ALTER TABLE room_participants
            ADD CONSTRAINT unique_room_participant UNIQUE ("roomId", "userId");
        `

        try {
            await client.query(addConstraintQuery)
            console.log('✅ UNIQUE constraint added successfully!')
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ UNIQUE constraint already exists')
            } else {
                throw error
            }
        }

        // Verify the constraint
        const verifyQuery = `
            SELECT
                conname as constraint_name,
                contype as constraint_type
            FROM pg_constraint
            WHERE conname = 'unique_room_participant';
        `

        const result = await client.query(verifyQuery)

        console.log('\nConstraint verified:')
        console.table(result.rows)

        console.log(
            '\n✅ Database is now protected against duplicate participants!'
        )
        console.log('   Each user can only have ONE record per room.\n')
    } catch (error) {
        console.error('❌ Error:', error.message)
    } finally {
        await client.end()
    }
}

addConstraint()
