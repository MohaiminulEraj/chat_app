# Kitty Chat WebSocket Testing Guide

This guide explains how to use the Postman collection for testing WebSocket chat functionality in the Kitty Chat application.

## Prerequisites

- [Postman](https://www.postman.com/downloads/) installed (make sure to use a recent version with WebSocket support)
- Kitty Chat backend running on `localhost:3000` (WebSocket available on same port)

## WebSocket Connection URL

Use this URL in Postman for WebSocket connection:
```
ws://localhost:3000/chat
```

The namespace is `/chat` and the server runs on port 3000.

## Importing the Collection

1. Open Postman
2. Click on "Import" button in the top left corner
3. Select the `postman_websocket_collection.json` file from this directory
4. Also import the `kitty_chat_environment.json` environment file

## Setting Up the Environment

1. After importing, select the "Kitty Chat Environment" from the environment dropdown in the top right corner
2. Update the following variables in the environment:
   - `jwt_token`: Use the most recent token generated from your `generate-test-token.js` script
   - `recipient_id`: UUID of a user you want to chat with (optional - needed only for direct messaging)
   - `conversation_id`: UUID of an existing conversation (optional - needed only for messaging in existing conversations)

## Using the Collection

### Authentication Flow

1. First run the "Connect" request to establish a WebSocket connection
2. Then run the "Authenticate" request to authenticate with your JWT token
3. After successful authentication, you can use any of the other requests

### Sending Messages

There are two ways to send messages:

1. **To a specific conversation**: Set the `conversation_id` variable and use the "Send Message" request
2. **To a specific user**: Set the `recipient_id` variable and use the "Send Message" request with the recipient option uncommented

### Testing Other Features

- Use "Mark Messages as Read" to mark messages as read
- Use "User Typing" to indicate typing status
- Use "Delete Message" to delete a message
- Use "Edit Message" to edit a message

## Monitoring Events

Postman's WebSocket interface allows you to monitor incoming events. After connecting:

1. Look for the "Messages" panel in the WebSocket interface
2. You'll see events like `newMessage`, `messageEdited`, `messageDeleted`, `userTyping`, etc.

## Troubleshooting

- If you encounter authentication errors, generate a new token using `node generate-test-token.js`
- Make sure your server is running and listening on port 3000 (HTTP) / 3001 (WebSocket)
- Check that you're using the correct namespace (`chat`)

## WebSocket Events Reference

### Client-to-Server Events:

- `authenticate`: Authenticate with JWT token
- `sendMessage`: Send a message to a conversation or user
- `getConversationHistory`: Get conversation message history with pagination
- `getUserConversations`: Get all user conversations
- `joinConversation`: Join a specific conversation room
- `leaveConversation`: Leave a specific conversation room
- `markAsRead`: Mark messages as read
- `typing`: Indicate typing status
- `deleteMessage`: Delete a message
- `editMessage`: Edit a message

### Server-to-Client Events:

- `connected`: Connection confirmation
- `newMessage`: New message notification
- `messagesRead`: Messages marked as read
- `messageDeleted`: Message deleted notification
- `messageEdited`: Message edited notification
- `userTyping`: User typing status
- `userStatusChanged`: User online/offline status
- `error`: Error notification

## Event Examples for Postman

### 1. Authentication
```json
{
  "token": "your-jwt-token-here"
}
```

### 2. Send Message
```json
{
  "recipientId": "user-uuid-here",
  "type": "text",
  "content": "Hello! This is a test message"
}
```
OR
```json
{
  "conversationId": "conversation-uuid-here",
  "type": "text",
  "content": "Hello! This is a test message"
}
```

### 3. Get Conversation History
```json
{
  "conversationId": "conversation-uuid-here",
  "limit": 50
}
```
OR start new conversation:
```json
{
  "recipientId": "user-uuid-here",
  "limit": 50
}
```

### 4. Get User Conversations
```json
{}
```

### 5. Join Conversation
```json
{
  "conversationId": "conversation-uuid-here"
}
```

### 6. Typing Indicator
```json
{
  "conversationId": "conversation-uuid-here",
  "isTyping": true
}
```
