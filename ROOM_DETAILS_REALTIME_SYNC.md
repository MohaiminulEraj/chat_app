# Room Details Real-Time Synchronization

## Overview

The room details HTTP API endpoint is now fully synchronized with WebSocket events. When users sit in seats, leave rooms, or get kicked, the changes are immediately persisted to the database AND broadcast to all room participants.

## HTTP API Endpoint

```
GET /api/v1/rooms/:roomId/details
```

**Example:**

```
http://103.190.136.178:3000/api/v1/rooms/b729e516-5d8e-4c1a-9217-4ccca6d3e545/details
```

### Response Format

```json
{
    "statusCode": 200,
    "message": "Room details fetched successfully",
    "data": {
        "roomId": "b729e516-5d8e-4c1a-9217-4ccca6d3e545",
        "roomName": "My Room",
        "description": "Room description",
        "level": 0,
        "ownerId": "uuid",
        "ownerName": "Owner Name",
        "ownerImage": "https://...",
        "hostId": "uuid",
        "hostName": "Host Name",
        "hostImage": "https://...",
        "participants": [
            {
                "userId": "uuid",
                "name": "User Name",
                "avatar": "https://...",
                "seatIndex": 1,
                "isSpeaking": false,
                "micOn": true,
                "role": "guest"
            }
        ],
        "seats": [
            {
                "index": 0,
                "locked": false,
                "occupied": true,
                "occupantUserId": "uuid"
            }
        ],
        "maxSeats": 8,
        "roomAvatarUrl": "https://...",
        "createdAt": "2025-10-19T00:00:00.000Z"
    }
}
```

## WebSocket Integration

### Events That Trigger Updates

The following WebSocket events automatically update the database and broadcast changes:

1. **sitInSeat** - When a user sits in a seat
2. **leaveRoom** - When a user leaves the room
3. **kickUser** - When a user is kicked from the room

### Real-Time Broadcast Event

**Event Name:** `roomDetailsUpdated`

This event is broadcast to ALL users in the room whenever seat assignments change.

**Payload:**

```json
{
  "roomId": "b729e516-5d8e-4c1a-9217-4ccca6d3e545",
  "details": {
    // Full room details object (same as HTTP API response)
  },
  "updateType": "seat_assignment" | "user_left" | "user_kicked",
  "updatedBy": "user-uuid",
  "timestamp": "2025-10-19T00:20:00.000Z"
}
```

### Update Types

- **seat_assignment**: User successfully sat in a seat
- **user_left**: User left the room
- **user_kicked**: User was kicked from the room

## How It Works

### 1. Database Persistence

When a user sits in a seat via WebSocket:

```typescript
// Gateway calls service which saves to database
const participant = await this.roomService.joinRoomWithSeat(
    roomId,
    userId,
    seatIndex,
    password
)

// This internally calls:
// await this.participantRepository.save(participant)
```

### 2. Real-Time Broadcast

After successful database update:

```typescript
// Fetch fresh room details from database
const updatedRoomDetails = await this.roomService.getRoomDetails(roomId)

// Broadcast to ALL users in the room
this.server.to(`room:${roomId}`).emit('roomDetailsUpdated', {
    roomId,
    details: updatedRoomDetails,
    updateType: 'seat_assignment',
    updatedBy: userId,
    timestamp: new Date().toISOString()
})
```

### 3. HTTP API Reflects Changes Immediately

Since the database is updated synchronously, the HTTP API endpoint will return the latest data:

```typescript
// This queries the database directly
const data = await this.roomService.getRoomDetails(roomId)
// Returns fresh data with all seat assignments
```

## Implementation Details

### sitInSeat Handler (room.gateway.ts)

```typescript
@SubscribeMessage('sitInSeat')
async handleSitInSeat(client: Socket, data: {...}) {
  // 1. Validate and assign seat
  const participant = await this.roomService.joinRoomWithSeat(...);

  // 2. Broadcast sitInSeatResponse globally
  this.server.to(`room:${roomId}`).emit('sitInSeatResponse', response);

  // 3. Broadcast updated room details for HTTP API sync
  const updatedRoomDetails = await this.roomService.getRoomDetails(roomId);
  this.server.to(`room:${roomId}`).emit('roomDetailsUpdated', {...});
}
```

### leaveRoom Handler

```typescript
@SubscribeMessage('leaveRoom')
async handleLeaveRoom(client: Socket, roomId: string) {
  // 1. Remove user from room
  await this.roomService.leaveRoom(roomId, userId);

  // 2. Update tracking and broadcast
  await this.roomRankingService.removeUserActivity(roomId, userId);

  // 3. Broadcast updated room details
  const updatedRoomDetails = await this.roomService.getRoomDetails(roomId);
  this.server.to(`room:${roomId}`).emit('roomDetailsUpdated', {...});
}
```

