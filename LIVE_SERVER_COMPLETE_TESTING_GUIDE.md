# 🚀 Live Server Complete Chat Testing Guide

## Overview
This guide provides comprehensive instructions for testing both **One-to-One Chat** and **Group Chat** functionality on your live server at `http://103.190.136.200:3000`.

## 📋 Server Information
- **API Base URL**: `http://103.190.136.200:3000/api/v1`
- **WebSocket URL**: `ws://103.190.136.200:3000`
- **One-to-One Chat Namespace**: `/chat`
- **Group Chat Namespace**: `/group-chat`

## 📦 Files Created

### Postman Collections & Environment
1. **`kitty_live_api_environment.json`** - Environment variables for live server
2. **`Kitty_Live_API_Complete_Chat_System.postman_collection.json`** - Complete API collection

### Testing Clients
3. **`live-server-complete-chat-test.html`** - Comprehensive HTML test client

## 🚀 Getting Started

### Step 1: Import Postman Collection
1. Open Postman
2. Import `kitty_live_api_environment.json` as Environment
3. Import `Kitty_Live_API_Complete_Chat_System.postman_collection.json` as Collection
4. Select "Kitty Live API Environment" in Postman

### Step 2: Authentication Setup
Run these requests in order:

1. **Register User 1 (Main User)**
   - Creates your main test account
   - Automatically saves JWT token

2. **Register User 2 (Friend User)**
   - Creates a friend account for testing one-to-one chat
   - Saves friend's user ID

3. **Login Main User**
   - Logs in your main account
   - Updates JWT token

### Step 3: Test API Endpoints

#### Friendship Setup (for One-to-One Chat)
1. **Send Friend Request** - Send request to friend
2. **Accept Friend Request** - Accept the friendship
3. **Get Friends List** - Verify friendship

#### One-to-One Chat Setup
1. **Create Conversation** - Create chat with friend
2. **Get All Conversations** - List conversations
3. **Send Message (HTTP)** - Test HTTP message sending

#### Group Chat Setup
1. **Create Group** - Create a test group
2. **Join Group** - Join the created group
3. **Invite User to Group** - Invite friend to group
4. **Get Group Members** - Verify group membership

## 🔌 WebSocket Testing

### Option A: HTML Test Client (Recommended)

1. **Open Test Client**
   ```bash
   # Open in browser
   file:///path/to/kitty_backend/test-client/live-server-complete-chat-test.html
   ```

2. **Authentication**
   - Fill in email/password (defaults provided)
   - Click "Register" or "Login"
   - JWT token will be auto-filled

3. **One-to-One Chat Testing**
   - Enter friend's user ID (from Postman)
   - Click "Create Conversation"
   - Click "Connect Chat"
   - Start sending messages!

4. **Group Chat Testing**
   - Enter group name
   - Click "Create Group"
   - Click "Join Group"
   - Click "Connect Group Chat"
   - Start group messaging!

### Option B: Postman WebSocket

**⚠️ Important:** Postman WebSocket requests need to be created as **NEW WebSocket requests**, not HTTP GET requests.

#### How to Create WebSocket Request in Postman:
1. Click **"New"** in Postman
2. Select **"WebSocket Request"** (not HTTP request)
3. Enter the WebSocket URL
4. Click **"Connect"**
5. Send JSON messages in the message box

#### One-to-One Chat WebSocket
1. Create **NEW WebSocket Request** in Postman
2. **URL:** `ws://103.190.136.200:3000/chat`
3. Click **"Connect"**
4. Send these messages:

**Step 1 - Authenticate:**
```json
{
  "event": "authenticate",
  "data": {
    "token": "YOUR_JWT_TOKEN"
  }
}
```

**Step 2 - Join Conversation:**
```json
{
  "event": "joinConversation",
  "data": {
    "conversationId": "YOUR_CONVERSATION_ID"
  }
}
```

**Step 3 - Send Message:**
```json
{
  "event": "sendMessage",
  "data": {
    "conversationId": "YOUR_CONVERSATION_ID",
    "content": "Hello from live server!",
    "messageType": "text"
  }
}
```

#### Group Chat WebSocket
1. Create **NEW WebSocket Request** in Postman
2. **URL:** `ws://103.190.136.200:3000/group-chat`
3. Click **"Connect"**
4. Send these messages:

