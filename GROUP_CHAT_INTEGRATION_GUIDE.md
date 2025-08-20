# Group Chat Integration Guide

## Overview

Updated the group chat backend to ensure perfect compatibility with Flutter implementation. The backend now handles proper namespace connections, room management, and message format consistency.

## Key Fixes Applied

### ✅ 1. Namespace & Socket Room Management

**Problem**: Flutter connects to `/group-chat` namespace but users weren't joining group rooms
**Solution**: Added proper room management with `joinGroup` and `leaveGroup` events

### ✅ 2. Message Format Compatibility

**Problem**: Flutter expects `_id` field but backend was sending `id`
**Solution**: Updated all responses to use `_id` format

### ✅ 3. Group Membership Verification

**Problem**: No verification if user is actually a member of the group
**Solution**: Added membership verification for all group operations

### ✅ 4. Broadcasting Logic

**Problem**: Messages weren't properly broadcasted to all group members
**Solution**: Fixed broadcasting to use group rooms (`group:${groupId}`)

## Flutter Integration Steps

### 1. Initialize Group Chat Connection

```dart
// Flutter connects to group-chat namespace
context.read<GroupProvider>().initializeChat(
  "${AppConstants.socketBaseUrl}/group-chat",
  "group-chat",
  "group-chat"
);
```

### 2. Join Group Room (Required)

Before sending messages, users must join the group room:

```dart
// Backend expects this event to join group room
socket.emit('joinGroup', {
  'groupId': 'group-uuid',
  'userId': 'user-uuid',
  'userName': 'User Name'
});

// Listen for join confirmation
socket.on('joinGroupResponse', (data) {
  if (data['success']) {
    print('Successfully joined group chat');
  }
});
```

### 3. Send Messages

```dart
// Your existing Flutter code works with backend format
final msg = GroupMessageModel(
  group: providerGroup.groupDetailModel.uuid,
  content: text,
  sender: Sender(
    id: getUserID,
    name: getUserName,
    role: groupUserInfo.user!.userRole
  ),
  createdAt: DateTime.now(),
);

providerGroup.chatRepo.sendSocketData(msg.toJson(), "sendGroupMessage");
```

### 4. Listen for Messages

```dart
// Your existing listener works perfectly
chatRepo.messageStream.listen((message) {
  if (message.responseType == 'sendGroupMessageResponse') {
    SocketResponseModel socketResponseModel = message.data;
    providerGroup.addgroupMessageModel(message.data);
  }
});
```

## Backend API Events

### Connection Events

```typescript
// Auto-emitted on connection
socket.emit('connected', {
    success: true,
    message: 'Connected to Group Chat Gateway',
    socketId: 'socket-id',
    namespace: 'group-chat'
})
```

### Group Management Events

```typescript
// Join group room (required before messaging)
socket.on('joinGroup', {
  groupId: string,
  userId: string,
  userName?: string
});

// Leave group room
socket.on('leaveGroup', {
  groupId: string,
  userId: string
});
```

### Message Events

```typescript
// Send message (your Flutter format)
socket.on('sendGroupMessage', {
  group: string,
  sender: {
    _id: string,
    name: string,
    role?: string
  },
  content: string,
  avatar?: string,
  type?: string
});

// Response format (Flutter compatible)
socket.emit('sendGroupMessageResponse', {
  _id: string,           // Message ID
  group: string,         // Group ID
  sender: {
    _id: string,         // Sender ID
    name: string,        // Sender name
    role: string         // Actual role from database
  },
  content: string,       // Message content
  avatar: string,        // Avatar URL
  createdAt: string,     // ISO timestamp
  updatedAt: string,     // ISO timestamp
  __v: number,          // Version field
  type: string,         // Message type
  success: true
});
```

### Message History

```typescript
// Get message history
socket.on('getGroupMessageHistory', {
  groupId: string,
  userId: string,
  page?: number,        // Default: 1
  limit?: number,       // Default: 50
  before?: string       // Message ID for pagination
});

// Response
socket.emit('groupMessageHistory', {
  groupId: string,
  messages: GroupMessage[], // Array in Flutter format
  page: number,
  limit: number,
  hasMore: boolean
});
```

### Additional Events

```typescript
// Typing indicator
socket.on('groupTyping', {
  groupId: string,
  isTyping: boolean,
  userId: string,
  userName: string
});

// Mark messages as read
socket.on('markGroupMessageAsRead', {
  groupId: string,
  messageIds: string[],
  userId: string,
  userName: string
});

// Delete message
socket.on('deleteGroupMessage', {
  groupId: string,
  messageId: string,
  userId: string
});

// Edit message
socket.on('editGroupMessage', {
  groupId: string,
  messageId: string,
  newContent: string,
  userId: string
});
```

## Security Features

### ✅ Group Membership Verification

- All operations verify user is actually a group member
- Prevents unauthorized access to group messages
- Returns appropriate error messages for non-members

### ✅ Message Ownership Validation

- Only message senders can edit their messages
- Group admins can delete any message
- Regular members can only delete their own messages

### ✅ Time-based Edit Restrictions

- Messages can only be edited within 15 minutes of sending
- Prevents abuse of edit functionality

## Error Handling

All events return proper error responses:

```typescript
socket.emit('error', {
    message: 'Descriptive error message'
})
```

Common error scenarios:

- User not a group member
- Missing required fields
- Message not found
- Permission denied
- Connection issues

## Real-time Features

### ✅ Live Message Broadcasting

- Messages broadcast to all group members in real-time
- Sender also receives confirmation
- Proper room-based broadcasting

### ✅ Typing Indicators

- Real-time typing status updates
- Only visible to other group members
- Automatic cleanup on disconnect

### ✅ Read Receipts

- Track which users read which messages
- Notify group members of read status
- Optimized database updates

## Usage Flow

1. **Connect** to `/group-chat` namespace
2. **Join group** using `joinGroup` event
3. **Send messages** using existing Flutter code
4. **Receive real-time** updates automatically
5. **Leave group** when done (optional)

The backend now perfectly matches your Flutter implementation while adding robust security, proper room management, and real-time capabilities! 🚀
