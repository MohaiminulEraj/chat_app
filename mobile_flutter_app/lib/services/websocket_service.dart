import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:logger/logger.dart';
import '../config/app_config.dart';

class WebSocketService {
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  IO.Socket? _socket;
  final Logger _logger = Logger();
  String? _authToken;
  String? _currentUserId;
  String? _currentUserName;

  // Stream controllers for real-time events
  final Map<String, Function(dynamic)> _eventHandlers = {};

  bool get isConnected => _socket?.connected ?? false;
  String? get currentUserId => _currentUserId;

  /// Initialize WebSocket connection
  Future<void> connect(String authToken) async {
    if (_socket?.connected == true) {
      _logger.i('WebSocket already connected');
      return;
    }

    _authToken = authToken;

    try {
      _socket = IO.io(
        AppConfig.currentWsUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(5)
            .setReconnectionDelay(2000)
            .build(),
      );

      _setupEventHandlers();

      _socket!.connect();
      _logger.i('WebSocket connecting to: ${AppConfig.currentWsUrl}');

    } catch (e) {
      _logger.e('WebSocket connection error: $e');
      throw Exception('Failed to connect to WebSocket: $e');
    }
  }

  /// Setup all WebSocket event handlers
  void _setupEventHandlers() {
    if (_socket == null) return;

    // Connection events
    _socket!.onConnect((_) {
      _logger.i('✅ WebSocket connected');
      _authenticate();
      _notifyHandler('connected', true);
    });

    _socket!.onDisconnect((_) {
      _logger.w('❌ WebSocket disconnected');
      _notifyHandler('disconnected', true);
    });

    _socket!.onConnectError((error) {
      _logger.e('❌ WebSocket connection error: $error');
      _notifyHandler('connection_error', error);
    });

    _socket!.onError((error) {
      _logger.e('❌ WebSocket error: $error');
      _notifyHandler('error', error);
    });

    // Authentication events
    _socket!.on(AppConfig.authenticatedEvent, (data) {
      _logger.i('🔐 Authenticated: $data');
      _currentUserId = data['userId'];
      _currentUserName = data['userName'];
      _notifyHandler('authenticated', data);
    });

    _socket!.on(AppConfig.authenticationErrorEvent, (data) {
      _logger.e('🔐 Authentication failed: $data');
      _notifyHandler('authentication_error', data);
    });

    // Group events
    _socket!.on(AppConfig.joinedGroupEvent, (data) {
      _logger.i('👥 Joined group: ${data['groupId']}');
      _notifyHandler('joined_group', data);
    });

    _socket!.on(AppConfig.leftGroupEvent, (data) {
      _logger.i('👥 Left group: ${data['groupId']}');
      _notifyHandler('left_group', data);
    });

    _socket!.on(AppConfig.userJoinedGroupEvent, (data) {
      _logger.i('👤 User joined group: ${data['userName']} in ${data['groupId']}');
      _notifyHandler('user_joined_group', data);
    });

    _socket!.on(AppConfig.userLeftGroupEvent, (data) {
      _logger.i('👤 User left group: ${data['userName']} from ${data['groupId']}');
      _notifyHandler('user_left_group', data);
    });

    // Message events
    _socket!.on(AppConfig.groupMessageReceivedEvent, (data) {
      _logger.i('💬 Message received in group ${data['groupId']}: ${data['content']}');
      _notifyHandler('message_received', data);
    });

    _socket!.on(AppConfig.groupMessageHistoryEvent, (data) {
      _logger.i('📜 Message history received for group ${data['groupId']}: ${data['messages']?.length} messages');
      _notifyHandler('message_history', data);
    });

    _socket!.on(AppConfig.messagesMarkedAsReadEvent, (data) {
      _logger.i('✅ Messages marked as read in group ${data['groupId']}');
      _notifyHandler('messages_marked_read', data);
    });

    _socket!.on(AppConfig.groupMessageDeletedEvent, (data) {
      _logger.i('🗑️ Message deleted in group ${data['groupId']}: ${data['messageId']}');
      _notifyHandler('message_deleted', data);
    });

    _socket!.on(AppConfig.groupMessageEditedEvent, (data) {
      _logger.i('✏️ Message edited in group ${data['groupId']}: ${data['messageId']}');
      _notifyHandler('message_edited', data);
    });

    // Typing events
    _socket!.on(AppConfig.userTypingInGroupEvent, (data) {
      _logger.d('⌨️ ${data['userName']} is ${data['isTyping'] ? 'typing' : 'stopped typing'} in group ${data['groupId']}');
      _notifyHandler('user_typing', data);
    });

    // Member events
    _socket!.on(AppConfig.groupMembersListEvent, (data) {
      _logger.i('👥 Group members list received for ${data['groupId']}: ${data['members']?.length} members');
      _notifyHandler('group_members', data);
    });

    // General error handling
    _socket!.on(AppConfig.errorEvent, (data) {
      _logger.e('❌ Server error: $data');
      _notifyHandler('server_error', data);
    });
  }