**Step 1 - Authenticate:**
```json
{
  "event": "authenticate",
  "data": {
    "token": "YOUR_JWT_TOKEN"
  }
}
```

**Step 2 - Join Group:**
```json
{
  "event": "joinGroup",
  "data": {
    "groupUuid": "YOUR_GROUP_UUID"
  }
}
```

**Step 3 - Send Group Message:**
```json
{
  "event": "sendMessage",
  "data": {
    "groupUuid": "YOUR_GROUP_UUID",
    "content": "Hello group from live server!",
    "messageType": "text"
  }
}
```

### Option C: Socket.io Protocol (Advanced)

For direct Socket.io testing:

#### One-to-One Chat
```
URL: ws://103.190.136.200:3000/socket.io/?EIO=4&transport=websocket&ns=/chat

Messages:
1. 42["authenticate",{"token":"JWT_TOKEN"}]
2. 42["joinConversation",{"conversationId":"CONVERSATION_ID"}]
3. 42["sendMessage",{"conversationId":"CONVERSATION_ID","content":"Hello!","messageType":"text"}]
```

#### Group Chat
```
URL: ws://103.190.136.200:3000/socket.io/?EIO=4&transport=websocket&ns=/group-chat

Messages:
1. 42["authenticate",{"token":"JWT_TOKEN"}]
2. 42["joinGroup",{"groupUuid":"GROUP_UUID"}]
3. 42["sendMessage",{"groupUuid":"GROUP_UUID","content":"Hello group!","messageType":"text"}]
```

## 🎯 Complete Testing Workflow

### 1. User Registration & Authentication
```bash
# Test both users registration
POST /api/v1/auth/registration (User 1)
POST /api/v1/auth/registration (User 2)
POST /api/v1/auth/login (Login User 1)
```

### 2. Friendship Setup
```bash
# Establish friendship for one-to-one chat
POST /api/v1/friendship/send-request
PATCH /api/v1/friendship/respond-request
GET /api/v1/friendship/friends
```

### 3. One-to-One Chat Testing
```bash
# HTTP API Testing
POST /api/v1/conversation (Create conversation)
GET /api/v1/conversation (List conversations)
POST /api/v1/conversation/{id}/messages (Send message)
GET /api/v1/conversation/{id}/messages (Get history)

# WebSocket Testing
Connect to ws://103.190.136.200:3000/chat
Send: authenticate, joinConversation, sendMessage
Test: Real-time messaging, typing indicators, message history
```

### 4. Group Chat Testing
```bash
# HTTP API Testing
POST /api/v1/group (Create group)
POST /api/v1/group/{uuid}/join (Join group)
POST /api/v1/group/{uuid}/invite (Invite users)
GET /api/v1/group/{uuid}/members (Get members)

# Group Chat HTTP Endpoints
GET /api/v1/group-chat/{uuid}/messages (Get messages)
POST /api/v1/group-chat/{uuid}/mark-as-read (Mark as read)
PATCH /api/v1/group-chat/{uuid}/messages/{id} (Edit message)
DELETE /api/v1/group-chat/{uuid}/messages/{id} (Delete message)

# WebSocket Testing
Connect to ws://103.190.136.200:3000/group-chat
Send: authenticate, joinGroup, sendMessage
Test: Real-time group messaging, typing, editing, deletion
```

## 🔍 WebSocket Events Reference

### One-to-One Chat Events

#### Client → Server
| Event | Description | Data |
|-------|-------------|------|
| `authenticate` | Authenticate with JWT | `{token: "jwt_token"}` |
| `joinConversation` | Join conversation | `{conversationId: "id"}` |
| `leaveConversation` | Leave conversation | `{conversationId: "id"}` |
| `sendMessage` | Send message | `{conversationId, content, messageType}` |
| `getMessageHistory` | Get message history | `{conversationId, page, limit}` |
| `markAsRead` | Mark messages as read | `{conversationId, messageIds[]}` |
| `typing` | Typing indicator | `{conversationId, isTyping}` |

#### Server → Client
| Event | Description | Data |
|-------|-------------|------|
| `authenticated` | Authentication success | `{userId, message}` |
| `conversationJoined` | Joined conversation | `{conversationId}` |
| `newMessage` | New message received | `{id, content, senderName, timestamp}` |
| `messageHistory` | Message history | `{messages[], total, page}` |
| `userTyping` | User typing status | `{userId, userName, isTyping}` |
| `error` | Error message | `{message, code}` |

