import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

class LocalStorageService {
  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  // Auth Token Management
  static Future<String?> getAuthToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(AppConfig.authTokenKey);
  }

  Future<void> saveAuthToken(String token) async {
    await _prefs.setString(AppConfig.authTokenKey, token);
  }

  Future<void> removeAuthToken() async {
    await _prefs.remove(AppConfig.authTokenKey);
  }

  // User Data Management
  Future<Map<String, dynamic>?> getUserData() async {
    final userData = _prefs.getString(AppConfig.userDataKey);
    if (userData != null) {
      return json.decode(userData) as Map<String, dynamic>;
    }
    return null;
  }

  Future<void> saveUserData(Map<String, dynamic> userData) async {
    await _prefs.setString(AppConfig.userDataKey, json.encode(userData));
  }

  Future<void> removeUserData() async {
    await _prefs.remove(AppConfig.userDataKey);
  }

  // Groups Data Management
  Future<List<Map<String, dynamic>>> getGroupsData() async {
    final groupsData = _prefs.getString(AppConfig.groupsDataKey);
    if (groupsData != null) {
      final List<dynamic> decoded = json.decode(groupsData);
      return decoded.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<void> saveGroupsData(List<Map<String, dynamic>> groupsData) async {
    await _prefs.setString(AppConfig.groupsDataKey, json.encode(groupsData));
  }

  Future<void> removeGroupsData() async {
    await _prefs.remove(AppConfig.groupsDataKey);
  }

  // Messages Data Management (per group)
  Future<List<Map<String, dynamic>>> getMessagesData(String groupId) async {
    final messagesData = _prefs.getString('${AppConfig.messagesDataKey}_$groupId');
    if (messagesData != null) {
      final List<dynamic> decoded = json.decode(messagesData);
      return decoded.cast<Map<String, dynamic>>();
    }
    return [];
  }

  Future<void> saveMessagesData(String groupId, List<Map<String, dynamic>> messagesData) async {
    await _prefs.setString('${AppConfig.messagesDataKey}_$groupId', json.encode(messagesData));
  }

  Future<void> removeMessagesData(String groupId) async {
    await _prefs.remove('${AppConfig.messagesDataKey}_$groupId');
  }

  // Add single message to cached messages
  Future<void> addMessage(String groupId, Map<String, dynamic> message) async {
    final messages = await getMessagesData(groupId);
    messages.add(message);

    // Keep only the last 1000 messages to prevent storage overflow
    if (messages.length > AppConfig.maxCachedMessages) {
      messages.removeRange(0, messages.length - AppConfig.maxCachedMessages);
    }

    await saveMessagesData(groupId, messages);
  }

  // Update message in cached messages
  Future<void> updateMessage(String groupId, String messageId, Map<String, dynamic> updatedMessage) async {
    final messages = await getMessagesData(groupId);
    final index = messages.indexWhere((msg) => msg['messageId'] == messageId);

    if (index != -1) {
      messages[index] = updatedMessage;
      await saveMessagesData(groupId, messages);
    }
  }

  // Remove message from cached messages
  Future<void> removeMessage(String groupId, String messageId) async {
    final messages = await getMessagesData(groupId);
    messages.removeWhere((msg) => msg['messageId'] == messageId);
    await saveMessagesData(groupId, messages);
  }

  // App Settings Management
  Future<Map<String, dynamic>> getSettings() async {
    final settings = _prefs.getString(AppConfig.settingsKey);
    if (settings != null) {
      return json.decode(settings) as Map<String, dynamic>;
    }
    return {
      'notifications_enabled': true,
      'sound_enabled': true,
      'vibration_enabled': true,
      'theme_mode': 'system',
      'message_preview_enabled': true,
      'typing_indicators_enabled': true,
      'read_receipts_enabled': true,
    };
  }

  Future<void> saveSetting(String key, dynamic value) async {
    final settings = await getSettings();
    settings[key] = value;
    await _prefs.setString(AppConfig.settingsKey, json.encode(settings));
  }

  Future<void> saveSettings(Map<String, dynamic> settings) async {
    await _prefs.setString(AppConfig.settingsKey, json.encode(settings));
  }

  // Typing indicator cache
  Future<void> saveTypingUsers(String groupId, List<String> userIds) async {
    await _prefs.setStringList('typing_$groupId', userIds);
  }

  Future<List<String>> getTypingUsers(String groupId) async {
    return _prefs.getStringList('typing_$groupId') ?? [];
  }

  Future<void> removeTypingUsers(String groupId) async {
    await _prefs.remove('typing_$groupId');
  }

  // Connection state
  Future<void> saveConnectionState(bool isConnected) async {
    await _prefs.setBool('websocket_connected', isConnected);
  }

  Future<bool> getConnectionState() async {
    return _prefs.getBool('websocket_connected') ?? false;
  }

  // Last seen timestamps for groups
  Future<void> saveLastSeen(String groupId, DateTime timestamp) async {
    await _prefs.setString('last_seen_$groupId', timestamp.toIso8601String());
  }

  Future<DateTime?> getLastSeen(String groupId) async {
    final timestamp = _prefs.getString('last_seen_$groupId');
    if (timestamp != null) {
      return DateTime.parse(timestamp);
    }
    return null;
  }

  // Unread message counts
  Future<void> saveUnreadCount(String groupId, int count) async {
    await _prefs.setInt('unread_$groupId', count);
  }

  Future<int> getUnreadCount(String groupId) async {
    return _prefs.getInt('unread_$groupId') ?? 0;
  }

  Future<void> incrementUnreadCount(String groupId) async {
    final current = await getUnreadCount(groupId);
    await saveUnreadCount(groupId, current + 1);
  }

  Future<void> resetUnreadCount(String groupId) async {
    await _prefs.remove('unread_$groupId');
  }

  // Clear all data (for logout)
  Future<void> clearAllData() async {
    await Future.wait([
      removeAuthToken(),
      removeUserData(),
      removeGroupsData(),
      _prefs.clear(),
    ]);
  }

  // Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getAuthToken();
    return token != null && token.isNotEmpty;
  }

  // Cache expiration management
  Future<void> saveCacheTimestamp(String key) async {
    await _prefs.setString('cache_$key', DateTime.now().toIso8601String());
  }

  Future<bool> isCacheExpired(String key) async {
    final timestamp = _prefs.getString('cache_$key');
    if (timestamp == null) return true;

    final cacheTime = DateTime.parse(timestamp);
    final now = DateTime.now();
    return now.difference(cacheTime) > AppConfig.cacheExpiration;
  }
}
