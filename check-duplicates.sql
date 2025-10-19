-- ====================================================================
-- CHECK FOR DUPLICATE PARTICIPANTS
-- Run this to see if you still have duplicate records in the database
-- ====================================================================

-- Show all duplicate participant records
SELECT
    "roomId",
    "userId",
    COUNT(*) as duplicate_count,
    STRING_AGG("seatNumber"::text, ', ') as seat_numbers,
    STRING_AGG(id::text, ', ') as record_ids
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Show total count of duplicate records
SELECT
    COUNT(*) as total_duplicates,
    SUM(cnt - 1) as records_to_delete
FROM (
    SELECT "roomId", "userId", COUNT(*) as cnt
    FROM room_participant
    GROUP BY "roomId", "userId"
    HAVING COUNT(*) > 1
) duplicates;

-- Show all participants (for debugging)
SELECT
    id,
    "roomId",
    "userId",
    "seatNumber",
    "updatedAt",
    "createdAt"
FROM room_participant
ORDER BY "roomId", "userId", "seatNumber";
