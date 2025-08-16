class ChatMessage {
  final String messageId;
  final String senderId;
  final String senderName;
  final String? senderAvatarUrl;
  final String groupId;
  final String content;
  final String messageType;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;
  final List<String> readBy;
  final List<String> deliveredTo;
  final String? replyToMessageId;
  final ChatMessage? replyToMessage;
  final bool isEdited;
  final DateTime? editedAt;
  final bool isDeleted;

  const ChatMessage({
    required this.messageId,
    required this.senderId,
    required this.senderName,
    this.senderAvatarUrl,
    required this.groupId,
    required this.content,
    required this.messageType,
    required this.timestamp,
    this.metadata = const {},
    this.readBy = const [],
    this.deliveredTo = const [],
    this.replyToMessageId,
    this.replyToMessage,
    this.isEdited = false,
    this.editedAt,
    this.isDeleted = false,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      messageId: json['messageId'] ?? '',
      senderId: json['senderId'] ?? '',
      senderName: json['senderName'] ?? '',
      senderAvatarUrl: json['senderAvatarUrl'],
      groupId: json['groupId'] ?? '',
      content: json['content'] ?? '',
      messageType: json['messageType'] ?? 'text',
      timestamp: DateTime.parse(json['timestamp'] ?? DateTime.now().toIso8601String()),
      metadata: Map<String, dynamic>.from(json['metadata'] ?? {}),
      readBy: List<String>.from(json['readBy'] ?? []),
      deliveredTo: List<String>.from(json['deliveredTo'] ?? []),
      replyToMessageId: json['replyToMessageId'],
      replyToMessage: json['replyToMessage'] != null
          ? ChatMessage.fromJson(json['replyToMessage'])
          : null,
      isEdited: json['isEdited'] ?? false,
      editedAt: json['editedAt'] != null
          ? DateTime.parse(json['editedAt'])
          : null,
      isDeleted: json['isDeleted'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'messageId': messageId,
      'senderId': senderId,
      'senderName': senderName,
      'senderAvatarUrl': senderAvatarUrl,
      'groupId': groupId,
      'content': content,
      'messageType': messageType,
      'timestamp': timestamp.toIso8601String(),
      'metadata': metadata,
      'readBy': readBy,
      'deliveredTo': deliveredTo,
      'replyToMessageId': replyToMessageId,
      'replyToMessage': replyToMessage?.toJson(),
      'isEdited': isEdited,
      'editedAt': editedAt?.toIso8601String(),
      'isDeleted': isDeleted,
    };
  }

  ChatMessage copyWith({
    String? messageId,
    String? senderId,
    String? senderName,
    String? senderAvatarUrl,
    String? groupId,
    String? content,
    String? messageType,
    DateTime? timestamp,
    Map<String, dynamic>? metadata,
    List<String>? readBy,
    List<String>? deliveredTo,
    String? replyToMessageId,
    ChatMessage? replyToMessage,
    bool? isEdited,
    DateTime? editedAt,
    bool? isDeleted,
  }) {
    return ChatMessage(
      messageId: messageId ?? this.messageId,
      senderId: senderId ?? this.senderId,
      senderName: senderName ?? this.senderName,
      senderAvatarUrl: senderAvatarUrl ?? this.senderAvatarUrl,
      groupId: groupId ?? this.groupId,
      content: content ?? this.content,
      messageType: messageType ?? this.messageType,
      timestamp: timestamp ?? this.timestamp,
      metadata: metadata ?? this.metadata,
      readBy: readBy ?? this.readBy,
      deliveredTo: deliveredTo ?? this.deliveredTo,
      replyToMessageId: replyToMessageId ?? this.replyToMessageId,
      replyToMessage: replyToMessage ?? this.replyToMessage,
      isEdited: isEdited ?? this.isEdited,
      editedAt: editedAt ?? this.editedAt,
      isDeleted: isDeleted ?? this.isDeleted,
    );
  }

  bool get isFromCurrentUser => senderId == WebSocketService().currentUserId;

  bool get canEdit {
    if (!isFromCurrentUser || isDeleted) return false;
    final now = DateTime.now();
    final editTimeLimit = Duration(minutes: 15); // AppConfig.messageEditTimeLimit
    return now.difference(timestamp) <= editTimeLimit;
  }

  bool get canDelete => isFromCurrentUser && !isDeleted;

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ChatMessage && other.messageId == messageId;
  }

  @override
  int get hashCode => messageId.hashCode;
}

class TypingUser {
  final String userId;
  final String userName;
  final String groupId;
  final DateTime timestamp;

  const TypingUser({
    required this.userId,
    required this.userName,
    required this.groupId,
    required this.timestamp,
  });

  factory TypingUser.fromJson(Map<String, dynamic> json) {
    return TypingUser(
      userId: json['userId'] ?? '',
      userName: json['userName'] ?? '',
      groupId: json['groupId'] ?? '',
      timestamp: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'userName': userName,
      'groupId': groupId,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  bool get isExpired {
    final now = DateTime.now();
    return now.difference(timestamp).inMilliseconds > 3000; // AppConfig.typingIndicatorTimeout
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is TypingUser &&
           other.userId == userId &&
           other.groupId == groupId;
  }

  @override
  int get hashCode => '$userId-$groupId'.hashCode;
}

class GroupChatState {
  final String groupId;
  final List<ChatMessage> messages;
  final List<TypingUser> typingUsers;
  final bool isLoading;
  final bool hasMoreMessages;
  final String? error;
  final int unreadCount;
  final DateTime? lastSeen;

  const GroupChatState({
    required this.groupId,
    this.messages = const [],
    this.typingUsers = const [],
    this.isLoading = false,
    this.hasMoreMessages = true,
    this.error,
    this.unreadCount = 0,
    this.lastSeen,
  });

  GroupChatState copyWith({
    String? groupId,
    List<ChatMessage>? messages,
    List<TypingUser>? typingUsers,
    bool? isLoading,
    bool? hasMoreMessages,
    String? error,
    int? unreadCount,
    DateTime? lastSeen,
  }) {
    return GroupChatState(
      groupId: groupId ?? this.groupId,
      messages: messages ?? this.messages,
      typingUsers: typingUsers ?? this.typingUsers,
      isLoading: isLoading ?? this.isLoading,
      hasMoreMessages: hasMoreMessages ?? this.hasMoreMessages,
      error: error ?? this.error,
      unreadCount: unreadCount ?? this.unreadCount,
      lastSeen: lastSeen ?? this.lastSeen,
    );
  }

  GroupChatState clearError() {
    return copyWith(error: null);
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is GroupChatState && other.groupId == groupId;
  }

  @override
  int get hashCode => groupId.hashCode;
}
