# 📱 Flutter Socket.IO One-to-One Chat Client

A comprehensive Flutter client implementation for real-time one-to-one chat using Socket.IO, designed to work with the Kitty Backend unified Socket.IO system.

## ✨ Features

### 🔐 Authentication & Security

- JWT token-based authentication
- Secure token storage using Flutter Secure Storage
- Automatic token validation
- Session management

### 💬 Real-time Messaging

- Send and receive direct messages instantly
- Message read receipts
- Typing indicators
- Message history
- Support for text, image, file, and voice messages

### 📞 Voice & Video Calls

- Initiate voice and video calls
- Accept/decline incoming calls
- Call state management
- Real-time call status updates

### 👥 Friends Management

- Friends list with online status
- Friendship validation (users must be friends to chat)
- Real-time status updates (online, away, busy, offline)
- Profile pictures and user information

### 🎨 Modern UI/UX

- Material Design 3 components
- Responsive layout with sidebar
- Real-time connection status indicator
- Intuitive chat interface
- Status indicators and typing animations

## 🏗️ Architecture

The Flutter client follows a clean architecture pattern:

```
flutter_client/
├── main.dart                     # App entry point and login screen
├── one_to_one_chat_client.dart   # Main chat client implementation
├── pubspec.yaml                  # Dependencies configuration
└── README.md                     # This file
```

### Core Components

1. **OneToOneChatClient** - Main chat interface widget
2. **LoginScreen** - Authentication interface
3. **ChatMessage** - Message data model
4. **Friend** - Friend data model
5. **Socket Event Handlers** - Real-time event processing

## 🚀 Getting Started

### Prerequisites

- Flutter SDK (>=3.10.0)
- Dart SDK (>=3.0.0)
- Kitty Backend server running
- Valid user accounts with friendship relationships

### Installation

1. **Create Flutter Project**

    ```bash
    flutter create socketio_chat_client
    cd socketio_chat_client
    ```

2. **Replace Files**

    ```bash
    # Copy the generated files to your Flutter project
    cp one_to_one_chat_client.dart lib/
    cp main.dart lib/
    cp pubspec.yaml .
    ```

3. **Install Dependencies**

    ```bash
    flutter pub get
    ```

4. **Create Assets Directories**
    ```bash
    mkdir -p assets/images assets/sounds
    ```

### Dependencies

```yaml
dependencies:
    socket_io_client: ^2.0.3+1 # Socket.IO client
    http: ^1.1.0 # HTTP requests
    flutter_secure_storage: ^9.0.0 # Secure token storage
    flutter_local_notifications: ^16.3.2 # Push notifications
    provider: ^6.1.1 # State management
    intl: ^0.19.0 # Date formatting
    permission_handler: ^11.1.0 # Permissions for calls
```

### Configuration

1. **Update Server URL**

    ```dart
    // In main.dart, update the default server URL
    final TextEditingController serverUrlController = TextEditingController(
      text: 'http://your-server-url:3000',  // Update this
    );
    ```

2. **Configure Authentication**
    ```dart
    // Implement real authentication in _login() method
    // Replace dummy JWT token with actual login API call
    ```

## 🔧 Usage

### Basic Implementation

```dart
import 'package:flutter/material.dart';
import 'one_to_one_chat_client.dart';

void main() {
  runApp(MaterialApp(
    home: OneToOneChatClient(
      serverUrl: 'http://localhost:3000',
      jwtToken: 'your-jwt-token-here',
      currentUserId: 'your-user-uuid-here',
    ),
  ));
}
```

### Socket.IO Events

The client handles all Socket.IO events from the backend:

#### Outgoing Events (Client → Server)

- `authenticate` - Authenticate socket connection
- `sendDirectMessage` - Send message to friend
- `markMessagesAsRead` - Mark messages as read
- `typing` - Send typing status
- `initiateCall` - Start voice/video call
- `respondToCall` - Accept/decline call
- `endCall` - End active call
- `updateStatus` - Update user status

#### Incoming Events (Server → Client)

- `authenticated` - Authentication confirmation
- `authenticationError` - Authentication failure
- `newDirectMessage` - Receive new message
- `messagesRead` - Message read notification
- `userTyping` - Typing status from friend
- `incomingCall` - Incoming call notification
- `callResponse` - Call response from friend
- `callEnded` - Call ended notification
- `userStatusChanged` - Friend status update

