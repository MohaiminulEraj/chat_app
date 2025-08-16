# Group Chat WebSocket Testing Guide

## Overview

This guide provides step-by-step instructions for testing the group chat WebSocket functionality using various tools.

## WebSocket Connection Details

### Endpoints

- **Local Development**: `ws://localhost:3001/group-chat`
- **Live Server**: `${process.env.LIVE_SOCKET_URL}$/group-chat`

### Authentication

All WebSocket events require authentication via JWT token.

## Testing with Postman (WebSocket Feature)

### Step 1: Setup Environment

1. Import `kitty_group_chat_environment.json` into Postman
2. Import `Kitty_Group_Chat_API.postman_collection.json`
3. Run "Login User" request to get JWT token

### Step 2: Create and Join Group

1. Run "Create Group" request - saves group UUID to environment
2. Run "Join Group" request to become a member

### Step 3: WebSocket Connection

1. In Postman, create new WebSocket request
2. URL: `{{websocket_url}}/group-chat` (or `{{live_websocket_url}}/group-chat` for live)
3. Connect to WebSocket

### Step 4: Authentication

Send authenticate event:

```json
{
    "event": "authenticate",
    "data": {
        "token": "YOUR_JWT_TOKEN_HERE"
    }
}
```

### Step 5: Join Group

Send joinGroup event:

```json
{
    "event": "joinGroup",
    "data": {
        "groupUuid": "YOUR_GROUP_UUID_HERE"
    }
}
```

### Step 6: Send Messages

Send message event:

```json
{
    "event": "sendMessage",
    "data": {
        "groupUuid": "YOUR_GROUP_UUID_HERE",
        "content": "Hello from WebSocket!",
        "messageType": "text"
    }
}
```

## Testing with Browser JavaScript

### HTML WebSocket Test

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Group Chat WebSocket Test</title>
    </head>
    <body>
        <div id="messages"></div>
        <input type="text" id="messageInput" placeholder="Type a message..." />
        <button onclick="sendMessage()">Send</button>

        <script src="https://cdn.socket.io/4.5.0/socket.io.min.js"></script>
        <script>
            // Configuration
            const SERVER_URL = 'ws://localhost:3001' // or process.env.LIVE_SOCKET_URL
            const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'
            const GROUP_UUID = 'YOUR_GROUP_UUID_HERE'

            // Connect to group chat namespace
            const socket = io(SERVER_URL + '/group-chat')

            // Authentication
            socket.on('connect', () => {
                console.log('Connected to group chat')
                socket.emit('authenticate', { token: JWT_TOKEN })
            })

            socket.on('authenticated', (data) => {
                console.log('Authenticated:', data)
                // Join the group
                socket.emit('joinGroup', { groupUuid: GROUP_UUID })
            })

            socket.on('groupJoined', (data) => {
                console.log('Joined group:', data)
                addMessage('System', 'Joined group successfully')
            })

            // Message events
            socket.on('newMessage', (data) => {
                console.log('New message:', data)
                addMessage(data.senderName, data.content)
            })

            socket.on('messageHistory', (data) => {
                console.log('Message history:', data)
                data.messages.forEach((msg) => {
                    addMessage(msg.senderName, msg.content)
                })
            })

            // Error handling
            socket.on('error', (error) => {
                console.error('Socket error:', error)
                addMessage('Error', error.message)
            })

            // Send message function
            function sendMessage() {
                const input = document.getElementById('messageInput')
                const content = input.value.trim()

                if (content) {
                    socket.emit('sendMessage', {
                        groupUuid: GROUP_UUID,
                        content: content,
                        messageType: 'text'
                    })
                    input.value = ''
                }
            }

            // Add message to UI
            function addMessage(sender, content) {
                const messagesDiv = document.getElementById('messages')
                const messageElement = document.createElement('div')
                messageElement.innerHTML = `<strong>${sender}:</strong> ${content}`
                messagesDiv.appendChild(messageElement)
                messagesDiv.scrollTop = messagesDiv.scrollHeight
            }

            // Enter key to send
            document
                .getElementById('messageInput')
                .addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        sendMessage()
                    }
                })
        </script>
    </body>
