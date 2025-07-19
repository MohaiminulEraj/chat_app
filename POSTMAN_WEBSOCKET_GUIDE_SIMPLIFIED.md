# Kitty Chat WebSocket Testing Guide (Simplified)

This guide explains how to use Postman for WebSocket testing with the Kitty Chat application.

## Step 1: Import the Collection and Environment

1. Open Postman
2. Click "Import" in the top-left corner
3. Import both:
    - `postman_websocket_simplified.json`
    - `kitty_chat_environment.json`
4. Select the "Kitty Chat Environment" from the environment dropdown (top-right)

## Step 2: Connect to WebSocket

1. In the collection, click on "Direct Chat Connection"
2. Click the blue "Connect" button (not "Send") in the request panel
3. You should see "Connected to chat server" in the response

## Step 3: Authenticate

Once connected, you'll see the WebSocket interface with a "New Message" section at the bottom:

1. In the "Event Name" field, enter: `authenticate`
2. In the message field, enter the JSON:

```json
{
    "token": "{{jwt_token}}"
}
```

3. Click "Send"
4. Check the response in the "Messages" panel - you should see a successful authentication response

## Step 4: Send Messages

After authentication:

1. In the "Event Name" field, enter: `sendMessage`
2. In the message field, enter the JSON:

```json
{
    "recipientId": "RECIPIENT_UUID_HERE",
    "type": "text",
    "content": "Hello from Postman!"
}
```

3. Click "Send"
4. Check the response in the "Messages" panel

## Step 5: Listen for Events

The "Messages" panel will show all incoming events, including:

- `newMessage` - When someone sends you a message
- `userStatusChanged` - When a user comes online/offline
- `userTyping` - When someone is typing
- `messageRead` - When messages are read

## Common WebSocket Events

| Event Name      | Direction | Example JSON Payload                                                          |
| --------------- | --------- | ----------------------------------------------------------------------------- |
| `authenticate`  | Send      | `{"token": "your-jwt-token"}`                                                 |
| `sendMessage`   | Send      | `{"recipientId": "uuid", "type": "text", "content": "Hello"}`                 |
| `typing`        | Send      | `{"conversationId": "uuid", "isTyping": true}`                                |
| `markAsRead`    | Send      | `{"conversationId": "uuid", "messageIds": ["id1", "id2"]}`                    |
| `deleteMessage` | Send      | `{"conversationId": "uuid", "messageId": "message-id"}`                       |
| `editMessage`   | Send      | `{"conversationId": "uuid", "messageId": "id", "newContent": "Updated text"}` |

## Tips

- Keep the WebSocket connection open while testing
- If your token expires, generate a new one with `node generate-test-token.js` and update the environment variable
- Use the "Messages" panel to monitor all incoming and outgoing WebSocket messages
- For the general namespace, the token is passed in the URL as a query parameter
