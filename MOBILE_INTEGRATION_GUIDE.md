# 📱 Mobile Integration: Backend Socket.IO URLs & Authentication

## 🔗 Server Configuration

### Base URLs

```
Development:  http://localhost:3000
Production:   https://your-domain.com
Socket.IO:    {BASE_URL}/socket.io/
WebSocket:    ws://localhost:3000 (or wss://your-domain.com for production)
```

### Connection Options

```javascript
// Recommended connection options for mobile
{
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  forceNew: true
}
```

---

## 🔐 Authentication Method

### ⚠️ IMPORTANT: JWT Token Location

**The JWT token is sent in the SOCKET EMIT BODY, NOT in headers!**

```javascript
// ✅ CORRECT: Send token in socket emit body
socket.emit(
    'authenticate',
    {
        token: 'your-jwt-token-here' // ← Token goes in the BODY
    },
    (response) => {
        console.log(response)
    }
)

// ❌ WRONG: Do NOT send in headers for socket authentication
// Headers are only used for HTTP requests, not Socket.IO events
```

### Authentication Flow

1. **Get JWT Token via HTTP** (headers used here):

    ```bash
    POST /auth/login
    Headers: Content-Type: application/json
    Body: {"email": "user@test.com", "password": "pass123"}
    Response: {"accessToken": "jwt-token-here"}
    ```

2. **Authenticate Socket** (token in body):
    ```javascript
    socket.emit('authenticate', {
        token: 'jwt-token-from-step-1'
    })
    ```

---

## 📡 Complete Socket.IO Event URLs

### 🔐 Authentication Events

| Event                      | Direction     | URL/Event             | Purpose                        |
| -------------------------- | ------------- | --------------------- | ------------------------------ |
| **Authenticate Socket**    | Client→Server | `authenticate`        | Authenticate socket connection |
| **Authentication Success** | Server→Client | `authenticated`       | Confirmation of authentication |
| **Authentication Error**   | Server→Client | `authenticationError` | Authentication failed          |

```javascript
// Authentication
socket.emit('authenticate', { token: 'jwt-token' })
socket.on('authenticated', (data) => {
    /* success */
})
socket.on('authenticationError', (data) => {
    /* error */
})
```

---

### 💬 One-to-One Messaging Events

| Event               | Direction     | URL/Event            | Purpose                   |
| ------------------- | ------------- | -------------------- | ------------------------- |
| **Send Message**    | Client→Server | `sendDirectMessage`  | Send private message      |
| **Receive Message** | Server→Client | `newDirectMessage`   | Receive incoming message  |
| **Mark Read**       | Client→Server | `markMessagesAsRead` | Mark messages as read     |
| **Read Receipt**    | Server→Client | `messagesRead`       | Message read notification |

```javascript
// Send message
socket.emit('sendDirectMessage', {
    recipientId: 'user-uuid',
    type: 'text',
    content: 'Hello!'
})

// Receive message
socket.on('newDirectMessage', (data) => {
    // data.message.content, data.conversationId
})

// Mark as read
socket.emit('markMessagesAsRead', {
    conversationId: 'conv-uuid',
    messageIds: ['msg-uuid-1', 'msg-uuid-2']
})

// Read receipt
socket.on('messagesRead', (data) => {
    // data.readBy.name, data.messageIds
})
```

---

### ⌨️ Typing Indicator Events

| Event              | Direction     | URL/Event    | Purpose                     |
| ------------------ | ------------- | ------------ | --------------------------- |
| **Send Typing**    | Client→Server | `typing`     | Send typing status          |
| **Receive Typing** | Server→Client | `userTyping` | Receive typing notification |

```javascript
// Send typing status
socket.emit('typing', {
    conversationId: 'conv-uuid',
    isTyping: true
})

// Receive typing status
socket.on('userTyping', (data) => {
    // data.userName, data.isTyping, data.conversationId
})
```

---

### 📞 Voice/Video Call Events

