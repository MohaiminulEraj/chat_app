# Flutter Real-time Group Chat - Setup & Testing Guide

This Flutter app provides complete real-time group chat functionality using WebSocket connections to your NestJS backend.

## 📁 Project Structure

```
lib/
├── config/
│   └── app_config.dart              # Configuration and constants
├── services/
│   └── websocket_service.dart       # Socket.io WebSocket service
├── managers/
│   └── group_chat_manager.dart      # Chat state management
├── models/
│   └── chat_models.dart             # Data models
├── screens/
│   └── group_chat_screen.dart       # Main chat UI
├── widgets/
│   ├── message_bubble.dart          # Message display widget
│   ├── message_input.dart           # Message input widget
│   ├── typing_indicator.dart        # Typing animation
│   ├── chat_app_bar.dart           # Custom app bar
│   ├── message_reply_widget.dart    # Reply functionality
│   ├── message_attachment_widget.dart # Attachment display
│   ├── attachment_bottom_sheet.dart  # Attachment picker
│   └── message_search_delegate.dart  # Search functionality
├── group_chat_demo.dart             # Demo app entry point
└── main.dart                        # Original full app
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd mobile_flutter_app
flutter pub get
```

### 2. Configure Backend Connection

Edit `lib/config/app_config.dart`:

```dart
class AppConfig {
  // Update with your backend server details
  static const String baseUrl = 'http://your-server:3000';
  static const String wsUrl = 'http://your-server:3000';

  // Update with actual user credentials from your database
  static const String testUser1Id = 'your-user-id-1';
  static const String testUser1Email = 'your-email@example.com';

  // Update with actual group ID from your database
  static const String testGroupId = 'your-group-id';
}
```

### 3. Run the Demo

```bash
# Run the demo app (focused on group chat only)
flutter run lib/group_chat_demo.dart

# OR run the full app
flutter run
```

## 🔧 Configuration

### Backend Connection Setup

1. **Update Server URLs** in `app_config.dart`:

    - `baseUrl`: Your NestJS backend HTTP endpoint
    - `wsUrl`: Your NestJS backend WebSocket endpoint

2. **Configure Test Users**:

    - Get user IDs from your PostgreSQL database
    - Update `testUser1Id`, `testUser1Email` in config
    - Optionally add `testUser2Id`, `testUser2Email` for multi-user testing

3. **Set Group ID**:
    - Create a group using your backend API or database
    - Update `testGroupId` with the actual group ID

### Demo Configuration

In `group_chat_demo.dart`, modify these variables:

```dart
final String _currentUserId = AppConfig.testUser1Id;
final String _currentUserEmail = AppConfig.testUser1Email;
final String _currentUserName = 'Your Name';
final String _groupId = 'your-actual-group-id';
final String _groupName = 'Your Group Name';
```

## 🧪 Testing Real-time Features

### WebSocket Events Testing

The app supports all backend WebSocket events:

1. **Authentication**: `authenticate`
2. **Group Management**: `joinGroup`, `leaveGroup`
3. **Messaging**: `sendGroupMessage`, `groupMessageReceived`
4. **Typing Indicators**: `userTypingInGroup`, `userStoppedTypingInGroup`
5. **Message Actions**: `editGroupMessage`, `deleteGroupMessage`
6. **Read Receipts**: `markGroupMessageAsRead`
7. **User Presence**: `userJoinedGroup`, `userLeftGroup`

### Multi-User Testing

1. **Using Multiple Devices**:

    ```dart
    // Device 1 - User 1
    final String _currentUserId = AppConfig.testUser1Id;
    final String _currentUserEmail = AppConfig.testUser1Email;

    // Device 2 - User 2
    final String _currentUserId = AppConfig.testUser2Id;
    final String _currentUserEmail = AppConfig.testUser2Email;
    ```

2. **Using Browser + Mobile**:
    - Use your existing Postman WebSocket collections on browser
    - Run Flutter app on mobile/simulator
    - Test real-time sync between both

### Feature Testing Checklist

- [ ] **Connection**: App connects to WebSocket server
- [ ] **Authentication**: User authenticates successfully
- [ ] **Join Group**: User joins group and sees existing messages
- [ ] **Send Messages**: Messages send and appear in real-time
- [ ] **Typing Indicators**: Typing animation shows/hides correctly
- [ ] **Message History**: Previous messages load on app start
- [ ] **Message Actions**: Edit/delete messages (15-min window)
- [ ] **Replies**: Reply to messages functionality
- [ ] **Attachments**: Image picker and display (basic setup)
- [ ] **Real-time Updates**: Messages appear instantly across devices
- [ ] **Reconnection**: App reconnects after network issues

## 🎯 Real-time Features Included

