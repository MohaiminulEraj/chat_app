# 🔄 WebSocket Testing Flow Diagram

## ❌ **WRONG WAY** (What Caused Your Error)

```
Postman: New → HTTP Request → GET ws://103.190.136.200:3000/chat
                    ↓
            ❌ Error: Invalid protocol: ws:
```

## ✅ **CORRECT WAY**

```
Postman: New → WebSocket Request → ws://103.190.136.200:3000/chat
                    ↓
               🟢 Connected
                    ↓
        Send: {"event": "authenticate", "data": {"token": "JWT_TOKEN"}}
                    ↓
               🔐 Authenticated
                    ↓
        Send: {"event": "joinConversation", "data": {"conversationId": "123"}}
                    ↓
               🏠 Joined Room
                    ↓
        Send: {"event": "sendMessage", "data": {"content": "Hello!"}}
                    ↓
               💬 Message Sent & Received
```

## 📊 **Complete Testing Flow**

### Phase 1: Setup Data (HTTP Requests)

```
1. Register User 1 ──→ Get JWT Token
2. Register User 2 ──→ Get Friend ID
3. Send Friend Request ──→ Create Friendship
4. Accept Friend Request ──→ Confirm Friendship
5. Create Conversation ──→ Get Conversation ID
6. Create Group ──→ Get Group UUID
```

### Phase 2: Test Chat (WebSocket Requests)

```
7. Connect to /chat ──→ WebSocket Connection
8. Authenticate ──→ Send JWT Token
9. Join Conversation ──→ Enter Chat Room
10. Send Messages ──→ Real-time Communication
11. Receive Messages ──→ See Responses
```

### Phase 3: Test Group Chat (WebSocket Requests)

```
12. Connect to /group-chat ──→ WebSocket Connection
13. Authenticate ──→ Send JWT Token
14. Join Group ──→ Enter Group Room
15. Send Group Messages ──→ Real-time Communication
16. Receive Group Messages ──→ See Responses
```

## 🔧 **Postman WebSocket Request Creation**

### Visual Steps:

```
Step 1: Postman Main Screen
┌─────────────────────────────────┐
│  [+ New] [Import] [Collections] │
│                                 │
│  Click "New" button             │
└─────────────────────────────────┘

Step 2: Request Type Selection
┌─────────────────────────────────┐
│  Create New                     │
│  ○ HTTP Request                 │
│  ● WebSocket Request  ←── Select│
│  ○ gRPC Request                 │
│  ○ Collection                   │
└─────────────────────────────────┘

Step 3: WebSocket Configuration
┌─────────────────────────────────┐
│  URL: ws://103.190.136.200:3000/chat │
│  [Connect] [Disconnect]         │
│                                 │
│  Status: 🟢 Connected           │
│                                 │
│  Message Input:                 │
│  ┌─────────────────────────────┐ │
│  │ {"event": "authenticate",   │ │
│  │  "data": {"token": "..."}}  │ │
│  └─────────────────────────────┘ │
│  [Send]                         │
└─────────────────────────────────┘
```

## 🎯 **Expected WebSocket Responses**

### Authentication Success:

```json
{
    "event": "authenticated",
    "data": {
        "message": "Authentication successful",
        "userId": "user-id-here"
    }
}
```

### Join Conversation Success:

```json
{
    "event": "joinedConversation",
    "data": {
        "conversationId": "conversation-id",
        "message": "Joined conversation successfully"
    }
}
```

### Message Received:

```json
{
    "event": "messageReceived",
    "data": {
        "messageId": "msg-123",
        "conversationId": "conv-456",
        "senderId": "user-789",
        "content": "Hello from WebSocket!",
        "messageType": "text",
        "timestamp": "2024-01-01T12:00:00Z"
    }
}
```

### Group Message Received:

```json
{
    "event": "groupMessageReceived",
    "data": {
        "messageId": "msg-123",
        "groupUuid": "group-456",
        "senderId": "user-789",
        "senderName": "John Doe",
        "content": "Hello group!",
        "messageType": "text",
        "timestamp": "2024-01-01T12:00:00Z"
    }
}
```

## 🚨 **Common Error Messages**

### Authentication Errors:

```json
{
    "event": "error",
    "data": {
        "message": "Authentication failed",
        "code": "AUTH_ERROR"
    }
}
```

### Invalid Conversation:

```json
{
    "event": "error",
    "data": {
        "message": "Conversation not found",
        "code": "CONVERSATION_NOT_FOUND"
    }
}
```

### Permission Denied:

```json
{
    "event": "error",
    "data": {
        "message": "You are not a member of this group",
        "code": "PERMISSION_DENIED"
    }
}
```

## 📋 **Quick Copy-Paste Messages**

### Authenticate:

```json
{ "event": "authenticate", "data": { "token": "{{jwt_token}}" } }
```

### Join One-to-One Chat:

```json
{
    "event": "joinConversation",
    "data": { "conversationId": "{{conversation_id}}" }
}
```

### Send Chat Message:

```json
{
    "event": "sendMessage",
    "data": {
        "conversationId": "{{conversation_id}}",
        "content": "Hello from Postman!",
        "messageType": "text"
    }
}
```

### Join Group Chat:

```json
{ "event": "joinGroup", "data": { "groupUuid": "{{group_uuid}}" } }
```

### Send Group Message:

```json
{
    "event": "sendMessage",
    "data": {
        "groupUuid": "{{group_uuid}}",
        "content": "Hello group from Postman!",
        "messageType": "text"
    }
}
```

## 🎨 **Testing Scenarios**

### Scenario 1: Basic Chat Test

```
1. Create WebSocket → /chat
2. Authenticate with JWT
3. Join existing conversation
4. Send 3 different messages
5. Verify messages are stored in MongoDB
```

### Scenario 2: Group Chat Test

```
1. Create WebSocket → /group-chat
2. Authenticate with JWT
3. Join existing group
4. Send 3 different messages
5. Verify messages in group collection
```

### Scenario 3: Multi-User Test

```
1. Open 2 WebSocket connections (different users)
2. Both join same conversation/group
3. Send messages from User 1
4. Verify User 2 receives messages
5. Send messages from User 2
6. Verify User 1 receives messages
```

### Scenario 4: Error Handling Test

```
1. Try connecting without authentication
2. Try joining non-existent conversation
3. Try sending messages without joining
4. Verify proper error responses
```

This guide should solve your WebSocket testing issues! 🚀
