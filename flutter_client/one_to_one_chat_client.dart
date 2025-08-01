import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

/// Flutter Socket.IO One-to-One Chat Client
///
/// This file implements real-time one-to-one chat functionality using Socket.IO
/// Based on the backend unified Socket.IO system
///
/// Features:
/// - JWT Authentication
/// - Real-time messaging
/// - Typing indicators
/// - Voice/Video calls
/// - Read receipts
/// - User status updates
/// - Friendship validation
///
/// Dependencies:
/// Add to pubspec.yaml:
/// ```yaml
/// dependencies:
///   socket_io_client: ^2.0.3+1
///   http: ^1.1.0
/// ```

class OneToOneChatClient extends StatefulWidget {
  final String serverUrl;
  final String jwtToken;
  final String currentUserId;

  const OneToOneChatClient({
    Key? key,
    required this.serverUrl,
    required this.jwtToken,
    required this.currentUserId,
  }) : super(key: key);

  @override
  State<OneToOneChatClient> createState() => _OneToOneChatClientState();
}

class _OneToOneChatClientState extends State<OneToOneChatClient> {
  // Socket.IO instance
  late IO.Socket socket;

  // Connection state
  bool isConnected = false;
  bool isAuthenticated = false;

  // Chat state
  List<ChatMessage> messages = [];
  List<Friend> friends = [];
  String? selectedFriendId;
  String? currentConversationId;
  String? activeCallId;

  // UI Controllers
  final TextEditingController messageController = TextEditingController();
  final ScrollController scrollController = ScrollController();

  // Typing state
  bool isTyping = false;
  String? friendTyping;
  Timer? typingTimer;

  // Status
  UserStatus currentStatus = UserStatus.online;
  Map<String, UserStatus> friendStatuses = {};

  @override
  void initState() {
    super.initState();
    _initializeSocket();
    _loadFriends();
  }

  @override
  void dispose() {
    socket.disconnect();
    messageController.dispose();
    scrollController.dispose();
    typingTimer?.cancel();
    super.dispose();
  }

  /// Initialize Socket.IO connection
  void _initializeSocket() {
    socket = IO.io(widget.serverUrl,
      IO.OptionBuilder()
        .setTransports(['websocket', 'polling'])
        .setTimeout(20000)
        .enableReconnection()
        .setReconnectionAttempts(5)
        .setReconnectionDelay(1000)
        .build()
    );

    _setupSocketListeners();
    socket.connect();
  }

  /// Setup all Socket.IO event listeners
  void _setupSocketListeners() {
    // Connection events
    socket.onConnect((_) {
      print('🔌 Connected to server');
      setState(() {
        isConnected = true;
      });
      _authenticateSocket();
    });

    socket.onDisconnect((_) {
      print('🔌 Disconnected from server');
      setState(() {
        isConnected = false;
        isAuthenticated = false;
      });
    });

    socket.onConnectError((data) {
      print('❌ Connection error: $data');
      _showSnackBar('Connection failed: $data', isError: true);
    });

    // Authentication events
    socket.on('authenticated', (data) {
      print('✅ Authentication successful');
      setState(() {
        isAuthenticated = true;
      });
      _showSnackBar('Connected and authenticated successfully');
    });

    socket.on('authenticationError', (data) {
      print('❌ Authentication error: ${data['message']}');
      setState(() {
        isAuthenticated = false;
      });
      _showSnackBar('Authentication failed: ${data['message']}', isError: true);
    });

    // Message events
    socket.on('newDirectMessage', (data) {
      _handleNewMessage(data);
    });

    socket.on('messagesRead', (data) {
      _handleMessagesRead(data);
    });

    // Typing events
    socket.on('userTyping', (data) {
      _handleTypingStatus(data);
    });

    // Call events
    socket.on('incomingCall', (data) {
      _handleIncomingCall(data);
    });

    socket.on('callResponse', (data) {
      _handleCallResponse(data);
    });

    socket.on('callEnded', (data) {
      _handleCallEnded(data);
    });

    // Status events
    socket.on('userStatusChanged', (data) {
      _handleStatusChanged(data);
    });

    // Error events
    socket.on('error', (data) {
      print('❌ Socket error: ${data['message']}');
      _showSnackBar('Error: ${data['message']}', isError: true);
    });
  }

