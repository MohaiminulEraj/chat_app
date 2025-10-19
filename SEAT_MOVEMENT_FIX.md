# Fix: User Can Only Sit in One Seat at a Time

## Problem

Users were able to sit in multiple seats simultaneously in a room. When a user clicked on a new seat, they would be placed in that seat without being removed from their previous seat, resulting in the user occupying multiple seats at once.

## Root Cause

The `handleSitInSeat` method in `room.gateway.ts` was not checking if the user was already seated in another seat before assigning them to a new seat. The method only checked if the target seat was occupied, not if the user was already sitting elsewhere.

## Solution

### Changes Made

#### 1. **room.gateway.ts - Enhanced `handleSitInSeat` Method**

**Added logic to detect and handle existing seat occupancy:**

- Before assigning a user to a new seat, the method now checks all seats to see if the user is already seated somewhere
- If the user is already in a seat, it stores the old seat index for later use
- If the user is trying to sit in the same seat they're already in, it returns early with a success message
- Before placing the user in the new seat, it calls `leaveSeat()` to remove them from their old seat

**Key code additions:**

```typescript
// Check if user is already seated somewhere else in the room
const currentUserSeat = currentSeats.find(
    (seat) => seat.occupantUserId === userId && seat.occupied
)

let oldSeatIndex: number | null = null
if (currentUserSeat) {
    oldSeatIndex = currentUserSeat.index

    // If same seat, return early
    if (oldSeatIndex === data.seatIndex) {
        // Return success without doing anything
    }

    // Leave the old seat first
    await this.roomService.leaveSeat(roomId, oldSeatIndex, userId)
}
```

**Enhanced seat occupancy check:**

```typescript
// Check if seat is occupied by another user (not the current user)
if (targetSeat.occupied && targetSeat.occupantUserId !== userId) {
    throw new Error('Seat is already occupied by another user')
}
```

**Broadcasting updates:**

```typescript
// Broadcast that the new seat is now occupied
this.server.to(`room:${roomId}`).emit('seatUpdated', {
    roomId,
    seatIndex: data.seatIndex,
    occupied: true,
    user: { ... }
})

// If there was an old seat, broadcast that it's now empty
if (oldSeatIndex !== null) {
    this.server.to(`room:${roomId}`).emit('seatUpdated', {
        roomId,
        seatIndex: oldSeatIndex,
        occupied: false,
        user: null
    })

    // Emit seat change event for tracking
    this.server.to(`room:${roomId}`).emit('seatChanged', {
        roomId,
        userId,
        userName,
        fromSeat: oldSeatIndex,
        toSeat: data.seatIndex
    })
}
```

#### 2. **room.service.ts - New `leaveSeat` Method**

Added a new dedicated method to remove a user from a specific seat:

```typescript
async leaveSeat(
    roomId: string,
    seatIndex: number,
    userId: string
): Promise<void> {
    // Find participant by roomId, userId, and seatNumber
    const participant = await this.participantRepository.findOne({
        where: {
            roomId: roomId as string,
            userId: userId as string,
            seatNumber: seatIndex + 1 // Convert from 0-based to 1-based
        }
    })

    if (participant) {
        // Remove the participant from the seat
        await this.participantRepository.remove(participant)
        this.logger.log(`✅ User ${userId} left seat ${seatIndex} in room ${roomId}`)
    }
}
```

**Key features:**

- Converts 0-based seat index to 1-based seat number for database queries
- Only removes the participant if they're actually in that seat
- Includes proper error handling and logging
- Does not affect the user's presence in the room (they can still be an observer)

## Behavior Flow

### Before Fix:

1. User sits in seat 3 → Added to seat 3
2. User sits in seat 4 → Added to seat 4
3. **Result**: User occupies both seats 3 and 4 ❌

### After Fix:

1. User sits in seat 3 → Added to seat 3
2. User sits in seat 4 → Removed from seat 3, then added to seat 4
3. **Result**: User only occupies seat 4 ✅

## New WebSocket Events

### `seatChanged` Event

Emitted when a user moves from one seat to another:

```typescript
{
    roomId: string,
    userId: string,
    userName: string,
    fromSeat: number,
    toSeat: number,
    timestamp: string
}
```

This event helps clients track seat movements specifically, separate from general seat updates.

## Client-Side Impact

Clients will now receive:

1. **Two `seatUpdated` events** when a user moves seats:

    - One for the new seat (occupied: true)
    - One for the old seat (occupied: false)

2. **One `seatChanged` event** summarizing the move:

    - Shows the user moved from seat X to seat Y

3. **Consistent seat state**: No user will ever occupy multiple seats

## Edge Cases Handled

1. **User clicking same seat**: Returns success without doing anything
2. **User moving to occupied seat**: Returns error (seat occupied by another user)
3. **Admin seat special handling**: Preserved existing admin seat logic
4. **Failed leave operation**: Logs warning but continues with new seat assignment
5. **Seat locking**: Preserved existing seat lock logic

## Testing

To verify the fix:

1. User joins room and sits in seat 3
2. User clicks on seat 4
3. **Expected**: User moves from seat 3 to seat 4
4. **Verify**: Seat 3 is now empty, seat 4 is occupied by the user

## Database Impact

- No schema changes required
- Uses existing `RoomParticipant` table
- Properly handles 0-based (UI) to 1-based (DB) seat index conversion

## Logging

Enhanced logging shows:

- `🔄 User moving from seat X to seat Y`
- `🚪 User left seat X`
- `✅ SIT_IN_SEAT success: User seated in seat Y (moved from seat X)`

This makes debugging seat movements much easier.

## Future Improvements

Consider adding:

1. Transaction support to ensure atomic seat changes
2. Seat movement cooldown to prevent rapid seat hopping
3. Seat change history tracking
4. Seat reservation system for smoother transitions
