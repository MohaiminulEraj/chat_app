# Enhanced SendMessage with User Profile Information

## Overview

The `sendMessage` socket event has been enhanced to include comprehensive user profile information in all responses. This allows clients to display rich user information without making additional API calls.

## Features Added

### ✅ Enhanced Response Structure

- **Sender Profile**: Complete user profile information included in every message
- **User Details**: Name, avatar, country, level, badges, and more
- **Consistent Format**: Standardized response structure across all message types

### ✅ Profile Information Included

```javascript
{
  success: true,
  message: {
    // ... existing message fields
    sender: {
      id: "user-uuid",
      uuid: "user-uuid",
      name: "User Display Name",
      displayName: "User Display Name",
      email: "user@example.com",
      avatarUrl: "https://cloudinary.com/user-avatar.jpg",
      country: "United States",
      level: 15,
      badge: ["vip", "early_adopter"],
      frameId: "frame_001",
      frameImage: "https://cloudinary.com/frame.png"
    }
  },
  conversation: "conversation-uuid",
  timestamp: "2025-08-16T12:00:00.000Z"
}
```

## Usage Examples

### 1. Send Direct Message

```javascript
socket.emit(
    'sendMessage',
    {
        recipientId: 'recipient-user-uuid',
        type: 'text',
        content: 'Hello! This is a direct message.'
    },
    (response) => {
        console.log('Sender Profile:', response.message.sender)
        // Access sender information:
        // - response.message.sender.name
        // - response.message.sender.avatarUrl
        // - response.message.sender.level
        // - response.message.sender.badge
    }
)
```

### 2. Send Message in Existing Conversation

```javascript
socket.emit(
    'sendMessage',
    {
        conversationId: 'existing-conversation-uuid',
        type: 'text',
        content: 'Reply in existing conversation'
    },
    (response) => {
        console.log('Enhanced message with profile:', response.message)
    }
)
```

### 3. Send File Message

```javascript
socket.emit(
    'sendMessage',
    {
        conversationId: 'conversation-uuid',
        type: 'file',
        content: 'Check out this file!',
        fileUrl: 'https://example.com/file.pdf'
    },
    (response) => {
        // File message also includes sender profile
        console.log('File sender:', response.message.sender.name)
    }
)
```

## Event Broadcasting

### newMessage Event

All participants in the conversation receive the `newMessage` event with enhanced profile information:

```javascript
socket.on('newMessage', (data) => {
    console.log('Message received:', data.message.content)
    console.log('From:', data.message.sender.name)
    console.log('Avatar:', data.message.sender.avatarUrl)
    console.log('Level:', data.message.sender.level)
})
```

## Profile Information Fields

| Field         | Type   | Description                             | Example                                 |
| ------------- | ------ | --------------------------------------- | --------------------------------------- |
| `id`          | string | User UUID                               | `"7f60076a-6384-420f-9adc-c5fe33dbecc"` |
| `uuid`        | string | User UUID (duplicate for compatibility) | `"7f60076a-6384-420f-9adc-c5fe33dbecc"` |
| `name`        | string | User's display name or name             | `"John Doe"`                            |
| `displayName` | string | User's preferred display name           | `"Johnny"`                              |
| `email`       | string | User's email address                    | `"john@example.com"`                    |
| `avatarUrl`   | string | User's profile picture URL              | `"https://cloudinary.com/avatar.jpg"`   |
| `country`     | string | User's country                          | `"United States"`                       |
| `level`       | number | User's level/experience                 | `15`                                    |
| `badge`       | array  | User's achievement badges               | `["vip", "early_adopter"]`              |
| `frameId`     | string | User's selected frame ID                | `"frame_gold_001"`                      |
| `frameImage`  | string | User's frame image URL                  | `"https://cloudinary.com/frame.png"`    |

## Implementation Details

### Service Method Added

```typescript
// ConversationService.getUserProfile()
async getUserProfile(userId: string): Promise<User> {
  const user = await this.userRepository.findOne({
    where: { uuid: userId, isActive: true },
    select: [
      'uuid', 'name', 'email', 'displayName', 'avatarUrl',
      'coverImage', 'country', 'level', 'balance',
      'frameId', 'frameImage', 'badge', 'bio'
    ]
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user;
}
```

### Gateway Enhancement

```typescript
// Enhanced sendMessage handler
const senderProfile = await this.conversationService.getUserProfile(senderId)

const enhancedMessage = {
    ...message.toObject(),
    sender: {
        id: senderId,
        uuid: senderId,
        name: senderProfile.displayName || senderProfile.name || 'Unknown User',
        displayName: senderProfile.displayName || senderProfile.name,
        email: senderProfile.email,
        avatarUrl: senderProfile.avatarUrl,
        country: senderProfile.country,
        level: senderProfile.level || 0,
        badge: senderProfile.badge || [],
        frameId: senderProfile.frameId,
        frameImage: senderProfile.frameImage
    }
}
```

## Benefits

### ✅ Improved User Experience

- **Rich Display**: Show user avatars, names, and badges immediately
- **No Additional API Calls**: All user info included in message response
- **Consistent UI**: Standardized user information across all messages

### ✅ Performance Benefits

- **Reduced Network Requests**: No need to fetch user profiles separately
- **Faster UI Updates**: Immediate display of sender information
- **Cached Profile Data**: Profile information travels with each message

### ✅ Developer Experience

- **Simple Integration**: Just use the enhanced response structure
- **Backward Compatible**: Existing message fields remain unchanged
- **Type Safe**: Full TypeScript support for profile fields

## Testing

### Manual Testing

1. Use the provided test client: `node test-sendmessage-enhanced.js`
2. Configure JWT tokens and user IDs
3. Run tests to verify profile information is included

### Expected Response Format

```javascript
{
  "success": true,
  "message": {
    "_id": "message-mongo-id",
    "conversationId": "conversation-uuid",
    "senderId": "sender-uuid",
    "type": "text",
    "content": "Hello world!",
    "status": "sent",
    "createdAt": "2025-08-16T12:00:00.000Z",
    "sender": {
      "id": "sender-uuid",
      "uuid": "sender-uuid",
      "name": "John Doe",
      "displayName": "Johnny",
      "email": "john@example.com",
      "avatarUrl": "https://cloudinary.com/avatar.jpg",
      "country": "United States",
      "level": 15,
      "badge": ["vip"],
      "frameId": "gold_frame",
      "frameImage": "https://cloudinary.com/frame.png"
    }
  },
  "conversation": "conversation-uuid",
  "timestamp": "2025-08-16T12:00:00.000Z"
}
```

## Error Handling

### User Not Found

```javascript
{
  "success": false,
  "error": "User not found"
}
```

### Invalid Conversation

```javascript
{
  "success": false,
  "error": "Conversation not found"
}
```

### Missing Parameters

```javascript
{
  "success": false,
  "error": "Either conversationId or recipientId is required"
}
```

## Migration Notes

### For Existing Clients

- **No Breaking Changes**: Existing message fields remain unchanged
- **Additive Enhancement**: New `sender` object added to response
- **Gradual Adoption**: Clients can adopt enhanced profile display incrementally

### For New Clients

- **Rich User Display**: Utilize full profile information from day one
- **Consistent Design**: Use standardized user profile components
- **Performance Optimized**: No additional API calls needed for user information

---

**🎉 The enhanced sendMessage functionality provides rich user profile information with every message, improving user experience and reducing API overhead!**