  /// Authenticate socket connection with JWT token
  void _authenticateSocket() {
    socket.emitWithAck('authenticate', {
      'token': widget.jwtToken,
    }, ack: (data) {
      if (data['success'] == true) {
        print('✅ Socket authenticated for user: ${data['userId']}');
      } else {
        print('❌ Socket authentication failed: ${data['error']}');
      }
    });
  }

  /// Load friends list from server
  Future<void> _loadFriends() async {
    try {
      final response = await _makeHttpRequest('GET', '/friendship/friends');
      if (response.statusCode == 200) {
        final List<dynamic> friendsData = json.decode(response.body);
        setState(() {
          friends = friendsData.map((data) => Friend.fromJson(data)).toList();
        });
        print('📋 Loaded ${friends.length} friends');
      }
    } catch (e) {
      print('❌ Failed to load friends: $e');
      _showSnackBar('Failed to load friends', isError: true);
    }
  }

  /// Make authenticated HTTP request
  Future<HttpClientResponse> _makeHttpRequest(String method, String path) async {
    final client = HttpClient();
    final uri = Uri.parse('${widget.serverUrl}$path');

    late HttpClientRequest request;
    switch (method.toUpperCase()) {
      case 'GET':
        request = await client.getUrl(uri);
        break;
      case 'POST':
        request = await client.postUrl(uri);
        break;
      default:
        throw Exception('Unsupported HTTP method: $method');
    }

    request.headers.add('Authorization', 'Bearer ${widget.jwtToken}');
    request.headers.add('Content-Type', 'application/json');

    return await request.close();
  }

  /// Handle new incoming message
  void _handleNewMessage(dynamic data) {
    final message = ChatMessage.fromSocketData(data);
    setState(() {
      messages.add(message);
      currentConversationId = data['conversationId'];
    });

    // Auto-scroll to bottom
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scrollController.hasClients) {
        scrollController.animateTo(
          scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });

    // Auto-mark as read after 1 second
    Timer(const Duration(seconds: 1), () {
      _markMessageAsRead(message.id);
    });