### ✅ Core Messaging

- Send/receive messages in real-time
- Message history loading with pagination
- Auto-scroll to new messages
- Message timestamps with "time ago" format

### ✅ Typing Indicators

- Real-time typing animation
- Multiple users typing support
- Auto-hide after inactivity timeout
- Smooth animation transitions

### ✅ Message Actions

- Edit messages (15-minute window)
- Delete messages with confirmation
- Reply to messages with preview
- Long-press context menu

### ✅ User Experience

- Connection status indicators
- Loading states and error handling
- Retry mechanisms for failed operations
- Smooth UI animations and transitions

### ✅ Advanced Features

- Message search functionality
- Attachment support (images, videos, documents)
- Read receipts tracking
- User presence indicators

## 📱 UI Components

### GroupChatScreen

Main chat interface with:

- Custom app bar with typing indicators
- Message list with auto-scroll
- Message input with reply preview
- Floating action buttons for attachments

### MessageBubble

Individual message display:

- Sender/receiver styling
- Timestamp and read status
- Reply preview
- Attachment rendering

### MessageInput

Message composition:

- Text input with auto-expand
- Emoji picker button
- Attachment picker
- Voice message recording (placeholder)

### TypingIndicator

Animated typing feedback:

- Bouncing dots animation
- Multiple user support
- Auto-hide timers

## 🔌 Integration with Existing App

### Option 1: Use DirectChatLauncher

```dart
import 'package:your_app/group_chat_demo.dart';

// Launch group chat from anywhere in your app
DirectChatLauncher.launchGroupChat(
  context,
  groupId: 'group-id',
  groupName: 'Group Name',
  userId: 'user-id',
  userEmail: 'user@email.com',
  userName: 'User Name',
);
```

### Option 2: Integrate Components

```dart
import 'package:your_app/services/websocket_service.dart';
import 'package:your_app/managers/group_chat_manager.dart';
import 'package:your_app/screens/group_chat_screen.dart';

// Initialize in your existing app
final webSocketService = WebSocketService();
final chatManager = GroupChatManager(
  webSocketService: webSocketService,
  currentUserId: userId,
);

// Use in your navigation
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (context) => GroupChatScreen(
      groupId: groupId,
      groupName: groupName,
      chatManager: chatManager,
    ),
  ),
);
```

## 🛠️ Customization

### Theming

Modify colors and styles in `group_chat_demo.dart`:

```dart
theme: ThemeData(
  primaryColor: Colors.yourColor,
  // ... other theme properties
),
```

### Message Appearance

Customize message bubbles in `message_bubble.dart`:

```dart
// Colors, padding, border radius, etc.
Container(
  decoration: BoxDecoration(
    color: isFromCurrentUser ? Colors.blue : Colors.grey[200],
    borderRadius: BorderRadius.circular(16),
  ),
  // ... rest of styling
)
```

### Add Custom Features

Extend functionality by:

1. Adding new WebSocket events in `websocket_service.dart`
2. Updating state management in `group_chat_manager.dart`
3. Creating new UI widgets in `widgets/` folder
4. Adding new screens for additional features

## 📊 Performance Considerations

- **Message Pagination**: Loads messages in chunks to prevent memory issues
- **Auto-scroll Optimization**: Only scrolls when user is near bottom
- **Image Caching**: Network images are cached automatically
- **Connection Management**: Handles reconnection and cleanup properly

## 🐛 Troubleshooting

### Connection Issues

1. Check backend server is running on correct port
2. Verify WebSocket namespace `/group-chat` is active
3. Ensure CORS is properly configured for mobile requests
4. Check if device/simulator can reach the server IP

### Authentication Problems

1. Verify user IDs exist in your database
2. Check JWT token generation in backend
3. Ensure user has permission to join the group

### Message Issues

1. Check group ID exists and user is a member
2. Verify MongoDB dynamic collection creation
3. Check backend logs for WebSocket event errors

### UI Issues

1. Run `flutter clean && flutter pub get`
2. Check for widget key conflicts
3. Verify all imports are correct

## 🔄 Next Steps

1. **Connect to Live Backend**: Update configuration with your server details
2. **Test Real-time Features**: Verify all WebSocket events work correctly
3. **Add Authentication**: Integrate with your existing auth system
4. **Extend Features**: Add file uploads, push notifications, etc.
5. **Performance Testing**: Test with larger groups and message volumes

## 💡 Tips

- Use the demo app first to test basic functionality
- Monitor backend logs while testing WebSocket connections
- Test on real devices for accurate network behavior
- Use your existing Postman collections alongside the Flutter app
- Gradually integrate components into your main app

The Flutter real-time group chat is now ready for testing and integration! 🚀
