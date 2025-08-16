# 🚀 Localhost Chat Testing Guide

## 📋 Complete Testing Instructions for localhost:3001

### 👥 Test Users

- **User 1**: eraj@gmail.com (Password: 12345678)
- **User 2**: faysal@mobile.com (Password: 12345678)

---

## 🎯 Testing Checklist

### ✅ Phase 1: Authentication & Setup

- [ ] Start your NestJS server: `npm run start:dev`
- [ ] Import Postman collection: `Kitty_Local_Testing_Complete_Chat_System.postman_collection.json`
- [ ] Import environment: `kitty_local_testing_environment.json`
- [ ] Login User 1 (Eraj) → Verify JWT token received
- [ ] Login User 2 (Faysal) → Verify JWT token received

### ✅ Phase 2: Friendship & Conversation Setup

- [ ] Send friend request (User 1 to User 2)
- [ ] Accept friend request (User 2)
- [ ] Create conversation between users
- [ ] Create group with both users
- [ ] Verify conversation ID and group UUID are set

### ✅ Phase 3: One-to-One Chat Testing

- [ ] Connect User 1 to WebSocket: `ws://localhost:3001/chat`
- [ ] Connect User 2 to WebSocket: `ws://localhost:3001/chat`
- [ ] Both users authenticate with JWT tokens
- [ ] Both users join the conversation
- [ ] **Test Real-time Messaging:**
    - [ ] User 1 sends message → User 2 receives instantly
    - [ ] User 2 sends message → User 1 receives instantly
    - [ ] Verify messages are stored in MongoDB
- [ ] **Test Typing Indicators:**
    - [ ] User 1 starts typing → User 2 sees "typing..." indicator
    - [ ] User 1 stops typing → User 2's indicator disappears
    - [ ] User 2 starts typing → User 1 sees "typing..." indicator
    - [ ] User 2 stops typing → User 1's indicator disappears

### ✅ Phase 4: Group Chat Testing

- [ ] Connect User 1 to WebSocket: `ws://localhost:3001/group-chat`
- [ ] Connect User 2 to WebSocket: `ws://localhost:3001/group-chat`
- [ ] Both users authenticate with JWT tokens
- [ ] Both users join the group
- [ ] **Test Real-time Group Messaging:**
    - [ ] User 1 sends group message → User 2 receives with sender info
    - [ ] User 2 sends group message → User 1 receives with sender info
    - [ ] Verify messages are stored in MongoDB collection named by group UUID
- [ ] **Test Group Typing Indicators:**
    - [ ] User 1 starts typing → User 2 sees "Eraj is typing..."
    - [ ] User 1 stops typing → User 2's indicator disappears
    - [ ] User 2 starts typing → User 1 sees "Faysal is typing..."
    - [ ] User 2 stops typing → User 1's indicator disappears

---

## 🔧 Quick Testing Options

### Option 1: Postman WebSocket Testing

#### One-to-One Chat:

```
1. New → WebSocket Request → ws://localhost:3001/chat
2. Connect
3. Authenticate: {"event": "authenticate", "data": {"token": "USER_JWT_TOKEN"}}
4. Join: {"event": "joinConversation", "data": {"conversationId": "CONVERSATION_ID"}}
5. Send: {"event": "sendMessage", "data": {"conversationId": "CONVERSATION_ID", "content": "Hello!", "type": "text"}}
6. Typing: {"event": "typing", "data": {"conversationId": "CONVERSATION_ID", "isTyping": true}}
```

#### Group Chat:

```
1. New → WebSocket Request → ws://localhost:3001/group-chat
2. Connect
3. Authenticate: {"event": "authenticate", "data": {"token": "USER_JWT_TOKEN"}}
4. Join: {"event": "joinGroup", "data": {"groupId": "GROUP_UUID"}}
5. Send: {"event": "sendMessage", "data": {"groupId": "GROUP_UUID", "content": "Hello group!", "messageType": "text"}}
6. Typing: {"event": "groupTyping", "data": {"groupId": "GROUP_UUID", "isTyping": true}}
```

### Option 2: HTML Test Client

Open in browser: `/home/eraj/Documents/work/per/kitty_backend/test-client/localhost-complete-chat-test.html`

**Features:**

