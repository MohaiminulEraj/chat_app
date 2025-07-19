# Postman WebSocket Testing Guide for Kitty Chat

## Prerequisites

### 1. Postman Version Requirements
- **Postman v10.0 or higher** is required for WebSocket support
- If you have an older version, update from [https://www.postman.com/downloads/](https://www.postman.com/downloads/)

### 2. Server Running
Make sure your NestJS server is running:
```bash
cd /home/eraj/Documents/work/per/kitty_backend
npm run start
```

The server should be running on `http://localhost:3001`

## Step-by-Step Testing Instructions

### Step 1: Import the Collection
1. Open Postman
2. Click **Import** (top left)
3. Drag and drop `postman_websocket_complete_collection.json` or click **Choose Files**
4. Click **Import**

### Step 2: Create Environment (Important!)
1. Click the **Environment** dropdown (top right) 
2. Click **Create Environment**
3. Name it: `Kitty Chat WebSocket`
4. Add these variables (leave values empty for now):

| Variable Name | Initial Value | Current Value |
|--------------|---------------|---------------|
| `base_ws_url` | `ws://localhost:3001` | `ws://localhost:3001` |
| `alice_user_id` | (leave empty) | (leave empty) |
| `alice_token` | (leave empty) | (leave empty) |
| `bob_user_id` | (leave empty) | (leave empty) |
| `bob_token` | (leave empty) | (leave empty) |
| `conversation_id` | (leave empty) | (leave empty) |

5. Click **Save**
6. **Select this environment** from the dropdown

### Step 3: Test WebSocket Connection

#### Test 1: Alice Connection
1. Open request: **"1. Alice - Connect & Authenticate"**
2. Click **Send**
3. In the **Message** tab at the bottom, you should see:
   ```json
   {
     "success": true,
     "message": "Connected to chat server"
   }
   ```

#### Test 2: Alice Authentication  
1. Open request: **"2. Alice - Send Authentication"**
2. Change method to **WebSocket** (if not already)
3. Click **Send Message**
4. You should receive:
   ```json
   {
     "success": true,
     "userId": "18a008b0-d339-4629-99d8-f565cd8cf3e2"
   }
   ```

#### Test 3: Bob Connection & Authentication
1. Repeat steps 1-2 for Bob using requests **"3. Bob - Connect & Authenticate"** and **"4. Bob - Send Authentication"**

### Step 4: Send Messages Between Users

#### Test 4: Alice sends to Bob
1. Open request: **"5. Alice sends message to Bob"**
2. Click **Send Message**
3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": {
       "conversationId": "some-uuid-here",
       "senderId": "18a008b0-d339-4629-99d8-f565cd8cf3e2",
       "content": "Hi Bob! This is Alice sending a message via Postman WebSocket.",
       "type": "text",
       "createdAt": "2025-07-19T...",
       "_id": "message-id-here"
     }
   }
   ```

#### Test 5: Bob replies to Alice
1. Open request: **"6. Bob sends reply to Alice"**
2. Click **Send Message**
3. Bob should receive a similar success response

### Step 5: Test Additional Features

#### Typing Indicators
1. Use request: **"7. Alice - Typing Indicator"**
2. This will show Bob that Alice is typing

#### Mark as Read
1. Use request: **"8. Alice - Mark Messages as Read"**
2. Replace `"message_id_here"` with actual message ID from previous responses

## Important Postman WebSocket Settings

### For Each WebSocket Request:
1. **Method**: Select **WebSocket** 
2. **URL**: Use `ws://localhost:3001/direct-chat`
3. **Message Type**: **Text**
4. **Message Content**: Raw JSON

### Sample Message Formats:

#### Authentication:
```json
{
  "token": "your-jwt-token-here"
}
```

#### Send Message to User:
```json
{
  "recipientId": "recipient-user-uuid",
  "type": "text", 
  "content": "Your message here"
}
```

#### Send Message to Existing Conversation:
```json
{
  "conversationId": "conversation-uuid",
  "type": "text",
  "content": "Your message here"
}
```

#### Typing Indicator:
```json
{
  "conversationId": "conversation-uuid",
  "isTyping": true
}
```

## Fresh JWT Tokens (Valid for 24 hours)

