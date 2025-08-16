# WebSocket Testing Guide for Postman 11.54.0

This guide specifically addresses WebSocket testing with Postman version 11.54.0 on Linux.

## Important: Fixing the "Invalid protocol: ws:" Error

If you're encountering the "Invalid protocol: ws:" error, follow these steps:

## Method 1: Use the Fixed Collection

1. Import the `postman_websocket_fixed.json` file into Postman
2. Import the `kitty_chat_environment.json` file
3. Select "Kitty Chat Environment" from the environment dropdown

## Method 2: Use HTTP instead of WebSocket Protocol in Request URL

If the above doesn't work, try this manual approach:

1. Create a new request in Postman
2. In the URL field, enter: `http://localhost:3001/direct-chat`
3. From the dropdown next to the URL field, select "WebSocket"
4. Click "Connect"

This tricks Postman into using the correct WebSocket connection even when starting from an HTTP URL.

## Method 3: Use the Socket.io URL Format

Try using the Socket.io specific format:

1. Create a new request in Postman
2. In the URL field, enter: `http://localhost:3001/socket.io/?EIO=4&transport=websocket`
3. From the dropdown next to the URL field, select "WebSocket"
4. Click "Connect"

## Testing with the Browser Tool

If Postman continues to have issues with WebSockets, use the included browser tool:

1. Make sure your server is running
2. Open `websocket_tester.html` in your browser
3. Click "Connect" in the Direct Chat panel
4. After connecting, click "Authenticate" to authenticate with the JWT token
5. Once authenticated, you can send messages and other events

## Testing with the Command-Line Tool

For command-line testing:

1. Open a terminal in your project directory
2. Run: `node websocket-cli-client.js`
3. Type `authenticate` to authenticate
4. Use commands like `send` to send messages

## Specific Postman 11.54.0 Tips

- Use New Workspace: Try creating a new workspace before adding WebSocket requests
- Clear Cache: In Postman, go to Settings > General > Clear Cache & Restart
- Check Network Settings: Make sure no proxies are interfering with WebSocket connections
- Update Postman: Consider updating to the latest version if possible

## Socket.io Events Reference

| Event        | Description           | Example Payload                                                 |
| ------------ | --------------------- | --------------------------------------------------------------- |
| authenticate | Authenticate with JWT | `{ "token": "your-jwt-token" }`                                 |
| sendMessage  | Send a message        | `{ "recipientId": "uuid", "type": "text", "content": "Hello" }` |

Remember: When working with Socket.io in Postman, you might need to manually format the events according to Socket.io's protocol rather than using raw WebSocket frames.
