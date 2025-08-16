import 'package:flutter/material.dart';
import '../models/chat_models.dart';

class TypingIndicator extends StatefulWidget {
  final List<TypingUser> typingUsers;

  const TypingIndicator({
    Key? key,
    required this.typingUsers,
  }) : super(key: key);

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
    _animation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _animationController.repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  String _getTypingText() {
    final activeUsers = widget.typingUsers
        .where((user) => !user.isExpired)
        .toList();

    if (activeUsers.isEmpty) return '';

    if (activeUsers.length == 1) {
      return '${activeUsers[0].userName} is typing...';
    } else if (activeUsers.length == 2) {
      return '${activeUsers[0].userName} and ${activeUsers[1].userName} are typing...';
    } else {
      return '${activeUsers[0].userName} and ${activeUsers.length - 1} others are typing...';
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeUsers = widget.typingUsers
        .where((user) => !user.isExpired)
        .toList();

    if (activeUsers.isEmpty) {
      return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Avatar for single user, or multiple avatars indicator
          if (activeUsers.length == 1)
            CircleAvatar(
              radius: 12,
              backgroundColor: Colors.grey[300],
              child: Text(
                activeUsers[0].userName.isNotEmpty
                    ? activeUsers[0].userName[0].toUpperCase()
                    : '?',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
              ),
            )
          else
            SizedBox(
              width: 32,
              height: 24,
              child: Stack(
                children: [
                  for (int i = 0; i < (activeUsers.length > 3 ? 3 : activeUsers.length); i++)
                    Positioned(
                      left: i * 8.0,
                      child: CircleAvatar(
                        radius: 8,
                        backgroundColor: Colors.grey[300],
                        child: Text(
                          activeUsers[i].userName.isNotEmpty
                              ? activeUsers[i].userName[0].toUpperCase()
                              : '?',
                          style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                ],
              ),
            ),

          const SizedBox(width: 12),

          // Typing text with animation
          Expanded(
            child: Row(
              children: [
                Text(
                  _getTypingText(),
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                    fontStyle: FontStyle.italic,
                  ),
                ),
                const SizedBox(width: 8),
                _buildTypingAnimation(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingAnimation() {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (int i = 0; i < 3; i++)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 1),
                child: _buildDot(i),
              ),
          ],
        );
      },
    );
  }

  Widget _buildDot(int index) {
    final delay = index * 0.33;
    final adjustedAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Interval(
        delay,
        0.8 + delay,
        curve: Curves.easeInOut,
      ),
    ));

    return AnimatedBuilder(
      animation: adjustedAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -adjustedAnimation.value * 4),
          child: Container(
            width: 4,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[400],
              shape: BoxShape.circle,
            ),
          ),
        );
      },
    );
  }
}
