# Toggle Seat Lock WebSocket Event Testing Guide

## Overview

The `toggleSeatLock` WebSocket event allows room hosts/owners to lock or unlock specific seats in a room. When a seat is locked, no user can sit in that seat until it's unlocked.

## Event Details

### Event Name

`toggleSeatLock`

### Data Format

```typescript
{
    roomId: string,     // Room UUID
    seatIndex: number,  // 0-based seat index (0, 1, 2, etc.)
    isLocked: boolean   // true to lock, false to unlock
}
```

### Response Events

- `toggleSeatLockResponse` - Direct response to the requester
- `seatLockChanged` - Broadcast to all room participants
- `roomSeatsUpdate` - Updated seat states for all participants

## Implementation Details

### Permission Requirements

- Only room **host** or **owner** can lock/unlock seats
- User must be in the room to perform this action
- Proper user authentication is required

### Seat Lock Behavior

#### When Locking a Seat (`isLocked: true`)

1. If seat is **empty**: Seat gets locked immediately
2. If seat is **occupied**: User is kicked from the seat, then seat gets locked
3. If seat is **already locked**: No change, returns current state

#### When Unlocking a Seat (`isLocked: false`)

1. Seat becomes available for users to sit in
2. Users from waiting list can be promoted to unlocked seats

#### Prevention Logic

- Users **cannot** sit in locked seats
- `validateAndAssignSeat` method throws error for locked seats
- Auto-seat assignment skips locked seats

## Testing Scenarios

### 1. Basic Lock/Unlock Test

```javascript
// Lock seat 2
socket.emit('toggleSeatLock', {
    roomId: 'your-room-id',
    seatIndex: 2,
    isLocked: true
})

// Listen for response
socket.on('toggleSeatLockResponse', (response) => {
    console.log('Lock response:', response)
    // Expected: { status: 'success', seatIndex: 2, isLocked: true, ... }
})

// Listen for broadcast
socket.on('seatLockChanged', (data) => {
    console.log('Seat lock changed:', data)
    // Expected: { roomId, seatIndex: 2, isLocked: true, lockedBy: {...}, ... }
})
```

### 2. Lock Occupied Seat Test

```javascript
// First, have a user sit in seat 3
socket.emit('sitInSeat', {
    roomId: 'your-room-id',
    seatIndex: 3
})

// Then try to lock that seat (should kick user first)
socket.emit('toggleSeatLock', {
    roomId: 'your-room-id',
    seatIndex: 3,
    isLocked: true
})

// User should be removed and seat should be locked
```

### 3. Try to Sit in Locked Seat Test

```javascript
// First lock a seat
socket.emit('toggleSeatLock', {
    roomId: 'your-room-id',
    seatIndex: 1,
    isLocked: true
})

// Then try to sit in that seat (should fail)
socket.emit('sitInSeat', {
    roomId: 'your-room-id',
    seatIndex: 1
})

// Should receive error: "Seat 1 is currently locked"
```

### 4. Permission Test (Non-Host User)

```javascript
// Use a non-host user account
socket.emit('toggleSeatLock', {
    roomId: 'your-room-id',
    seatIndex: 4,
    isLocked: true
})

// Should receive error: "Only room owner/host can lock/unlock seats"
```

### 5. Unlock Seat Test

```javascript
// Unlock a previously locked seat
socket.emit('toggleSeatLock', {
    roomId: 'your-room-id',
    seatIndex: 2,
    isLocked: false
})

// Seat should become available again
```

## Response Formats

### Success Response (`toggleSeatLockResponse`)

```json
{
    "status": "success",
    "seatIndex": 2,
    "isLocked": true,
    "message": "Seat 2 locked successfully",
    "seats": [
        {
            "index": 0,
            "locked": false,
            "occupied": true,
            "occupantUserId": "user123"
        },
        {
            "index": 1,
            "locked": false,
            "occupied": false,
            "occupantUserId": null
        },
        {
            "index": 2,
            "locked": true,
            "occupied": false,
            "occupantUserId": null
        }
    ]
}
```

