import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

class GroupChatScreen extends StatefulWidget {
  final String groupId;
  final String groupName;

  const GroupChatScreen({
    Key? key,
    required this.groupId,
    required this.groupName
  }) : super(key: key);

  @override
  _GroupChatScreenState createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  IO.Socket? socket;
  final TextEditingController _messageController = TextEditingController();
  final TextEditingController _tokenController = TextEditingController();
  List<Map<String, dynamic>> messages = [];
  List<Map<String, dynamic>> members = [];
  Map<String, bool> typingUsers = {};
  bool isConnected = false;
  bool isAuthenticated = false;
  bool isJoinedGroup = false;

  @override
  void initState() {
    super.initState();
    initSocket();
  }

  void initSocket() {
    try {
      // Connect to group chat namespace
      socket = IO.io(
        process.env.LIVE_SOCKET_URL,
        IO.OptionBuilder()
            .setTransports(['websocket'])
            .enableAutoConnect()
            .setPath('/socket.io/')
            .setNamespace('/group-chat')
            .build(),
      );

      // Connection events
      socket!.onConnect((_) {
        setState(() {
          isConnected = true;
        });
        _addSystemMessage('✅ Connected to group chat server');
      });

      socket!.onDisconnect((_) {
        setState(() {
          isConnected = false;
          isAuthenticated = false;
          isJoinedGroup = false;
        });
        _addSystemMessage('❌ Disconnected from server');
      });

      // Authentication response
      socket!.on('authenticated', (data) {
        setState(() {
          isAuthenticated = true;
        });
        _addSystemMessage('🔐 Authentication successful');

        // Auto join the group after authentication
        joinGroup();
      });

      // Group events
      socket!.on('joinedGroup', (data) {
        setState(() {
          isJoinedGroup = true;
        });
        _addSystemMessage('🚪 Joined group: ${widget.groupName}');

        // Get group members and message history
        getGroupMembers();
        getMessageHistory();
      });

      socket!.on('leftGroup', (data) {
        setState(() {
          isJoinedGroup = false;
        });
        _addSystemMessage('🚪 Left group: ${widget.groupName}');
      });

      // Message events
      socket!.on('groupMessageReceived', (data) {
        _addMessage(data);
      });

      socket!.on('groupMessageHistory', (data) {
        setState(() {
          messages.clear();
          for (var msg in data['messages'].reversed) {
            messages.add(msg);
          }
        });
      });

      // User activity events
      socket!.on('userJoinedGroup', (data) {
        _addSystemMessage('👋 ${data['userName']} joined the group');
        getGroupMembers(); // Refresh member list
      });

      socket!.on('userLeftGroup', (data) {
        _addSystemMessage('👋 ${data['userName']} left the group');
        getGroupMembers(); // Refresh member list
      });

      socket!.on('userTypingInGroup', (data) {
        setState(() {
          typingUsers[data['userId']] = data['isTyping'];
        });

        // Clear typing after 3 seconds
        if (data['isTyping']) {
          Future.delayed(Duration(seconds: 3), () {
            setState(() {
              typingUsers.remove(data['userId']);
            });
          });
        }
      });

      // Message management events
      socket!.on('groupMessageDeleted', (data) {
        setState(() {
          messages.removeWhere((msg) => msg['messageId'] == data['messageId']);
        });
        _addSystemMessage('🗑️ A message was deleted');
      });

      socket!.on('groupMessageEdited', (data) {
        setState(() {
          for (var msg in messages) {
            if (msg['messageId'] == data['messageId']) {
              msg['content'] = data['newContent'];
              msg['isEdited'] = true;
              break;
            }
          }
        });
      });

      socket!.on('groupMembersList', (data) {
        setState(() {
          members = List<Map<String, dynamic>>.from(data['members']);
        });
      });

      // Error handling
      socket!.onError((error) {
        _addSystemMessage('❌ Error: $error');
      });

      socket!.on('error', (data) {
        _addSystemMessage('❌ ${data['message']}');
      });

    } catch (e) {
      _addSystemMessage('❌ Socket initialization error: $e');
    }
  }

  void authenticate() {
    if (_tokenController.text.isNotEmpty && isConnected) {
      socket!.emit('authenticate', {'token': _tokenController.text});
      _addSystemMessage('🔑 Authenticating...');
    }
  }

  void joinGroup() {
    if (isAuthenticated) {
      socket!.emit('joinGroup', {'groupId': widget.groupId});
      _addSystemMessage('🚪 Joining group...');
    }
  }

  void leaveGroup() {
    if (isJoinedGroup) {
      socket!.emit('leaveGroup', {'groupId': widget.groupId});
    }
  }

  void sendMessage() {
    if (_messageController.text.isNotEmpty && isJoinedGroup) {
      socket!.emit('sendGroupMessage', {
        'groupId': widget.groupId,
        'content': _messageController.text,
        'messageType': 'text'
      });

      _messageController.clear();
      stopTyping();
    }
  }

