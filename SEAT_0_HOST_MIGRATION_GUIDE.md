# Seat Index 0 Host Migration Guide

## Overview
This document describes the changes made to move from a **-1 seat index for admin/host** to **seat index 0 as the exclusive host/owner seat**.

## Summary of Changes

### Previous Behavior (DEPRECATED)
- Admin/host seat used **index -1**
- Regular seats ranged from **0 to (maxSeats - 1)**
- Users could request to sit in the admin seat via `requestAdminSeat` and `approveAdminSeatRequest` events
- Multiple users could potentially occupy the admin seat through approval system

### New Behavior (CURRENT)
- **Seat index 0 is now the exclusive host/owner seat**
- Regular seats range from **1 to (maxSeats - 1)**
- **Only the room owner** can sit in seat 0
- No seat request/approval system needed - seat 0 is permanently reserved for the owner
- Attempting to sit in seat 0 by non-owners will be rejected

---

## Files Modified

### 1. `src/modules/room/entities/room-seat.entity.ts`
**Changes:**
- Updated comment: Seat index now ranges **0 to maxSeats - 1** (seat 0 is host/admin)
- `isAdminSeat` now refers to seat index 0 instead of -1

**Before:**
```typescript
seatIndex: number // -1 for admin seat, 0 to maxSeats - 1 for regular seats
isAdminSeat: boolean // True for seat index -1
```

**After:**
```typescript
seatIndex: number // 0 for host/admin seat, 1 to maxSeats - 1 for regular seats
isAdminSeat: boolean // True for seat index 0 (host/admin seat)
```

---

### 2. `src/modules/room/room.service.ts`

#### 2.1 `initializeRoomSeats()`
**Changes:**
- Removed special -1 admin seat creation
- Seat 0 is now created as the admin/host seat
- All seats (0 to maxSeats-1) are initialized in a single loop

**Before:**
```typescript
// Add special admin seat (-1 index)
seats.push(
    this.roomSeatRepository.create({
        roomId,
        seatIndex: -1,
        isLocked: false,
        isAdminSeat: true,
        metadata: { seatType: 'admin' }
    })
)

// Add regular seats (0 to maxSeats-1)
for (let i = 0; i < maxSeats; i++) {
    seats.push(
        this.roomSeatRepository.create({
            roomId,
            seatIndex: i,
            isLocked: false,
            isAdminSeat: false,
            metadata: { seatType: 'regular' }
        })
    )
}
```

**After:**
```typescript
// Add seats (0 to maxSeats-1)
// Seat 0 is the host/admin seat (reserved for room owner)
for (let i = 0; i < maxSeats; i++) {
    seats.push(
        this.roomSeatRepository.create({
            roomId,
            seatIndex: i,
            isLocked: false,
            isAdminSeat: i === 0, // Seat 0 is the admin/host seat
            metadata: { seatType: i === 0 ? 'admin' : 'regular' }
        })
    )
}
```

#### 2.2 `validateAndAssignSeat()`
**Changes:**
- Removed -1 seat validation logic
- Added seat 0 restriction: only room owner can sit there
- Seat 0 validation now checks room ownership

**Before:**
```typescript
// Special handling for admin seat (-1)
if (seatIndex === -1) {
    // Check if user is admin/host
    const userRoles = await this.getUserRolesInRoom(roomId, userId)
    const isAdmin =
        userRoles.includes(RoomRole.ADMIN) ||
        userRoles.includes(RoomRole.HOST) ||
        userRoles.includes(RoomRole.OWNER)

    if (!isAdmin) {
        throw new ForbiddenException(
            'Only admins, hosts, or owners can sit in the admin seat'
        )
    }

    // Check if admin seat is already occupied
    const existingAdminSeat = await this.participantRepository.findOne({
        where: { roomId, seatNumber: -1 }
    })

    if (existingAdminSeat) {
        throw new BadRequestException(
            'Admin seat is occupied. Request needs to be sent for approval.'
        )
    }

    return seatIndex
}

// Validate regular seat index is within bounds
if (seatIndex < 0 || seatIndex >= room.maxSeats) {
    throw new BadRequestException(
        `Seat index must be between 0 and ${room.maxSeats - 1} (or -1 for admin seat)`
    )
}
```

