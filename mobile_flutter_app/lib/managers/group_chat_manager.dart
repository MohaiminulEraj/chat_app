import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/websocket_service.dart';
import '../models/chat_models.dart';

class GroupChatManager extends ChangeNotifier {
  static final GroupChatManager _instance = GroupChatManager._internal();
  factory GroupChatManager() => _instance;
  GroupChatManager._internal() {
    _setupEventHandlers();
  }

  final WebSocketService _webSocketService = WebSocketService();
  final Map<String, GroupChatState> _groupStates = {};
  final Map<String, Timer> _typingTimers = {};

  String? _currentGroupId;
  bool _isConnected = false;

  // Getters
  bool get isConnected => _isConnected;
  String? get currentGroupId => _currentGroupId;
  GroupChatState? get currentGroupState => _currentGroupId != null
      ? _groupStates[_currentGroupId]
      : null;

  GroupChatState? getGroupState(String groupId) => _groupStates[groupId];
  List<ChatMessage> getMessages(String groupId) =>
      _groupStates[groupId]?.messages ?? [];
  List<TypingUser> getTypingUsers(String groupId) =>
      _groupStates[groupId]?.typingUsers ?? [];

  /// Initialize connection with auth token
  Future<void> connect(String authToken) async {
    try {
      await _webSocketService.connect(authToken);
    } catch (e) {
      debugPrint('❌ Failed to connect: $e');
      rethrow;
    }
  }

  /// Setup WebSocket event handlers
  void _setupEventHandlers() {
    // Connection events
    _webSocketService.onEvent('connected', (data) {
      _isConnected = true;
      debugPrint('✅ Connected to WebSocket');
      notifyListeners();
    });

    _webSocketService.onEvent('disconnected', (data) {
      _isConnected = false;
      debugPrint('❌ Disconnected from WebSocket');
      notifyListeners();
    });

    _webSocketService.onEvent('authenticated', (data) {
      debugPrint('🔐 Authenticated as: ${data['userName']}');
      notifyListeners();
    });

    // Group events
    _webSocketService.onEvent('joined_group', (data) {
      final groupId = data['groupId'];
      debugPrint('👥 Joined group: $groupId');
      _initializeGroupState(groupId);
      notifyListeners();
    });

    _webSocketService.onEvent('user_joined_group', (data) {
      final groupId = data['groupId'];
      final userName = data['userName'];
      debugPrint('👤 $userName joined group $groupId');
      // You can add a system message here if needed
      notifyListeners();
    });

    _webSocketService.onEvent('user_left_group', (data) {
      final groupId = data['groupId'];
      final userName = data['userName'];
      debugPrint('👤 $userName left group $groupId');
      // You can add a system message here if needed
      notifyListeners();
    });

    // Message events
    _webSocketService.onEvent('message_received', (data) {
      _handleMessageReceived(data);
    });

    _webSocketService.onEvent('message_history', (data) {
      _handleMessageHistory(data);
    });

    _webSocketService.onEvent('message_deleted', (data) {
      _handleMessageDeleted(data);
    });

    _webSocketService.onEvent('message_edited', (data) {
      _handleMessageEdited(data);
    });

    _webSocketService.onEvent('messages_marked_read', (data) {
      _handleMessagesMarkedRead(data);
    });

    // Typing events
    _webSocketService.onEvent('user_typing', (data) {
      _handleUserTyping(data);
    });

    // Error events
    _webSocketService.onEvent('connection_error', (error) {
      debugPrint('❌ Connection error: $error');
      _setGroupError(_currentGroupId, 'Connection error: $error');
    });

    _webSocketService.onEvent('server_error', (error) {
      debugPrint('❌ Server error: $error');
      _setGroupError(_currentGroupId, 'Server error: ${error['message']}');
    });
  }

  /// Join a group chat
  Future<void> joinGroup(String groupId) async {
    try {
      _currentGroupId = groupId;
      _initializeGroupState(groupId);
      await _webSocketService.joinGroup(groupId);

      // Load message history
      await getMessageHistory(groupId);
    } catch (e) {
      _setGroupError(groupId, 'Failed to join group: $e');
      rethrow;
    }
  }

