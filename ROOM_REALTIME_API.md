# Room Real-time WebSocket API Documentation

## Overview

The Room Real-time API provides WebSocket functionality for real-time communication within rooms. Users can join rooms, send comments, exchange gifts, and receive live updates from other participants.

## Base Connection

### WebSocket Endpoint

```
ws://localhost:3000/room
```

### Authentication

All WebSocket connections require JWT authentication via the Authorization header:

```javascript
const socket = io('ws://localhost:3000/room', {
    extraHeaders: {
        Authorization: `Bearer ${jwt_token}`
    }
})
```

## Room Events

### 1. Join Room

**Event:** `joinRoom`

**Description:** Join a specific room to receive real-time updates

**Payload:**

```typescript
{
  roomId: string;      // UUID of the room
  password?: string;   // Required if room is private
}
```

**Example:**

```javascript
socket.emit('joinRoom', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    password: 'secret123' // Only for private rooms
})
```

**Response Events:**

- `joinRoomSuccess`: Successfully joined room
- `joinRoomError`: Failed to join room (invalid room, wrong password, etc.)

### 2. Leave Room

**Event:** `leaveRoom`

**Description:** Leave a specific room

**Payload:**

```typescript
{
    roomId: string // UUID of the room
}
```

**Example:**

```javascript
socket.emit('leaveRoom', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
})
```

### 3. Send Comment

**Event:** `sendComment`

**Description:** Send a real-time comment to a room

**Payload:**

```typescript
{
  roomId: string;           // UUID of the room
  message: string;          // Comment content (max 500 characters)
  messageType?: string;     // 'text' | 'emoji' | 'sticker' | 'system' (default: 'text')
  replyToId?: string;       // UUID of comment being replied to
  metadata?: any;           // Additional data (emoji info, sticker data, etc.)
}
```

**Example:**

```javascript
// Text comment
socket.emit('sendComment', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    message: 'Great discussion happening here!',
    messageType: 'text'
})

// Emoji reaction
socket.emit('sendComment', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    message: '👍',
    messageType: 'emoji',
    metadata: { emoji: '👍' }
})

// Reply to another comment
socket.emit('sendComment', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    message: 'I agree with this!',
    replyToId: 'comment-uuid-here'
})
```

**Response Events:**

- `newComment`: Broadcast to all room participants when a comment is sent
- `commentError`: Error occurred while sending comment

### 4. Send Gift

**Event:** `sendGift`

**Description:** Send a virtual gift to a room

**Payload:**

```typescript
{
  roomId: string;    // UUID of the room
  giftId: string;    // UUID of the gift to send
  message?: string;  // Optional message with gift (max 200 characters)
}
```

**Example:**

```javascript
socket.emit('sendGift', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    giftId: 'gift-uuid-here',
    message: 'Enjoyed your performance!'
})
```

**Response Events:**

- `newGift`: Broadcast to all room participants when a gift is sent
- `giftError`: Error occurred while sending gift

## Incoming Events (Server to Client)

### 1. Room Join Success

**Event:** `joinRoomSuccess`

**Payload:**

```typescript
{
    roomId: string
    message: string
    participantCount: number
}
```

### 2. Room Join Error

**Event:** `joinRoomError`

**Payload:**

```typescript
{
    roomId: string
    error: string
}
```

### 3. New Comment

**Event:** `newComment`

**Description:** Broadcast when someone sends a comment

**Payload:**

```typescript
{
  id: string;                    // Comment UUID
  roomId: string;               // Room UUID
  message: string;              // Comment content
  messageType: string;          // Type of message
  createdAt: string;            // ISO timestamp
  metadata?: any;               // Additional message data
  user: {
    id: string;                 // User UUID
    displayName: string;        // User display name
    avatarUrl?: string;         // User avatar URL
  };
  replyTo?: {                   // If replying to another comment
    id: string;
    message: string;
    user: {
      id: string;
      displayName: string;
    };
  };
}
```

### 4. Comment Error

**Event:** `commentError`

**Payload:**

```typescript
{
    error: string
    roomId: string
}
```

### 5. New Gift

**Event:** `newGift`

**Description:** Broadcast when someone sends a gift

**Payload:**