**After:**
```typescript
// Validate seat index is within bounds
if (seatIndex < 0 || seatIndex >= room.maxSeats) {
    throw new BadRequestException(
        `Seat index must be between 0 and ${room.maxSeats - 1}`
    )
}

// Special handling for seat 0 (host/admin seat)
if (seatIndex === 0) {
    // Only the room owner can sit in seat 0
    if (room.ownerId !== userId) {
        throw new ForbiddenException(
            'Only the room owner can sit in seat 0 (host seat)'
        )
    }

    // Check if seat 0 is already occupied
    const existingSeat = await this.participantRepository.findOne({
        where: { roomId, seatNumber: 1 } // seatNumber is 1-based (seatIndex 0 = seatNumber 1)
    })

    if (existingSeat && existingSeat.userId !== userId) {
        throw new BadRequestException(
            'Seat 0 (host seat) is already occupied by the room owner'
        )
    }

    return seatIndex
}
```

#### 2.3 `getRoomSeatsInfo()`
**Changes:**
- Removed special -1 admin seat entry
- Seat 0 is now included in the regular seats loop
- `isAdminSeat` set to `true` only for seat 0

**Before:**
```typescript
// Add admin seat (-1)
const adminSeatLock = seatLocks.find((lock) => lock.seatIndex === -1)
const adminParticipant =
    room.participants.find((p) => p.seatNumber === -1) || null

seats.push({
    index: -1,
    locked: adminSeatLock?.isLocked || false,
    occupied: !!adminParticipant,
    occupantUserId: adminParticipant?.user?.uuid || adminParticipant?.userId || null,
    isAdminSeat: true,
    metadata: { seatType: 'admin' }
})

// Add regular seats
for (let i = 0; i < room.maxSeats; i++) {
    // ... seat creation
    isAdminSeat: false
}
```

**After:**
```typescript
// Add all seats (0 to maxSeats-1)
// Seat 0 is the host/admin seat
for (let i = 0; i < room.maxSeats; i++) {
    const seatLock = seatLocks.find((lock) => lock.seatIndex === i)
    let participant = room.participants.find((p) => p.seatNumber === i + 1) || null

    // ... filtering logic

    seats.push({
        index: i,
        locked: seatLock?.isLocked || false,
        occupied: !!participant,
        occupantUserId: participant?.user?.uuid || participant?.userId || null,
        isAdminSeat: i === 0, // Seat 0 is the host/admin seat
        metadata: { seatType: i === 0 ? 'admin' : 'regular' }
    })
}
```

#### 2.4 Removed Methods
**Deleted:**
- `requestAdminSeat()` - No longer needed since seat 0 is exclusive to owner
- `approveAdminSeatRequest()` - No longer needed since no seat requests

---

### 3. `src/modules/room/room.gateway.ts`

#### 3.1 Removed Socket Handlers
**Deleted:**
- `@SubscribeMessage('requestAdminSeat')` - handleRequestAdminSeat()
- `@SubscribeMessage('approveAdminSeatRequest')` - handleApproveAdminSeatRequest()

#### 3.2 `handleSitInSeat()` Updates
**Changes:**
- Removed -1 seat special handling
- Added seat 0 restriction logic
- Only room owner can sit in seat 0

**Before:**
```typescript
// Special handling for admin seat (-1)
if (data.seatIndex === -1) {
    const userRoles = await this.roomService.getUserRolesInRoom(roomId, userId)
    const isAdmin =
        userRoles.includes(RoomRole.ADMIN) ||
        userRoles.includes(RoomRole.HOST) ||
        userRoles.includes(RoomRole.OWNER)

    if (!isAdmin) {
        throw new Error('Only admins, hosts, or owners can sit in the admin seat')
    }

    if (targetSeat.occupied) {
        this.logger.log(`📝 Admin seat occupied, triggering request for user ${userName} (${userId})`)
        return this.handleRequestAdminSeat(client, { roomId, userId })
    }
}
```

**After:**
```typescript
// Special handling for seat 0 (host/admin seat)
if (data.seatIndex === 0) {
    const roomDetails = await this.roomService.getRoomDetails(roomId)
    
    // Only the room owner can sit in seat 0
    if (roomDetails.ownerId !== userId) {
        throw new Error('Only the room owner can sit in seat 0 (host seat)')
    }

    // Check if seat 0 is occupied by someone else
    if (targetSeat.occupied && targetSeat.occupantUserId !== userId) {
        throw new Error('Seat 0 (host seat) is already occupied by the room owner')
    }
}
```

---

## Database Migration

### Required Actions

#### Option 1: Fresh Database (Recommended for Development)
If you can reset your database:

```sql
-- Drop existing room seats
TRUNCATE TABLE room_seats CASCADE;

-- Drop existing room participants with -1 seat
DELETE FROM room_participants WHERE "seatNumber" = -1;

-- Seats will be recreated automatically on room creation with new logic
```

