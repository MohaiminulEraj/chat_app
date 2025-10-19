-- =========================================================
-- CLEANUP DUPLICATE ROOM PARTICIPANTS
-- =========================================================
-- This script fixes the issue where users appear in multiple
-- seats simultaneously by removing duplicate participant records
-- and adding a unique constraint to prevent future duplicates.
-- =========================================================

-- Step 1: Show current duplicates (for debugging)
SELECT
    "roomId",
    "userId",
    COUNT(*) as duplicate_count,
    STRING_AGG("seatNumber"::text, ', ') as seat_numbers
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Step 2: Create a temporary table to store the records we want to keep
-- (Keep the most recent record for each user in each room)
CREATE TEMP TABLE participants_to_keep AS
SELECT DISTINCT ON ("roomId", "userId")
    id,
    "roomId",
    "userId",
    "seatNumber",
    "createdAt",
    "updatedAt"
FROM room_participant
ORDER BY "roomId", "userId", "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST;

-- Step 3: Count how many duplicates will be removed
SELECT
    COUNT(*) as total_participants,
    (SELECT COUNT(*) FROM participants_to_keep) as participants_to_keep,
    COUNT(*) - (SELECT COUNT(*) FROM participants_to_keep) as duplicates_to_remove
FROM room_participant;

-- Step 4: Delete duplicate records (keep only the ones in our temp table)
DELETE FROM room_participant
WHERE id NOT IN (SELECT id FROM participants_to_keep);

-- Step 5: Verify no duplicates remain
SELECT
    "roomId",
    "userId",
    COUNT(*) as count
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- Step 6: Add unique constraint to prevent future duplicates
-- First, check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_room_participant'
    ) THEN
        ALTER TABLE room_participant
        ADD CONSTRAINT unique_room_participant UNIQUE ("roomId", "userId");

        RAISE NOTICE 'Unique constraint "unique_room_participant" created successfully';
    ELSE
        RAISE NOTICE 'Unique constraint "unique_room_participant" already exists';
    END IF;
END $$;

-- Step 7: Verify the constraint was added
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'unique_room_participant';

-- Step 8: Final verification - show all participants grouped by room
SELECT
    r.name as room_name,
    rp."roomId",
    COUNT(*) as total_participants,
    STRING_AGG(u.name || ' (seat ' || rp."seatNumber" || ')', ', ') as participants
FROM room_participant rp
JOIN room r ON r.uuid = rp."roomId"
LEFT JOIN "user" u ON u.uuid = rp."userId"
GROUP BY r.name, rp."roomId"
ORDER BY total_participants DESC;

-- =========================================================
-- CLEANUP COMPLETE
-- =========================================================
-- Summary:
-- ✅ Removed duplicate participant records
-- ✅ Added unique constraint to prevent future duplicates
-- ✅ Each user can now only occupy ONE seat per room
-- =========================================================
