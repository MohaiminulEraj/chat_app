import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../managers/group_chat_manager.dart';
import '../models/chat_models.dart';
import '../widgets/message_bubble.dart';
import '../widgets/typing_indicator.dart';
import '../widgets/message_input.dart';
import '../widgets/chat_app_bar.dart';

class GroupChatScreen extends StatefulWidget {
  final String groupId;
  final String groupName;

  const GroupChatScreen({
    Key? key,
    required this.groupId,
    required this.groupName,
  }) : super(key: key);

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen>
    with WidgetsBindingObserver {
  final GroupChatManager _chatManager = GroupChatManager();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _messageController = TextEditingController();

  bool _isLoadingMore = false;
  ChatMessage? _replyToMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeChat();
    _setupScrollController();
    _chatManager.addListener(_onChatStateChanged);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _chatManager.removeListener(_onChatStateChanged);
    _scrollController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    if (state == AppLifecycleState.resumed) {
      // Mark messages as read when app becomes active
      _markVisibleMessagesAsRead();
    } else if (state == AppLifecycleState.paused) {
      // Stop typing when app goes to background
      _chatManager.stopTyping(widget.groupId);
    }
  }

  void _initializeChat() async {
    try {
      if (!_chatManager.isConnected) {
        // You would get the auth token from your auth service
        const authToken = 'your-auth-token-here';
        await _chatManager.connect(authToken);
      }

      await _chatManager.joinGroup(widget.groupId);
      _markVisibleMessagesAsRead();
    } catch (e) {
      _showErrorSnackBar('Failed to initialize chat: $e');
    }
  }

  void _setupScrollController() {
    _scrollController.addListener(() {
      // Load more messages when scrolled to top
      if (_scrollController.position.pixels == _scrollController.position.maxScrollExtent) {
        _loadMoreMessages();
      }

      // Mark messages as read when scrolled
      if (_scrollController.position.pixels < _scrollController.position.maxScrollExtent * 0.1) {
        _markVisibleMessagesAsRead();
      }
    });
  }

