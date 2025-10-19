# Seat Duplication Fix - Database Cleanup Guide

## Problem

Users are appearing in multiple seats simultaneously (e.g., sitting in both seat 3 and seat 5 at the same time). This is caused by duplicate participant records in the database.

## Root Cause

The `room_participant` table should have a unique constraint on `(roomId, userId)`, but either:

1. The constraint was never properly created
2. The constraint was dropped
3. Duplicate records existed before the constraint was added

## Solution

Run the database cleanup script to:

1. Remove all duplicate participant records
2. Add/restore the unique constraint
3. Prevent future duplicates

## Option 1: Using TypeORM Migration (Recommended)

### Step 1: Check Current Migration Status

```powershell
npm run typeorm:show
```

### Step 2: Run the Migration

```powershell
npm run typeorm:run
```

This will execute the migration file:
`src/migrations/1737000000000-AddUniqueConstraintToRoomParticipant.ts`

### Step 3: Verify Migration Success

```powershell
npm run typeorm:show
```

The migration should appear in the list of completed migrations.

## Option 2: Using SQL Script Directly

### Step 1: Connect to Your Database

```powershell
# Using psql (PostgreSQL command-line tool)
psql -U your_username -d your_database_name

# Or using your preferred database client (pgAdmin, DBeaver, etc.)
```

### Step 2: Run the Cleanup Script

```sql
-- Execute the contents of: cleanup-duplicate-participants.sql
\i cleanup-duplicate-participants.sql

# Or copy-paste the script directly into your SQL client
```

### Step 3: Verify Results

```sql
-- Check for remaining duplicates (should return 0 rows)
SELECT
    "roomId",
    "userId",
    COUNT(*) as count
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1;

-- Verify constraint exists
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'unique_room_participant';
```

## Option 3: Manual Database Cleanup (PostgreSQL)

If you prefer to run commands step-by-step:

### 1. Check for Duplicates

```sql
SELECT
    "roomId",
    "userId",
    COUNT(*) as duplicate_count,
    STRING_AGG("seatNumber"::text, ', ') as seat_numbers
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 2. Remove Duplicates (Keep Most Recent)

```sql
DELETE FROM room_participant
WHERE id NOT IN (
    SELECT DISTINCT ON ("roomId", "userId") id
    FROM room_participant
    ORDER BY "roomId", "userId", "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
);
```

### 3. Add Unique Constraint

```sql
ALTER TABLE room_participant
ADD CONSTRAINT unique_room_participant UNIQUE ("roomId", "userId");
```

### 4. Verify No Duplicates Remain

```sql
SELECT
    "roomId",
    "userId",
    COUNT(*) as count
FROM room_participant
GROUP BY "roomId", "userId"
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

## After Running the Cleanup

### 1. Restart Your NestJS Application

```powershell
npm run start:dev
# Or however you start your application
```

### 2. Test Seat Movement

1. Join a room as a user
2. Sit in seat 3
3. Move to seat 5
4. Verify user only appears in seat 5 (not in both 3 and 5)
5. Try moving to other seats (1, 2, 4, etc.)
6. Verify no duplication occurs

### 3. Check Server Logs

Look for these log messages in your NestJS console:

- `✅ Updated participant: User X now in seat Y`
- `🧹 Cleaning up N duplicate participant records before update` (if any duplicates are detected)
- `✅ Created fresh participant after cleanup` (if duplicates were found and cleaned)

### 4. Monitor for Warnings

If you see this warning, it means duplicates are still being created:

- `⚠️ Found N duplicate participant records for user X in room Y!`

## Troubleshooting

### Issue: Migration Fails with "Duplicate key violation"

**Solution:** Duplicates still exist. Run the cleanup SQL manually first, then retry the migration.

### Issue: Constraint Already Exists Error

**Solution:** Good! The constraint is already in place. Just run the duplicate cleanup part:

```sql
DELETE FROM room_participant
WHERE id NOT IN (
    SELECT DISTINCT ON ("roomId", "userId") id
    FROM room_participant
    ORDER BY "roomId", "userId", "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
);
```

### Issue: Users Still Duplicating After Cleanup

**Possible Causes:**

1. Application code wasn't restarted after database cleanup
2. Old in-memory cache needs to be cleared
3. Multiple application instances running with different code versions

**Solution:**

1. Restart ALL application instances
2. Clear any Redis/cache if applicable
3. Verify the unique constraint exists in the database

### Issue: Error "violates unique constraint"

**This is Actually Good!** This error means the constraint is working and preventing duplicates. The application code handles this gracefully by updating existing records instead of creating new ones.

## Expected Behavior After Fix

### ✅ Correct Behavior

- User sits in seat 3 → User appears ONLY in seat 3
- User moves to seat 5 → User appears ONLY in seat 5 (automatically removed from seat 3)
- User moves to seat -1 (admin) → User appears ONLY in seat -1
- User moves to seat 0 (host) → User appears ONLY in seat 0

### ❌ Bug Behavior (Before Fix)

- User sits in seat 3 → User appears in seat 3 ✓
- User moves to seat 5 → User appears in BOTH seat 3 AND seat 5 ❌
- Database has 2 participant records for the same user ❌

## Database Schema Reference

### Table: `room_participant`

```sql
CREATE TABLE room_participant (
    id UUID PRIMARY KEY,
    "roomId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seatNumber" INTEGER,
    "isMuted" BOOLEAN DEFAULT false,
    "isDeafened" BOOLEAN DEFAULT false,
    "isSharingScreen" BOOLEAN DEFAULT false,
    "isSharingVideo" BOOLEAN DEFAULT false,
    "isVideoOn" BOOLEAN DEFAULT false,
    "isSpeaking" BOOLEAN DEFAULT false,
    "joinedAt" TIMESTAMP DEFAULT NOW(),
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),

    -- Unique constraint (THIS IS CRITICAL)
    CONSTRAINT unique_room_participant UNIQUE ("roomId", "userId")
);
```

## Summary

The fix involves three layers of protection:

1. **Database Layer:** Unique constraint prevents duplicate records at the database level
2. **Application Layer:** Code detects and cleans up any existing duplicates before creating/updating records
3. **Service Layer:** Uses UPDATE instead of DELETE+INSERT for atomic seat changes

After running the cleanup and restarting your application, the seat duplication issue should be completely resolved for all seat indices.

## Date Created

January 16, 2025
