import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import '../config/app_config.dart';

class NotificationService {
  static final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    // Request permission
    await _requestPermission();

    // Android initialization
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    // iOS initialization
    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _notifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channel for Android
    await _createNotificationChannel();

    _initialized = true;
  }

  Future<void> _requestPermission() async {
    await Permission.notification.request();
  }

  Future<void> _createNotificationChannel() async {
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      AppConfig.notificationChannelId,
      AppConfig.notificationChannelName,
      description: AppConfig.notificationChannelDescription,
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  static void _onNotificationTapped(NotificationResponse response) {
    // Handle notification tap
    // You can navigate to specific chat screen based on payload
    final payload = response.payload;
    if (payload != null) {
      // Parse payload and navigate
      // Example: {"type": "group_message", "groupId": "123", "messageId": "456"}
    }
  }

  Future<void> showMessageNotification({
    required String groupId,
    required String groupName,
    required String senderName,
    required String message,
    required String messageId,
    String? senderAvatar,
  }) async {
    if (!_initialized) await initialize();

    final payload = '{"type": "group_message", "groupId": "$groupId", "messageId": "$messageId"}';

    // Create big text style for long messages
    final BigTextStyleInformation bigTextStyleInformation = BigTextStyleInformation(
      message,
      htmlFormatBigText: true,
      contentTitle: '$senderName in $groupName',
      htmlFormatContentTitle: true,
      summaryText: groupName,
      htmlFormatSummaryText: true,
    );

    final AndroidNotificationDetails androidNotificationDetails = AndroidNotificationDetails(
      AppConfig.notificationChannelId,
      AppConfig.notificationChannelName,
      channelDescription: AppConfig.notificationChannelDescription,
      importance: Importance.high,
      priority: Priority.high,
      styleInformation: bigTextStyleInformation,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    const DarwinNotificationDetails iOSNotificationDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final NotificationDetails notificationDetails = NotificationDetails(
      android: androidNotificationDetails,
      iOS: iOSNotificationDetails,
    );

    await _notifications.show(
      messageId.hashCode, // Use message ID hash as notification ID
      '$senderName in $groupName',
      message,
      notificationDetails,
      payload: payload,
    );
  }

  Future<void> showTypingNotification({
    required String groupId,
    required String groupName,
    required String userName,
  }) async {
    if (!_initialized) await initialize();

    final payload = '{"type": "typing", "groupId": "$groupId"}';

    const AndroidNotificationDetails androidNotificationDetails = AndroidNotificationDetails(
      '${AppConfig.notificationChannelId}_typing',
      'Typing Indicators',
      channelDescription: 'Notifications for typing indicators',
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true,
      autoCancel: false,
      showWhen: false,
    );

    const DarwinNotificationDetails iOSNotificationDetails = DarwinNotificationDetails(
      presentAlert: false,
      presentBadge: false,
      presentSound: false,
    );

    const NotificationDetails notificationDetails = NotificationDetails(
      android: androidNotificationDetails,
      iOS: iOSNotificationDetails,
    );

    await _notifications.show(
      'typing_$groupId'.hashCode,
      '$userName is typing...',
      'in $groupName',
      notificationDetails,
      payload: payload,
    );
  }

  Future<void> cancelTypingNotification(String groupId) async {
    await _notifications.cancel('typing_$groupId'.hashCode);
  }

  Future<void> showGroupJoinNotification({
    required String groupId,
    required String groupName,
    required String userName,
  }) async {
    if (!_initialized) await initialize();

    final payload = '{"type": "user_joined", "groupId": "$groupId"}';

    const AndroidNotificationDetails androidNotificationDetails = AndroidNotificationDetails(
      '${AppConfig.notificationChannelId}_events',
      'Group Events',
      channelDescription: 'Notifications for group events',
      importance: Importance.low,
      priority: Priority.low,
    );

    const DarwinNotificationDetails iOSNotificationDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: false,
      presentSound: false,
    );

    const NotificationDetails notificationDetails = NotificationDetails(
      android: androidNotificationDetails,
      iOS: iOSNotificationDetails,
    );

    await _notifications.show(
      'join_${groupId}_${userName}'.hashCode,
      '$userName joined $groupName',
      '',
      notificationDetails,
      payload: payload,
    );
  }

  Future<void> updateBadgeCount(int count) async {
    if (!_initialized) await initialize();

    // iOS badge count
    await _notifications
        .resolvePlatformSpecificImplementation<DarwinFlutterLocalNotificationsPlugin>()
        ?.updateBadge(count);
  }

  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
  }

  Future<void> cancelNotification(int id) async {
    await _notifications.cancel(id);
  }

  Future<void> cancelGroupNotifications(String groupId) async {
    // Cancel all notifications for a specific group
    final pendingNotifications = await _notifications.pendingNotificationRequests();

    for (final notification in pendingNotifications) {
      if (notification.payload?.contains(groupId) == true) {
        await _notifications.cancel(notification.id);
      }
    }
  }

  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _notifications.pendingNotificationRequests();
  }

  Future<bool> areNotificationsEnabled() async {
    final status = await Permission.notification.status;
    return status.isGranted;
  }

  Future<void> openNotificationSettings() async {
    await openAppSettings();
  }
}
