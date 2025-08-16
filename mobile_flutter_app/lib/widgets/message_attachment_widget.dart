import 'package:flutter/material.dart';
import '../models/chat_models.dart';

class MessageAttachmentWidget extends StatelessWidget {
  final MessageAttachment attachment;
  final bool isFromCurrentUser;

  const MessageAttachmentWidget({
    Key? key,
    required this.attachment,
    required this.isFromCurrentUser,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    switch (attachment.type) {
      case 'image':
        return _buildImageAttachment(context);
      case 'video':
        return _buildVideoAttachment(context);
      case 'audio':
        return _buildAudioAttachment(context);
      case 'document':
        return _buildDocumentAttachment(context);
      default:
        return _buildGenericAttachment(context);
    }
  }

  Widget _buildImageAttachment(BuildContext context) {
    return GestureDetector(
      onTap: () => _showImageViewer(context),
      child: Container(
        constraints: const BoxConstraints(
          maxWidth: 250,
          maxHeight: 300,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          image: DecorationImage(
            image: NetworkImage(attachment.url),
            fit: BoxFit.cover,
          ),
        ),
        child: Stack(
          children: [
            // Loading indicator
            Container(
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(
                child: CircularProgressIndicator(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVideoAttachment(BuildContext context) {
    return GestureDetector(
      onTap: () => _playVideo(context),
      child: Container(
        width: 250,
        height: 150,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
          image: attachment.thumbnailUrl != null
              ? DecorationImage(
                  image: NetworkImage(attachment.thumbnailUrl!),
                  fit: BoxFit.cover,
                )
              : null,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 60,
              height: 60,
              decoration: BoxDecoration(
                color: Colors.black54,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.play_arrow,
                color: Colors.white,
                size: 32,
              ),
            ),
            if (attachment.duration != null)
              Positioned(
                bottom: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _formatDuration(attachment.duration!),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAudioAttachment(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFromCurrentUser
            ? Colors.white.withOpacity(0.2)
            : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => _playAudio(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.play_arrow,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                attachment.fileName ?? 'Audio',
                style: TextStyle(
                  fontWeight: FontWeight.w500,
                  color: isFromCurrentUser ? Colors.white : Colors.black87,
                ),
              ),
              if (attachment.duration != null)
                Text(
                  _formatDuration(attachment.duration!),
                  style: TextStyle(
                    fontSize: 12,
                    color: isFromCurrentUser
                        ? Colors.white70
                        : Colors.grey[600],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentAttachment(BuildContext context) {
    return GestureDetector(
      onTap: () => _openDocument(context),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isFromCurrentUser
              ? Colors.white.withOpacity(0.2)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _getDocumentColor(),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                _getDocumentIcon(),
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 12),
            Flexible(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    attachment.fileName ?? 'Document',
                    style: TextStyle(
                      fontWeight: FontWeight.w500,
                      color: isFromCurrentUser ? Colors.white : Colors.black87,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (attachment.fileSize != null)
                    Text(
                      _formatFileSize(attachment.fileSize!),
                      style: TextStyle(
                        fontSize: 12,
                        color: isFromCurrentUser
                            ? Colors.white70
                            : Colors.grey[600],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGenericAttachment(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFromCurrentUser
            ? Colors.white.withOpacity(0.2)
            : Colors.grey[100],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.attach_file,
            color: isFromCurrentUser ? Colors.white : Colors.grey[600],
          ),
          const SizedBox(width: 8),
          Text(
            attachment.fileName ?? 'Attachment',
            style: TextStyle(
              color: isFromCurrentUser ? Colors.white : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Color _getDocumentColor() {
    final extension = attachment.fileName?.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Colors.red;
      case 'doc':
      case 'docx':
        return Colors.blue;
      case 'xls':
      case 'xlsx':
        return Colors.green;
      case 'ppt':
      case 'pptx':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getDocumentIcon() {
    final extension = attachment.fileName?.split('.').last.toLowerCase();
    switch (extension) {
      case 'pdf':
        return Icons.picture_as_pdf;
      case 'doc':
      case 'docx':
        return Icons.description;
      case 'xls':
      case 'xlsx':
        return Icons.grid_on;
      case 'ppt':
      case 'pptx':
        return Icons.slideshow;
      default:
        return Icons.insert_drive_file;
    }
  }

  String _formatDuration(int seconds) {
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) {
      return '$bytes B';
    } else if (bytes < 1024 * 1024) {
      return '${(bytes / 1024).toStringAsFixed(1)} KB';
    } else {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
  }

  void _showImageViewer(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            iconTheme: const IconThemeData(color: Colors.white),
          ),
          body: Center(
            child: InteractiveViewer(
              child: Image.network(
                attachment.url,
                fit: BoxFit.contain,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return const Center(child: CircularProgressIndicator());
                },
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _playVideo(BuildContext context) {
    // TODO: Implement video player
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Video player coming soon!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _playAudio(BuildContext context) {
    // TODO: Implement audio player
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Audio player coming soon!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _openDocument(BuildContext context) {
    // TODO: Implement document viewer
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Document viewer coming soon!'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
