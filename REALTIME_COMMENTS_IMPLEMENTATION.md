# Real-Time Comments Implementation

## Overview

This implementation enables real-time comment broadcasting when comments are created via the REST API. When a user posts a comment through the API endpoint, all connected users in that room will receive the comment instantly via WebSocket.

## Key Features

### 1. REST API Integration

- **Endpoint**: `POST /api/v1/rooms/comments`
- **Real-time Broadcasting**: Comments posted via API are automatically broadcast to all room participants
- **Error Handling**: Socket errors don't fail the API response

### 2. WebSocket Integration

- **Event Name**: `ReceivedComment`
- **Namespace**: `/rooms`
- **Room-based Broadcasting**: Uses Socket.IO rooms to ensure comments are only sent to relevant participants

### 3. Enhanced Comment Data

Comments include comprehensive information:

```json
{
    "content": "Hello world!",
    "senderId": "user-uuid",
    "senderName": "John Doe",
    "senderImage": "https://example.com/avatar.jpg",
    "createdAt": "2025-08-03T23:43:15.123Z",
    "roomId": "room-uuid",
    "commentId": "comment-uuid",
    "messageType": "text",
    "replyToId": null,
    "metadata": null,
    "source": "api"
}
```

## Technical Implementation

### 1. Room Controller Changes

- **RoomGateway Injection**: Added RoomGateway to constructor for WebSocket access
- **Real-time Emission**: After successful comment creation, emits `ReceivedComment` event
- **Error Isolation**: Socket emission errors don't affect API response

### 2. Room Gateway Changes

- **Public Server Property**: Made WebSocket server accessible from controller
- **Consistent Event Format**: Both WebSocket and API comments use same event structure

### 3. Room Module Integration

- Both RoomController and RoomGateway are properly configured in RoomModule
- Shared dependencies through dependency injection

## Usage Examples

### 1. Creating Comment via API

```bash
curl -X POST http://localhost:3001/api/v1/rooms/comments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "room": "your-room-uuid",
    "content": "Hello from API!"
  }'
```

### 2. Listening for Real-time Comments (Frontend)

```javascript
// Connect to rooms namespace
const socket = io('http://localhost:3001/rooms', {
    auth: {
        token: 'YOUR_JWT_TOKEN'
    }
})

// Join a specific room
socket.emit('joinRoom', { roomId: 'your-room-uuid' })

// Listen for incoming comments
socket.on('ReceivedComment', (commentData) => {
    console.log('New comment received:', commentData)
    // Update UI with new comment
    addCommentToUI(commentData)
})
```

### 3. Sending Comment via WebSocket

```javascript
// Send comment directly via WebSocket
socket.emit('sendComment', {
    roomId: 'your-room-uuid',
    message: 'Hello from WebSocket!',
    messageType: 'text'
})
```

## Benefits

1. **Unified Experience**: Comments appear in real-time regardless of source (API or WebSocket)
2. **API Flexibility**: REST API can be used by mobile apps, web clients, or other services
3. **Real-time Synchronization**: All connected clients stay synchronized
4. **Robust Error Handling**: API requests succeed even if WebSocket emission fails
5. **Enhanced Monitoring**: All comment activities are logged with comprehensive details

## Event Flow

1. **API Comment Creation**:

    ```
    Client → POST /api/rooms/comments → RoomController → RoomService → Database
                                           ↓
    RoomController → RoomGateway → WebSocket Emission → All Room Participants
    ```

2. **WebSocket Comment Creation**:
    ```
    Client → sendComment event → RoomGateway → RoomService → Database
                                      ↓
    RoomGateway → WebSocket Emission → All Room Participants (including sender)
    ```

## Monitoring and Logging

The system provides comprehensive logging:

- **API Comments**: Logged with source indicator (`source: "api"`)
- **WebSocket Comments**: Logged with user activity tracking
- **Connection Tracking**: Monitor which users are connected and active
- **Room Statistics**: Periodic statistics showing room activity
- **Error Tracking**: Both API and WebSocket errors are properly logged

## Security Considerations

1. **JWT Authentication**: Both API and WebSocket require valid JWT tokens
2. **Room Membership**: Users must be room participants to send/receive comments
3. **Rate Limiting**: Consider implementing rate limiting for comment creation
4. **Content Validation**: Comments are validated before saving and broadcasting

This implementation ensures that your chat application provides a seamless real-time experience while maintaining the flexibility of REST API access.