| Event               | Direction     | URL/Event       | Purpose                    |
| ------------------- | ------------- | --------------- | -------------------------- |
| **Initiate Call**   | Client→Server | `initiateCall`  | Start voice/video call     |
| **Incoming Call**   | Server→Client | `incomingCall`  | Receive call notification  |
| **Respond to Call** | Client→Server | `respondToCall` | Accept/decline call        |
| **Call Response**   | Server→Client | `callResponse`  | Call response notification |
| **End Call**        | Client→Server | `endCall`       | Terminate call             |
| **Call Ended**      | Server→Client | `callEnded`     | Call ended notification    |

```javascript
// Initiate call
socket.emit('initiateCall', {
    recipientId: 'user-uuid',
    callType: 'voice', // or 'video'
    callId: 'unique-call-id'
})

// Incoming call
socket.on('incomingCall', (data) => {
    // data.caller.name, data.callType, data.callId
})

// Respond to call
socket.emit('respondToCall', {
    callId: 'call-uuid',
    response: 'accept', // or 'decline'
    callerId: 'caller-uuid'
})

// Call response
socket.on('callResponse', (data) => {
    // data.response, data.responder.name
})

// End call
socket.emit('endCall', {
    callId: 'call-uuid',
    participants: ['user1-uuid', 'user2-uuid']
})

// Call ended
socket.on('callEnded', (data) => {
    // data.endedBy.name, data.reason
})
```

---

### 👤 User Status Events

| Event              | Direction     | URL/Event           | Purpose                  |
| ------------------ | ------------- | ------------------- | ------------------------ |
| **Update Status**  | Client→Server | `updateStatus`      | Update user status       |
| **Status Changed** | Server→Client | `userStatusChanged` | User status notification |

```javascript
// Update status
socket.emit('updateStatus', {
    status: 'online' // 'online', 'away', 'busy', 'offline'
})

// Status changed
socket.on('userStatusChanged', (data) => {
    // data.userId, data.status
})
```

---

### 🔔 Connection Events

| Event                | Direction     | URL/Event       | Purpose             |
| -------------------- | ------------- | --------------- | ------------------- |
| **Connected**        | Server→Client | `connect`       | Socket connected    |
| **Disconnected**     | Server→Client | `disconnect`    | Socket disconnected |
| **Connection Error** | Server→Client | `connect_error` | Connection failed   |
| **General Error**    | Server→Client | `error`         | General errors      |

```javascript
// Connection events
socket.on('connect', () => {
    console.log('Connected to server')
})

socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason)
})

socket.on('connect_error', (error) => {
    console.log('Connection error:', error)
})

socket.on('error', (data) => {
    console.log('Socket error:', data.message)
})
```

---

## 🛠️ Mobile Integration Code Examples

### React Native Example

```javascript
import io from 'socket.io-client'

class SocketService {
    constructor() {
        this.socket = null
        this.jwtToken = null
    }

    connect(serverUrl, jwtToken) {
        this.jwtToken = jwtToken

        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 20000,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            forceNew: true
        })

        this.setupEventListeners()
        return this.socket
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server')
            this.authenticate()
        })

        this.socket.on('authenticated', (data) => {
            console.log('✅ Authenticated:', data.userId)
        })

        this.socket.on('authenticationError', (data) => {
            console.error('❌ Auth error:', data.message)
        })

        // Add all other event listeners here...
    }

    authenticate() {
        this.socket.emit('authenticate', {
            token: this.jwtToken // ← Token in BODY, not headers
        })
    }

    sendMessage(recipientId, content) {
        this.socket.emit('sendDirectMessage', {
            recipientId,
            type: 'text',
            content
        })
    }

    // Add other methods...
}

// Usage
const socketService = new SocketService()
socketService.connect('http://localhost:3000', 'your-jwt-token')
```