    print('📨 New message from ${message.senderName}: ${message.content}');
  }

  /// Handle messages read notification
  void _handleMessagesRead(dynamic data) {
    final readBy = data['readBy']['name'];
    print('✅ Messages read by $readBy');

    setState(() {
      for (var message in messages) {
        if (data['messageIds'].contains(message.id)) {
          message.isRead = true;
        }
      }
    });
  }

  /// Handle typing status from other user
  void _handleTypingStatus(dynamic data) {
    if (data['userId'] == selectedFriendId) {
      setState(() {
        if (data['isTyping'] == true) {
          friendTyping = data['userName'];
        } else {
          friendTyping = null;
        }
      });
    }
  }

  /// Handle incoming call
  void _handleIncomingCall(dynamic data) {
    final callerName = data['caller']['name'];
    final callType = data['callType'];
    final callId = data['callId'];
    final callerId = data['caller']['uuid'];

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text('Incoming $callType Call'),
        content: Text('$callerName is calling you'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _respondToCall(callId, 'decline', callerId);
            },
            child: const Text('Decline'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _respondToCall(callId, 'accept', callerId);
            },
            child: const Text('Accept'),
          ),
        ],
      ),
    );
  }

  /// Handle call response
  void _handleCallResponse(dynamic data) {
    final response = data['response'];
    final responderName = data['responder']['name'];

    if (response == 'accept') {
      setState(() {
        activeCallId = data['callId'];
      });
      _showSnackBar('Call accepted by $responderName');
    } else {
      _showSnackBar('Call declined by $responderName');
    }
  }

  /// Handle call ended
  void _handleCallEnded(dynamic data) {
    final endedBy = data['endedBy']['name'];
    setState(() {
      activeCallId = null;
    });
    _showSnackBar('Call ended by $endedBy');
  }

  /// Handle user status change
  void _handleStatusChanged(dynamic data) {
    final userId = data['userId'];
    final status = UserStatus.values.firstWhere(
      (s) => s.name == data['status'],
      orElse: () => UserStatus.offline,
    );

    setState(() {
      friendStatuses[userId] = status;
    });
  }

  /// Send a direct message
  void _sendMessage() {
    if (messageController.text.trim().isEmpty || selectedFriendId == null) return;

    final content = messageController.text.trim();
    messageController.clear();

    socket.emitWithAck('sendDirectMessage', {
      'recipientId': selectedFriendId,
      'type': 'text',
      'content': content,
    }, ack: (response) {
      if (response['success'] == true) {
        print('✅ Message sent successfully');

        // Add to local messages immediately for better UX
        final tempMessage = ChatMessage(
          id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
          content: content,
          type: MessageType.text,
          senderId: widget.currentUserId,
          senderName: 'You',
          timestamp: DateTime.now(),
          isOwn: true,
        );

        setState(() {
          messages.add(tempMessage);
          currentConversationId = response['conversationId'];
        });

        // Auto-scroll to bottom
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (scrollController.hasClients) {
            scrollController.animateTo(
              scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      } else {
        _showSnackBar('Failed to send message: ${response['error']}', isError: true);
      }
    });

    // Stop typing
    _stopTyping();
  }

  /// Start typing indicator
  void _startTyping() {
    if (currentConversationId == null || isTyping) return;

    setState(() {
      isTyping = true;
    });

    socket.emit('typing', {
      'conversationId': currentConversationId,
      'isTyping': true,
    });

    // Auto-stop typing after 3 seconds
    typingTimer?.cancel();
    typingTimer = Timer(const Duration(seconds: 3), _stopTyping);
  }

  /// Stop typing indicator
  void _stopTyping() {
    if (!isTyping || currentConversationId == null) return;

    setState(() {
      isTyping = false;
    });

    socket.emit('typing', {
      'conversationId': currentConversationId,
      'isTyping': false,
    });

    typingTimer?.cancel();
  }

  /// Mark message as read
  void _markMessageAsRead(String messageId) {
    if (currentConversationId == null) return;

    socket.emit('markMessagesAsRead', {
      'conversationId': currentConversationId,
      'messageIds': [messageId],
    });
  }

  /// Initiate a call
  void _initiateCall(CallType callType) {
    if (selectedFriendId == null) return;

    final callId = 'call_${DateTime.now().millisecondsSinceEpoch}_${DateTime.now().microsecond}';

    socket.emitWithAck('initiateCall', {
      'recipientId': selectedFriendId,
      'callType': callType.name,
      'callId': callId,
    }, ack: (response) {
      if (response['success'] == true) {
        setState(() {
          activeCallId = callId;
        });
        _showSnackBar('${callType.name.toUpperCase()} call initiated');
      } else {
        _showSnackBar('Failed to initiate call: ${response['error']}', isError: true);
      }
    });
  }

  /// Respond to incoming call
  void _respondToCall(String callId, String response, String callerId) {
    socket.emitWithAck('respondToCall', {
      'callId': callId,
      'response': response,
      'callerId': callerId,
    }, ack: (data) {
      if (data['success'] == true) {
        if (response == 'accept') {
          setState(() {
            activeCallId = callId;
          });
        }
      }
    });
  }

  /// End active call
  void _endCall() {
    if (activeCallId == null || selectedFriendId == null) return;

    socket.emitWithAck('endCall', {
      'callId': activeCallId,
      'participants': [widget.currentUserId, selectedFriendId],
    }, ack: (response) {
      if (response['success'] == true) {
        setState(() {
          activeCallId = null;
        });
        _showSnackBar('Call ended');
      }
    });
  }

  /// Update user status
  void _updateStatus(UserStatus status) {
    socket.emitWithAck('updateStatus', {
      'status': status.name,
    }, ack: (response) {
      if (response['success'] == true) {
        setState(() {
          currentStatus = status;
        });
        _showSnackBar('Status updated to ${status.name}');
      }
    });
  }

  /// Select a friend to chat with
  void _selectFriend(String friendId) {
    setState(() {
      selectedFriendId = friendId;
      messages.clear(); // Clear previous conversation
      currentConversationId = null;
      friendTyping = null;
    });

    // Load conversation history here if needed
    _loadConversationHistory(friendId);
  }

  /// Load conversation history (placeholder implementation)
  Future<void> _loadConversationHistory(String friendId) async {
    try {
      // This would typically load from your conversation endpoint
      final response = await _makeHttpRequest('GET', '/conversation/with/$friendId');
      if (response.statusCode == 200) {
        // Parse and load messages
        print('📋 Loaded conversation history with $friendId');
      }
    } catch (e) {
      print('❌ Failed to load conversation history: $e');
    }
  }

  /// Show snackbar message
  void _showSnackBar(String message, {bool isError = false}) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red : Colors.green,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('One-to-One Chat'),
        backgroundColor: Colors.blue,
        actions: [
          // Connection status indicator
          Container(
            margin: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Icon(
                  isConnected && isAuthenticated ? Icons.wifi : Icons.wifi_off,
                  color: isConnected && isAuthenticated ? Colors.green : Colors.red,
                ),
                const SizedBox(width: 4),
                Text(
                  isConnected && isAuthenticated ? 'Online' : 'Offline',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
          // Status dropdown
          PopupMenuButton<UserStatus>(
            icon: Icon(
              Icons.circle,
              color: _getStatusColor(currentStatus),
            ),
            onSelected: _updateStatus,
            itemBuilder: (context) => UserStatus.values.map((status) =>
              PopupMenuItem(
                value: status,
                child: Row(
                  children: [
                    Icon(Icons.circle, color: _getStatusColor(status), size: 16),
                    const SizedBox(width: 8),
                    Text(status.name.toUpperCase()),
                  ],
                ),
              ),
            ).toList(),
          ),
        ],
      ),
      body: Row(
        children: [
          // Friends sidebar
          Container(
            width: 300,
            decoration: const BoxDecoration(
              border: Border(right: BorderSide(color: Colors.grey)),
            ),
            child: Column(
              children: [
                // Friends header
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.grey[100],
                  child: Row(
                    children: [
                      const Icon(Icons.people),
                      const SizedBox(width: 8),
                      Text(
                        'Friends (${friends.length})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                // Friends list
                Expanded(
                  child: ListView.builder(
                    itemCount: friends.length,
                    itemBuilder: (context, index) {
                      final friend = friends[index];
                      final isSelected = selectedFriendId == friend.id;
                      final status = friendStatuses[friend.id] ?? UserStatus.offline;

                      return ListTile(
                        leading: Stack(
                          children: [
                            CircleAvatar(
                              backgroundImage: friend.profilePicture != null
                                  ? NetworkImage(friend.profilePicture!)
                                  : null,
                              child: friend.profilePicture == null
                                  ? Text(friend.name[0].toUpperCase())
                                  : null,
                            ),
                            Positioned(
                              bottom: 0,
                              right: 0,
                              child: Container(
                                width: 16,
                                height: 16,
                                decoration: BoxDecoration(
                                  color: _getStatusColor(status),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                              ),
                            ),
                          ],
                        ),
                        title: Text(friend.name),
                        subtitle: Text(status.name.toUpperCase()),
                        selected: isSelected,
                        selectedTileColor: Colors.blue[50],
                        onTap: () => _selectFriend(friend.id),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          // Chat area
          Expanded(
            child: selectedFriendId == null
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 64, color: Colors.grey),
                        SizedBox(height: 16),
                        Text(
                          'Select a friend to start chatting',
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                      ],
                    ),
                  )
                : Column(
                    children: [
                      // Chat header
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: const BoxDecoration(
                          border: Border(bottom: BorderSide(color: Colors.grey)),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundImage: _getSelectedFriend()?.profilePicture != null
                                  ? NetworkImage(_getSelectedFriend()!.profilePicture!)
                                  : null,
                              child: _getSelectedFriend()?.profilePicture == null
                                  ? Text(_getSelectedFriend()?.name[0].toUpperCase() ?? '?')
                                  : null,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _getSelectedFriend()?.name ?? 'Unknown',
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    friendTyping != null
                                        ? '$friendTyping is typing...'
                                        : (friendStatuses[selectedFriendId]?.name.toUpperCase() ?? 'OFFLINE'),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: friendTyping != null ? Colors.green : Colors.grey,
                                      fontStyle: friendTyping != null ? FontStyle.italic : FontStyle.normal,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            // Call buttons
                            if (activeCallId == null) ...[
                              IconButton(
                                icon: const Icon(Icons.call),
                                onPressed: () => _initiateCall(CallType.voice),
                                tooltip: 'Voice Call',
                              ),
                              IconButton(
                                icon: const Icon(Icons.videocam),
                                onPressed: () => _initiateCall(CallType.video),
                                tooltip: 'Video Call',
                              ),
                            ] else ...[
                              IconButton(
                                icon: const Icon(Icons.call_end, color: Colors.red),
                                onPressed: _endCall,
                                tooltip: 'End Call',
                              ),
                              const Text('📞 In Call', style: TextStyle(color: Colors.green)),
                            ],
                          ],
                        ),
                      ),
                      // Messages area
                      Expanded(
                        child: ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: messages.length,
                          itemBuilder: (context, index) {
                            final message = messages[index];
                            return _buildMessageBubble(message);
                          },
                        ),
                      ),
                      // Message input area
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: const BoxDecoration(
                          border: Border(top: BorderSide(color: Colors.grey)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: messageController,
                                decoration: const InputDecoration(
                                  hintText: 'Type a message...',
                                  border: OutlineInputBorder(),
                                ),
                                onChanged: (text) {
                                  if (text.isNotEmpty && !isTyping) {
                                    _startTyping();
                                  } else if (text.isEmpty && isTyping) {
                                    _stopTyping();
                                  }
                                },
                                onSubmitted: (_) => _sendMessage(),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.send),
                              onPressed: _sendMessage,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  /// Build message bubble widget
  Widget _buildMessageBubble(ChatMessage message) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: message.isOwn ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!message.isOwn) ...[
            CircleAvatar(
              radius: 16,
              child: Text(message.senderName[0].toUpperCase()),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: message.isOwn ? Colors.blue : Colors.grey[300],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!message.isOwn)
                    Text(
                      message.senderName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  Text(
                    message.content,
                    style: TextStyle(
                      color: message.isOwn ? Colors.white : Colors.black,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatTimestamp(message.timestamp),
                        style: TextStyle(
                          fontSize: 10,
                          color: message.isOwn ? Colors.white70 : Colors.grey[600],
                        ),
                      ),
                      if (message.isOwn) ...[
                        const SizedBox(width: 4),
                        Icon(
                          message.isRead ? Icons.done_all : Icons.done,
                          size: 12,
                          color: message.isRead ? Colors.green : Colors.white70,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
          if (message.isOwn) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              child: Text(message.senderName[0].toUpperCase()),
            ),
          ],
        ],
      ),
    );
  }

  /// Get selected friend object
  Friend? _getSelectedFriend() {
    return friends.firstWhere(
      (friend) => friend.id == selectedFriendId,
      orElse: () => Friend(id: '', name: 'Unknown', email: ''),
    );
  }

  /// Get status color
  Color _getStatusColor(UserStatus status) {
    switch (status) {
      case UserStatus.online:
        return Colors.green;
      case UserStatus.away:
        return Colors.orange;
      case UserStatus.busy:
        return Colors.red;
      case UserStatus.offline:
        return Colors.grey;
    }
  }

  /// Format timestamp for display
  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h';
    } else {
      return '${difference.inDays}d';
    }
  }
}

/// Chat message model
class ChatMessage {
  final String id;
  final String content;
  final MessageType type;
  final String senderId;
  final String senderName;
  final DateTime timestamp;
  final bool isOwn;
  bool isRead;

  ChatMessage({
    required this.id,
    required this.content,
    required this.type,
    required this.senderId,
    required this.senderName,
    required this.timestamp,
    required this.isOwn,
    this.isRead = false,
  });

  factory ChatMessage.fromSocketData(dynamic data) {
    final message = data['message'];
    return ChatMessage(
      id: message['id'],
      content: message['content'],
      type: MessageType.values.firstWhere(
        (t) => t.name == message['type'],
        orElse: () => MessageType.text,
      ),
      senderId: message['sender']['uuid'],
      senderName: message['sender']['name'],
      timestamp: DateTime.parse(message['timestamp']),
      isOwn: false, // Will be set based on current user
    );
  }
}

/// Friend model
class Friend {
  final String id;
  final String name;
  final String email;
  final String? profilePicture;

  Friend({
    required this.id,
    required this.name,
    required this.email,
    this.profilePicture,
  });

  factory Friend.fromJson(Map<String, dynamic> json) {
    return Friend(
      id: json['uuid'] ?? json['id'],
      name: json['name'],
      email: json['email'],
      profilePicture: json['profilePicture'],
    );
  }
}

/// Enums
enum MessageType { text, image, file, voice }
enum CallType { voice, video }
enum UserStatus { online, away, busy, offline }

/// Usage Example:
///
/// ```dart
/// void main() {
///   runApp(MaterialApp(
///     home: OneToOneChatClient(
///       serverUrl: 'http://localhost:3000',
///       jwtToken: 'your-jwt-token-here',
///       currentUserId: 'your-user-uuid-here',
///     ),
///   ));
/// }
/// ```
///
/// Dependencies in pubspec.yaml:
/// ```yaml
/// dependencies:
///   flutter:
///     sdk: flutter
///   socket_io_client: ^2.0.3+1
///   http: ^1.1.0
/// ```
