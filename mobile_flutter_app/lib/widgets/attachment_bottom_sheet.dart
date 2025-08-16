import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class AttachmentBottomSheet extends StatelessWidget {
  final Function(XFile) onImageSelected;
  final Function(XFile) onVideoSelected;
  final Function(XFile) onFileSelected;

  const AttachmentBottomSheet({
    Key? key,
    required this.onImageSelected,
    required this.onVideoSelected,
    required this.onFileSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),

          const Text(
            'Share Content',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 20),

          // Options grid
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: 3,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: [
              _buildAttachmentOption(
                context,
                icon: Icons.photo_camera,
                label: 'Camera',
                color: Colors.blue,
                onTap: () => _pickImageFromCamera(context),
              ),
              _buildAttachmentOption(
                context,
                icon: Icons.photo_library,
                label: 'Gallery',
                color: Colors.green,
                onTap: () => _pickImageFromGallery(context),
              ),
              _buildAttachmentOption(
                context,
                icon: Icons.videocam,
                label: 'Video',
                color: Colors.red,
                onTap: () => _pickVideoFromGallery(context),
              ),
              _buildAttachmentOption(
                context,
                icon: Icons.insert_drive_file,
                label: 'Document',
                color: Colors.orange,
                onTap: () => _pickDocument(context),
              ),
              _buildAttachmentOption(
                context,
                icon: Icons.location_on,
                label: 'Location',
                color: Colors.purple,
                onTap: () => _shareLocation(context),
              ),
              _buildAttachmentOption(
                context,
                icon: Icons.contact_page,
                label: 'Contact',
                color: Colors.teal,
                onTap: () => _shareContact(context),
              ),
            ],
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildAttachmentOption(
    BuildContext context, {
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: color,
              size: 28,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Future<void> _pickImageFromCamera(BuildContext context) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (image != null) {
        Navigator.pop(context);
        onImageSelected(image);
      }
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to take photo: $e');
    }
  }

  Future<void> _pickImageFromGallery(BuildContext context) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 80,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (image != null) {
        Navigator.pop(context);
        onImageSelected(image);
      }
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to pick image: $e');
    }
  }

  Future<void> _pickVideoFromGallery(BuildContext context) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? video = await picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5), // 5 minute limit
      );

      if (video != null) {
        Navigator.pop(context);
        onVideoSelected(video);
      }
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to pick video: $e');
    }
  }

  Future<void> _pickDocument(BuildContext context) async {
    try {
      // TODO: Implement file picker for documents
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Document picker coming soon!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to pick document: $e');
    }
  }

  Future<void> _shareLocation(BuildContext context) async {
    try {
      // TODO: Implement location sharing
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Location sharing coming soon!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to share location: $e');
    }
  }

  Future<void> _shareContact(BuildContext context) async {
    try {
      // TODO: Implement contact sharing
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Contact sharing coming soon!'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } catch (e) {
      _showErrorSnackBar(context, 'Failed to share contact: $e');
    }
  }

  void _showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