```typescript
{
  id: string;                   // Gift transaction UUID
  roomId: string;              // Room UUID
  giftId: string;              // Gift UUID
  message?: string;            // Optional message with gift
  createdAt: string;           // ISO timestamp
  sender: {
    id: string;                // Sender UUID
    displayName: string;       // Sender display name
    avatarUrl?: string;        // Sender avatar URL
  };
  gift: {
    id: string;                // Gift UUID
    name: string;              // Gift name
    imageUrl: string;          // Gift image URL
    value: number;             // Gift value/cost
  };
}
```

### 6. Gift Error

**Event:** `giftError`

**Payload:**

```typescript
{
    error: string
    roomId: string
}
```

### 7. User Joined Room

**Event:** `userJoinedRoom`

**Description:** Broadcast when a new user joins the room

**Payload:**

```typescript
{
  roomId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  participantCount: number;
}
```

### 8. User Left Room

**Event:** `userLeftRoom`

**Description:** Broadcast when a user leaves the room

**Payload:**

```typescript
{
    roomId: string
    userId: string
    participantCount: number
}
```

## HTTP Endpoints (Complementary)

### Get Room Comments

**Endpoint:** `GET /room/:id/comments`

**Description:** Retrieve paginated room comments

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Comments per page (default: 20)

**Response:**

```typescript
{
  statusCode: 200,
  message: "Room comments retrieved successfully",
  data: {
    comments: [
      {
        id: string;
        message: string;
        messageType: string;
        createdAt: string;
        user: {
          id: string;
          displayName: string;
          avatarUrl?: string;
        }
      }
    ],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  }
}
```

## Error Handling

### Common Error Scenarios

1. **Authentication Errors**

    - Invalid or missing JWT token
    - Token expired

2. **Room Access Errors**

    - Room not found
    - Room is private and password not provided/incorrect
    - User not authorized to access room

3. **Validation Errors**

    - Invalid room ID format
    - Message too long
    - Required fields missing

4. **Rate Limiting**
    - Too many messages sent in short time
    - Anti-spam protection triggered

## Connection Management

### Auto-reconnection

The WebSocket client should implement auto-reconnection logic:

```javascript
const socket = io('ws://localhost:3000/room', {
    extraHeaders: {
        Authorization: `Bearer ${jwt_token}`
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
})

socket.on('connect', () => {
    console.log('Connected to room gateway')
    // Re-join rooms that were previously joined
    previousRooms.forEach((roomId) => {
        socket.emit('joinRoom', { roomId })
    })
})

socket.on('disconnect', () => {
    console.log('Disconnected from room gateway')
})
```

### Heartbeat/Ping

The server automatically handles WebSocket ping/pong for connection health monitoring.

## Best Practices

1. **Message Throttling**: Implement client-side throttling to prevent spam
2. **Error Handling**: Always listen for error events and handle gracefully
3. **Connection State**: Track connection state and re-join rooms on reconnect
4. **Memory Management**: Clean up event listeners when components unmount
5. **Authentication**: Refresh JWT tokens before they expire

## Example Implementation

```javascript
class RoomWebSocket {
    constructor(token) {
        this.socket = io('ws://localhost:3000/room', {
            extraHeaders: {
                Authorization: `Bearer ${token}`
            }
        })

        this.setupEventListeners()
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to room service')
        })

        this.socket.on('newComment', (data) => {
            this.handleNewComment(data)
        })

        this.socket.on('newGift', (data) => {
            this.handleNewGift(data)
        })

        this.socket.on('commentError', (error) => {
            console.error('Comment error:', error)
        })
    }

    joinRoom(roomId, password) {
        this.socket.emit('joinRoom', { roomId, password })
    }

    sendComment(roomId, message, options = {}) {
        this.socket.emit('sendComment', {
            roomId,
            message,
            ...options
        })
    }

    sendGift(roomId, giftId, message) {
        this.socket.emit('sendGift', {
            roomId,
            giftId,
            message
        })
    }

    handleNewComment(comment) {
        // Update UI with new comment
        console.log('New comment:', comment)
    }

    handleNewGift(gift) {
        // Show gift animation
        console.log('New gift:', gift)
    }
}
```

## Security Considerations

1. **Authentication**: All WebSocket connections must be authenticated
2. **Authorization**: Users can only join rooms they have access to
3. **Rate Limiting**: Message sending is rate-limited per user
4. **Content Filtering**: Messages may be filtered for inappropriate content
5. **Room Privacy**: Private rooms require correct password

This documentation covers all real-time WebSocket functionality for the Room API, enabling seamless real-time communication and interaction within rooms.
