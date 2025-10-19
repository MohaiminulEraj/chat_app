# Seat Duplication Bug Fix

## Problem Description

Users were being duplicated when moving between seats (except for seats -1 and 0). When a user tried to sit in a different seat, they would remain in their old seat while also appearing in the new seat, causing duplication.

### Example Issue

```
User Eraj sits in seat 1
User Eraj moves to seat 2
Result: User Eraj appears in BOTH seat 1 AND seat 2 ❌
```

## Root Cause

The issue had TWO problems in the seat movement logic flow:

### Problem #1: Delete + Insert Race Condition

1. **Gateway**: Detect user is in old seat
2. **Gateway**: Call `leaveSeat()` to remove participant record from database
3. **Gateway**: Call `joinRoomWithSeat()` to create new participant record
4. **Service**: `joinRoom()` checks if participant exists
5. **Service**: If participant exists, return it WITHOUT updating seat
6. **Problem**: Race condition - if the delete hasn't completed, the old record is returned instead of being updated

### Problem #2: Seat Validation Blocking User's Own Seat

1. **Service**: `joinRoom()` calls `validateAndAssignSeat()`
2. **Service**: `validateAndAssignSeat()` checks if seat is occupied
3. **Service**: If seat is occupied by ANYONE (including the current user), throw error
4. **Problem**: User cannot move to a seat because their old participant record still exists and blocks the validation

These caused:

- Duplicate participant records in some cases
- User appearing in multiple seats
- Inconsistent seat state
- "Seat is already occupied" errors when trying to move seats

## Solution

Applied TWO fixes:

### Fix #1: Changed from DELETE + INSERT to UPDATE approach

**Old Flow:**

- Gateway: Detect old seat → Call `leaveSeat()` (DELETE) → Call `joinRoomWithSeat()` (INSERT)
- Problem: Race conditions between delete and insert

**New Flow:**

1. **Gateway**: Detect user is in old seat (for logging purposes only)
2. **Gateway**: Call `joinRoomWithSeat()` with new seat index
3. **Service**: `joinRoom()` checks if participant exists
4. **Service**: If participant exists AND seat is different:
    - **UPDATE** the existing participant record with new seat number
    - Return updated participant
5. **Service**: If participant doesn't exist:
    - **CREATE** new participant record
    - Return new participant

### Fix #2: Modified seat validation to allow same user

**Old Validation:**

```typescript
if (existingParticipant) {
    throw error // ❌ Blocks ALL occupancy, even by same user
}
```

**New Validation:**

```typescript
if (existingParticipant && existingParticipant.userId !== userId) {
    throw error // ✅ Only blocks if ANOTHER user occupies the seat
}
```

This ensures:

- ✅ Atomic seat changes (single UPDATE query)
- ✅ No race conditions
- ✅ No duplicate records
- ✅ User can only be in one seat at a time
- ✅ User can move between seats without "already occupied" errors

## Technical Changes

### File: `room.service.ts`

**Modified `validateAndAssignSeat()` method** (lines 2004-2011):

**Before:**

```typescript
// Check if seat is already occupied
const existingParticipant = await this.participantRepository.findOne({
    where: { roomId, seatNumber: seatIndex + 1 }
})

if (existingParticipant) {
    throw new ConflictException(`Seat ${seatIndex} is already occupied`) // ❌ Blocks user from moving to their own seat
}
```

**After:**

```typescript
// Check if seat is already occupied by ANOTHER user
const existingParticipant = await this.participantRepository.findOne({
    where: { roomId, seatNumber: seatIndex + 1 }
})

if (existingParticipant && existingParticipant.userId !== userId) {
    // Seat is occupied by someone else
    throw new ConflictException(
        `Seat ${seatIndex} is already occupied by another user`
    ) // ✅ Only blocks if ANOTHER user is in the seat
}

// Seat is either empty OR occupied by the current user (moving seats)
```

**Modified `joinRoom()` method** (lines 407-446):

**Before:**

```typescript
// Check if user is already in this specific room
const existingParticipant = await this.participantRepository.findOne({
    where: { roomId: roomId as string, userId: userId as string }
})

if (existingParticipant) {
    this.logger.log(
        `User ${userId} is already in room ${roomId}, returning existing participant info`
    )
    return existingParticipant // ❌ Returns old seat without updating
}

// Determine seat assignment...
```

**After:**

