# BlockUser Feature Implementation

## Overview

Implemented comprehensive user blocking functionality for room-based applications, allowing hosts and owners to block specific users from rooms with persistent database storage and API filtering.

## Features Implemented

### 1. Database Schema

- **New Entity**: `RoomBlockedUser` with the following fields:
    - `userId`: UUID of the blocked user
    - `roomId`: UUID of the room from which user is blocked
    - `blockedBy`: UUID of the user who performed the block (host/owner)
    - `reason`: Optional text reason for blocking
    - `isActive`: Boolean flag for soft delete functionality
    - `blockedAt`: Timestamp of when the block occurred
    - Relations to `User` and `Room` entities

### 2. Socket.IO Event: `blockUser`

- **Request Format**:

    ```typescript
    {
      roomId: string,
      blockUserID: string,
      reason?: string
    }
    ```

- **Response Events**:
    <!-- - `blockUserResponse`: Direct response to the blocking user -->
    - `userBlocked`: Notification sent to the blocked user
    - `blockUserResponse`: Broadcast to all room participants
    - `roomSeatsUpdate`: Updated room state after blocking

### 3. Permission System

- Only room **hosts** and **owners** can block users
- Permission verification through `getUserRolesInRoom()` and room ownership checks
- Comprehensive permission validation before blocking

### 4. Blocking Process

When a user is blocked from a room:

1. **Validation**: Checks room existence, blocker permissions, and target user existence
2. **Participant Removal**: Removes blocked user from room participants if currently seated
3. **Waiting List Cleanup**: Removes blocked user from room waiting list if present
4. **Socket Disconnection**: Automatically disconnects blocked user from the specific room
5. **Database Record**: Creates persistent block record in `room_blocked_users` table
6. **Real-time Notifications**: Sends appropriate notifications to all parties

### 5. API Filtering: `/room/recommended`

- **Enhanced Endpoint**: Now accepts optional `userId` query parameter
- **Automatic Filtering**: Blocked users cannot see rooms they're blocked from
- **Usage Example**: `GET /room/recommended?userId=user-uuid-here`
- **Backward Compatible**: Works without userId parameter for anonymous access

## Service Methods

### `blockUserFromRoom(roomId, userIdToBlock, blockedBy, reason?)`

- Blocks a specific user from a room
- Handles all cleanup and validation
- Returns success/failure status with message

### `unblockUserFromRoom(roomId, userIdToUnblock, unblockedBy)`

- Unblocks a previously blocked user
- Soft delete approach (sets isActive to false)
- Permission validation for unblocker

### `isUserBlockedFromRoom(roomId, userId)`

- Quick check if a user is blocked from a specific room
- Returns boolean result

### `getRoomBlockedUsers(roomId)`

- Get list of all blocked users for a room
- Includes user details and block information

### `filterRoomsForUser(rooms, userId?)`

- Filters out blocked rooms from room lists
- Used by recommend API and other room listing endpoints

## Socket Event Flow

### Blocking Process:

1. **Request**: `blockUser` event with roomId and blockUserID
2. **Validation**: Permission and data validation
3. **Database**: Create block record, cleanup participants/waiting list
4. **Socket Management**: Remove blocked user from room socket
5. **Notifications**:
    - Send `blockUserResponse` to blocker
    - Send `userBlocked` to blocked user
    - Broadcast `userBlockedFromRoom` to all room participants
6. **State Updates**: Update room seats, user counts, etc.

### Response Types:

- **SUCCESS**: User successfully blocked
- **ROOM_ID_ERROR**: Missing room ID
- **BLOCK_USER_ID_ERROR**: Missing user ID to block
- **USER_VALIDATION_ERROR**: Blocker validation failed
- **SERVICE_ERROR**: Permission denied or user already blocked
- **CATCH_ERROR**: Unexpected errors

## Duplicate Prevention

- Implements the same duplicate prevention pattern as other events
- Uses `sentBlockUserResponses` Map for tracking
- Request ID system for debugging and traceability
- Memory management with automatic cleanup

## Flutter Integration

Your Flutter implementation works perfectly:

```dart
roomProvider.socket.sendMessage(
  {
    'roomId': roomProvider.roomInfoModel.roomId,
    'blockUserID': roomProvider.roomInfoModel.participants![index].userId,
  },
  'blockUser',
);
```

Listen for response:

```dart
socket.on('blockUserResponse', (data) => {
  // Handle blocking response
});

socket.on('userBlocked', (data) => {
  // Handle being blocked notification
});
```

## Security Features

- **Permission Validation**: Only hosts/owners can block
- **Data Validation**: All inputs validated before processing
- **Audit Trail**: Full logging with request IDs for debugging
- **Soft Delete**: Block records preserved for audit purposes
- **Memory Protection**: Automatic cleanup prevents memory leaks

## Testing Examples

### Block a User:

```javascript
socket.emit('blockUser', {
    roomId: 'room-uuid',
    blockUserID: 'user-uuid-to-block',
    reason: 'Inappropriate behavior'
})
```

### Check Filtered Rooms:

```bash
GET /room/recommended?userId=blocked-user-uuid
# Will not include rooms where user is blocked
```

## Benefits

1. **Persistent Blocking**: Blocks survive server restarts
2. **Real-time Updates**: Immediate socket disconnection and notifications
3. **API Integration**: Automatic filtering in recommendation system
4. **Audit Trail**: Complete logging and block history
5. **Memory Efficient**: Automatic cleanup and optimized queries
6. **Permission-Based**: Secure access control
7. **Flutter Compatible**: Works seamlessly with your existing Flutter code
