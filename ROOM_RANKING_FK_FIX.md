# Room Ranking Foreign Key Fix

## Problem

The `RoomRanking` entity was causing the error:

```
invalid input syntax for type integer: "d5cebdc0-87e7-4168-8881-1da369c2f1bb"
```

## Root Cause

The issue was in the entity definition where `@JoinColumn` decorators were not specifying which column to reference:

```typescript
// ❌ BEFORE - This caused TypeORM to reference the 'id' (integer) column by default
@ManyToOne(() => Room)
@JoinColumn({ name: 'roomId' })
room: Room

@ManyToOne(() => User)
@JoinColumn({ name: 'userId' })
user: User
```

Even though `roomId` and `userId` were defined as UUID columns, the `@JoinColumn` was trying to create a foreign key to the `id` (integer primary key) of Room and User entities, not their `uuid` fields.

## Solution

Added `referencedColumnName` to explicitly tell TypeORM to reference the UUID columns:

```typescript
// ✅ AFTER - This tells TypeORM to reference the 'uuid' column
@ManyToOne(() => Room)
@JoinColumn({ name: 'roomId', referencedColumnName: 'uuid' })
room: Room

@ManyToOne(() => User)
@JoinColumn({ name: 'userId', referencedColumnName: 'uuid' })
user: User
```

## Files Modified

1. **src/modules/room/entities/room-ranking.entity.ts**

    - Added `referencedColumnName: 'uuid'` to both `@JoinColumn` decorators

2. **src/modules/room/services/room-ranking.service.ts** (previous fix)
    - Changed delete operation to use query builder for proper UUID handling

## Database Migration Required

Run the SQL migration script to update your database schema:

```bash
psql -U your_username -d your_database -f fix-room-ranking-foreign-keys.sql
```

Or execute the SQL directly in your database client.

## Verification Steps

1. ✅ Build completed successfully
2. ✅ No TypeScript errors
3. ✅ Entity relationships properly configured
4. 🔄 After migration, test by:
    - Sending gifts in a room
    - Calling `getRoomRankings` WebSocket event
    - Check logs for successful persistence message

## Expected Log Output

After fix, you should see:

```
✅ Successfully persisted X hourly rankings for room d5cebdc0-87e7-4168-8881-1da369c2f1bb
```

Instead of:

```
❌ Failed to persist rankings for room d5cebdc0-87e7-4168-8881-1da369c2f1bb: invalid input syntax for type integer
```

## Technical Details

- **CustomBaseEntity** provides both `id: number` (PK) and `uuid: string` fields
- Default TypeORM behavior: `@JoinColumn` references the entity's primary key (`id`)
- Our use case: Need to reference the `uuid` field instead
- Solution: Explicitly specify `referencedColumnName: 'uuid'`

## Related TypeORM Documentation

- [Relations Documentation](https://typeorm.io/relations)
- [JoinColumn Options](https://typeorm.io/relations#joincolumn-options)