### Friendship Validation

The client ensures users can only chat with friends:

```dart
// Before sending messages, the client validates:
// 1. User is authenticated
// 2. Recipient exists in friends list
// 3. Friendship status is 'ACCEPTED'

// Backend friendship entity structure:
enum FriendshipStatus {
  PENDING,   // Friend request sent
  ACCEPTED,  // Friends - can chat
  BLOCKED    // Blocked - cannot chat
}
```

## 🎯 Key Features Implementation

### 1. Real-time Messaging

```dart
// Send message
void _sendMessage() {
  socket.emitWithAck('sendDirectMessage', {
    'recipientId': selectedFriendId,
    'type': 'text',
    'content': messageController.text.trim(),
  }, ack: (response) {
    if (response['success'] == true) {
      // Message sent successfully
      currentConversationId = response['conversationId'];
    }
  });
}

// Receive message
socket.on('newDirectMessage', (data) {
  final message = ChatMessage.fromSocketData(data);
  setState(() {
    messages.add(message);
  });
  _markMessageAsRead(message.id);
});
```

### 2. Typing Indicators

```dart
// Start typing
void _startTyping() {
  if (!isTyping && currentConversationId != null) {
    setState(() => isTyping = true);
    socket.emit('typing', {
      'conversationId': currentConversationId,
      'isTyping': true,
    });
  }
}

// Receive typing status
socket.on('userTyping', (data) {
  if (data['userId'] == selectedFriendId) {
    setState(() {
      friendTyping = data['isTyping'] ? data['userName'] : null;
    });
  }
});
```

### 3. Voice/Video Calls

```dart
// Initiate call
void _initiateCall(CallType callType) {
  final callId = 'call_${DateTime.now().millisecondsSinceEpoch}';
  socket.emitWithAck('initiateCall', {
    'recipientId': selectedFriendId,
    'callType': callType.name,
    'callId': callId,
  }, ack: (response) {
    if (response['success']) {
      setState(() => activeCallId = callId);
    }
  });
}

// Handle incoming call
socket.on('incomingCall', (data) {
  showDialog(
    context: context,
    builder: (context) => IncomingCallDialog(
      callerName: data['caller']['name'],
      callType: data['callType'],
      onAccept: () => _respondToCall(data['callId'], 'accept', data['caller']['uuid']),
      onDecline: () => _respondToCall(data['callId'], 'decline', data['caller']['uuid']),
    ),
  );
});
```

### 4. Status Management

```dart
// Update status
void _updateStatus(UserStatus status) {
  socket.emitWithAck('updateStatus', {
    'status': status.name,
  }, ack: (response) {
    if (response['success']) {
      setState(() => currentStatus = status);
    }
  });
}

// Handle friend status changes
socket.on('userStatusChanged', (data) {
  setState(() {
    friendStatuses[data['userId']] = UserStatus.values.firstWhere(
      (s) => s.name == data['status'],
      orElse: () => UserStatus.offline,
    );
  });
});
```

## 🔄 State Management

The client uses Flutter's built-in `setState()` for simplicity, but you can integrate with:

- **Provider** - Included in dependencies for complex state
- **Riverpod** - Modern state management
- **Bloc** - Event-driven architecture
- **GetX** - Reactive state management

Example with Provider:

```dart
class ChatProvider extends ChangeNotifier {
  List<ChatMessage> _messages = [];
  List<Friend> _friends = [];
  bool _isConnected = false;

  // Getters
  List<ChatMessage> get messages => _messages;
  List<Friend> get friends => _friends;
  bool get isConnected => _isConnected;

  // Methods
  void addMessage(ChatMessage message) {
    _messages.add(message);
    notifyListeners();
  }

  void updateConnectionStatus(bool connected) {
    _isConnected = connected;
    notifyListeners();
  }
}
```

## 🔐 Security Best Practices

### JWT Token Management

```dart
// Store tokens securely
const storage = FlutterSecureStorage();

// Save token
await storage.write(key: 'jwt_token', value: token);

// Read token
final token = await storage.read(key: 'jwt_token');

// Delete token on logout
await storage.delete(key: 'jwt_token');
```

### Input Validation