### Alice:
```
User ID: 18a008b0-d339-4629-99d8-f565cd8cf3e2
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXVpZCI6IjE4YTAwOGIwLWQzMzktNDYyOS05OWQ4LWY1NjVjZDhjZjNlMiIsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTI4NjI1NTMsImV4cCI6MTc1Mjk0ODk1M30.-02P4vnPEG2Sgcu-_ZX1yeX7zBoy5thOhqVj6DiNcvg
```

### Bob:
```
User ID: 8bc2abbf-3dde-4b42-aed4-56479d510249
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXVpZCI6IjhiYzJhYmJmLTNkZGUtNGI0Mi1hZWQ0LTU2NDc5ZDUxMDI0OSIsImVtYWlsIjoiYm9iQGV4YW1wbGUuY29tIiwiaWF0IjoxNzUyODYyNTUzLCJleHAiOjE3NTI5NDg5NTN9.Erk2QF1oFUKz8qBXyEfeSYe31cjHxJxZo1YGnZGVgpw
```

### Charlie:
```
User ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXVpZCI6ImY0N2FjMTBiLTU4Y2MtNDM3Mi1hNTY3LTBlMDJiMmMzZDQ3OSIsImVtYWlsIjoiY2hhcmxpZUBleGFtcGxlLmNvbSIsImlhdCI6MTc1Mjg2MjU1MywiZXhwIjoxNzUyOTQ4OTUzfQ.Y_tYo8j_DeDC1v-H4LDNxth_WCXlFU7bekzgcoFUXUw
```

### Diana:
```
User ID: 550e8400-e29b-41d4-a716-446655440000
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwidXVpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoiZGlhbmFAZXhhbXBsZS5jb20iLCJpYXQiOjE3NTI4NjI1NTMsImV4cCI6MTc1Mjk0ODk1M30.ODyDkl8IEtTeaOsu5mEUfMDuq0iuLjkglR-w9QITSTs
```

## Troubleshooting

### Common Issues:

#### 1. "WebSocket connection failed"
- **Check server**: Make sure `npm run start` is running
- **Check URL**: Ensure using `ws://localhost:3001/direct-chat` (not `wss://`)
- **Check port**: Server should be on port 3001

#### 2. "Authentication failed"
- **Check token**: Make sure using the correct, non-expired JWT token
- **Check format**: Message should be exactly `{"token": "your-jwt-token"}`

#### 3. "Message not received"
- **Check authentication**: Both users must be authenticated first
- **Check user IDs**: Make sure using correct recipient UUID
- **Check conversation**: For replies, use the correct conversationId

#### 4. "Invalid protocol: ws:"
- **Update Postman**: You need Postman v10.0+ for WebSocket support
- **Check settings**: Make sure method is set to "WebSocket"

### Success Indicators:
✅ **Connection Success**: Receive `{"success": true, "message": "Connected to chat server"}`
✅ **Auth Success**: Receive `{"success": true, "userId": "user-uuid-here"}`  
✅ **Message Success**: Receive `{"success": true, "message": {...}}`

## Mobile App Implementation Notes

For your mobile app, you'll need to:

1. **Use Socket.io Client Library**: 
   - React Native: `socket.io-client`
   - Flutter: `socket_io_client`
   - Native iOS: `Socket.IO-Client-Swift`
   - Native Android: `socket.io-client-java`

2. **Connection Pattern**:
   ```javascript
   // Connect to namespace
   const socket = io('http://your-server:3001/direct-chat');
   
   // Authenticate
   socket.emit('authenticate', { token: 'jwt-token' }, (response) => {
     if (response.success) {
       // User authenticated, can now send messages
     }
   });
   
   // Listen for incoming messages
   socket.on('newMessage', (data) => {
     // Handle incoming message
     console.log('New message:', data.message);
   });
   
   // Send message
   socket.emit('sendMessage', {
     recipientId: 'recipient-uuid',
     type: 'text',
     content: 'Hello!'
   }, (response) => {
     if (response.success) {
       // Message sent successfully
     }
   });
   ```

3. **Important Events to Handle**:
   - `connected` - Server confirms connection
   - `newMessage` - Incoming message from another user
   - `userStatusChanged` - User came online/offline
   - `userTyping` - Someone is typing
   - `messagesRead` - Messages were read by recipient

This Postman collection will give you the exact same patterns you'll need in your mobile app!