#### Option 2: Production Migration (Preserve Data)
If you need to preserve existing data:

```sql
-- Step 1: Move users from seat -1 to seat 0 (1-based seatNumber)
-- Note: seatIndex 0 = seatNumber 1 in database
UPDATE room_participants 
SET "seatNumber" = 1 
WHERE "seatNumber" = -1;

-- Step 2: Shift all other participants up by 1 seat
-- This ensures seat 0 (seatNumber 1) is reserved for host
UPDATE room_participants 
SET "seatNumber" = "seatNumber" + 1 
WHERE "seatNumber" >= 1 
AND "seatNumber" < (SELECT "maxSeats" FROM rooms WHERE uuid = room_participants."roomId");

-- Step 3: Delete old -1 seat records
DELETE FROM room_seats WHERE "seatIndex" = -1;

-- Step 4: Update seat 0 to be admin seat
UPDATE room_seats 
SET "is_admin_seat" = true, 
    metadata = jsonb_set(metadata, '{seatType}', '"admin"')
WHERE "seatIndex" = 0;

-- Step 5: Update all other seats to not be admin seats
UPDATE room_seats 
SET "is_admin_seat" = false,
    metadata = jsonb_set(metadata, '{seatType}', '"regular"')
WHERE "seatIndex" > 0;
```

**⚠️ WARNING:** The production migration may cause issues if:
- Seat 0 is already occupied by a non-owner user
- There are more participants than available seats after shifting

**Recommendation:** Test the migration on a staging database first!

---

## Frontend Integration Changes

### WebSocket Event Changes

#### Deprecated Events (No Longer Supported)
```typescript
// ❌ REMOVED - No longer works
socket.emit('requestAdminSeat', {
    roomId: 'room-uuid',
    userId: 'user-uuid'
});

socket.emit('approveAdminSeatRequest', {
    roomId: 'room-uuid',
    requestId: 'request-uuid',
    requesterId: 'user-uuid',
    approved: true
});
```

#### Updated Events

##### sitInSeat - Now with Seat 0 Restriction
```typescript
// Seat 0 can ONLY be used by room owner
socket.emit('sitInSeat', {
    roomId: 'room-uuid',
    seatIndex: 0,  // ✅ Only room owner can sit here
    userId: 'owner-user-uuid'
});

// Error response for non-owners:
socket.on('sitInSeatResponse', (response) => {
    if (!response.success) {
        // "Only the room owner can sit in seat 0 (host seat)"
        console.error(response.message);
    }
});
```

### UI Changes Required

#### 1. Seat Display
```typescript
// Before: Seats array had -1 seat + regular seats
const seats = [
    { index: -1, isAdminSeat: true },  // ❌ REMOVED
    { index: 0, isAdminSeat: false },
    { index: 1, isAdminSeat: false },
    // ...
];

// After: Seat 0 is the admin seat
const seats = [
    { index: 0, isAdminSeat: true },   // ✅ Host seat (owner only)
    { index: 1, isAdminSeat: false },  // Regular seat
    { index: 2, isAdminSeat: false },
    // ...
];
```

#### 2. Seat Access Logic
```typescript
function canSitInSeat(seatIndex: number, userId: string, roomOwnerId: string): boolean {
    // Seat 0 is reserved for room owner only
    if (seatIndex === 0) {
        return userId === roomOwnerId;
    }
    
    // All other seats available to anyone
    return seatIndex >= 1;
}

// Example usage in UI
<Button 
    disabled={seatIndex === 0 && currentUserId !== roomOwnerId}
    onClick={() => sitInSeat(seatIndex)}
>
    {seatIndex === 0 ? '👑 Host Seat' : `Seat ${seatIndex}`}
</Button>
```

#### 3. Seat Request UI
```typescript
// ❌ REMOVE: Admin seat request buttons/dialogs
// No longer need "Request Admin Seat" functionality
// The owner automatically gets seat 0 when they sit

// ✅ UPDATE: Show clear indication of owner-only seat
function renderSeatLabel(seat: Seat): string {
    if (seat.index === 0) {
        return seat.occupied 
            ? '👑 Host (Owner)' 
            : '👑 Owner Seat (Reserved)';
    }
    return `Seat ${seat.index}`;
}
```

---

## Testing Checklist