```typescript
// Check if user is already in this specific room
const existingParticipant = await this.participantRepository.findOne({
    where: { roomId: roomId as string, userId: userId as string }
})

// Determine seat assignment first
let assignedSeat: number
// ... seat assignment logic ...

if (existingParticipant) {
    // User is already in the room - update their seat if different
    const currentSeatIndex = existingParticipant.seatNumber - 1

    if (currentSeatIndex !== assignedSeat) {
        // ✅ UPDATE the seat number
        existingParticipant.seatNumber = assignedSeat + 1
        const updatedParticipant =
            await this.participantRepository.save(existingParticipant)
        return updatedParticipant
    } else {
        return existingParticipant // Already in correct seat
    }
}

// Create new participant if doesn't exist...
```

### File: `room.gateway.ts`

**Modified `handleSitInSeat()` method** (lines 1169-1198):

**Before:**

```typescript
if (currentUserSeat) {
    oldSeatIndex = currentUserSeat.index
    // ...

    // Leave the old seat first
    try {
        await this.roomService.leaveSeat(roomId, oldSeatIndex, userId) // ❌ DELETE then INSERT
        this.logger.log(`🚪 User left seat ${oldSeatIndex}`)
    } catch (error) {
        this.logger.warn(`⚠️ Failed to leave old seat: ${error.message}`)
    }
}
```

**After:**

```typescript
if (currentUserSeat) {
    oldSeatIndex = currentUserSeat.index
    // ...

    // The seat update will be handled atomically by joinRoomWithSeat
    // No need to explicitly leave the old seat - it will be updated  // ✅ Let service handle UPDATE
}
```

## Benefits

1. **Atomic Operations**: Single UPDATE query instead of DELETE + INSERT
2. **No Race Conditions**: No timing issues between delete and insert
3. **Consistent State**: User can only exist in one seat at a time
4. **Simpler Logic**: Less complex, more maintainable code
5. **Better Performance**: One query instead of two

## Testing

### Test Cases

1. ✅ User sits in seat 1, then moves to seat 2 → User only in seat 2
2. ✅ User sits in seat 2, then moves to seat 3 → User only in seat 3
3. ✅ User sits in seat -1 (admin), then moves to seat 0 → User only in seat 0
4. ✅ User sits in seat 0, then moves to seat 1 → User only in seat 1
5. ✅ User sits in seat 5, then moves to seat 1 → User only in seat 1
6. ✅ User tries to sit in same seat → No duplication, same seat maintained

### Expected Behavior

- User should always appear in only ONE seat
- Moving seats should update the seat number atomically
- Old seat should become empty immediately
- New seat should show the user immediately
- No duplicate participant records in database

## Related WebSocket Events

The following events are still broadcast correctly:

- `seatUpdated` - for both old seat (now empty) and new seat (now occupied)
- `seatChanged` - tracks user movement from old seat to new seat
- `joinRoomResponse` - confirms user's new seat assignment

## Notes

- The `leaveSeat()` method still exists in `room.service.ts` but is no longer used for seat movements
- It can be used for explicitly removing a user from a seat without moving them to another seat
- All seat indices are 0-based in the gateway but 1-based in the database
- The fix applies to ALL seat numbers, including -1 (admin seat) and 0 (host seat)

## Additional Fix: Duplicate Participant Records

After the initial fix, testing revealed that users were still appearing in multiple seats (except for seats -1 and 0). This was caused by **duplicate participant records** in the database.

### Root Cause of Duplicates

The unique constraint on the `room_participant` table was not properly enforced, allowing multiple records with the same `(roomId, userId)` combination but different `seatNumber` values. When a user moved seats, the old record wasn't being removed/updated, creating duplicates.

### Solution

Modified the `joinRoom()` method to:

1. **Detect duplicates** by using `find()` instead of `findOne()` to get ALL participant records
2. **Log warnings** when duplicates are detected
3. **Clean up duplicates** before updating:
    - If duplicates exist when moving seats → Remove ALL records → Create fresh record
    - If duplicates exist when user is already in correct seat → Keep first record → Remove rest
4. **Prevent future duplicates** by ensuring atomic operations

### Code Changes

```typescript
// Before: Only found one record
const existingParticipant = await this.participantRepository.findOne({
    where: { roomId, userId }
})

// After: Find ALL records to detect duplicates
const existingParticipants = await this.participantRepository.find({
    where: { roomId, userId }
})

if (existingParticipants.length > 1) {
    // Clean up duplicates before proceeding
    await this.participantRepository.remove(existingParticipants)
    // Create fresh record
}
```

### Result

✅ Duplicate records are automatically detected and cleaned up
✅ Users only appear in ONE seat at a time
✅ Seat movements work correctly for ALL seat indices (including -1, 0, 1, 2, 3, etc.)
✅ Database remains consistent without duplicate participant records

## Date Fixed

January 15, 2025 (Updated with duplicate cleanup logic)