```dart
// Validate message content
bool _isValidMessage(String content) {
  return content.isNotEmpty &&
         content.length <= 1000 &&
         content.trim().isNotEmpty;
}

// Sanitize user input
String _sanitizeInput(String input) {
  return input.trim().replaceAll(RegExp(r'[<>]'), '');
}
```

### Permission Handling

```dart
// Request microphone permission for voice calls
Future<bool> _requestMicrophonePermission() async {
  final status = await Permission.microphone.request();
  return status == PermissionStatus.granted;
}

// Request camera permission for video calls
Future<bool> _requestCameraPermission() async {
  final status = await Permission.camera.request();
  return status == PermissionStatus.granted;
}
```

## 🚨 Error Handling

### Connection Errors

```dart
socket.onConnectError((data) {
  print('Connection error: $data');
  _showSnackBar('Connection failed. Retrying...', isError: true);

  // Implement exponential backoff
  Timer(Duration(seconds: _retryDelay), () {
    _retryDelay = math.min(_retryDelay * 2, 30);
    socket.connect();
  });
});
```

### Message Errors

```dart
// Handle message send failures
socket.emitWithAck('sendDirectMessage', messageData, ack: (response) {
  if (response['success'] != true) {
    // Remove optimistically added message
    _removeOptimisticMessage(tempMessageId);
    _showSnackBar('Failed to send message: ${response['error']}', isError: true);
  }
});
```

### Authentication Errors

```dart
socket.on('authenticationError', (data) {
  // Clear stored token
  storage.delete(key: 'jwt_token');

  // Navigate to login
  Navigator.pushReplacement(
    context,
    MaterialPageRoute(builder: (context) => LoginScreen()),
  );
});
```

## 🧪 Testing

### Unit Tests

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ChatMessage', () {
    test('should create message from socket data', () {
      final data = {
        'message': {
          'id': 'msg-123',
          'content': 'Hello World',
          'type': 'text',
          'sender': {'uuid': 'user-456', 'name': 'John Doe'},
          'timestamp': '2025-07-29T12:00:00.000Z'
        }
      };

      final message = ChatMessage.fromSocketData(data);

      expect(message.id, 'msg-123');
      expect(message.content, 'Hello World');
      expect(message.senderName, 'John Doe');
    });
  });
}
```

### Widget Tests

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('should display message bubble', (WidgetTester tester) async {
    final message = ChatMessage(
      id: 'test',
      content: 'Test message',
      type: MessageType.text,
      senderId: 'user1',
      senderName: 'Test User',
      timestamp: DateTime.now(),
      isOwn: true,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MessageBubble(message: message),
        ),
      ),
    );

    expect(find.text('Test message'), findsOneWidget);
  });
}
```

## 📱 Platform Considerations

### Android

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### iOS

```xml
<!-- ios/Runner/Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice calls</string>
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
```

## 🚀 Deployment

### Build for Production

```bash
# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

### Environment Configuration

```dart
// lib/config/environment.dart
class Environment {
  static const String production = 'https://your-api.com';
  static const String staging = 'https://staging-api.com';
  static const String development = 'http://localhost:3000';

  static String get baseUrl {
    return const String.fromEnvironment('API_URL', defaultValue: development);
  }
}
```

## 📋 TODO / Future Enhancements

- [ ] Group chat support
- [ ] File upload/download
- [ ] Voice message recording
- [ ] Push notifications
- [ ] Dark mode theme
- [ ] Message search
- [ ] Message reactions
- [ ] Custom emoji support
- [ ] Message encryption
- [ ] Offline message queue
- [ ] Chat backup/restore
- [ ] Multiple device sync

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**

    ```
    Solution: Check server URL and network connectivity
    ```

2. **Authentication Error**

    ```
    Solution: Verify JWT token validity and format
    ```

3. **Messages Not Received**

    ```
    Solution: Check friendship status and Socket.IO connection
    ```

4. **UI Not Updating**
    ```
    Solution: Ensure setState() is called in event handlers
    ```

### Debug Mode

```dart
// Enable debug logging
socket = IO.io(serverUrl,
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .enableLogging()  // Add this
    .build()
);
```

## 📄 License

This Flutter client is part of the Kitty Backend Socket.IO chat system project.

## 🤝 Contributing

1. Follow Flutter style guidelines
2. Add tests for new features
3. Update documentation
4. Test on both Android and iOS

---

**Built with ❤️ using Flutter and Socket.IO**