  void getMessageHistory() {
    if (isJoinedGroup) {
      socket!.emit('getGroupMessageHistory', {
        'groupId': widget.groupId,
        'page': 1,
        'limit': 50
      });
    }
  }

  void getGroupMembers() {
    if (isJoinedGroup) {
      socket!.emit('getGroupMembers', {'groupId': widget.groupId});
    }
  }

  void startTyping() {
    if (isJoinedGroup) {
      socket!.emit('groupTyping', {
        'groupId': widget.groupId,
        'isTyping': true
      });
    }
  }

  void stopTyping() {
    if (isJoinedGroup) {
      socket!.emit('groupTyping', {
        'groupId': widget.groupId,
        'isTyping': false
      });
    }
  }

  void _addMessage(Map<String, dynamic> messageData) {
    setState(() {
      messages.add({
        'messageId': messageData['messageId'],
        'senderId': messageData['senderId'],
        'senderName': messageData['senderName'],
        'content': messageData['content'],
        'messageType': messageData['messageType'],
        'timestamp': messageData['timestamp'],
        'isOwn': false, // Will be determined by comparing with current user
        'isSystem': false
      });
    });
  }

  void _addSystemMessage(String message) {
    setState(() {
      messages.add({
        'content': message,
        'timestamp': DateTime.now().toIso8601String(),
        'isSystem': true,
        'isOwn': false
      });
    });
  }

  String _getTypingText() {
    final typingUserNames = typingUsers.entries
        .where((entry) => entry.value)
        .map((entry) => entry.key)
        .take(3)
        .toList();

    if (typingUserNames.isEmpty) return '';

    if (typingUserNames.length == 1) {
      return '${typingUserNames[0]} is typing...';
    } else if (typingUserNames.length == 2) {
      return '${typingUserNames[0]} and ${typingUserNames[1]} are typing...';
    } else {
      return '${typingUserNames[0]}, ${typingUserNames[1]} and others are typing...';
    }
  }

  @override
  void dispose() {
    leaveGroup();
    socket?.disconnect();
    socket?.dispose();
    _messageController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.groupName),
            if (members.isNotEmpty)
              Text(
                '${members.length} members',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
              ),
          ],
        ),
        backgroundColor: isJoinedGroup ? Colors.green :
                         isConnected ? Colors.orange : Colors.red,
        actions: [
          IconButton(
            icon: Icon(Icons.people),
            onPressed: getGroupMembers,
          ),
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: getMessageHistory,
          ),
        ],
      ),
      body: Column(
        children: [
          // Connection Status
          Container(
            width: double.infinity,
            padding: EdgeInsets.all(8),
            color: isJoinedGroup ? Colors.green[100] :
                   isConnected ? Colors.orange[100] : Colors.red[100],
            child: Text(
              isJoinedGroup ? 'In Group Chat' :
              isAuthenticated ? 'Authenticated - Not in Group' :
              isConnected ? 'Connected - Not Authenticated' :
              'Disconnected',
              textAlign: TextAlign.center,
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),

          // JWT Token Input
          if (!isAuthenticated)
            Padding(
              padding: EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _tokenController,
                      decoration: InputDecoration(
                        labelText: 'JWT Token',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 2,
                    ),
                  ),
                  SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: authenticate,
                    child: Text('Login'),
                  ),
                ],
              ),
            ),

          // Messages List
          Expanded(
            child: ListView.builder(
              padding: EdgeInsets.all(8),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final message = messages[index];
                final isSystem = message['isSystem'] ?? false;
                final isOwn = message['isOwn'] ?? false;

                if (isSystem) {
                  return Padding(
                    padding: EdgeInsets.symmetric(vertical: 4),
                    child: Center(
                      child: Text(
                        message['content'],
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  );
                }

                return Align(
                  alignment: isOwn ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: EdgeInsets.symmetric(vertical: 2),
                    padding: EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isOwn ? Colors.blue[100] : Colors.grey[200],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    constraints: BoxConstraints(
                      maxWidth: MediaQuery.of(context).size.width * 0.75,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (!isOwn && message['senderName'] != null)
                          Text(
                            message['senderName'],
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: Colors.blue[800],
                            ),
                          ),
                        Text(message['content'] ?? ''),
                        if (message['isEdited'] == true)
                          Text(
                            'edited',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey[600],
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Typing Indicator
          if (_getTypingText().isNotEmpty)
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Text(
                _getTypingText(),
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),

          // Message Input
          if (isJoinedGroup)
            Padding(
              padding: EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: InputDecoration(
                        labelText: 'Type a message...',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (text) {
                        if (text.isNotEmpty) {
                          startTyping();
                        } else {
                          stopTyping();
                        }
                      },
                      onSubmitted: (_) => sendMessage(),
                    ),
                  ),
                  SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: sendMessage,
                    child: Icon(Icons.send),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// Usage Example:
// GroupChatScreen(
//   groupId: "your-group-uuid-here",
//   groupName: "My Awesome Group"
// )