### Group Chat Events

#### Client → Server
| Event | Description | Data |
|-------|-------------|------|
| `authenticate` | Authenticate with JWT | `{token: "jwt_token"}` |
| `joinGroup` | Join group | `{groupUuid: "uuid"}` |
| `leaveGroup` | Leave group | `{groupUuid: "uuid"}` |
| `sendMessage` | Send group message | `{groupUuid, content, messageType}` |
| `editMessage` | Edit message | `{groupUuid, messageId, content}` |
| `deleteMessage` | Delete message | `{groupUuid, messageId}` |
| `getMessageHistory` | Get message history | `{groupUuid, page, limit}` |
| `markAsRead` | Mark messages as read | `{groupUuid, messageIds[]}` |
| `typing` | Typing indicator | `{groupUuid, isTyping}` |

#### Server → Client
| Event | Description | Data |
|-------|-------------|------|
| `authenticated` | Authentication success | `{userId, message}` |
| `groupJoined` | Joined group | `{groupUuid, message}` |
| `newMessage` | New group message | `{id, content, senderName, timestamp}` |
| `messageEdited` | Message edited | `{messageId, content, editedAt}` |
| `messageDeleted` | Message deleted | `{messageId, deletedAt}` |
| `messageHistory` | Message history | `{messages[], total, page}` |
| `userTyping` | User typing status | `{userId, userName, isTyping}` |
| `error` | Error message | `{message, code}` |

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify JWT token is valid
   - Check token format in WebSocket events
   - Ensure user is registered and logged in

2. **WebSocket Connection Failed**
   - Verify live server is running on port 3000
   - Check WebSocket URL format
   - Ensure correct namespace (/chat or /group-chat)

3. **Conversation/Group Not Found**
   - Verify conversation ID or group UUID exists
   - Check user has permission to access
   - Ensure proper relationship (friendship for chat, membership for group)

4. **Messages Not Saving**
   - Check MongoDB connection on server
   - Verify database permissions
   - Check server logs for errors

### Debug Commands

```bash
# Check server status
curl -I http://103.190.136.200:3000

# Test authentication endpoint
curl -X POST http://103.190.136.200:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"test@example.com","password":"password123"}'

# Test with authentication
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://103.190.136.200:3000/api/v1/user/profile
```

## 📊 Testing Checklist

### Authentication ✅
- [ ] User registration works
- [ ] User login works
- [ ] JWT token is generated
- [ ] Profile retrieval works

### One-to-One Chat ✅
- [ ] Friendship creation works
- [ ] Conversation creation works
- [ ] WebSocket connection successful
- [ ] WebSocket authentication works
- [ ] Real-time messaging works
- [ ] Message history retrieval works
- [ ] Typing indicators work
- [ ] Message read status works

### Group Chat ✅
- [ ] Group creation works
- [ ] Group joining works
- [ ] User invitation works
- [ ] WebSocket connection successful
- [ ] WebSocket authentication works
- [ ] Real-time group messaging works
- [ ] Message history retrieval works
- [ ] Message editing works
- [ ] Message deletion works
- [ ] Typing indicators work
- [ ] Read receipts work

### Database Verification ✅
- [ ] PostgreSQL stores user/group metadata
- [ ] MongoDB stores conversation messages
- [ ] MongoDB creates dynamic group collections
- [ ] Message indexing works properly

## 🎉 Success Criteria

Your live server implementation is working correctly when:

1. ✅ All Postman requests return success responses
2. ✅ WebSocket connections establish successfully
3. ✅ Real-time messaging works in both chat types
4. ✅ HTML test client shows all features working
5. ✅ Database stores messages correctly
6. ✅ Authentication is properly secured
7. ✅ Error handling works as expected

## 📱 Mobile Testing

For mobile app integration, use the same WebSocket URLs and events. The live server supports:
- Cross-origin requests (CORS enabled)
- Mobile WebSocket connections
- JWT authentication from mobile apps
- File upload for media messages

## 🚀 Next Steps

After successful testing:
1. **Production Deployment**: Your live server is ready for production use
2. **Mobile Integration**: Connect your Flutter/React Native apps
3. **Scaling**: Monitor performance and add load balancing if needed
4. **Features**: Add push notifications, file sharing, message encryption
5. **Monitoring**: Set up logging and error tracking

Your complete chat system is now fully operational on the live server! 🎉