### Error Response (`toggleSeatLockResponse`)

```json
{
    "status": "error",
    "message": "Only room owner/host can lock/unlock seats",
    "seatIndex": 2,
    "isLocked": false,
    "error": "Only room owner/host can lock/unlock seats"
}
```

### Broadcast Event (`seatLockChanged`)

```json
{
    "roomId": "room-uuid",
    "seatIndex": 2,
    "isLocked": true,
    "lockedBy": {
        "userId": "host-user-id",
        "userName": "Host Name"
    },
    "seats": [...],
    "timestamp": "2025-08-16T10:30:00Z"
}
```

### Room Seats Update (`roomSeatsUpdate`)

```json
{
    "roomId": "room-uuid",
    "seats": [
        {
            "index": 0,
            "locked": false,
            "occupied": true,
            "occupantUserId": "user123"
        }
    ]
}
```

## Testing with Client Code

### JavaScript/Node.js Example

```javascript
const io = require('socket.io-client')
const socket = io('http://localhost:3000')

// Connect and authenticate
socket.emit('setup', {
    userId: 'host-user-id',
    token: 'your-jwt-token'
})

// Join room first
socket.emit('joinRoom', {
    roomId: 'your-room-id'
})

// Test seat locking
function testSeatLock() {
    console.log('Testing seat lock...')

    socket.emit('toggleSeatLock', {
        roomId: 'your-room-id',
        seatIndex: 2,
        isLocked: true
    })
}

// Listen for responses
socket.on('toggleSeatLockResponse', (response) => {
    console.log('Toggle Seat Lock Response:', JSON.stringify(response, null, 2))
})

socket.on('seatLockChanged', (data) => {
    console.log('Seat Lock Changed:', JSON.stringify(data, null, 2))
})

socket.on('roomSeatsUpdate', (data) => {
    console.log('Room Seats Update:', JSON.stringify(data, null, 2))
})

// Start test
setTimeout(testSeatLock, 2000)
```

### Flutter/Dart Example

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io('http://localhost:3000');

void testSeatLock() {
  // Lock seat
  socket.emit('toggleSeatLock', {
    'roomId': 'your-room-id',
    'seatIndex': 2,
    'isLocked': true
  });
}

void setupListeners() {
  socket.on('toggleSeatLockResponse', (data) {
    print('Toggle Seat Lock Response: $data');
  });

  socket.on('seatLockChanged', (data) {
    print('Seat Lock Changed: $data');
  });

  socket.on('roomSeatsUpdate', (data) {
    print('Room Seats Update: $data');
  });
}
```

## Common Error Scenarios

### 1. User Not in Room

```json
{
    "status": "error",
    "message": "You must be in the room to toggle seat locks"
}
```

### 2. Invalid Permissions

```json
{
    "status": "error",
    "message": "Only room owner/host can lock/unlock seats"
}
```

### 3. Invalid Seat Index

```json
{
    "status": "error",
    "message": "Seat index must be between 0 and 7"
}
```

### 4. Missing Data

```json
{
    "status": "error",
    "message": "Room ID and seat index are required"
}
```

## Verification Steps

1. **Connect as host user** to a room
2. **Lock an empty seat** - should succeed
3. **Try to sit in locked seat** - should fail
4. **Lock an occupied seat** - should kick user and lock seat
5. **Unlock the seat** - should become available again
6. **Try as non-host user** - should fail with permission error

## Integration Notes

- Seat indices are **0-based** (0, 1, 2, 3, etc.)
- Database stores seat numbers as **1-based** internally
- Lock status persists across room sessions
- Locked seats are skipped in auto-seat assignment
- Waiting list users are not promoted to locked seats

## Performance Considerations

- Seat lock changes are broadcast to all room participants
- Memory seat state is updated after each lock/unlock operation
- Database is updated immediately for persistence
- No rate limiting on seat lock operations currently
