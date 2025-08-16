import 'package:flutter/material.dart';
import 'config/app_config.dart';
import 'services/websocket_service.dart';
import 'managers/group_chat_manager.dart';
import 'screens/group_chat_screen.dart';

// Main entry point for the Flutter app demo
void main() {
  runApp(const GroupChatDemoApp());
}

class GroupChatDemoApp extends StatelessWidget {
  const GroupChatDemoApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kitty Group Chat Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        primaryColor: Colors.blue[600],
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.blue[600],
          foregroundColor: Colors.white,
          elevation: 1,
        ),
        floatingActionButtonTheme: FloatingActionButtonThemeData(
          backgroundColor: Colors.blue[600],
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide(color: Colors.blue[600]!),
          ),
        ),
      ),
      home: const GroupChatDemo(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class GroupChatDemo extends StatefulWidget {
  const GroupChatDemo({Key? key}) : super(key: key);

  @override
  State<GroupChatDemo> createState() => _GroupChatDemoState();
}

class _GroupChatDemoState extends State<GroupChatDemo> {
  late WebSocketService _webSocketService;
  late GroupChatManager _chatManager;
  bool _isInitialized = false;
  String? _error;

  // Demo configuration - you can modify these for testing
  final String _currentUserId = AppConfig.testUser1Id;
  final String _currentUserEmail = AppConfig.testUser1Email;
  final String _currentUserName = 'Eraj Khan';
  final String _groupId = '675c123456789abcdef12345'; // Replace with actual group ID
  final String _groupName = 'Flutter Demo Group';

  @override
  void initState() {
    super.initState();
    _initializeChat();
  }

  Future<void> _initializeChat() async {
    try {
      // Initialize WebSocket service
      _webSocketService = WebSocketService();

      // Initialize chat manager
      _chatManager = GroupChatManager(
        webSocketService: _webSocketService,
        currentUserId: _currentUserId,
      );

      // Connect to WebSocket
      await _webSocketService.connect();

      // Authenticate user
      await _webSocketService.authenticate(
        userId: _currentUserId,
        email: _currentUserEmail,
        userName: _currentUserName,
      );

      // Join the group
      await _webSocketService.joinGroup(_groupId);

      setState(() {
        _isInitialized = true;
      });

      // Load message history
      await _chatManager.loadMessages(_groupId);

    } catch (e) {
      setState(() {
        _error = 'Failed to initialize chat: $e';
      });
    }
  }

  @override
  void dispose() {
    _webSocketService.disconnect();
    _chatManager.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Group Chat Demo'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red[400],
              ),
              const SizedBox(height: 16),
              Text(
                'Initialization Error',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _error = null;
                    _isInitialized = false;
                  });
                  _initializeChat();
                },
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (!_isInitialized) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Group Chat Demo'),
        ),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Connecting to chat...'),
            ],
          ),
        ),
      );
    }

    return GroupChatScreen(
      groupId: _groupId,
      groupName: _groupName,
      chatManager: _chatManager,
    );
  }
}

// Alternative direct chat screen launcher for integration
class DirectChatLauncher {
  static void launchGroupChat(
    BuildContext context, {
    required String groupId,
    required String groupName,
    required String userId,
    required String userEmail,
    required String userName,
  }) async {
    try {
      // Show loading dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Dialog(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('Connecting to group chat...'),
              ],
            ),
          ),
        ),
      );

      // Initialize services
      final webSocketService = WebSocketService();
      final chatManager = GroupChatManager(
        webSocketService: webSocketService,
        currentUserId: userId,
      );

      // Connect and authenticate
      await webSocketService.connect();
      await webSocketService.authenticate(
        userId: userId,
        email: userEmail,
        userName: userName,
      );
      await webSocketService.joinGroup(groupId);

      // Close loading dialog
      Navigator.of(context).pop();

      // Navigate to chat screen
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => GroupChatScreen(
            groupId: groupId,
            groupName: groupName,
            chatManager: chatManager,
          ),
        ),
      );

      // Load message history
      await chatManager.loadMessages(groupId);

    } catch (e) {
      // Close loading dialog if open
      Navigator.of(context).pop();

      // Show error
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to connect: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }
}
