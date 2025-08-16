import 'package:flutter/material.dart';
import '../models/chat_models.dart';

class ChatAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String groupName;
  final bool isConnected;
  final List<TypingUser> typingUsers;
  final VoidCallback? onBackPressed;

  const ChatAppBar({
    Key? key,
    required this.groupName,
    required this.isConnected,
    required this.typingUsers,
    this.onBackPressed,
  }) : super(key: key);

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  String _getSubtitle() {
    final activeTypingUsers = typingUsers
        .where((user) => !user.isExpired)
        .toList();

    if (activeTypingUsers.isNotEmpty) {
      if (activeTypingUsers.length == 1) {
        return '${activeTypingUsers[0].userName} is typing...';
      } else {
        return '${activeTypingUsers.length} people are typing...';
      }
    }

    return isConnected ? 'Online' : 'Connecting...';
  }

  Color _getStatusColor() {
    final activeTypingUsers = typingUsers
        .where((user) => !user.isExpired)
        .toList();

    if (activeTypingUsers.isNotEmpty) {
      return Colors.blue;
    }

    return isConnected ? Colors.green : Colors.orange;
  }

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: Theme.of(context).primaryColor,
      elevation: 1,
      leading: IconButton(
        onPressed: onBackPressed ?? () => Navigator.pop(context),
        icon: const Icon(Icons.arrow_back, color: Colors.white),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            groupName,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: _getStatusColor(),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _getSubtitle(),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.normal,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ],
      ),
      actions: [
        // Video call button
        IconButton(
          onPressed: () {
            // TODO: Implement video call
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Video call feature coming soon!'),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          icon: const Icon(Icons.videocam, color: Colors.white),
        ),

        // Voice call button
        IconButton(
          onPressed: () {
            // TODO: Implement voice call
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Voice call feature coming soon!'),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          icon: const Icon(Icons.call, color: Colors.white),
        ),

        // More options
        PopupMenuButton<String>(
          onSelected: (value) => _handleMenuSelection(context, value),
          icon: const Icon(Icons.more_vert, color: Colors.white),
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'search',
              child: ListTile(
                leading: Icon(Icons.search),
                title: Text('Search messages'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuItem(
              value: 'members',
              child: ListTile(
                leading: Icon(Icons.people),
                title: Text('Group members'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuItem(
              value: 'media',
              child: ListTile(
                leading: Icon(Icons.photo_library),
                title: Text('Shared media'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuItem(
              value: 'notifications',
              child: ListTile(
                leading: Icon(Icons.notifications),
                title: Text('Notifications'),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuDivider(),
            const PopupMenuItem(
              value: 'clear_history',
              child: ListTile(
                leading: Icon(Icons.delete_sweep, color: Colors.red),
                title: Text('Clear history', style: TextStyle(color: Colors.red)),
                contentPadding: EdgeInsets.zero,
              ),
            ),
            const PopupMenuItem(
              value: 'leave_group',
              child: ListTile(
                leading: Icon(Icons.exit_to_app, color: Colors.red),
                title: Text('Leave group', style: TextStyle(color: Colors.red)),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ],
        ),
      ],
    );
  }

  void _handleMenuSelection(BuildContext context, String value) {
    switch (value) {
      case 'search':
        _showSearchDialog(context);
        break;
      case 'members':
        _showGroupMembersDialog(context);
        break;
      case 'media':
        _showSharedMediaDialog(context);
        break;
      case 'notifications':
        _showNotificationSettings(context);
        break;
      case 'clear_history':
        _showClearHistoryDialog(context);
        break;
      case 'leave_group':
        _showLeaveGroupDialog(context);
        break;
    }
  }

  void _showSearchDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Search Messages'),
        content: const TextField(
          decoration: InputDecoration(
            hintText: 'Enter search term...',
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
              Navigator.pop(context);
              // TODO: Implement search functionality
            },
            child: const Text('Search'),
          ),
        ],
      ),
    );
  }

  void _showGroupMembersDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Group Members'),
        content: const Text('Group members functionality coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showSharedMediaDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Shared Media'),
        content: const Text('Shared media functionality coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showNotificationSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Notification Settings'),
        content: const Text('Notification settings coming soon!'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _showClearHistoryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear History'),
        content: const Text('Are you sure you want to clear all message history? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Implement clear history
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Clear history functionality coming soon!'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  void _showLeaveGroupDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Leave Group'),
        content: Text('Are you sure you want to leave "$groupName"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              if (onBackPressed != null) {
                onBackPressed!();
              } else {
                Navigator.pop(context);
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Leave'),
          ),
        ],
      ),
    );
  }
}