### Flutter Example

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class SocketService {
  late IO.Socket socket;
  String? jwtToken;

  void connect(String serverUrl, String token) {
    jwtToken = token;

    socket = IO.io(serverUrl,
      IO.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .setTimeout(20000)
        .enableReconnection()
        .setReconnectionAttempts(5)
        .setReconnectionDelay(1000)
        .build()
    );

    setupEventListeners();
    socket.connect();
  }

  void setupEventListeners() {
    socket.onConnect((_) {
      print('Connected to server');
      authenticate();
    });

    socket.on('authenticated', (data) {
      print('✅ Authenticated: ${data['userId']}');
    });

    socket.on('authenticationError', (data) {
      print('❌ Auth error: ${data['message']}');
    });

    // Add all other event listeners here...
  }

  void authenticate() {
    socket.emit('authenticate', {
      'token': jwtToken  // ← Token in BODY, not headers
    });
  }

  void sendMessage(String recipientId, String content) {
    socket.emit('sendDirectMessage', {
      'recipientId': recipientId,
      'type': 'text',
      'content': content
    });
  }

  // Add other methods...
}
```

### Swift (iOS) Example

```swift
import SocketIO

class SocketService {
    private var manager: SocketManager!
    private var socket: SocketIOClient!
    private var jwtToken: String?

    func connect(serverUrl: String, jwtToken: String) {
        self.jwtToken = jwtToken

        manager = SocketManager(socketURL: URL(string: serverUrl)!, config: [
            .log(false),
            .compress,
            .reconnects(true),
            .reconnectAttempts(5),
            .reconnectWait(1),
            .timeout(20),
            .forceNew(true)
        ])

        socket = manager.defaultSocket
        setupEventListeners()
        socket.connect()
    }

    private func setupEventListeners() {
        socket.on(clientEvent: .connect) { data, ack in
            print("Connected to server")
            self.authenticate()
        }

        socket.on("authenticated") { data, ack in
            print("✅ Authenticated: \(data)")
        }

        socket.on("authenticationError") { data, ack in
            print("❌ Auth error: \(data)")
        }

        // Add all other event listeners here...
    }

    private func authenticate() {
        socket.emit("authenticate", [
            "token": jwtToken!  // ← Token in BODY, not headers
        ])
    }

    func sendMessage(recipientId: String, content: String) {
        socket.emit("sendDirectMessage", [
            "recipientId": recipientId,
            "type": "text",
            "content": content
        ])
    }

    // Add other methods...
}
```

### Kotlin (Android) Example

```kotlin
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

class SocketService {
    private lateinit var socket: Socket
    private var jwtToken: String? = null

    fun connect(serverUrl: String, token: String) {
        jwtToken = token

        val options = IO.Options().apply {
            transports = arrayOf("websocket", "polling")
            timeout = 20000
            reconnection = true
            reconnectionAttempts = 5
            reconnectionDelay = 1000
            forceNew = true
        }

        socket = IO.socket(serverUrl, options)
        setupEventListeners()
        socket.connect()
    }

    private fun setupEventListeners() {
        socket.on(Socket.EVENT_CONNECT) {
            println("Connected to server")
            authenticate()
        }

        socket.on("authenticated") { args ->
            println("✅ Authenticated: ${args[0]}")
        }

        socket.on("authenticationError") { args ->
            println("❌ Auth error: ${args[0]}")
        }

        // Add all other event listeners here...
    }

    private fun authenticate() {
        val authData = JSONObject().apply {
            put("token", jwtToken)  // ← Token in BODY, not headers
        }
        socket.emit("authenticate", authData)
    }

    fun sendMessage(recipientId: String, content: String) {
        val messageData = JSONObject().apply {
            put("recipientId", recipientId)
            put("type", "text")
            put("content", content)
        }
        socket.emit("sendDirectMessage", messageData)
    }

    // Add other methods...
}
```

---

## 🔍 HTTP Endpoints (for REST API calls)

### Authentication Endpoints (Use Headers)

```bash
# Login (get JWT token)
POST /auth/login
Headers: Content-Type: application/json
Body: {"email": "user@test.com", "password": "pass123"}

