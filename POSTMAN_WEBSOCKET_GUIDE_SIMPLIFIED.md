# Kitty Chat WebSocket Testing Guide - Updated ✅

This guide explains how to use Postman for WebSocket testing with the Kitty Chat application. **This version is tested and working!**

## Step 1: Import the Collection and Environment

1. Open Postman
2. Click "Import" in the top-left corner
3. Import both files:
    - `kitty_chat_websocket_updated.json` (Collection)
    - `kitty_chat_environment_updated.json` (Environment)
4. Select the "Kitty Chat Environment - Updated" from the environment dropdown (top-right)

## Step 2: Connect to WebSocket

1. In the collection, click on "Chat WebSocket Connection"
2. Click the blue "Connect" button (not "Send") in the request panel
3. You should see "Connected" status in the WebSocket interface
4. The connection URL is: `ws://localhost:3001/socket.io/?EIO=4&transport=websocket&ns=/chat`

## Step 3: Authenticate

Once connected, you'll see the WebSocket interface with a "New Message" section at the bottom:

1. In the "Event Name" field, enter: `authenticate`
2. In the message field, enter the JSON (Socket.io format):

```json
["authenticate", { "token": "{{jwt_token}}" }]
```

3. Click "Send"
4. You should see an authentication success response in the "Messages" panel

## Step 4: Send Messages

After authentication, you can send messages using Socket.io event format:

1. In the "Event Name" field, enter: `message`
2. In the message field, enter the JSON:

```json
[
    "message",
    {
        "receiverId": "{{recipient_uuid}}",
        "content": "Hello from Postman!",
        "messageType": "text"
    }
]
```

3. Click "Send"
4. Check the response in the "Messages" panel

## Step 5: Join Conversation

To receive messages from a specific user:

1. Event Name: `joinConversation`
2. Message:

```json
["joinConversation", { "userId": "{{recipient_uuid}}" }]
```

## Step 6: Get Message History

To retrieve previous messages:

1. Event Name: `getMessageHistory`
2. Message:

```json
[
    "getMessageHistory",
    {
        "userId": "{{recipient_uuid}}",
        "page": 1,
        "limit": 20
    }
]
```

## Step 7: Listen for Events

The "Messages" panel will show all incoming events, including:

- `authenticated` - Successful authentication confirmation
- `messageReceived` - When someone sends you a message
- `messageHistory` - Response with historical messages
- `userTyping` - When someone is typing
- `userStoppedTyping` - When someone stopped typing

## Common WebSocket Events (Socket.io Format)

| Event Name          | Direction | Socket.io Format Example                                                         |
| ------------------- | --------- | -------------------------------------------------------------------------------- |
| `authenticate`      | Send      | `["authenticate", {"token": "your-jwt-token"}]`                                  |
| `message`           | Send      | `["message", {"receiverId": "uuid", "content": "Hello", "messageType": "text"}]` |
| `joinConversation`  | Send      | `["joinConversation", {"userId": "uuid"}]`                                       |
| `getMessageHistory` | Send      | `["getMessageHistory", {"userId": "uuid", "page": 1, "limit": 20}]`              |
| `typing`            | Send      | `["typing", {"conversationId": "uuid", "isTyping": true}]`                       |
| `authenticated`     | Receive   | Server confirmation of successful authentication                                 |
| `messageReceived`   | Receive   | New message from another user                                                    |
| `messageHistory`    | Receive   | Response with conversation history                                               |

## Getting JWT Tokens

Use the Authentication requests in the collection:

1. **Register User**: Creates a new user and automatically saves the token
2. **Login User**: Logs in existing user and saves the token

Both requests automatically save the JWT token to the `{{jwt_token}}` environment variable.

## Environment Variables

The environment includes these pre-configured variables:

- `{{base_url}}`: http://localhost:3001
- `{{websocket_url}}`: ws://localhost:3001
- `{{jwt_token}}`: Your authentication token
- `{{user_uuid}}`: Your user ID
- `{{recipient_uuid}}`: ID of user to chat with

## Tips

- Keep the WebSocket connection open while testing
- The collection automatically handles JWT token management
- Use Socket.io array format: `["eventName", {data}]` for sending events
- Monitor the "Messages" panel for all incoming and outgoing WebSocket messages
- The server uses namespace `/chat` - this is already configured in the collection
- If connection fails, ensure the server is running on port 3001

## Test User Credentials

The environment includes a test user:

- **Email**: testuser2@example.com
- **Password**: password123
- **UUID**: 483eb237-3de7-419a-86f1-d143c426b2d8

## Troubleshooting

1. **Connection Failed**: Ensure server is running with `npm run start:dev`
2. **Authentication Failed**: Generate a new token using Login request
3. **Invalid Protocol Error**: Use the exact URL format in the collection
4. **Messages Not Received**: Make sure you've joined the conversation first
