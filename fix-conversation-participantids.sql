-- Fix conversations with null or empty participantIds
-- This script should be run to clean up any existing data issues
-- Note: participantIds is stored as text (simple-array), not PostgreSQL array

-- First, let's see if there are any conversations with null participantIds
SELECT uuid, type, "participantIds", "createdAt" 
FROM conversations 
WHERE "participantIds" IS NULL 
   OR "participantIds" = '' 
   OR length("participantIds") = 0;

-- Update conversations with null participantIds to have an empty string
-- (This is safer than deleting them)
UPDATE conversations 
SET "participantIds" = '' 
WHERE "participantIds" IS NULL;

-- If you want to delete conversations that have no participants (risky - backup first!)
-- DELETE FROM conversations 
-- WHERE "participantIds" IS NULL 
--    OR "participantIds" = '' 
--    OR length("participantIds") = 0;

-- Verify the fix
SELECT COUNT(*) as "conversations_with_null_participants"
FROM conversations 
WHERE "participantIds" IS NULL 
   OR "participantIds" = '' 
   OR length("participantIds") = 0;