  void _onChatStateChanged() {
    if (mounted) {
      setState(() {});

      // Auto-scroll to bottom when new message arrives
      final state = _chatManager.getGroupState(widget.groupId);
      if (state != null && state.messages.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollToBottom();
          }
        });
      }
    }
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        0.0,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _loadMoreMessages() async {
    if (_isLoadingMore) return;

    final state = _chatManager.getGroupState(widget.groupId);
    if (state == null || !state.hasMoreMessages) return;

    setState(() => _isLoadingMore = true);

    try {
      final currentPage = (state.messages.length / 50).ceil() + 1;
      await _chatManager.getMessageHistory(widget.groupId, page: currentPage);
    } catch (e) {
      _showErrorSnackBar('Failed to load more messages: $e');
    } finally {
      setState(() => _isLoadingMore = false);
    }
  }

  void _markVisibleMessagesAsRead() {
    final state = _chatManager.getGroupState(widget.groupId);
    if (state == null || state.messages.isEmpty) return;

    final unreadMessages = state.messages
        .where((msg) => !msg.readBy.contains(_chatManager._webSocketService.currentUserId))
        .map((msg) => msg.messageId)
        .toList();

    if (unreadMessages.isNotEmpty) {
      _chatManager.markMessagesAsRead(widget.groupId, unreadMessages);
    }
  }

  void _sendMessage() {
    final content = _messageController.text.trim();
    if (content.isEmpty) return;

    _chatManager.sendMessage(
      groupId: widget.groupId,
      content: content,
      replyToMessageId: _replyToMessage?.messageId,
    );

    _messageController.clear();
    _setReplyToMessage(null);
    _chatManager.stopTyping(widget.groupId);
  }

  void _onMessageTextChanged(String text) {
    if (text.isNotEmpty) {
      _chatManager.startTyping(widget.groupId);
    } else {
      _chatManager.stopTyping(widget.groupId);
    }
  }

  void _setReplyToMessage(ChatMessage? message) {
    setState(() {
      _replyToMessage = message;
    });
  }

  void _onMessageLongPress(ChatMessage message) {
    showModalBottomSheet(
      context: context,
      builder: (context) => _buildMessageOptionsSheet(message),
    );
  }

  Widget _buildMessageOptionsSheet(ChatMessage message) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            leading: const Icon(Icons.reply),
            title: const Text('Reply'),
            onTap: () {
              Navigator.pop(context);
              _setReplyToMessage(message);
            },
          ),
          ListTile(
            leading: const Icon(Icons.copy),
            title: const Text('Copy'),
            onTap: () {
              Navigator.pop(context);
              Clipboard.setData(ClipboardData(text: message.content));
              _showSuccessSnackBar('Message copied to clipboard');
            },
          ),
          if (message.canEdit) ...[
            ListTile(
              leading: const Icon(Icons.edit),
              title: const Text('Edit'),
              onTap: () {
                Navigator.pop(context);
                _showEditMessageDialog(message);
              },
            ),
          ],
          if (message.canDelete) ...[
            ListTile(
              leading: const Icon(Icons.delete, color: Colors.red),
              title: const Text('Delete', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                _showDeleteMessageDialog(message);
              },
            ),
          ],
        ],
      ),
    );
  }

  void _showEditMessageDialog(ChatMessage message) {
    final controller = TextEditingController(text: message.content);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Message'),
        content: TextField(
          controller: controller,
          maxLines: null,
          decoration: const InputDecoration(
            hintText: 'Enter new message...',
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              final newContent = controller.text.trim();
              if (newContent.isNotEmpty && newContent != message.content) {
                _chatManager.editMessage(widget.groupId, message.messageId, newContent);
              }
              Navigator.pop(context);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showDeleteMessageDialog(ChatMessage message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Message'),
        content: const Text('Are you sure you want to delete this message?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              _chatManager.deleteMessage(widget.groupId, message.messageId);
              Navigator.pop(context);
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = _chatManager.getGroupState(widget.groupId);

    return Scaffold(
      appBar: ChatAppBar(
        groupName: widget.groupName,
        isConnected: _chatManager.isConnected,
        typingUsers: state?.typingUsers ?? [],
        onBackPressed: () {
          _chatManager.leaveGroup(widget.groupId);
          Navigator.pop(context);
        },
      ),
      body: Column(
        children: [
          // Error banner
          if (state?.error != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: Colors.red[100],
              child: Row(
                children: [
                  const Icon(Icons.error, color: Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state!.error!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _chatManager.clearError(widget.groupId),
                    icon: const Icon(Icons.close, color: Colors.red),
                  ),
                ],
              ),
            ),

          // Messages list
          Expanded(
            child: state == null || state.isLoading && state.messages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: state.messages.length +
                              (state.typingUsers.isNotEmpty ? 1 : 0) +
                              (_isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      // Loading indicator at top
                      if (_isLoadingMore && index == state.messages.length + (state.typingUsers.isNotEmpty ? 1 : 0)) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      // Typing indicator
                      if (state.typingUsers.isNotEmpty && index == 0) {
                        return TypingIndicator(
                          typingUsers: state.typingUsers,
                        );
                      }

                      // Message
                      final messageIndex = state.typingUsers.isNotEmpty
                          ? index - 1
                          : index;
                      final message = state.messages[state.messages.length - 1 - messageIndex];

                      return MessageBubble(
                        message: message,
                        isFromCurrentUser: message.isFromCurrentUser,
                        onLongPress: () => _onMessageLongPress(message),
                        onReplyTap: () => _setReplyToMessage(message),
                      );
                    },
                  ),
          ),

          // Message input
          MessageInput(
            controller: _messageController,
            replyToMessage: _replyToMessage,
            onSendPressed: _sendMessage,
            onTextChanged: _onMessageTextChanged,
            onCancelReply: () => _setReplyToMessage(null),
          ),
        ],
      ),
    );
  }
}