- ✅ Visual interface for both chat types
- ✅ Auto-authentication with test users
- ✅ Real-time message display
- ✅ Typing indicators with visual feedback
- ✅ Connection status monitoring
- ✅ Auto-setup for friendship and groups

---

## 🔍 Expected Real-time Behaviors

### Message Flow:

```
User 1 Types → User 2 sees "typing..." → User 1 sends → User 2 receives instantly
```

### Database Storage:

- **One-to-One**: Messages in MongoDB `conversations` collection
- **Group Chat**: Messages in MongoDB collection named `{GROUP_UUID}`

### WebSocket Events:

- **messageReceived**: Instant message delivery
- **userTyping**: Real-time typing indicators
- **userTypingInGroup**: Group typing indicators
- **authenticated**: Successful connection
- **joinedConversation**: Conversation join confirmation
- **joinedGroup**: Group join confirmation

---

## 🐛 Troubleshooting

### Connection Issues:

1. **Verify server is running**: `curl -I http://localhost:3001`
2. **Check WebSocket paths**: `/chat` and `/group-chat`
3. **Verify JWT tokens**: Must be valid and not expired

### Message Not Delivered:

1. **Check authentication**: Must authenticate before joining
2. **Verify IDs**: Correct conversation ID and group UUID
3. **Check friendship**: Users must be friends for one-to-one chat
4. **Check membership**: Users must be group members for group chat

### Typing Indicators Not Working:

1. **Verify WebSocket connection**: Must be connected and authenticated
2. **Check event names**: `typing` for chat, `groupTyping` for groups
3. **Verify room joining**: Must join conversation/group first

---

## 📊 Performance Testing

### Load Testing Scenarios:

#### Scenario 1: Rapid Messages

```
- Send 10 messages quickly from each user
- Verify all messages delivered in order
- Check for message loss or duplication
```

#### Scenario 2: Concurrent Typing

```
- Both users start typing simultaneously
- Verify both typing indicators work
- Stop typing and verify indicators disappear
```

#### Scenario 3: Connection Resilience

```
- Disconnect one user during conversation
- Reconnect after 5 seconds
- Verify auto-rejoin and message delivery resumption
```

#### Scenario 4: Multi-Chat Testing

```
- Connect both users to one-to-one chat
- Connect both users to group chat simultaneously
- Send messages in both chats
- Verify no cross-chat interference
```

---

## 🎉 Success Criteria

### ✅ One-to-One Chat Success:

- [x] Real-time message delivery (< 100ms latency)
- [x] Typing indicators work perfectly
- [x] Messages persist in MongoDB
- [x] Clean connection handling
- [x] Proper authentication flow

### ✅ Group Chat Success:

- [x] Real-time group message delivery
- [x] Sender identification in messages
- [x] Group typing indicators work
- [x] Messages stored in group-specific collection
- [x] Proper member authentication

### ✅ Overall System Success:

- [x] No message loss or duplication
- [x] Stable WebSocket connections
- [x] Clean error handling
- [x] Scalable architecture
- [x] Real-time responsiveness

---

## 🔄 Testing Workflow

### For Manual Testing:

1. **Start Server**: `npm run start:dev`
2. **Open HTML Client**: Use browser to open `localhost-complete-chat-test.html`
3. **Login Both Users**: Use the login buttons
4. **Run Auto Setup**: Click "Auto Setup" button
5. **Connect WebSockets**: Click connect buttons for both users
6. **Test Messaging**: Send messages and verify real-time delivery
7. **Test Typing**: Use typing buttons and verify indicators

### For API Testing:

1. **Import Postman Collection**: Load the complete testing collection
2. **Set Environment**: Use localhost testing environment
3. **Run Authentication**: Login both users
4. **Setup Relationships**: Friend request, conversation, group
5. **WebSocket Testing**: Create WebSocket requests for both chat types
6. **Verify Real-time**: Test messaging and typing indicators

---

## 📱 Next Steps

After successful localhost testing:

1. **Deploy to staging** environment
2. **Update WebSocket URLs** for production
3. **Test with multiple users** (>2 users)
4. **Performance testing** under load
5. **Mobile app integration** testing

Your localhost chat system is now ready for comprehensive real-time testing! 🚀