  /// Leave current group
  Future<void> leaveGroup(String groupId) async {
    try {
      await _webSocketService.leaveGroup(groupId);
      _groupStates.remove(groupId);

      if (_currentGroupId == groupId) {
        _currentGroupId = null;
      }

      notifyListeners();
    } catch (e) {
      _setGroupError(groupId, 'Failed to leave group: $e');
      rethrow;
    }
  }

  /// Send a text message
  Future<void> sendMessage({
    required String groupId,
    required String content,
    String? replyToMessageId,
  }) async {
    if (content.trim().isEmpty) return;

    try {
      await _webSocketService.sendMessage(
        groupId: groupId,
        content: content.trim(),
        messageType: 'text',
        replyToMessageId: replyToMessageId,
      );
    } catch (e) {
      _setGroupError(groupId, 'Failed to send message: $e');
      rethrow;
    }
  }

  /// Send typing indicator
  Future<void> startTyping(String groupId) async {
    try {
      await _webSocketService.sendTypingIndicator(
        groupId: groupId,
        isTyping: true,
      );

      // Auto-stop typing after 3 seconds
      _typingTimers[groupId]?.cancel();
      _typingTimers[groupId] = Timer(const Duration(seconds: 3), () {
        stopTyping(groupId);
      });
    } catch (e) {
      debugPrint('Failed to send typing indicator: $e');
    }
  }

  /// Stop typing indicator
  Future<void> stopTyping(String groupId) async {
    try {
      _typingTimers[groupId]?.cancel();
      _typingTimers.remove(groupId);

      await _webSocketService.sendTypingIndicator(
        groupId: groupId,
        isTyping: false,
      );
    } catch (e) {
      debugPrint('Failed to stop typing indicator: $e');
    }
  }

  /// Get message history
  Future<void> getMessageHistory(String groupId, {int page = 1}) async {
    final state = _groupStates[groupId];
    if (state == null) return;

    _updateGroupState(groupId, state.copyWith(isLoading: true));

    try {
      await _webSocketService.getMessageHistory(
        groupId: groupId,
        page: page,
        limit: 50,
      );
    } catch (e) {
      _setGroupError(groupId, 'Failed to load messages: $e');
    }
  }

  /// Mark messages as read
  Future<void> markMessagesAsRead(String groupId, List<String> messageIds) async {
    try {
      await _webSocketService.markMessagesAsRead(
        groupId: groupId,
        messageIds: messageIds,
      );
    } catch (e) {
      debugPrint('Failed to mark messages as read: $e');
    }
  }

  /// Delete a message
  Future<void> deleteMessage(String groupId, String messageId) async {
    try {
      await _webSocketService.deleteMessage(
        groupId: groupId,
        messageId: messageId,
      );
    } catch (e) {
      _setGroupError(groupId, 'Failed to delete message: $e');
      rethrow;
    }
  }

  /// Edit a message
  Future<void> editMessage(String groupId, String messageId, String newContent) async {
    try {
      await _webSocketService.editMessage(
        groupId: groupId,
        messageId: messageId,
        newContent: newContent,
      );
    } catch (e) {
      _setGroupError(groupId, 'Failed to edit message: $e');
      rethrow;
    }
  }

  /// Handle received message
  void _handleMessageReceived(Map<String, dynamic> data) {
    final message = ChatMessage.fromJson(data);
    final groupId = message.groupId;

    final state = _groupStates[groupId];
    if (state == null) {
      _initializeGroupState(groupId);
    }

    final currentState = _groupStates[groupId]!;
    final updatedMessages = List<ChatMessage>.from(currentState.messages);

    // Add new message
    updatedMessages.add(message);

    // Sort messages by timestamp
    updatedMessages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    _updateGroupState(groupId, currentState.copyWith(
      messages: updatedMessages,
      unreadCount: _currentGroupId == groupId ? 0 : currentState.unreadCount + 1,
    ));

    debugPrint('💬 Message received in $groupId: ${message.content}');
  }