# Register
POST /auth/register
Headers: Content-Type: application/json
Body: {"name": "User", "email": "user@test.com", "password": "pass123"}

# Refresh token
POST /auth/refresh
Headers: Authorization: Bearer {refresh_token}

# Logout
POST /auth/logout
Headers: Authorization: Bearer {access_token}
```

### User Endpoints (Use Headers)

```bash
# Get profile
GET /user/profile
Headers: Authorization: Bearer {access_token}

# Update profile
PUT /user/profile
Headers: Authorization: Bearer {access_token}
Body: {"name": "New Name"}
```

### Friends Endpoints (Use Headers)

```bash
# Get friends list
GET /friendship/friends
Headers: Authorization: Bearer {access_token}

# Send friend request
POST /friendship/send-request
Headers: Authorization: Bearer {access_token}
Body: {"recipientId": "user-uuid"}

# Accept friend request
PUT /friendship/accept
Headers: Authorization: Bearer {access_token}
Body: {"friendshipId": "friendship-uuid"}
```

### Conversation Endpoints (Use Headers)

```bash
# Get conversations
GET /conversation
Headers: Authorization: Bearer {access_token}

# Get conversation messages
GET /conversation/{conversationId}/messages
Headers: Authorization: Bearer {access_token}
```

---

## 📋 Integration Checklist

### Step 1: Setup Socket.IO Client

- [ ] Install Socket.IO client library
- [ ] Configure connection options
- [ ] Setup base URL configuration

### Step 2: Authentication

- [ ] Get JWT token via HTTP POST to `/auth/login`
- [ ] Store JWT token securely
- [ ] Send token in socket emit body (NOT headers)
- [ ] Handle authentication success/error

### Step 3: Basic Messaging

- [ ] Implement `sendDirectMessage` event
- [ ] Handle `newDirectMessage` event
- [ ] Implement message UI

### Step 4: Advanced Features

- [ ] Typing indicators (`typing`, `userTyping`)
- [ ] Read receipts (`markMessagesAsRead`, `messagesRead`)
- [ ] User status (`updateStatus`, `userStatusChanged`)

### Step 5: Voice/Video Calls

- [ ] Implement call initiation (`initiateCall`)
- [ ] Handle incoming calls (`incomingCall`)
- [ ] Call responses (`respondToCall`, `callResponse`)
- [ ] Call termination (`endCall`, `callEnded`)

### Step 6: Error Handling

- [ ] Connection errors (`connect_error`)
- [ ] Authentication errors (`authenticationError`)
- [ ] General errors (`error`)
- [ ] Reconnection logic

---

## 🚨 Important Notes

### ⚠️ Authentication Token Location

- **Socket.IO Events**: Token goes in **BODY** of emit
- **HTTP Requests**: Token goes in **HEADERS** (Authorization: Bearer)

### 🔐 Security

- Store JWT tokens securely (Keychain/Keystore)
- Implement token refresh logic
- Handle token expiration gracefully
- Validate server certificates in production

### 📱 Mobile Considerations

- Handle app backgrounding/foregrounding
- Implement reconnection on network changes
- Add offline message queue
- Optimize for battery usage

### 🐛 Debugging

- Enable socket logging in development
- Monitor connection state changes
- Log all socket events for debugging
- Test with poor network conditions

---

## 🔗 Quick Reference URLs

| Purpose           | Event/URL                 | Token Location    |
| ----------------- | ------------------------- | ----------------- |
| **Socket Auth**   | `authenticate`            | Body              |
| **HTTP Login**    | `POST /auth/login`        | Headers           |
| **Send Message**  | `sendDirectMessage`       | Body (after auth) |
| **Start Call**    | `initiateCall`            | Body (after auth) |
| **Update Status** | `updateStatus`            | Body (after auth) |
| **Get Friends**   | `GET /friendship/friends` | Headers           |

**Remember**: Socket.IO authentication uses the emit body, not headers!