</html>
```

## Available WebSocket Events

### Client to Server Events

#### authenticate

```json
{
    "event": "authenticate",
    "data": {
        "token": "jwt_token_here"
    }
}
```

#### joinGroup

```json
{
    "event": "joinGroup",
    "data": {
        "groupUuid": "group-uuid-here"
    }
}
```

#### leaveGroup

```json
{
    "event": "leaveGroup",
    "data": {
        "groupUuid": "group-uuid-here"
    }
}
```

#### sendMessage

```json
{
    "event": "sendMessage",
    "data": {
        "groupUuid": "group-uuid-here",
        "content": "Message content",
        "messageType": "text",
        "replyTo": "message-id-optional"
    }
}
```

#### editMessage

```json
{
    "event": "editMessage",
    "data": {
        "groupUuid": "group-uuid-here",
        "messageId": "message-id",
        "content": "Edited content"
    }
}
```

#### deleteMessage

```json
{
    "event": "deleteMessage",
    "data": {
        "groupUuid": "group-uuid-here",
        "messageId": "message-id"
    }
}
```

#### getMessageHistory

```json
{
    "event": "getMessageHistory",
    "data": {
        "groupUuid": "group-uuid-here",
        "page": 1,
        "limit": 20
    }
}
```

#### markAsRead

```json
{
    "event": "markAsRead",
    "data": {
        "groupUuid": "group-uuid-here",
        "messageIds": ["message-id-1", "message-id-2"]
    }
}
```

#### typing

```json
{
    "event": "typing",
    "data": {
        "groupUuid": "group-uuid-here",
        "isTyping": true
    }
}
```

### Server to Client Events

#### authenticated

```json
{
    "userId": "user-id",
    "message": "Authentication successful"
}
```

#### groupJoined

```json
{
    "groupUuid": "group-uuid",
    "message": "Successfully joined group"
}
```

#### newMessage

```json
{
    "id": "message-id",
    "groupUuid": "group-uuid",
    "senderId": "user-id",
    "senderName": "User Name",
    "content": "Message content",
    "messageType": "text",
    "timestamp": "2024-01-15T10:30:00Z",
    "replyTo": null
}
```

#### messageEdited

```json
{
    "messageId": "message-id",
    "content": "Edited content",
    "editedAt": "2024-01-15T10:35:00Z"
}
```

#### messageDeleted

```json
{
    "messageId": "message-id",
    "deletedAt": "2024-01-15T10:40:00Z"
}
```

#### messageHistory

```json
{
    "messages": [
        {
            "id": "message-id",
            "content": "Message content",
            "senderName": "User Name",
            "timestamp": "2024-01-15T10:30:00Z"
        }
    ],
    "total": 100,
    "page": 1,
    "totalPages": 5
}
```

#### userTyping

```json
{
    "userId": "user-id",
    "userName": "User Name",
    "isTyping": true
}
```

#### error

```json
{
    "message": "Error description",
    "code": "ERROR_CODE"
}
```

## MongoDB Collection Verification

After sending messages, verify that MongoDB collections are created:

1. Connect to MongoDB
2. List collections with group pattern:

    ```javascript
    show collections
    // Should show: group_YOUR_GROUP_UUID_UNDERSCORED
    ```

3. Query messages:
    ```javascript
    db.group_YOUR_GROUP_UUID_UNDERSCORED.find().pretty()
    ```

## Troubleshooting

### Common Issues

1. **Authentication Failed**

    - Verify JWT token is valid and not expired
    - Check token format in authenticate event

2. **Group Not Found**

    - Ensure group UUID exists in PostgreSQL
    - Verify user is a member of the group

3. **Connection Issues**

    - Check WebSocket URL format
    - Verify server is running on correct port
    - Check namespace is '/group-chat'

4. **Messages Not Persisting**
    - Verify MongoDB connection
    - Check group UUID format (no special chars except hyphens)

### Debug Commands

```bash
# Check server logs
tail -f logs/combined.log

# Verify MongoDB collections
mongo
use kitty_backend
show collections

# Check group membership in PostgreSQL
psql -d kitty_backend
SELECT * FROM group_member WHERE group_uuid = 'your-group-uuid';
```

## Testing Checklist

- [ ] User authentication successful
- [ ] Group created and joined
- [ ] WebSocket connection established
- [ ] Authentication event successful
- [ ] Join group event successful
- [ ] Send message successful
- [ ] Receive message in real-time
- [ ] Message persisted in MongoDB
- [ ] Message history retrieval working
- [ ] Typing indicators working
- [ ] Message editing working
- [ ] Message deletion working
- [ ] Read receipts working
- [ ] Error handling working

## Multiple User Testing

To test with multiple users:

1. Create multiple user accounts
2. Add all users to the same group
3. Open multiple WebSocket connections
4. Send messages from different users
5. Verify all users receive messages in real-time

## Performance Testing

For load testing:

1. Create multiple concurrent WebSocket connections
2. Send high frequency messages
3. Monitor server CPU and memory usage
4. Check MongoDB write performance
5. Verify message delivery reliability

This completes the comprehensive group chat WebSocket testing guide!
