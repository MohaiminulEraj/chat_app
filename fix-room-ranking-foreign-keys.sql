-- Fix RoomRanking foreign key references to use UUID instead of integer IDs
-- This script updates the room_rankings table to properly reference Room and User UUIDs

-- Drop existing foreign key constraints if they exist
ALTER TABLE room_rankings
DROP CONSTRAINT IF EXISTS "FK_room_rankings_room",
DROP CONSTRAINT IF EXISTS "FK_room_rankings_user";

-- Ensure roomId and userId columns are UUID type
ALTER TABLE room_rankings
ALTER COLUMN "roomId" TYPE uuid USING "roomId"::uuid,
ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;

-- Add new foreign key constraints that reference the uuid columns
ALTER TABLE room_rankings
ADD CONSTRAINT "FK_room_rankings_room"
FOREIGN KEY ("roomId") REFERENCES rooms(uuid) ON DELETE CASCADE,
ADD CONSTRAINT "FK_room_rankings_user"
FOREIGN KEY ("userId") REFERENCES users(uuid) ON DELETE CASCADE;

-- Verify the changes
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'room_rankings';

-- Expected output:
-- FK_room_rankings_room  | room_rankings | roomId | rooms | uuid
-- FK_room_rankings_user  | room_rankings | userId | users | uuid
