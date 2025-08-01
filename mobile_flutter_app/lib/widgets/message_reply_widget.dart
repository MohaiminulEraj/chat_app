import 'package:flutter/material.dart';
import '../models/chat_models.dart';

class MessageReplyWidget extends StatelessWidget {
  final ChatMessage? replyToMessage;
  final VoidCallback? onCancelReply;
  final bool isPreview;

  const MessageReplyWidget({
    Key? key,
    this.replyToMessage,
    this.onCancelReply,
    this.isPreview = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (replyToMessage == null) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.all(8),
      margin: isPreview
          ? const EdgeInsets.only(left: 12, right: 12, bottom: 8)
          : const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isPreview
            ? Colors.grey[100]
            : Colors.grey[200]?.withOpacity(0.3),
        borderRadius: BorderRadius.circular(8),
        border: Border(
          left: BorderSide(
            color: Theme.of(context).primaryColor,
            width: 3,
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  replyToMessage!.userName,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).primaryColor,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  _getReplyContent(),
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          if (isPreview && onCancelReply != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onCancelReply,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.close,
                  size: 16,
                  color: Colors.grey[600],
                ),
              ),
            ),
          ],
          if (!isPreview && replyToMessage!.attachments.isNotEmpty) ...[
            const SizedBox(width: 8),
            _buildAttachmentPreview(),
          ],
        ],
      ),
    );
  }

  String _getReplyContent() {
    if (replyToMessage!.attachments.isNotEmpty) {
      final attachment = replyToMessage!.attachments.first;
      switch (attachment.type) {
        case 'image':
          return '📷 Photo';
        case 'video':
          return '🎥 Video';
        case 'audio':
          return '🎵 Audio';
        case 'document':
          return '📄 Document';
        default:
          return '📎 Attachment';
      }
    }
    return replyToMessage!.content;
  }

  Widget _buildAttachmentPreview() {
    final attachment = replyToMessage!.attachments.first;

    if (attachment.type == 'image') {
      return Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(6),
          image: DecorationImage(
            image: NetworkImage(attachment.url),
            fit: BoxFit.cover,
          ),
        ),
      );
    }

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.grey[300],
        borderRadius: BorderRadius.circular(6),
      ),
      child: Icon(
        _getAttachmentIcon(attachment.type),
        color: Colors.grey[600],
        size: 20,
      ),
    );
  }

  IconData _getAttachmentIcon(String type) {
    switch (type) {
      case 'video':
        return Icons.play_circle_filled;
      case 'audio':
        return Icons.music_note;
      case 'document':
        return Icons.description;
      default:
        return Icons.attach_file;
    }
  }
}