  /// Authenticate with the server
  void _authenticate() {
    if (_authToken != null && _socket?.connected == true) {
      _socket!.emit(AppConfig.authenticateEvent, {'token': _authToken});
    }
  }

  /// Join a group chat
  Future<void> joinGroup(String groupId) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    _logger.i('🔗 Joining group: $groupId');
    _socket!.emit(AppConfig.joinGroupEvent, {'groupId': groupId});
  }

  /// Leave a group chat
  Future<void> leaveGroup(String groupId) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    _logger.i('🔗 Leaving group: $groupId');
    _socket!.emit(AppConfig.leaveGroupEvent, {'groupId': groupId});
  }

  /// Send a message to a group
  Future<void> sendMessage({
    required String groupId,
    required String content,
    String messageType = 'text',
    String? replyToMessageId,
    Map<String, dynamic>? metadata,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final messageData = {
      'groupId': groupId,
      'content': content,
      'messageType': messageType,
      'metadata': metadata ?? {},
      if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
    };

    _logger.i('📤 Sending message to group $groupId: $content');
    _socket!.emit(AppConfig.sendGroupMessageEvent, messageData);
  }

  /// Get message history for a group
  Future<void> getMessageHistory({
    required String groupId,
    int page = 1,
    int limit = 50,
    String? before,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final data = {
      'groupId': groupId,
      'page': page,
      'limit': limit,
      if (before != null) 'before': before,
    };

    _logger.i('📜 Requesting message history for group $groupId (page: $page, limit: $limit)');
    _socket!.emit(AppConfig.getGroupMessageHistoryEvent, data);
  }

  /// Mark messages as read
  Future<void> markMessagesAsRead({
    required String groupId,
    required List<String> messageIds,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final data = {
      'groupId': groupId,
      'messageIds': messageIds,
    };

    _logger.i('✅ Marking ${messageIds.length} messages as read in group $groupId');
    _socket!.emit(AppConfig.markGroupMessageAsReadEvent, data);
  }

  /// Send typing indicator
  Future<void> sendTypingIndicator({
    required String groupId,
    required bool isTyping,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final data = {
      'groupId': groupId,
      'isTyping': isTyping,
    };

    _socket!.emit(AppConfig.groupTypingEvent, data);
  }

  /// Delete a message
  Future<void> deleteMessage({
    required String groupId,
    required String messageId,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final data = {
      'groupId': groupId,
      'messageId': messageId,
    };

    _logger.i('🗑️ Deleting message $messageId from group $groupId');
    _socket!.emit(AppConfig.deleteGroupMessageEvent, data);
  }

  /// Edit a message
  Future<void> editMessage({
    required String groupId,
    required String messageId,
    required String newContent,
  }) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    final data = {
      'groupId': groupId,
      'messageId': messageId,
      'newContent': newContent,
    };

    _logger.i('✏️ Editing message $messageId in group $groupId');
    _socket!.emit(AppConfig.editGroupMessageEvent, data);
  }

  /// Get group members
  Future<void> getGroupMembers(String groupId) async {
    if (!isConnected) {
      throw Exception('WebSocket not connected');
    }

    _logger.i('👥 Requesting group members for $groupId');
    _socket!.emit(AppConfig.getGroupMembersEvent, {'groupId': groupId});
  }

  /// Register event handler
  void onEvent(String event, Function(dynamic) handler) {
    _eventHandlers[event] = handler;
  }

  /// Remove event handler
  void removeEventHandler(String event) {
    _eventHandlers.remove(event);
  }

  /// Notify registered handlers
  void _notifyHandler(String event, dynamic data) {
    final handler = _eventHandlers[event];
    if (handler != null) {
      try {
        handler(data);
      } catch (e) {
        _logger.e('Error in event handler for $event: $e');
      }
    }
  }

  /// Disconnect WebSocket
  void disconnect() {
    if (_socket?.connected == true) {
      _logger.i('🔌 Disconnecting WebSocket');
      _socket!.disconnect();
    }
    _socket = null;
    _authToken = null;
    _currentUserId = null;
    _currentUserName = null;
    _eventHandlers.clear();
  }

  /// Reconnect WebSocket
  Future<void> reconnect() async {
    if (_authToken != null) {
      disconnect();
      await connect(_authToken!);
    }
  }

  /// Check connection status
  bool checkConnection() {
    return _socket?.connected ?? false;
  }
}
