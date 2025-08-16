# Room Real-time WebSocket API Documentation

## Overview

The Room Real-time API provides WebSocket functionality for real-time communication within rooms. Users can join rooms, send comments, exchange gifts, and receive live updates from other participants.

## Base Connections

### Main WebSocket Endpoint (SocketIOGateway)

```
ws://103.190.136.200:3000
```

### Room WebSocket Endpoint (RoomGateway)

```
ws://103.190.136.200:3000/rooms
```

### Authentication

All WebSocket connections require JWT authentication. You can authenticate via:

1. **Query Parameters:**

```javascript
const socket = io('ws://103.190.136.200:3000', {
    query: { token: jwt_token }
})
```

2. **Auth Object:**

```javascript
const socket = io('ws://103.190.136.200:3000', {
    auth: { token: jwt_token }
})
```

3. **Manual Authentication:**

```javascript
const socket = io('ws://103.190.136.200:3000')
socket.emit('authenticate', { token: jwt_token })
```

## Authentication Events

### Setup Event (Flutter Compatible)

**Event:** `setup`
**Gateway:** Main SocketIO Gateway
**Description:** Initialize user session and join relevant rooms

**Payload:**

```typescript
{
  userId?: string;     // Optional user ID
  roomIds?: string[];  // Optional array of room IDs to join
}
```

**Example:**

```javascript
socket.emit('setup', {
    userId: 'user-uuid',
    roomIds: ['room-1', 'room-2']
})
```

**Response:**

```typescript
{
  status: 'success' | 'error';
  message: string;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  rooms?: string[];
}
```

### Manual Authentication

**Event:** `authenticate`
**Gateway:** Main SocketIO Gateway

**Payload:**

```typescript
{
    token: string // JWT token
}
```

**Response:**

```typescript
{
  status: 'success' | 'error';
  message: string;
  userId?: string;
  userName?: string;
}
```

## Room Events

### 1. Join Room

**Event:** `joinRoom`
**Gateway:** Room Gateway (`/rooms` namespace)
**Description:** Join a specific room to receive real-time updates

**Payload:**

```typescript
{
    roomId: string // UUID of the room
}
```

**Example:**

```javascript
// Connect to rooms namespace
const roomSocket = io('ws://103.190.136.200:3000/rooms', {
    auth: { token: jwt_token }
})

roomSocket.emit('joinRoom', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8'
})
```

**Response:**

```typescript
{
  status: 'success' | 'error';
  participant?: {
    userId: string;
    userName: string;
    seatNumber: number;
    joinedAt: string;
  };
  roomUserCount?: number;
  message: string;
}
```

**Broadcast Events:**

- `userJoined`: Sent to all room participants when someone joins

### 2. Leave Room

**Event:** `leaveRoom` or `leave_room` (legacy)
**Gateway:** Room Gateway

**Payload:**

```typescript
string // Room ID (for leaveRoom)
// OR
{
    roomId: string // For leave_room legacy event
}
```

**Response:**

```typescript
{
  status: 'success' | 'error';
  roomUserCount?: number;
  message: string;
}
```

**Broadcast Events:**

- `userLeft`: Sent to all room participants when someone leaves

### 3. Send Comment

**Event:** `sendComment`
**Gateway:** Room Gateway
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
roomSocket.emit('sendComment', {
    roomId: 'a71adf4a-221d-4d59-a60a-005e2552f6f8',
    message: 'Great discussion happening here!',
    messageType: 'text'
})
```

**Response:**

```typescript
{
  status: 'success' | 'error';
  comment?: {
    uuid: string;
    message: string;
    messageType: string;
    createdAt: string;
  };
  message: string;
}
```

**Broadcast Event:** `ReceivedComment` (Flutter compatible)

```typescript
{
  _id: string;              // Comment UUID
  senderId: string;         // Sender user ID
  senderName: string;       // Sender display name
  senderImage?: string;     // Sender avatar URL
  content: string;          // Comment content
  messageType: string;      // Message type
  replyToId?: string;       // Reply to comment ID
  metadata?: any;           // Additional metadata
  createdAt: string;        // ISO timestamp
  isVisible: boolean;       // Comment visibility
}
```

### 4. Comment Reactions

**Event:** `reactToComment`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
    commentId: string
    reaction: string // Emoji reaction
    action: 'add' | 'remove'
}
```

**Broadcast Event:** `commentReaction`

### 5. Typing Indicators

**Event:** `typingComment`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
    isTyping: boolean
}
```

**Broadcast Event:** `userTypingComment`

## Group Messaging (Main Gateway)

### Send Group Message

**Event:** `sendGroupMessage`
**Gateway:** Main SocketIO Gateway
**Description:** Send messages to group conversations

**Payload:**

```typescript
{
  groupId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content?: string;
  fileUrl?: string;
  metadata?: any;
  replyToMessageId?: string;
}
```

**Broadcast Event:** `GroupMessageReceived` (Flutter compatible)

```typescript
{
  _id: string;              // Message UUID
  senderId: string;         // Sender user ID
  senderName: string;       // Sender display name
  senderImage?: string;     // Sender avatar URL
  content: string;          // Message content
  messageType: string;      // Message type
  groupId: string;          // Group ID
  createdAt: string;        // ISO timestamp
  replyToMessageId?: string;// Reply to message ID
  metadata?: any;           // Additional metadata
}
```

## Voice Call Management

### Request to Join Call

**Event:** `requestToJoinCall`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  message?: string;  // Optional request message
}
```

**Broadcast Event:** `UserRequestedToJoinCall`

```typescript
{
  roomId: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  message?: string;
  timestamp: string;
}
```

### Grant Microphone Access

