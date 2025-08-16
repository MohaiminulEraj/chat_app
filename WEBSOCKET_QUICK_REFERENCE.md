# Kitty Chat WebSocket - Quick Reference 🚀

## ✅ Files to Import

1. `kitty_chat_websocket_updated.json` (Collection)
2. `kitty_chat_environment_updated.json` (Environment)

## 🔗 WebSocket URL

```
ws://localhost:3001/socket.io/?EIO=4&transport=websocket&ns=/chat
```

## 🔐 Authentication Flow

```json
["authenticate", { "token": "{{jwt_token}}" }]
```

## 💬 Send Message

```json
[
    "message",
    {
        "receiverId": "{{recipient_uuid}}",
        "content": "Hello!",
        "messageType": "text"
    }
]
```

## 🗨️ Join Conversation

```json
["joinConversation", { "userId": "{{recipient_uuid}}" }]
```

## 📜 Get History

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

## 🎯 Test User

- **Email**: testuser2@example.com
- **Password**: password123
- **UUID**: 483eb237-3de7-419a-86f1-d143c426b2d8

## 🔄 Quick Test Steps

1. Import both JSON files
2. Select "Kitty Chat Environment - Updated"
3. Connect to WebSocket
4. Send authenticate event
5. Send message event
6. Watch Messages panel for responses

**Ready for Flutter development! 🦋**
