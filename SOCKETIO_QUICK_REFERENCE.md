# 🚀 Socket.IO One-to-One Chat - Quick Reference

## 🔗 Connection URL
```
ws://localhost:3000
http://localhost:3000/socket.io/
```

## 🔐 Authentication
```javascript
socket.emit('authenticate', { token: 'JWT_TOKEN' }, callback);
```

## 💬 Core Messaging Endpoints

### Send Message
```javascript
socket.emit('sendDirectMessage', {
  recipientId: 'user-uuid',
  type: 'text',
  content: 'Hello!'
}, callback);
```

### Receive Message
```javascript
socket.on('newDirectMessage', (data) => {
  console.log('New message:', data.message.content);
});
```

### Typing Indicators
```javascript
// Send typing status
socket.emit('typing', {
  conversationId: 'conv-uuid',
  isTyping: true
});

// Receive typing status
socket.on('userTyping', (data) => {
  console.log(data.userName + ' is typing...');
});
```

### Mark as Read
```javascript
socket.emit('markMessagesAsRead', {
  conversationId: 'conv-uuid',
  messageIds: ['msg-1', 'msg-2']
}, callback);
```

## 📞 Voice/Video Calls

### Initiate Call
```javascript
socket.emit('initiateCall', {
  recipientId: 'user-uuid',
  callType: 'voice',
  callId: 'unique-call-id'
}, callback);
```

### Handle Incoming Call
```javascript
socket.on('incomingCall', (data) => {
  socket.emit('respondToCall', {
    callId: data.callId,
    response: 'accept', // or 'decline'
    callerId: data.caller.uuid
  });
});
```

### End Call
```javascript
socket.emit('endCall', {
  callId: 'call-uuid',
  participants: ['user1-uuid', 'user2-uuid']
}, callback);
```

## 👤 User Status
```javascript
// Update status
socket.emit('updateStatus', { status: 'online' }, callback);

// Receive status changes
socket.on('userStatusChanged', (data) => {
  console.log('User status:', data.status);
});
```

## 🧪 cURL Examples

### Get JWT Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "password123"}'
```

### Test Socket.IO Endpoint
```bash
curl -X GET "http://localhost:3000/socket.io/?EIO=4&transport=polling"
```

### Get Friends List
```bash
curl -X GET http://localhost:3000/friendship/friends \
  -H "Authorization: Bearer JWT_TOKEN"
```

## 📋 Quick Setup Checklist
1. ✅ Start server: `npm run start:dev`
2. ✅ Get JWT token via login
3. ✅ Ensure users are friends
4. ✅ Connect to Socket.IO
5. ✅ Authenticate socket
6. ✅ Start messaging!

## 🔄 Complete Flow Example
```javascript
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  // 1. Authenticate
  socket.emit('authenticate', { token: 'JWT_TOKEN' }, (res) => {
    if (res.success) {
      // 2. Send message
      socket.emit('sendDirectMessage', {
        recipientId: 'friend-uuid',
        type: 'text',
        content: 'Hello friend!'
      }, (res) => {
        console.log('Message sent:', res.success);
      });
    }
  });
});

// 3. Receive messages
socket.on('newDirectMessage', (data) => {
  console.log('Received:', data.message.content);
});
```
