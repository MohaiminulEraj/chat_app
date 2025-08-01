class AppConfig {
  static const String appName = 'Kitty Group Chat';
  static const String version = '1.0.0';

  // API Configuration
  static const String baseUrl = 'http://103.190.136.200:3000'; // Live server
  static const String localUrl = 'http://localhost:3001'; // Local development
  static const String apiVersion = '/api/v1';

  // WebSocket Configuration
  static const String wsNamespace = '/group-chat';
  static String get wsUrl => '$baseUrl$wsNamespace';
  static String get localWsUrl => '$localUrl$wsNamespace';

  // Environment
  static const bool isProduction = true;
  static String get currentBaseUrl => isProduction ? baseUrl : localUrl;
  static String get currentWsUrl => isProduction ? wsUrl : localWsUrl;

  // API Endpoints
  static String get apiBaseUrl => '$currentBaseUrl$apiVersion';

  // Auth endpoints
  static String get loginEndpoint => '$apiBaseUrl/auth/login';
  static String get registerEndpoint => '$apiBaseUrl/auth/register';
  static String get refreshTokenEndpoint => '$apiBaseUrl/auth/refresh';
  static String get logoutEndpoint => '$apiBaseUrl/auth/logout';

  // Group endpoints
  static String get groupsEndpoint => '$apiBaseUrl/groups';
  static String groupEndpoint(String groupId) => '$groupsEndpoint/$groupId';
  static String groupMembersEndpoint(String groupId) => '$groupsEndpoint/$groupId/members';

  // Group Chat endpoints
  static String get groupChatBaseEndpoint => '$apiBaseUrl/group-chat';
  static String groupChatHistoryEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/messages';
  static String groupChatSearchEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/search';
  static String groupChatStatsEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/stats';
  static String groupChatMembersEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/members';
  static String groupChatUnreadCountEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/unread-count';
  static String groupChatMessageEndpoint(String groupId, String messageId) => '$groupChatBaseEndpoint/$groupId/messages/$messageId';
  static String groupChatMarkReadEndpoint(String groupId) => '$groupChatBaseEndpoint/$groupId/messages/read';

  // Message Configuration
  static const int messageEditTimeLimit = 15; // minutes
  static const int messagePageSize = 50;
  static const int typingIndicatorTimeout = 3000; // milliseconds

  // File Upload Configuration
  static const int maxFileSize = 10 * 1024 * 1024; // 10MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  static const List<String> allowedVideoTypes = ['mp4', 'mov', 'avi', 'mkv'];
  static const List<String> allowedAudioTypes = ['mp3', 'wav', 'aac', 'm4a'];

  // Notification Configuration
  static const String notificationChannelId = 'group_chat_messages';
  static const String notificationChannelName = 'Group Chat Messages';
  static const String notificationChannelDescription = 'Notifications for new group chat messages';

  // Cache Configuration
  static const Duration cacheExpiration = Duration(hours: 24);
  static const int maxCachedMessages = 1000;

  // Connection Configuration
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  static const int maxRetryAttempts = 3;
  static const Duration retryDelay = Duration(seconds: 2);

  // WebSocket Events
  static const String authenticateEvent = 'authenticate';
  static const String authenticatedEvent = 'authenticated';
  static const String authenticationErrorEvent = 'authenticationError';
  static const String joinGroupEvent = 'joinGroup';
  static const String joinedGroupEvent = 'joinedGroup';
  static const String leaveGroupEvent = 'leaveGroup';
  static const String leftGroupEvent = 'leftGroup';
  static const String userJoinedGroupEvent = 'userJoinedGroup';
  static const String userLeftGroupEvent = 'userLeftGroup';
  static const String sendGroupMessageEvent = 'sendGroupMessage';
  static const String groupMessageReceivedEvent = 'groupMessageReceived';
  static const String getGroupMessageHistoryEvent = 'getGroupMessageHistory';
  static const String groupMessageHistoryEvent = 'groupMessageHistory';
  static const String markGroupMessageAsReadEvent = 'markGroupMessageAsRead';
  static const String messagesMarkedAsReadEvent = 'messagesMarkedAsRead';
  static const String groupTypingEvent = 'groupTyping';
  static const String userTypingInGroupEvent = 'userTypingInGroup';
  static const String deleteGroupMessageEvent = 'deleteGroupMessage';
  static const String groupMessageDeletedEvent = 'groupMessageDeleted';
  static const String editGroupMessageEvent = 'editGroupMessage';
  static const String groupMessageEditedEvent = 'groupMessageEdited';
  static const String getGroupMembersEvent = 'getGroupMembers';
  static const String groupMembersListEvent = 'groupMembersList';
  static const String errorEvent = 'error';

  // Local Storage Keys
  static const String authTokenKey = 'auth_token';
  static const String userDataKey = 'user_data';
  static const String groupsDataKey = 'groups_data';
  static const String messagesDataKey = 'messages_data';
  static const String settingsKey = 'app_settings';

  // Test Users (for development)
  static const Map<String, String> testUsers = {
    'eraj@gmail.com': 'password123',
    'faysal@mobile.com': 'password123',
  };
}
