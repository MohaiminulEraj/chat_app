# 🚀 Unified Socket.IO Real-Time System Documentation

## Overview

This document describes the unified Socket.IO real-time communication system that replaces the previous fragmented WebSocket gateway architecture. The new system provides a single, comprehensive gateway for all real-time features including direct messaging, group chat, voice/video calls, user presence, and typing indicators.

## Architecture Changes

### Before (Old System)

- Multiple fragmented gateways: `ConversationGateway`, `GroupChatGateway`, `MessageGateway`, `RoomGateway`, `GiftGateway`, `WebsocketGateway`
- Namespace conflicts and complex routing
- Difficult to maintain and extend
- Inconsistent authentication across gateways

### After (New System)

- Single unified `SocketIOGateway` handling all real-time communication
- Centralized authentication and authorization
- Consistent event handling and error management
- Type-safe event system with DTOs and interfaces
- Better scalability and maintainability

## Core Components

### 1. SocketIOGateway (`src/modules/socketio/socketio.gateway.ts`)

The main gateway class that handles all Socket.IO connections and events.

**Key Features:**

- JWT-based authentication
- Connection lifecycle management
- Event handling for all real-time features
- Room-based organization for groups and conversations
- Error handling and logging

**Main Event Categories:**

- Authentication: `authenticate`
- Direct Messaging: `sendDirectMessage`, `newDirectMessage`
- Group Messaging: `sendGroupMessage`, `newGroupMessage`, `joinGroup`, `leaveGroup`
- Typing Indicators: `typing`, `userTyping`
- User Status: `updateStatus`, `userStatusChanged`
- Voice/Video Calls: `initiateCall`, `respondToCall`, `endCall`
- Message Management: `markMessagesAsRead`, `messagesRead`

### 2. SocketIOService (`src/modules/socketio/socketio.service.ts`)

Utility service providing helper methods for Socket.IO operations.

**Features:**

- Room management utilities
- Message formatting helpers
- Event emission utilities
- Logging and debugging support

### 3. SocketIOModule (`src/modules/socketio/socketio.module.ts`)

Module configuration that wires together all Socket.IO dependencies.

**Imports:**

- JwtModule for token verification
- UserModule for user operations
- ConversationModule for direct messaging
- FriendshipModule for friend relationships
- GroupModule for group operations

### 4. DTOs (`src/modules/socketio/dto/socketio.dto.ts`)

Data Transfer Objects for type-safe event validation.

**Available DTOs:**

- `AuthenticateDto`: JWT token authentication
- `SendDirectMessageDto`: Direct message sending
- `SendGroupMessageDto`: Group message sending
- `TypingDto`: Typing indicator events
- `CallDto`: Voice/video call events

### 5. Interfaces (`src/modules/socketio/interfaces/socketio.interface.ts`)

TypeScript interfaces defining the event contract between client and server.

**Interface Categories:**

- `SocketIOEvents`: Client-to-server events
- `SocketIOServerEvents`: Server-to-client events

## Authentication Flow

```typescript
// Client connects and authenticates
socket.emit('authenticate', { token: 'jwt-token-here' }, (response) => {
    if (response.success) {
        console.log('Authenticated:', response.userId)
        // Now can use all other events
    } else {
        console.error('Auth failed:', response.error)
    }
})
```

## Event Documentation

### Authentication Events

#### `authenticate` (Client → Server)

Authenticate the socket connection with a JWT token.

**Payload:**

```typescript
{
    token: string // JWT token
}
```

**Response:**

```typescript
{
  success: boolean;
  userId?: string;
  error?: string;
}
```

#### `authenticated` (Server → Client)

Confirmation of successful authentication.

**Payload:**

```typescript
{
    message: string
    userId: string
}
```

### Direct Messaging Events

#### `sendDirectMessage` (Client → Server)

Send a direct message to another user.

**Payload:**

```typescript
{
  recipientId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  metadata?: any;
}
```

**Response:**

```typescript
{
  success: boolean;
  conversationId?: string;
  messageId?: string;
  error?: string;
}
```

#### `newDirectMessage` (Server → Client)

Notification of a new direct message received.

