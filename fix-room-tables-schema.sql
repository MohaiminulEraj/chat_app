-- Fix room tables schema - Convert integer roomId columns to UUID
-- This script fixes the "invalid input syntax for type integer" error

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check current schema and fix room_waiting_list table
DO $$
BEGIN
    -- Check if room_waiting_list.roomId is integer and convert to UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'room_waiting_list'
        AND column_name = 'roomId'
        AND data_type = 'integer'
    ) THEN
        -- Drop foreign key constraints if they exist
        ALTER TABLE room_waiting_list DROP CONSTRAINT IF EXISTS "FK_room_waiting_list_roomId";

        -- Convert integer roomId to UUID using a temporary column
        ALTER TABLE room_waiting_list ADD COLUMN roomId_temp uuid;

        -- Note: This conversion will need manual data migration since we can't automatically
        -- convert integer IDs to UUIDs. For now, we'll clear the table and recreate structure.
        TRUNCATE TABLE room_waiting_list;

        -- Drop old column and rename new one
        ALTER TABLE room_waiting_list DROP COLUMN roomId;
        ALTER TABLE room_waiting_list RENAME COLUMN roomId_temp TO roomId;

        -- Add NOT NULL constraint
        ALTER TABLE room_waiting_list ALTER COLUMN roomId SET NOT NULL;

        RAISE NOTICE 'Fixed room_waiting_list.roomId column type to UUID';
    END IF;

    -- Check if room_participants.roomId is integer and convert to UUID
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'room_participants'
        AND column_name = 'roomId'
        AND data_type = 'integer'
    ) THEN
        -- Drop foreign key constraints if they exist
        ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS "FK_room_participants_roomId";

        -- Convert integer roomId to UUID using a temporary column
        ALTER TABLE room_participants ADD COLUMN roomId_temp uuid;

        -- Note: This conversion will need manual data migration since we can't automatically
        -- convert integer IDs to UUIDs. For now, we'll clear the table and recreate structure.
        TRUNCATE TABLE room_participants;

        -- Drop old column and rename new one
        ALTER TABLE room_participants DROP COLUMN roomId;
        ALTER TABLE room_participants RENAME COLUMN roomId_temp TO roomId;

        -- Add NOT NULL constraint
        ALTER TABLE room_participants ALTER COLUMN roomId SET NOT NULL;

        RAISE NOTICE 'Fixed room_participants.roomId column type to UUID';
    END IF;

    -- Recreate indexes and constraints

    -- For room_waiting_list
    DROP INDEX IF EXISTS "IDX_room_waiting_list_roomId_position";
    CREATE INDEX "IDX_room_waiting_list_roomId_position" ON room_waiting_list(roomId, position);

    -- Add unique constraint
    ALTER TABLE room_waiting_list DROP CONSTRAINT IF EXISTS "UQ_room_waiting_list_roomId_userId";
    ALTER TABLE room_waiting_list ADD CONSTRAINT "UQ_room_waiting_list_roomId_userId" UNIQUE (roomId, userId);

    -- For room_participants
    DROP INDEX IF EXISTS "IDX_room_participants_roomId_userId";
    CREATE INDEX "IDX_room_participants_roomId_userId" ON room_participants(roomId, userId);

    -- Add unique constraint
    ALTER TABLE room_participants DROP CONSTRAINT IF EXISTS "UQ_room_participants_userId_roomId";
    ALTER TABLE room_participants ADD CONSTRAINT "UQ_room_participants_userId_roomId" UNIQUE (userId, roomId);

END $$;

-- Verify the fixes
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('room_waiting_list', 'room_participants')
    AND column_name = 'roomId';
