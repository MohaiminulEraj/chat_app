import 'package:flutter/material.dart';
import '../models/chat_models.dart';
import '../config/app_config.dart';

class MessageSearchDelegate extends SearchDelegate<ChatMessage?> {
  final List<ChatMessage> messages;

  MessageSearchDelegate(this.messages);

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        onPressed: () => query = '',
        icon: const Icon(Icons.clear),
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      onPressed: () => close(context, null),
      icon: const Icon(Icons.arrow_back),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    return _buildSearchResults();
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return _buildSearchResults();
  }

  Widget _buildSearchResults() {
    if (query.isEmpty) {
      return const Center(
        child: Text('Enter search term to find messages'),
      );
    }

    final searchResults = messages
        .where((message) =>
            message.content.toLowerCase().contains(query.toLowerCase()) ||
            message.userName.toLowerCase().contains(query.toLowerCase()))
        .toList();

    if (searchResults.isEmpty) {
      return const Center(
        child: Text('No messages found'),
      );
    }

    return ListView.builder(
      itemCount: searchResults.length,
      itemBuilder: (context, index) {
        final message = searchResults[index];
        return ListTile(
          leading: CircleAvatar(
            child: Text(message.userName.substring(0, 1).toUpperCase()),
          ),
          title: Text(message.userName),
          subtitle: Text(
            message.content,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: Text(
            _formatTime(message.timestamp),
            style: const TextStyle(fontSize: 12),
          ),
          onTap: () => close(context, message),
        );
      },
    );
  }

  String _formatTime(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}