**Payload:**

```typescript
{
  conversationId: string;
  message: {
    id: string;
    content: string;
    type: string;
    sender: {
      uuid: string;
      name: string;
      profilePicture?: string;
    };
    timestamp: Date;
  };
}
```

### Group Messaging Events

#### `joinGroup` (Client → Server)

Join a group for real-time updates.

**Payload:**

```typescript
{
    groupId: string
}
```

#### `sendGroupMessage` (Client → Server)

Send a message to a group.

**Payload:**

```typescript
{
  groupId: string;
  type: 'text' | 'image' | 'file' | 'voice';
  content: string;
  metadata?: any;
}
```

#### `newGroupMessage` (Server → Client)

Notification of a new group message.

**Payload:**

```typescript
{
  groupId: string;
  message: {
    id: string;
    content: string;
    type: string;
    sender: {
      uuid: string;
      name: string;
      profilePicture?: string;
    };
    timestamp: Date;
  };
}
```

### Typing Indicators

#### `typing` (Client → Server)

Indicate typing status in a conversation.

**Payload:**

```typescript
{
  conversationId?: string;
  groupId?: string;
  isTyping: boolean;
}
```

#### `userTyping` (Server → Client)

Notification that a user is typing.

**Payload:**

```typescript
{
  userId: string;
  userName: string;
  conversationId?: string;
  groupId?: string;
  isTyping: boolean;
}
```

### Voice/Video Calls

#### `initiateCall` (Client → Server)

Start a voice or video call.

**Payload:**

```typescript
{
    recipientId: string
    callType: 'voice' | 'video'
    callId: string
}
```

#### `respondToCall` (Client → Server)

Respond to an incoming call.

**Payload:**

```typescript
{
    callId: string
    response: 'accept' | 'decline'
    callerId: string
}
```

#### `endCall` (Client → Server)

End an active call.

**Payload:**

```typescript
{
  callId: string;
  participants: string[];
}
```

### User Status Events

#### `updateStatus` (Client → Server)

Update user's online status.

**Payload:**

```typescript
{
    status: 'online' | 'away' | 'busy' | 'offline'
}
```

#### `userStatusChanged` (Server → Client)

Notification of user status change.

**Payload:**

```typescript
{
    userId: string
    status: string
    timestamp: Date
}
```

## Client Integration

### HTML/JavaScript Client

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
    const socket = io('http://localhost:3000')

    // Authenticate
    socket.emit('authenticate', { token: 'your-jwt-token' }, (response) => {
        if (response.success) {
            console.log('Connected as:', response.userId)
        }
    })

    // Listen for direct messages
    socket.on('newDirectMessage', (data) => {
        console.log('New message:', data.message.content)
    })

    // Send a direct message
    socket.emit(
        'sendDirectMessage',
        {
            recipientId: 'user-uuid',
            type: 'text',
            content: 'Hello!'
        },
        (response) => {
            if (response.success) {
                console.log('Message sent!')
            }
        }
    )
</script>
```

### React/TypeScript Client

```typescript
import { io, Socket } from 'socket.io-client'

interface SocketIOEvents {
    authenticate: (
        data: { token: string },
        callback: (response: any) => void
    ) => void
    sendDirectMessage: (data: any, callback: (response: any) => void) => void
    // ... other events
}

interface SocketIOServerEvents {
    authenticated: (data: any) => void
    newDirectMessage: (data: any) => void
    // ... other events
}

const socket: Socket<SocketIOServerEvents, SocketIOEvents> = io(
    'http://localhost:3000'
)

