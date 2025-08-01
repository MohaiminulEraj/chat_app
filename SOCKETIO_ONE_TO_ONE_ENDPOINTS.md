# 🔌 Socket.IO One-to-One Chat Endpoints Reference

## 📡 Connection Information

### Base URL

```
ws://localhost:3000
```

### Socket.IO Endpoint

```
http://localhost:3000/socket.io/
```

### Connection Protocol

- **Transport**: WebSocket (with polling fallback)
- **Namespace**: Default (`/`)
- **Authentication**: JWT Bearer Token

---

## 🔗 Connection Setup

### JavaScript Client Connection

```javascript
const { io } = require('socket.io-client')

const socket = io('http://localhost:3000', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
})
```

### Browser Client Connection

```html
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
    const socket = io('http://localhost:3000')
</script>
```

---

## 🔐 Authentication Endpoints

### 1. Authenticate Socket Connection

**Event:** `authenticate`
**Direction:** Client → Server
**Purpose:** Authenticate the socket connection with JWT token

#### Request Format

```javascript
socket.emit(
    'authenticate',
    {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "token": "string (JWT token)"
}
```

#### Success Response

```json
{
    "success": true,
    "userId": "user-uuid-here",
    "message": "Authentication successful"
}
```

#### Error Response

```json
{
    "success": false,
    "error": "Invalid token or authentication failed"
}
```

#### cURL Equivalent (HTTP Auth Endpoint)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

---

## 💬 One-to-One Messaging Endpoints

### 2. Send Direct Message

**Event:** `sendDirectMessage`
**Direction:** Client → Server
**Purpose:** Send a private message to another user

#### Request Format

```javascript
socket.emit(
    'sendDirectMessage',
    {
        recipientId: 'recipient-user-uuid',
        type: 'text',
        content: 'Hello, how are you?',
        metadata: {}
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "recipientId": "string (recipient UUID)",
    "type": "text|image|file|voice",
    "content": "string (message content)",
    "metadata": "object (optional)"
}
```

#### Success Response

