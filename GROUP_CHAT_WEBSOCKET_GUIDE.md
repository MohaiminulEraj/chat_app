# Group Chat WebSocket Events - Quick Reference 🗨️

## ✅ **WebSocket URL for Group Chat**

```
ws://localhost:3001/socket.io/?EIO=4&transport=websocket&ns=/group-chat
```

## 🔐 **Authentication (Required First)**

```json
["authenticate", { "token": "{{jwt_token}}" }]
```

## 🚪 **Join Group Chat**

```json
["joinGroup", { "groupId": "{{group_uuid}}" }]
```

## 💬 **Send Message to Group**

```json
[
    "sendGroupMessage",
    {
        "groupId": "{{group_uuid}}",
        "content": "Hello everyone!",
        "messageType": "text",
        "metadata": {}
    }
]
```

## 📤 **Send Reply Message**

```json
[
    "sendGroupMessage",
    {
        "groupId": "{{group_uuid}}",
        "content": "This is a reply",
        "messageType": "text",
        "replyToMessageId": "{{message_id}}"
    }
]
```

## 📜 **Get Group Message History**

```json
[
    "getGroupMessageHistory",
    {
        "groupId": "{{group_uuid}}",
        "page": 1,
        "limit": 50
    }
]
```

## 👁️ **Mark Messages as Read**

```json
[
    "markGroupMessageAsRead",
    {
        "groupId": "{{group_uuid}}",
        "messageIds": ["message_id_1", "message_id_2"]
    }
]
```

## ⌨️ **Show Typing Indicator**

```json
[
    "groupTyping",
    {
        "groupId": "{{group_uuid}}",
        "isTyping": true
    }
]
```

## 🗑️ **Delete Message**

```json
[
    "deleteGroupMessage",
    {
        "groupId": "{{group_uuid}}",
        "messageId": "{{message_id}}"
    }
]
```

## ✏️ **Edit Message**

```json
[
    "editGroupMessage",
    {
        "groupId": "{{group_uuid}}",
        "messageId": "{{message_id}}",
        "newContent": "Updated message content"
    }
]
```

## 👥 **Get Group Members**

```json
["getGroupMembers", { "groupId": "{{group_uuid}}" }]
```

## 🚪 **Leave Group Chat**

```json
["leaveGroup", { "groupId": "{{group_uuid}}" }]
```

---

## 📨 **Incoming Events (Listen For)**

| Event Name             | Description                  |
| ---------------------- | ---------------------------- |
| `authenticated`        | Authentication successful    |
| `joinedGroup`          | Successfully joined group    |
| `leftGroup`            | Successfully left group      |
| `groupMessageReceived` | New message in group         |
| `userJoinedGroup`      | Someone joined the group     |
| `userLeftGroup`        | Someone left the group       |
| `groupMessageHistory`  | Historical messages response |
| `messagesMarkedAsRead` | Someone read messages        |
| `userTypingInGroup`    | Someone is typing            |
| `groupMessageDeleted`  | Message was deleted          |
| `groupMessageEdited`   | Message was edited           |
| `groupMembersList`     | List of group members        |
| `error`                | Error occurred               |

---

## 🌐 **HTTP REST Endpoints**

### Get Messages

```
GET /api/v1/group-chat/{groupId}/messages?page=1&limit=50
```

### Mark as Read

```
POST /api/v1/group-chat/{groupId}/messages/{messageId}/read
Body: {"messageIds": ["id1", "id2"]}
```

### Delete Message

```
DELETE /api/v1/group-chat/{groupId}/messages/{messageId}
```

### Edit Message

```
PATCH /api/v1/group-chat/{groupId}/messages/{messageId}
Body: {"content": "new content"}
```

### Get Members

```
GET /api/v1/group-chat/{groupId}/members
```

### Unread Count

```
GET /api/v1/group-chat/{groupId}/unread-count
```

### Search Messages

```
GET /api/v1/group-chat/{groupId}/search?q=search_term
```

### Group Stats

```
GET /api/v1/group-chat/{groupId}/stats
```

---

## 💾 **MongoDB Collections**

Each group gets its own MongoDB collection:

- **Collection Name**: `group_messages_{group_uuid_with_underscores}`
- **Example**: `group_messages_a1b2c3d4_e5f6_7890_abcd_ef1234567890`

## 🔧 **Key Features**

✅ **Dynamic Collections**: Each group has separate MongoDB collection
✅ **Real-time Messaging**: Instant message delivery
✅ **Message History**: Paginated history with "load more"
✅ **Read Receipts**: Track who read which messages
✅ **Typing Indicators**: Show when users are typing
✅ **Message Editing**: Edit within 15 minutes
✅ **Message Deletion**: Delete own messages or admin rights
✅ **Reply to Messages**: Thread-like conversations
✅ **Online Status**: Track who's in the group
✅ **Search**: Find messages by content/sender
✅ **Statistics**: Message counts and activity

**Ready for Flutter group chat implementation! 🚀**