// Usage
socket.emit('authenticate', { token }, (response) => {
    if (response.success) {
        // Handle success
    }
})
```

## Testing

### 1. HTML Test Client

Use the provided test client at `test-client/unified-socketio-test.html`:

```bash
# Serve the test client
cd test-client
python3 -m http.server 8080
# Open http://localhost:8080/unified-socketio-test.html
```

### 2. Node.js Test Script

Use the automated test script:

```bash
cd test-client
node socketio-test.js
```

### 3. Manual Testing Steps

1. **Authentication Test:**

    - Connect two clients with valid JWT tokens
    - Verify authentication success/failure responses

2. **Direct Messaging Test:**

    - Send messages between authenticated users
    - Verify real-time message delivery
    - Test different message types (text, image, file, voice)

3. **Group Messaging Test:**

    - Join multiple users to the same group
    - Send group messages and verify delivery to all members
    - Test joining/leaving groups

4. **Call Testing:**

    - Initiate voice/video calls between users
    - Test call acceptance/rejection
    - Test call termination

5. **Status Testing:**
    - Update user status and verify broadcasts
    - Test typing indicators

## Security Features

### 1. JWT Authentication

- All socket connections must authenticate with valid JWT tokens
- Tokens are verified using the same secret as the REST API
- Failed authentication results in socket disconnection

### 2. Authorization Checks

- Group membership verification before allowing group operations
- Friendship verification for direct messaging
- User verification for all operations

### 3. Input Validation

- All incoming events are validated using DTOs with decorators
- Type checking for all event payloads
- Sanitization of user inputs

## Performance Considerations

### 1. Room Management

- Users are automatically joined to relevant rooms (conversations, groups)
- Efficient event broadcasting using Socket.IO rooms
- Automatic cleanup when users disconnect

### 2. Connection Scaling

- Support for multiple server instances with Redis adapter (configurable)
- Efficient memory usage with proper event cleanup
- Connection pooling and reuse

### 3. Error Handling

- Graceful error handling with informative error messages
- Automatic retry mechanisms for transient failures
- Logging and monitoring integration

## Deployment Notes

### 1. Environment Variables

Ensure these environment variables are set:

```bash
JWT_SECRET=your-jwt-secret
DATABASE_URL=your-database-url
MONGODB_URI=your-mongodb-uri
```

### 2. CORS Configuration

Update CORS settings in `main.ts` for production:

```typescript
app.enableCors({
    origin: ['http://localhost:3000', 'https://yourdomain.com'],
    credentials: true
})
```

### 3. Socket.IO Adapter

For production with multiple server instances, configure Redis adapter:

```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

const pubClient = createClient({ url: 'redis://localhost:6379' })
const subClient = pubClient.duplicate()

io.adapter(createAdapter(pubClient, subClient))
```

## Migration Guide

### From Old WebSocket System

1. **Update Client Code:**

    - Replace multiple namespace connections with single connection
    - Update event names to match new unified system
    - Add authentication flow

2. **Remove Old Gateways:**

    - Old gateways are already disabled in the modules
    - Can be safely deleted after testing

3. **Update Frontend:**
    - Use new event structure
    - Implement unified connection management
    - Update typing indicators and status updates

## Troubleshooting

### Common Issues

1. **Authentication Failures:**

    - Verify JWT token is valid and not expired
    - Check JWT_SECRET environment variable
    - Ensure token is passed correctly in authenticate event

2. **Messages Not Delivered:**

    - Verify users are properly authenticated
    - Check friendship/group membership requirements
    - Verify recipient is online and connected

3. **Connection Issues:**
    - Check CORS configuration
    - Verify server is running and accessible
    - Check browser developer tools for errors

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=socket.io* npm run start:dev
```

## API Reference

For complete API reference, see the TypeScript interfaces in:

- `src/modules/socketio/interfaces/socketio.interface.ts`
- `src/modules/socketio/dto/socketio.dto.ts`

## Future Enhancements

### Planned Features

1. **File Upload Support:** Direct file uploads through Socket.IO
2. **Screen Sharing:** WebRTC integration for screen sharing
3. **Push Notifications:** Integration with FCM/APNS
4. **Message Reactions:** Emoji reactions to messages
5. **Message Threading:** Threaded conversations
6. **Advanced Presence:** Rich presence with custom statuses

### Performance Improvements

1. **Message Caching:** Redis-based message caching
2. **Connection Clustering:** Multi-server deployment support
3. **Bandwidth Optimization:** Message compression and batching

---

## Support

For questions or issues with the unified Socket.IO system, please refer to:

- This documentation
- Code comments in the gateway files
- Test client examples
- TypeScript interfaces for event contracts
