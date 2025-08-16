import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/chat_models.dart';

class MessageBubble extends StatelessWidget {
  final ChatMessage message;
  final bool isFromCurrentUser;
  final VoidCallback? onLongPress;
  final VoidCallback? onReplyTap;

  const MessageBubble({
    Key? key,
    required this.message,
    required this.isFromCurrentUser,
    this.onLongPress,
    this.onReplyTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: isFromCurrentUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isFromCurrentUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: Colors.grey[300],
              backgroundImage: message.senderAvatarUrl != null
                  ? NetworkImage(message.senderAvatarUrl!)
                  : null,
              child: message.senderAvatarUrl == null
                  ? Text(
                      message.senderName.isNotEmpty
                          ? message.senderName[0].toUpperCase()
                          : '?',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    )
                  : null,
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: GestureDetector(
              onLongPress: onLongPress,
              child: Container(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.75,
                ),
                child: Column(
                  crossAxisAlignment: isFromCurrentUser
                      ? CrossAxisAlignment.end
                      : CrossAxisAlignment.start,
                  children: [
                    // Sender name (only for received messages)
                    if (!isFromCurrentUser)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4, left: 12, right: 12),
                        child: Text(
                          message.senderName,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[600],
                          ),
                        ),
                      ),

                    // Reply indicator
                    if (message.replyToMessage != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 4),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Replying to ${message.replyToMessage!.senderName}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: Colors.grey[600],
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              message.replyToMessage!.content,
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[700],
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                    // Message bubble
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isFromCurrentUser
                            ? Theme.of(context).primaryColor
                            : Colors.grey[200],
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(16),
                          topRight: const Radius.circular(16),
                          bottomLeft: Radius.circular(isFromCurrentUser ? 16 : 4),
                          bottomRight: Radius.circular(isFromCurrentUser ? 4 : 16),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Message content
                          Text(
                            message.content,
                            style: TextStyle(
                              fontSize: 16,
                              color: isFromCurrentUser ? Colors.white : Colors.black87,
                            ),
                          ),

                          const SizedBox(height: 4),

                          // Message metadata
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Timestamp
                              Text(
                                timeago.format(message.timestamp),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isFromCurrentUser
                                      ? Colors.white70
                                      : Colors.grey[600],
                                ),
                              ),

                              // Edited indicator
                              if (message.isEdited) ...[
                                const SizedBox(width: 4),
                                Icon(
                                  Icons.edit,
                                  size: 12,
                                  color: isFromCurrentUser
                                      ? Colors.white70
                                      : Colors.grey[600],
                                ),
                              ],

                              // Read status (only for sent messages)
                              if (isFromCurrentUser) ...[
                                const SizedBox(width: 4),
                                Icon(
                                  message.readBy.length > 1
                                      ? Icons.done_all
                                      : Icons.done,
                                  size: 12,
                                  color: message.readBy.length > 1
                                      ? Colors.blue[300]
                                      : Colors.white70,
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          if (isFromCurrentUser) ...[
            const SizedBox(width: 8),
            // Reply button for sent messages
            if (onReplyTap != null)
              GestureDetector(
                onTap: onReplyTap,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.reply,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                ),
              ),
          ] else ...[
            // Reply button for received messages
            if (onReplyTap != null)
              GestureDetector(
                onTap: onReplyTap,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  child: Icon(
                    Icons.reply,
                    size: 16,
                    color: Colors.grey[600],
                  ),
                ),
              ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