  /// Handle message history
  void _handleMessageHistory(Map<String, dynamic> data) {
    final groupId = data['groupId'];
    final messagesData = data['messages'] as List<dynamic>;

    final messages = messagesData
        .map((msgData) => ChatMessage.fromJson(msgData))
        .toList();

    final state = _groupStates[groupId];
    if (state == null) return;

    final existingMessages = List<ChatMessage>.from(state.messages);

    // Add new messages (avoiding duplicates)
    for (final message in messages) {
      if (!existingMessages.any((m) => m.messageId == message.messageId)) {
        existingMessages.add(message);
      }
    }

    // Sort messages by timestamp
    existingMessages.sort((a, b) => a.timestamp.compareTo(b.timestamp));

    _updateGroupState(groupId, state.copyWith(
      messages: existingMessages,
      isLoading: false,
      hasMoreMessages: messages.length >= 50,
    ));

    debugPrint('📜 Loaded ${messages.length} messages for group $groupId');
  }

  /// Handle message deleted
  void _handleMessageDeleted(Map<String, dynamic> data) {
    final groupId = data['groupId'];
    final messageId = data['messageId'];

    final state = _groupStates[groupId];
    if (state == null) return;

    final updatedMessages = state.messages
        .where((msg) => msg.messageId != messageId)
        .toList();

    _updateGroupState(groupId, state.copyWith(messages: updatedMessages));
    debugPrint('🗑️ Message deleted: $messageId');
  }

  /// Handle message edited
  void _handleMessageEdited(Map<String, dynamic> data) {
    final message = ChatMessage.fromJson(data);
    final groupId = message.groupId;

    final state = _groupStates[groupId];
    if (state == null) return;

    final updatedMessages = state.messages.map((msg) {
      if (msg.messageId == message.messageId) {
        return message;
      }
      return msg;
    }).toList();

    _updateGroupState(groupId, state.copyWith(messages: updatedMessages));
    debugPrint('✏️ Message edited: ${message.messageId}');
  }

  /// Handle messages marked as read
  void _handleMessagesMarkedRead(Map<String, dynamic> data) {
    final groupId = data['groupId'];
    final messageIds = List<String>.from(data['messageIds'] ?? []);
    final userId = data['userId'];

    final state = _groupStates[groupId];
    if (state == null) return;

    final updatedMessages = state.messages.map((msg) {
      if (messageIds.contains(msg.messageId)) {
        final updatedReadBy = List<String>.from(msg.readBy);
        if (!updatedReadBy.contains(userId)) {
          updatedReadBy.add(userId);
        }
        return msg.copyWith(readBy: updatedReadBy);
      }
      return msg;
    }).toList();

    _updateGroupState(groupId, state.copyWith(messages: updatedMessages));
  }

  /// Handle user typing
  void _handleUserTyping(Map<String, dynamic> data) {
    final typingUser = TypingUser.fromJson(data);
    final groupId = typingUser.groupId;
    final isTyping = data['isTyping'] ?? false;

    final state = _groupStates[groupId];
    if (state == null) return;

    final updatedTypingUsers = List<TypingUser>.from(state.typingUsers);

    // Remove existing typing user
    updatedTypingUsers.removeWhere((user) => user.userId == typingUser.userId);

    // Add if typing
    if (isTyping) {
      updatedTypingUsers.add(typingUser);
    }

    _updateGroupState(groupId, state.copyWith(typingUsers: updatedTypingUsers));
  }

  /// Initialize group state
  void _initializeGroupState(String groupId) {
    if (!_groupStates.containsKey(groupId)) {
      _groupStates[groupId] = GroupChatState(groupId: groupId);
      notifyListeners();
    }
  }

  /// Update group state
  void _updateGroupState(String groupId, GroupChatState newState) {
    _groupStates[groupId] = newState;
    notifyListeners();
  }

  /// Set error for group
  void _setGroupError(String? groupId, String error) {
    if (groupId != null) {
      final state = _groupStates[groupId];
      if (state != null) {
        _updateGroupState(groupId, state.copyWith(
          error: error,
          isLoading: false,
        ));
      }
    }
  }

  /// Clear error for group
  void clearError(String groupId) {
    final state = _groupStates[groupId];
    if (state != null) {
      _updateGroupState(groupId, state.clearError());
    }
  }

  /// Disconnect and cleanup
  void disconnect() {
    _webSocketService.disconnect();
    _groupStates.clear();
    _currentGroupId = null;
    _isConnected = false;

    // Cancel all typing timers
    for (final timer in _typingTimers.values) {
      timer.cancel();
    }
    _typingTimers.clear();

    notifyListeners();
  }

  @override
  void dispose() {
    disconnect();
    super.dispose();
  }
}