### kickUser Handler

```typescript
@SubscribeMessage('kickUser')
async handleKickUser(client: Socket, data: {...}) {
  // 1. Kick user from seat/room
  const result = await this.roomService.kickUserFromSeat(...);

  // 2. Update seats and broadcast
  await this.updateRoomSeatsState(data.roomId);

  // 3. Broadcast updated room details
  const updatedRoomDetails = await this.roomService.getRoomDetails(data.roomId);
  this.server.to(`room:${data.roomId}`).emit('roomDetailsUpdated', {...});
}
```

## Client Implementation Guide

### Flutter/Mobile Apps

Listen for `roomDetailsUpdated` event to refresh UI:

```dart
socket.on('roomDetailsUpdated', (data) {
  final roomId = data['roomId'];
  final details = data['details'];
  final updateType = data['updateType'];

  // Update local state with fresh room details
  updateRoomState(details);

  // Or refresh by calling HTTP API
  refreshRoomDetails(roomId);
});
```

### Refresh Strategy Options

**Option 1: Use WebSocket Data (Recommended)**

```dart
// Directly update UI with broadcast data
updateRoomState(data['details']);
```

**Option 2: Re-fetch via HTTP API**

```dart
// Call HTTP API to get fresh data
final response = await http.get(
  'http://103.190.136.178:3000/api/v1/rooms/$roomId/details'
);
```

## Testing

### Test Scenario 1: Seat Assignment

1. User A sits in seat 1 via WebSocket
2. All users in room receive `roomDetailsUpdated` event
3. HTTP API immediately reflects User A in seat 1

**WebSocket Event:**

```json
{
    "event": "sitInSeat",
    "data": {
        "roomId": "b729e516-5d8e-4c1a-9217-4ccca6d3e545",
        "seatIndex": 1,
        "userId": "user-a-uuid"
    }
}
```

**Broadcast Response:**

```json
{
  "event": "roomDetailsUpdated",
  "data": {
    "roomId": "b729e516-5d8e-4c1a-9217-4ccca6d3e545",
    "details": {
      "participants": [
        {
          "userId": "user-a-uuid",
          "seatIndex": 1,
          ...
        }
      ],
      "seats": [
        {
          "index": 1,
          "occupied": true,
          "occupantUserId": "user-a-uuid"
        }
      ]
    },
    "updateType": "seat_assignment",
    "updatedBy": "user-a-uuid"
  }
}
```

### Test Scenario 2: User Leaves Room

1. User B leaves the room via WebSocket
2. All remaining users receive `roomDetailsUpdated` event
3. HTTP API shows User B no longer in participants list

### Test Scenario 3: User Kicked

1. Host kicks User C from seat
2. All users (including User C) receive `roomDetailsUpdated` event
3. HTTP API shows seat is now vacant

## Benefits

✅ **Instant HTTP API Updates**: Database changes are immediate
✅ **Real-Time Synchronization**: All clients stay in sync
✅ **No Polling Required**: WebSocket broadcasts eliminate need for HTTP polling
✅ **Consistent Data**: Single source of truth (database)
✅ **Efficient**: Broadcast only when changes occur
✅ **Reliable**: Database-first approach ensures data persistence

## Error Handling

If broadcast fails, it's logged but doesn't affect the core operation:

```typescript
try {
  const updatedRoomDetails = await this.roomService.getRoomDetails(roomId);
  this.server.to(`room:${roomId}`).emit('roomDetailsUpdated', {...});
  this.logger.log('📡 Broadcasted updated room details');
} catch (error) {
  this.logger.warn(`⚠️ Failed to broadcast room details update: ${error.message}`);
  // Core operation (seat assignment) still succeeded
}
```

## Performance Considerations

- Room details are fetched AFTER successful database update
- Broadcast is asynchronous and non-blocking
- No caching layer between WebSocket and database
- HTTP API queries database directly for fresh data

## Summary

The room details HTTP API endpoint (`GET /api/v1/rooms/:id/details`) now stays perfectly synchronized with WebSocket seat events. When any user:

1. Sits in a seat → Database updated → Broadcast sent → HTTP API reflects change
2. Leaves the room → Database updated → Broadcast sent → HTTP API reflects change
3. Gets kicked → Database updated → Broadcast sent → HTTP API reflects change

All users in the room receive `roomDetailsUpdated` events, and the HTTP API always returns the latest state from the database. No manual refresh or polling needed! 🎉
