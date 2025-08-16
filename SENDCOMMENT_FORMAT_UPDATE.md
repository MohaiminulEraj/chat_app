# sendComment Event Format Update

## Changes Made

Updated the `sendComment` event handler to accept the new message body format as requested.

### ✅ **New Message Format**

```javascript
{
  "room": _currentRoomId,      // Room ID (required)
  "content": comment,          // Message content (required)
  "sender": getUserID          // User ID of sender (required)
}
```

### ✅ **Optional Fields Supported**

```javascript
{
  "room": "room-123",
  "content": "Hello world!",
  "sender": "user-456",
  "messageType": "text",       // Optional: default is "text"
  "replyToId": "comment-789",  // Optional: for reply functionality
  "metadata": { ... }          // Optional: additional data
}
```

## Handler Updates

### **Parameter Changes**

- **Before**: `CreateRoomCommentDto & { roomId: string }`
- **After**: `{ room: string; content: string; sender: string; ... }`

### **Field Mapping**

| Old Field     | New Field     | Notes                        |
| ------------- | ------------- | ---------------------------- |
| `roomId`      | `room`        | Room identifier              |
| `message`     | `content`     | Message text                 |
| N/A           | `sender`      | User ID (new required field) |
| `messageType` | `messageType` | Unchanged (optional)         |
| `replyToId`   | `replyToId`   | Unchanged (optional)         |
| `metadata`    | `metadata`    | Unchanged (optional)         |

### **Validation Added**

- ✅ `room` field is required
- ✅ `content` field is required
- ✅ `sender` field is required
- ✅ Fallback to userInfo.userId if sender not provided

## Flutter Integration

Your Flutter code can now send comments using:

```dart
socket.emit('sendComment', {
  "room": _currentRoomId,
  "content": comment,
  "sender": getUserID
});
```

## Response Format (Unchanged)

The response events remain the same:

### `commentAdded` Event

```javascript
{
  "roomId": "room-123",
  "comment": { /* comment object */ },
  "addedBy": "user-456",
  "addedByName": "John Doe",
  "timestamp": "2025-08-09T12:00:00.000Z"
}
```

### `commentActivityUpdate` Event

```javascript
{
  "action": "comment_added",
  "roomId": "room-123",
  "commentId": "comment-uuid",
  "addedBy": "user-456",
  "addedByName": "John Doe",
  "timestamp": "2025-08-09T12:00:00.000Z"
}
```

## Testing

Use the debug script to test the new format:

```bash
node debug-sendcomment-format.js
```

This will test both basic format and optional fields.