**Event:** `grantMikeAccess`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  memberId: string;   // User to grant access to
  message?: string;
}
```

**Broadcast Event:** `MikeAccessGranted`

### Revoke Microphone Access

**Event:** `revokeMikeAccess`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  memberId: string;   // User to revoke access from
  message?: string;
}
```

**Broadcast Event:** `MikeAccessRevoked`

### Close Room Call

**Event:** `closeRoomCall`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  reason?: string;
}
```

**Broadcast Event:** `RoomCallClosed`

## Room Media Controls

### Toggle Mute

**Event:** `toggleMute`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
    isMuted: boolean
}
```

### Toggle Video

**Event:** `toggleVideo`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
    isVideoOn: boolean
}
```

### Update Speaking Status

**Event:** `updateSpeaking`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
    isSpeaking: boolean
}
```

## Gift System

### Send Gift in Room

**Event:** `sendGiftInRoom`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  receiverId: string;
  giftId: string;
  message?: string;
}
```

**Broadcast Event:** `newGiftInRoom`

## Room Information

### Get Room Comments

**Event:** `getRoomComments`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
  roomId: string;
  limit?: number;
  offset?: number;
  lastCommentId?: string;
}
```

### Get Room Statistics

**Event:** `getRoomStats`
**Gateway:** Room Gateway

**Payload:**

```typescript
{
    roomId: string
}
```

## Connection Events

### Connection Established

**Event:** `connected`
**Description:** Sent when WebSocket connection is established

**Payload:**

```typescript
{
  status: 'success';
  message: string;
  socketId?: string;        // Main gateway
  timestamp?: string;       // Room gateway
}
```

### User Events

**Event:** `userJoined`
**Description:** Broadcast when user joins room

**Payload:**

```typescript
{
    roomId: string
    participant: {
        userId: string
        userName: string
        seatNumber: number
        joinedAt: string
    }
    userName: string
}
```

**Event:** `userLeft`
**Description:** Broadcast when user leaves room

**Payload:**

```typescript
{
    roomId: string
    userId: string
    userName: string
}
```

## Error Handling

### Common Error Response Format

```typescript
{
  status: 'error';
  message: string;
  roomId?: string;
  error?: string;
}
```

### Error Scenarios

1. **Authentication Errors**

    - Invalid or missing JWT token
    - Token expired
    - Authentication failed

2. **Room Access Errors**

    - Room not found
    - User not participant of room
    - Insufficient permissions

3. **Validation Errors**

    - Invalid room ID format
    - Message too long (>500 chars)
    - Required fields missing

4. **Rate Limiting**
    - Too many messages in short time
    - Anti-spam protection triggered

## Connection Management

### Dual Gateway Architecture

This API uses two separate WebSocket gateways:

1. **Main Gateway (`ws://103.190.136.200:3000`)**: General messaging, groups, authentication
2. **Room Gateway (`ws://103.190.136.200:3000/rooms`)**: Room-specific features, comments, voice calls

### Flutter Implementation Example

```javascript
class SocketService {
    constructor(token) {
        // Main gateway for general features
        this.mainSocket = io('ws://103.190.136.200:3000', {
            auth: { token }
        })

        // Room gateway for room features
        this.roomSocket = io('ws://103.190.136.200:3000/rooms', {
            auth: { token }
        })

        this.setupEventListeners()
    }

    setupEventListeners() {
        // Main gateway events
        this.mainSocket.on('connected', (data) => {
            console.log('Connected to main gateway:', data)
            // Setup user session
            this.mainSocket.emit('setup', { userId: 'user-id' })
        })

        this.mainSocket.on('GroupMessageReceived', (data) => {
            this.handleGroupMessage(data)
        })

        // Room gateway events
        this.roomSocket.on('connected', (data) => {
            console.log('Connected to room gateway:', data)
        })

        this.roomSocket.on('ReceivedComment', (data) => {
            this.handleRoomComment(data)
        })

        this.roomSocket.on('UserRequestedToJoinCall', (data) => {
            this.handleCallRequest(data)
        })
    }

    // Join room for real-time updates
    joinRoom(roomId) {
        this.roomSocket.emit('joinRoom', { roomId })
    }

    // Send comment to room
    sendComment(roomId, message) {
        this.roomSocket.emit('sendComment', {
            roomId,
            message,
            messageType: 'text'
        })
    }

    // Send group message
    sendGroupMessage(groupId, content) {
        this.mainSocket.emit('sendGroupMessage', {
            groupId,
            type: 'text',
            content
        })
    }

    // Handle incoming events
    handleGroupMessage(data) {
        console.log('Group message:', data)
        // Update UI with Flutter-compatible structure
    }

    handleRoomComment(data) {
        console.log('Room comment:', data)
        // Update room UI with new comment
    }

    handleCallRequest(data) {
        console.log('Call request:', data)
        // Show call request notification
    }
}
```

## Best Practices

1. **Dual Connection Management**: Use both main and room gateways appropriately
2. **Event Name Consistency**: Use Flutter-compatible event names (`GroupMessageReceived`, `ReceivedComment`)
3. **Error Handling**: Always listen for error responses and handle gracefully
4. **Auto-reconnection**: Implement reconnection logic and re-join rooms
5. **Authentication**: Use `setup` event after connection for Flutter clients
6. **Rate Limiting**: Implement client-side throttling to prevent spam

## Security Considerations

1. **JWT Authentication**: All connections require valid JWT tokens
2. **Room Authorization**: Users can only access rooms they're participants in
3. **Input Validation**: Messages are validated for length and content
4. **Rate Limiting**: Automatic spam protection and rate limiting
5. **Permission Checks**: Voice call permissions verified before granting access

This documentation reflects the current dual-gateway architecture optimized for Flutter client compatibility with proper event naming and structures.