```json
{
    "success": true,
    "messageId": "message-uuid",
    "conversationId": "conversation-uuid",
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

#### Error Response

```json
{
    "success": false,
    "error": "Recipient not found or not a friend"
}
```

### 3. Receive Direct Message

**Event:** `newDirectMessage`
**Direction:** Server → Client
**Purpose:** Receive incoming direct messages

#### Event Format

```javascript
socket.on('newDirectMessage', (data) => {
    console.log('New message received:', data)
})
```

#### Event Payload

```json
{
    "conversationId": "conversation-uuid",
    "message": {
        "id": "message-uuid",
        "content": "Hello, how are you?",
        "type": "text",
        "sender": {
            "uuid": "sender-uuid",
            "name": "John Doe",
            "profilePicture": "https://example.com/avatar.jpg"
        },
        "timestamp": "2025-07-29T12:00:00.000Z",
        "metadata": {}
    }
}
```

### 4. Mark Messages as Read

**Event:** `markMessagesAsRead`
**Direction:** Client → Server
**Purpose:** Mark messages as read in a conversation

#### Request Format

```javascript
socket.emit(
    'markMessagesAsRead',
    {
        conversationId: 'conversation-uuid',
        messageIds: ['msg-uuid-1', 'msg-uuid-2']
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "conversationId": "string (conversation UUID)",
    "messageIds": ["string (array of message UUIDs)"]
}
```

#### Success Response

```json
{
    "success": true,
    "markedCount": 2
}
```

### 5. Messages Read Notification

**Event:** `messagesRead`
**Direction:** Server → Client
**Purpose:** Receive notification when messages are read by recipient

#### Event Format

```javascript
socket.on('messagesRead', (data) => {
    console.log('Messages read by recipient:', data)
})
```

#### Event Payload

```json
{
    "conversationId": "conversation-uuid",
    "messageIds": ["msg-uuid-1", "msg-uuid-2"],
    "readBy": {
        "uuid": "reader-uuid",
        "name": "Jane Doe"
    },
    "timestamp": "2025-07-29T12:05:00.000Z"
}
```

---

## ⌨️ Typing Indicators

### 6. Send Typing Status

**Event:** `typing`
**Direction:** Client → Server
**Purpose:** Indicate typing status in a conversation

#### Request Format

```javascript
socket.emit('typing', {
    conversationId: 'conversation-uuid',
    isTyping: true
})
```

#### Request Payload

```json
{
    "conversationId": "string (conversation UUID)",
    "isTyping": "boolean"
}
```

### 7. Receive Typing Status

**Event:** `userTyping`
**Direction:** Server → Client
**Purpose:** Receive typing notifications from other users

#### Event Format

```javascript
socket.on('userTyping', (data) => {
    console.log('Typing status:', data)
})
```

#### Event Payload

```json
{
    "userId": "typer-uuid",
    "userName": "John Doe",
    "conversationId": "conversation-uuid",
    "isTyping": true,
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

---

## 📞 Voice/Video Call Endpoints

### 8. Initiate Call

**Event:** `initiateCall`
**Direction:** Client → Server
**Purpose:** Start a voice or video call

#### Request Format

```javascript
const callId =
    'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

socket.emit(
    'initiateCall',
    {
        recipientId: 'recipient-uuid',
        callType: 'voice',
        callId: callId
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "recipientId": "string (recipient UUID)",
    "callType": "voice|video",
    "callId": "string (unique call ID)"
}
```

#### Success Response

```json
{
    "success": true,
    "callId": "call-uuid",
    "message": "Call initiated successfully"
}
```

### 9. Incoming Call

**Event:** `incomingCall`
**Direction:** Server → Client
**Purpose:** Receive incoming call notifications

#### Event Format

```javascript
socket.on('incomingCall', (data) => {
    console.log('Incoming call:', data)

    // Respond to call
    socket.emit('respondToCall', {
        callId: data.callId,
        response: 'accept', // or 'decline'
        callerId: data.caller.uuid
    })
})
```

#### Event Payload

```json
{
    "callId": "call-uuid",
    "callType": "voice",
    "caller": {
        "uuid": "caller-uuid",
        "name": "John Doe",
        "profilePicture": "https://example.com/avatar.jpg"
    },
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

### 10. Respond to Call

**Event:** `respondToCall`
**Direction:** Client → Server
**Purpose:** Accept or decline an incoming call

#### Request Format

```javascript
socket.emit(
    'respondToCall',
    {
        callId: 'call-uuid',
        response: 'accept',
        callerId: 'caller-uuid'
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "callId": "string (call UUID)",
    "response": "accept|decline",
    "callerId": "string (caller UUID)"
}
```

### 11. Call Response

**Event:** `callResponse`
**Direction:** Server → Client
**Purpose:** Receive call response from recipient

#### Event Format

```javascript
socket.on('callResponse', (data) => {
    if (data.response === 'accept') {
        console.log('Call accepted')
        // Start call interface
    } else {
        console.log('Call declined')
    }
})
```

#### Event Payload

```json
{
    "callId": "call-uuid",
    "response": "accept",
    "responder": {
        "uuid": "responder-uuid",
        "name": "Jane Doe"
    },
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

### 12. End Call

**Event:** `endCall`
**Direction:** Client → Server
**Purpose:** Terminate an active call

#### Request Format

```javascript
socket.emit(
    'endCall',
    {
        callId: 'active-call-uuid',
        participants: ['user1-uuid', 'user2-uuid']
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "callId": "string (call UUID)",
    "participants": ["string (array of participant UUIDs)"]
}
```

### 13. Call Ended

**Event:** `callEnded`
**Direction:** Server → Client
**Purpose:** Receive notification when call is ended

#### Event Format

```javascript
socket.on('callEnded', (data) => {
    console.log('Call ended:', data)
    // Clean up call interface
})
```

#### Event Payload

```json
{
    "callId": "call-uuid",
    "endedBy": {
        "uuid": "ender-uuid",
        "name": "John Doe"
    },
    "reason": "user_ended",
    "timestamp": "2025-07-29T12:10:00.000Z"
}
```

---

## 👤 User Status Endpoints

### 14. Update Status

**Event:** `updateStatus`
**Direction:** Client → Server
**Purpose:** Update user's online status

#### Request Format

```javascript
socket.emit(
    'updateStatus',
    {
        status: 'online'
    },
    (response) => {
        console.log(response)
    }
)
```

#### Request Payload

```json
{
    "status": "online|away|busy|offline"
}
```

#### Success Response

```json
{
    "success": true,
    "status": "online",
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

### 15. User Status Changed

**Event:** `userStatusChanged`
**Direction:** Server → Client
**Purpose:** Receive status updates from other users

#### Event Format

```javascript
socket.on('userStatusChanged', (data) => {
    console.log('User status changed:', data)
})
```

#### Event Payload

```json
{
    "userId": "user-uuid",
    "status": "away",
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

---

## 🔔 Connection Events

### 16. Authenticated

**Event:** `authenticated`
**Direction:** Server → Client
**Purpose:** Confirmation of successful authentication

#### Event Format

```javascript
socket.on('authenticated', (data) => {
    console.log('Authentication confirmed:', data)
})
```

#### Event Payload

```json
{
    "message": "Successfully authenticated",
    "userId": "user-uuid",
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

### 17. Authentication Error

**Event:** `authenticationError`
**Direction:** Server → Client
**Purpose:** Authentication failure notification

#### Event Format

```javascript
socket.on('authenticationError', (data) => {
    console.error('Authentication failed:', data)
})
```

#### Event Payload

```json
{
    "message": "Invalid token",
    "code": "AUTH_FAILED",
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

### 18. Error

**Event:** `error`
**Direction:** Server → Client
**Purpose:** General error notifications

#### Event Format

```javascript
socket.on('error', (data) => {
    console.error('Socket error:', data)
})
```

#### Event Payload

```json
{
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {},
    "timestamp": "2025-07-29T12:00:00.000Z"
}
```

---

## 🧪 Complete Testing Example

### Full One-to-One Chat Implementation

```javascript
const { io } = require('socket.io-client')

class OneToOneChatClient {
    constructor(serverUrl, jwtToken) {
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling']
        })
        this.jwtToken = jwtToken
        this.userId = null
        this.setupEventListeners()
    }

    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server')
            this.authenticate()
        })

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server')
        })

        // Authentication events
        this.socket.on('authenticated', (data) => {
            console.log('✅ Authenticated:', data.message)
            this.userId = data.userId
        })

        this.socket.on('authenticationError', (data) => {
            console.error('❌ Auth error:', data.message)
        })

        // Message events
        this.socket.on('newDirectMessage', (data) => {
            console.log('📨 New message:', data.message.content)
            console.log('From:', data.message.sender.name)
            console.log('Conversation:', data.conversationId)
        })

        this.socket.on('messagesRead', (data) => {
            console.log('✅ Messages read by:', data.readBy.name)
        })

        // Typing events
        this.socket.on('userTyping', (data) => {
            if (data.isTyping) {
                console.log('⌨️ ', data.userName, 'is typing...')
            } else {
                console.log('⌨️ ', data.userName, 'stopped typing')
            }
        })

        // Call events
        this.socket.on('incomingCall', (data) => {
            console.log('📞 Incoming call from:', data.caller.name)
            console.log('Call type:', data.callType)

            // Auto-accept for demo
            this.respondToCall(data.callId, 'accept', data.caller.uuid)
        })

        this.socket.on('callResponse', (data) => {
            console.log('📞 Call', data.response, 'by', data.responder.name)
        })

        this.socket.on('callEnded', (data) => {
            console.log('📞 Call ended by:', data.endedBy.name)
        })

        // Status events
        this.socket.on('userStatusChanged', (data) => {
            console.log('👤 User', data.userId, 'is now', data.status)
        })

        // Error events
        this.socket.on('error', (data) => {
            console.error('❌ Error:', data.message)
        })
    }

    authenticate() {
        this.socket.emit(
            'authenticate',
            {
                token: this.jwtToken
            },
            (response) => {
                if (!response.success) {
                    console.error('Authentication failed:', response.error)
                }
            }
        )
    }

    sendMessage(recipientId, content, type = 'text') {
        this.socket.emit(
            'sendDirectMessage',
            {
                recipientId: recipientId,
                type: type,
                content: content
            },
            (response) => {
                if (response.success) {
                    console.log('✅ Message sent successfully')
                } else {
                    console.error('❌ Message failed:', response.error)
                }
            }
        )
    }

    startTyping(conversationId) {
        this.socket.emit('typing', {
            conversationId: conversationId,
            isTyping: true
        })
    }

    stopTyping(conversationId) {
        this.socket.emit('typing', {
            conversationId: conversationId,
            isTyping: false
        })
    }

    markMessagesAsRead(conversationId, messageIds) {
        this.socket.emit(
            'markMessagesAsRead',
            {
                conversationId: conversationId,
                messageIds: messageIds
            },
            (response) => {
                if (response.success) {
                    console.log('✅ Messages marked as read')
                }
            }
        )
    }

    initiateCall(recipientId, callType = 'voice') {
        const callId =
            'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

        this.socket.emit(
            'initiateCall',
            {
                recipientId: recipientId,
                callType: callType,
                callId: callId
            },
            (response) => {
                if (response.success) {
                    console.log('📞 Call initiated successfully')
                } else {
                    console.error('❌ Call failed:', response.error)
                }
            }
        )
    }

    respondToCall(callId, response, callerId) {
        this.socket.emit(
            'respondToCall',
            {
                callId: callId,
                response: response,
                callerId: callerId
            },
            (response) => {
                if (response.success) {
                    console.log('📞 Call response sent')
                }
            }
        )
    }

    endCall(callId, participants) {
        this.socket.emit(
            'endCall',
            {
                callId: callId,
                participants: participants
            },
            (response) => {
                if (response.success) {
                    console.log('📞 Call ended')
                }
            }
        )
    }

    updateStatus(status) {
        this.socket.emit(
            'updateStatus',
            {
                status: status
            },
            (response) => {
                if (response.success) {
                    console.log('👤 Status updated to:', status)
                }
            }
        )
    }

    disconnect() {
        this.socket.disconnect()
    }
}

// Usage Example
const client = new OneToOneChatClient(
    'http://localhost:3000',
    'your-jwt-token-here'
)

// Send a message
setTimeout(() => {
    client.sendMessage('recipient-uuid', 'Hello, how are you?')
}, 2000)

// Update status
setTimeout(() => {
    client.updateStatus('away')
}, 5000)

// Initiate a call
setTimeout(() => {
    client.initiateCall('recipient-uuid', 'voice')
}, 10000)
```

---

## 🌐 cURL Testing Examples

### Get JWT Token

```bash
# Login to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Test Socket.IO Connection (HTTP Handshake)

```bash
# Test Socket.IO endpoint availability
curl -X GET "http://localhost:3000/socket.io/?EIO=4&transport=polling&t=$(date +%s)"
```

### Test Authentication Endpoint

```bash
# Test if user profile is accessible (requires JWT)
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Test Friends List (Required for messaging)

```bash
# Get friends list
curl -X GET http://localhost:3000/friendship/friends \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### Test Conversations

```bash
# Get conversations list
curl -X GET http://localhost:3000/conversation \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## 📋 Prerequisites Checklist

Before using one-to-one chat endpoints:

1. **✅ Server Running**: NestJS server on port 3000
2. **✅ Authentication**: Valid JWT token obtained
3. **✅ Friendship**: Users must be friends to send direct messages
4. **✅ Socket Connection**: WebSocket connection established
5. **✅ Socket Authentication**: Socket authenticated with JWT token

---

## 🚨 Error Codes Reference

| Code                     | Description                | Solution                                  |
| ------------------------ | -------------------------- | ----------------------------------------- |
| `AUTH_REQUIRED`          | Socket not authenticated   | Call authenticate event first             |
| `AUTH_FAILED`            | Invalid JWT token          | Get new token via login endpoint          |
| `USER_NOT_FOUND`         | Recipient doesn't exist    | Verify recipient UUID                     |
| `NOT_FRIENDS`            | Users are not friends      | Send friend request first                 |
| `CONVERSATION_NOT_FOUND` | Conversation doesn't exist | Send first message to create conversation |
| `INVALID_MESSAGE_TYPE`   | Unsupported message type   | Use: text, image, file, voice             |
| `PERMISSION_DENIED`      | Insufficient permissions   | Check user permissions                    |
| `VALIDATION_ERROR`       | Invalid data format        | Check payload format                      |

---

## 📞 Support

For issues with one-to-one chat:

1. Check server logs for backend errors
2. Verify JWT token validity
3. Ensure friendship exists between users
4. Check network connectivity
5. Monitor browser console for client errors

**Server Logs Location**: `logs/combined.log`, `logs/error.log`
**Test Client**: `http://localhost:8080/unified-socketio-test.html`
**Documentation**: `SOCKETIO_SYSTEM_DOCS.md`