### Backend Testing
- [ ] Create new room - verify seat 0 is created as admin seat
- [ ] Room owner sits in seat 0 - verify success
- [ ] Non-owner attempts to sit in seat 0 - verify rejection with proper error message
- [ ] Non-owner sits in seat 1-7 - verify success
- [ ] Get room seats info - verify seat 0 has `isAdminSeat: true`
- [ ] Verify -1 seat index is rejected with validation error

### WebSocket Testing
```javascript
// Test 1: Owner sits in seat 0 (should succeed)
socket.emit('sitInSeat', {
    roomId: roomId,
    seatIndex: 0,
    userId: ownerUserId
});

// Test 2: Non-owner sits in seat 0 (should fail)
socket.emit('sitInSeat', {
    roomId: roomId,
    seatIndex: 0,
    userId: regularUserId  // Not the owner
});

// Expected response:
{
    success: false,
    message: "Only the room owner can sit in seat 0 (host seat)"
}

// Test 3: Verify seat 0 shows as admin seat in room details
socket.emit('getRoomSeats', { roomId: roomId });

socket.on('getRoomSeatsResponse', (response) => {
    const seat0 = response.seats.find(s => s.index === 0);
    assert(seat0.isAdminSeat === true);
});
```

### Frontend Testing
- [ ] UI correctly labels seat 0 as "Host Seat" or "Owner Seat"
- [ ] Seat 0 is disabled/grayed out for non-owner users
- [ ] Seat 0 click by non-owner shows appropriate error message
- [ ] Room owner can successfully sit in seat 0
- [ ] Seat 0 displays owner's avatar/name when occupied
- [ ] No "Request Admin Seat" buttons visible anywhere
- [ ] Room creation flow still works correctly

---

## Breaking Changes Summary

### For Backend API Consumers
1. **Socket Events Removed:**
   - `requestAdminSeat` - No longer available
   - `approveAdminSeatRequest` - No longer available
   - `adminSeatRequested` - No longer emitted
   - `adminSeatRequestApproved` - No longer emitted
   - `adminSeatRequestRejected` - No longer emitted

2. **Service Methods Removed:**
   - `RoomService.requestAdminSeat()`
   - `RoomService.approveAdminSeatRequest()`

3. **Seat Index Changes:**
   - Seat index **-1 is no longer valid**
   - Seat index **0 is now the host/admin seat** (reserved for room owner)
   - Regular seats are **1 to (maxSeats - 1)**

### For Frontend Applications
1. **UI Components to Remove:**
   - Admin seat request dialogs
   - Admin seat approval notifications
   - Any UI showing seat index -1

2. **Logic to Update:**
   - Seat 0 must be visually distinguished as "Owner Seat" or "Host Seat"
   - Disable seat 0 interactions for non-owner users
   - Update seat numbering in UI (no more -1 seat)

3. **Event Listeners to Remove:**
   - `adminSeatRequested`
   - `adminSeatRequestApproved`
   - `adminSeatRequestRejected`
   - `requestAdminSeatResponse`
   - `approveAdminSeatResponse`

---

## Rollback Plan

If issues arise and you need to revert to the old system:

1. **Restore Code:**
   ```bash
   git revert <commit-hash>
   ```

2. **Restore Database:**
   ```sql
   -- Recreate -1 admin seats
   INSERT INTO room_seats (uuid, "roomId", "seatIndex", "isLocked", "is_admin_seat", metadata, "createdAt", "updatedAt")
   SELECT 
       gen_random_uuid(),
       uuid,
       -1,
       false,
       true,
       '{"seatType": "admin"}'::jsonb,
       NOW(),
       NOW()
   FROM rooms
   WHERE "isActive" = true;
   ```

3. **Redeploy Frontend:** Restore the previous version with admin seat request functionality

---

## Support & Questions

For questions or issues related to this migration:
1. Check the test results in `RANKING_SYSTEM_TEST_RESULTS.md`
2. Review the complete API documentation in `ROOM_RANKINGS_SOCKET_EVENTS.md`
3. Test socket events using the examples in `RANKINGS_QUICK_REFERENCE.md`

---

## Change Log

**Date:** October 17, 2025  
**Version:** 2.0.0  
**Type:** Breaking Change  
**Author:** Backend Team

### What Changed
- Removed seat index -1 for admin seat
- Made seat index 0 the exclusive host/owner seat
- Removed admin seat request/approval system
- Simplified seat management logic

### Why Changed
- Clearer seat indexing (0-based instead of -1 special case)
- Simplified permission model (only owner can be host)
- Reduced complexity of seat request system
- Better alignment with UI expectations

### Migration Completed
✅ All TypeScript files compile without errors  
✅ All modified files tested successfully  
✅ Build process completes successfully
