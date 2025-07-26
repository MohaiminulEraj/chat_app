# 📖 Postman WebSocket Testing - Step by Step Guide

## 🚨 **IMPORTANT: The Error You Encountered**

The error you saw:

```
Error: Invalid protocol: ws:
```

This happens because you tried to use **HTTP GET requests** for WebSocket URLs. WebSocket connections require a **different type of request** in Postman.

## ✅ **Correct Way to Test WebSocket in Postman**

### Step 1: Create WebSocket Request (Not HTTP)

1. **Open Postman**
2. Click **"New"** button (top left)
3. **DO NOT** select "HTTP Request"
4. Select **"WebSocket Request"** from the list
5. Click **"Create"**

### Step 2: Set Up One-to-One Chat WebSocket

1. **URL Field:** Enter `ws://103.190.136.200:3000/chat`
2. Click **"Connect"** button
3. Wait for connection status to show "Connected"

### Step 3: Authenticate (Send First Message)

In the message input box at the bottom, paste and send:

```json
{
    "event": "authenticate",
    "data": {
        "token": "YOUR_JWT_TOKEN_FROM_LOGIN"
    }
}
```

**💡 Tip:** Get your JWT token from the "Login Main User" request in the collection.

### Step 4: Join Conversation

Send this message:

```json
{
    "event": "joinConversation",
    "data": {
        "conversationId": "YOUR_CONVERSATION_ID"
    }
}
```

**💡 Tip:** Get conversation ID from "Create Conversation" request.

### Step 5: Send Test Message

Send this message:

```json
{
    "event": "sendMessage",
    "data": {
        "conversationId": "YOUR_CONVERSATION_ID",
        "content": "Hello from Postman WebSocket!",
        "messageType": "text"
    }
}
```

## 🔄 **For Group Chat WebSocket**

### Step 1: Create Another WebSocket Request

1. Click **"New"** → **"WebSocket Request"**
2. **URL:** `ws://103.190.136.200:3000/group-chat`
3. Click **"Connect"**

### Step 2: Authenticate

```json
{
    "event": "authenticate",
    "data": {
        "token": "YOUR_JWT_TOKEN"
    }
}
```

### Step 3: Join Group

```json
{
    "event": "joinGroup",
    "data": {
        "groupUuid": "YOUR_GROUP_UUID"
    }
}
```

### Step 4: Send Group Message

```json
{
    "event": "sendMessage",
    "data": {
        "groupUuid": "YOUR_GROUP_UUID",
        "content": "Hello group from Postman!",
        "messageType": "text"
    }
}
```

## 📋 **Quick Reference: Getting Required IDs**

### Get JWT Token:

1. Run **"Login Main User"** request in Postman collection
2. Copy `jwt_token` from environment variables (top right)

### Get Conversation ID:

1. Run **"Create Conversation"** request
2. Copy `id` from response
3. Or run **"Get All Conversations"** to see existing ones

### Get Group UUID:

1. Run **"Create Group"** request
2. Copy `uuid` from response
3. Or run **"Get All Groups"** to see existing ones

### Get Friend User ID:

1. Run **"Register User 2 (Friend User)"** request
2. Copy `friend_user_id` from environment variables

## 🔧 **Troubleshooting WebSocket Connections**

### Connection Failed?

1. **Check Server Status:**

    ```bash
    curl -I http://103.190.136.200:3000
    ```

2. **Verify WebSocket URL:**

    - One-to-One: `ws://103.190.136.200:3000/chat`
    - Group Chat: `ws://103.190.136.200:3000/group-chat`

3. **Check Authentication:**
    - Always send `authenticate` event first
    - Use valid JWT token from login response

### Authentication Failed?

1. **Login first** using "Login Main User" request
2. **Copy JWT token** from response or environment
3. **Check token expiry** - tokens may expire after some time

### No Messages Received?

1. **Join conversation/group first** before sending messages
2. **Check IDs are correct** (conversation ID, group UUID)
3. **Verify user permissions** (friendship for chat, membership for group)

## 🎯 **Testing Workflow Summary**

### For One-to-One Chat:

```
1. Register User 1 → Get JWT token
2. Register User 2 → Get friend user ID
3. Send friend request → Accept friendship
4. Create conversation → Get conversation ID
5. Create WebSocket request → Connect to /chat
6. Authenticate → Join conversation → Send messages
```

### For Group Chat:

```
1. Register User 1 → Get JWT token
2. Create group → Get group UUID
3. Join group → Become member
4. Create WebSocket request → Connect to /group-chat
5. Authenticate → Join group → Send messages
```

## 🌟 **Pro Tips**

1. **Save WebSocket Requests:** Save your WebSocket requests in Postman for reuse
2. **Use Environment Variables:** Reference `{{jwt_token}}`, `{{group_uuid}}`, etc. in messages
3. **Keep Connection Open:** WebSocket stays connected until you disconnect
4. **Monitor Responses:** Watch the response panel for server messages
5. **Test Multiple Users:** Open multiple WebSocket connections to simulate multiple users

## 📱 **Alternative: Use HTML Test Client**

If Postman WebSocket is challenging, use the HTML test client:

```bash
# Open in browser:
/home/eraj/Documents/work/per/kitty_backend/test-client/live-server-complete-chat-test.html
```

The HTML client provides:

- ✅ Visual interface
- ✅ Automatic authentication
- ✅ Real-time message display
- ✅ Both chat types in one interface
- ✅ Error handling and status display

## ❌ **What NOT to Do**

1. **Don't use HTTP GET** for WebSocket URLs
2. **Don't forget to authenticate** before other events
3. **Don't use expired JWT tokens**
4. **Don't send messages before joining** conversation/group
5. **Don't mix up** conversation IDs and group UUIDs

Your WebSocket connections should now work correctly! 🎉
