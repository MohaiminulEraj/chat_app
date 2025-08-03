# Room Seat Management API Documentation

## Overview

This document describes the real-time seat management system for rooms in the Kitty Backend. The system supports seat assignment, locking/unlocking, and real-time updates via Socket.IO.

## Key Concepts

### Seat Indexing

- **0-based indexing**: Seats are numbered from `0` to `maxSeats - 1`
- **Seat 0 (Host Seat)**: Reserved exclusively for room owner/host
- **Other Seats**: Available for participants (seats 1-7 for 8-seat room)

### Seat States

- **Occupied**: A user is sitting in the seat
- **Locked**: Seat is locked by host/owner (cannot be used)
- **Available**: Seat is free and can be occupied

## Socket.IO Events

### Connection

```dart
// Connect to rooms namespace
socket = IO.io('http://localhost:3001', OptionBuilder()
    .setNamespace('/rooms')
    .setTransports(['websocket'])
    .build());
```

### Authentication

```dart
// Authenticate after connection
socket.emit('authenticate', {'token': 'your_jwt_token'});
```

## Room Joining with Seat Selection

### Event: `joinRoom`

Join a room with optional seat selection.

**Client → Server:**

```dart
socket.emit('joinRoom', {
  'roomId': 'room-uuid',
  'seatNumber': 2,           // Optional: 0-based seat index
  'password': 'room-password' // Optional: for private rooms
});
```

**Server Response:**

```dart
socket.on('joinRoom', (data) {
  if (data['status'] == 'success') {
    final participant = data['participant'];
    final seatIndex = data['seatIndex'];     // 0-based assigned seat
    final seats = data['seats'];             // Current room seat state
    final roomUserCount = data['roomUserCount'];

    // Update UI with seat assignment
    updateRoomSeats(seats);
    updateParticipant(participant);
  } else {
    // Handle error
    showError(data['message']);
  }
});
```

### Auto-Assignment

```dart
// Join without specifying seat (auto-assigns next available)
socket.emit('joinRoom', {
  'roomId': 'room-uuid'
});
```

## Seat Management Events

### Event: `toggleSeatLock`

Lock or unlock a seat (Host/Owner only).

**Client → Server:**

```dart
socket.emit('toggleSeatLock', {
  'roomId': 'room-uuid',
  'seatIndex': 3,        // 0-based seat index
  'isLocked': true       // true to lock, false to unlock
});
```

**Server Response:**

```dart
socket.on('toggleSeatLock', (data) {
  if (data['status'] == 'success') {
    final result = data['result'];
    final seats = data['seats'];    // Updated seat state

    updateRoomSeats(seats);
  }
});
```

### Event: `getRoomSeats`

Get current seat state for a room.

**Client → Server:**

```dart
socket.emit('getRoomSeats', {
  'roomId': 'room-uuid'
});
```

**Server Response:**

```dart
socket.on('getRoomSeats', (data) {
  if (data['status'] == 'success') {
    final seats = data['seats'];
    updateRoomSeats(seats);
  }
});
```

### Event: `requestSeat`

Alternative way to request a specific seat.

**Client → Server:**

```dart
socket.emit('requestSeat', {
  'roomId': 'room-uuid',
  'seatIndex': 2         // Optional: specific seat
});
```

## Real-Time Updates

### Event: `seatUpdated`

Broadcast when seat state changes.

**Server → Client:**

```dart
socket.on('seatUpdated', (data) {
  final roomId = data['roomId'];
  final seats = data['seats'];
  final action = data['action'];    // 'user_joined', 'user_left', 'lock_toggle'

  // Update UI with new seat state
  updateRoomSeats(seats);

  // Handle specific actions
  switch (action) {
    case 'user_joined':
      showNotification('${data['userName']} joined');
      break;
    case 'user_left':
      showNotification('User left');
      break;
    case 'lock_toggle':
      showNotification('Seat ${data['seatIndex']} ${data['isLocked'] ? 'locked' : 'unlocked'}');
      break;
  }
});
```

### Event: `userJoined`

When a user joins the room.

**Server → Client:**

```dart
socket.on('userJoined', (data) {
  final roomId = data['roomId'];
  final participant = data['participant'];
  final userName = data['userName'];
  final seatIndex = data['seatIndex'];  // 0-based

  addParticipant(participant);
  showNotification('$userName joined seat $seatIndex');
});
```

### Event: `userLeft`

When a user leaves the room.

**Server → Client:**

```dart
socket.on('userLeft', (data) {
  final roomId = data['roomId'];
  final userId = data['userId'];
  final userName = data['userName'];

  removeParticipant(userId);
  showNotification('$userName left the room');
});
```

## Leaving Rooms

### Event: `leaveRoom`

Leave a room (frees up the seat).

**Client → Server:**

```dart
socket.emit('leaveRoom', 'room-uuid');
```

**Server Response:**

```dart
socket.on('leaveRoom', (data) {
  if (data['status'] == 'success') {
    final seats = data['seats'];
    final roomUserCount = data['roomUserCount'];

    updateRoomSeats(seats);
    // Navigate away or update UI
  }
});
```

## Data Structures

### Seat Object

```dart
class Seat {
  final int index;              // 0-based seat index
  final bool locked;            // Is seat locked by host
  final bool occupied;          // Is seat currently occupied
  final String? occupantUserId; // User ID of occupant (null if empty)

  Seat({
    required this.index,
    required this.locked,
    required this.occupied,
    this.occupantUserId,
  });

  factory Seat.fromJson(Map<String, dynamic> json) {
    return Seat(
      index: json['index'],
      locked: json['locked'],
      occupied: json['occupied'],
      occupantUserId: json['occupantUserId'],
    );
  }
}
```

### Participant Object

```dart
class RoomParticipant {
  final String userId;
  final String name;
  final String? avatar;
  final int seatIndex;     // 0-based seat index
  final bool isSpeaking;
  final bool micOn;
  final String role;       // 'host', 'admin', 'speaker', 'guest'

  RoomParticipant({
    required this.userId,
    required this.name,
    this.avatar,
    required this.seatIndex,
    required this.isSpeaking,
    required this.micOn,
    required this.role,
  });

  factory RoomParticipant.fromJson(Map<String, dynamic> json) {
    return RoomParticipant(
      userId: json['userId'],
      name: json['name'],
      avatar: json['avatar'],
      seatIndex: json['seatIndex'],
      isSpeaking: json['isSpeaking'],
      micOn: json['micOn'],
      role: json['role'],
    );
  }
}
```

## HTTP API Endpoints

### Join Room with Seat Selection

```dart
// POST /api/rooms/:roomId/join
final response = await http.post(
  Uri.parse('$baseUrl/api/rooms/$roomId/join'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'seatNumber': 2,        // Optional: 0-based seat index
    'password': 'password'  // Optional: for private rooms
  }),
);

final data = jsonDecode(response.body);
if (data['statusCode'] == 201) {
  final participant = data['data']['participant'];
  final seatIndex = data['data']['seatIndex'];
  final seats = data['data']['seats'];
}
```

### Get Room Seats

```dart
// GET /api/rooms/:roomId/seats
final response = await http.get(
  Uri.parse('$baseUrl/api/rooms/$roomId/seats'),
  headers: {'Authorization': 'Bearer $token'},
);

final data = jsonDecode(response.body);
if (data['statusCode'] == 200) {
  final seats = (data['data'] as List)
      .map((seat) => Seat.fromJson(seat))
      .toList();
}
```

### Toggle Seat Lock

```dart
// POST /api/rooms/:roomId/seats/toggle-lock
final response = await http.post(
  Uri.parse('$baseUrl/api/rooms/$roomId/seats/toggle-lock'),
  headers: {
    'Authorization': 'Bearer $token',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'seatIndex': 3,
    'isLocked': true
  }),
);
```

## Implementation Example

### Flutter Room Screen

```dart
class RoomScreen extends StatefulWidget {
  final String roomId;
  const RoomScreen({required this.roomId});

  @override
  _RoomScreenState createState() => _RoomScreenState();
}

class _RoomScreenState extends State<RoomScreen> {
  IO.Socket? socket;
  List<Seat> seats = [];
  List<RoomParticipant> participants = [];

  @override
  void initState() {
    super.initState();
    initSocket();
  }

  void initSocket() {
    socket = IO.io('http://localhost:3001', OptionBuilder()
        .setNamespace('/rooms')
        .setTransports(['websocket'])
        .build());

    socket!.connect();

    // Authenticate
    socket!.emit('authenticate', {'token': 'your_jwt_token'});

    // Listen for seat updates
    socket!.on('seatUpdated', (data) {
      setState(() {
        seats = (data['seats'] as List)
            .map((seat) => Seat.fromJson(seat))
            .toList();
      });
    });

    // Listen for user joined
    socket!.on('userJoined', (data) {
      final participant = RoomParticipant.fromJson(data['participant']);
      setState(() {
        participants.add(participant);
      });
    });

    // Listen for user left
    socket!.on('userLeft', (data) {
      setState(() {
        participants.removeWhere((p) => p.userId == data['userId']);
      });
    });
  }

  void joinRoom({int? seatIndex}) {
    socket!.emit('joinRoom', {
      'roomId': widget.roomId,
      if (seatIndex != null) 'seatNumber': seatIndex,
    });
  }

  void toggleSeatLock(int seatIndex, bool isLocked) {
    socket!.emit('toggleSeatLock', {
      'roomId': widget.roomId,
      'seatIndex': seatIndex,
      'isLocked': isLocked,
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Room')),
      body: Column(
        children: [
          // Seat Grid
          Expanded(
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                mainAxisSpacing: 8,
                crossAxisSpacing: 8,
              ),
              itemCount: seats.length,
              itemBuilder: (context, index) {
                final seat = seats[index];
                return GestureDetector(
                  onTap: () {
                    if (!seat.occupied && !seat.locked) {
                      joinRoom(seatIndex: seat.index);
                    }
                  },
                  onLongPress: () {
                    // Only host can lock/unlock
                    if (isHost) {
                      toggleSeatLock(seat.index, !seat.locked);
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: seat.occupied
                          ? Colors.green
                          : seat.locked
                              ? Colors.red
                              : Colors.grey,
                      borderRadius: BorderRadius.circular(8),
                      border: seat.index == 0
                          ? Border.all(color: Colors.gold, width: 2)
                          : null,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Seat ${seat.index}'),
                        if (seat.index == 0) Text('HOST', style: TextStyle(fontWeight: FontWeight.bold)),
                        if (seat.locked) Icon(Icons.lock),
                        if (seat.occupied) Text('Occupied'),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Participants List
          Container(
            height: 100,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: participants.length,
              itemBuilder: (context, index) {
                final participant = participants[index];
                return Container(
                  width: 80,
                  margin: EdgeInsets.all(4),
                  child: Column(
                    children: [
                      CircleAvatar(
                        backgroundImage: participant.avatar != null
                            ? NetworkImage(participant.avatar!)
                            : null,
                        child: participant.avatar == null
                            ? Text(participant.name[0])
                            : null,
                      ),
                      Text(participant.name, style: TextStyle(fontSize: 12)),
                      Text('Seat ${participant.seatIndex}', style: TextStyle(fontSize: 10)),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    socket?.disconnect();
    super.dispose();
  }
}
```

## Error Handling

### Common Errors

- `"Room is full"` - All seats are occupied
- `"Seat 0 is reserved for host/owner only"` - Non-host tried to use seat 0
- `"Seat X is currently locked"` - Tried to use a locked seat
- `"Seat X is already occupied"` - Tried to use an occupied seat
- `"Only room owner or host can lock/unlock seats"` - Permission denied
- `"User is already in the room"` - User already has a seat

### Handle Errors

```dart
socket.on('joinRoom', (data) {
  if (data['status'] == 'error') {
    switch (data['message']) {
      case 'Room is full':
        showSnackBar('Room is full. Try again later.');
        break;
      case 'Seat 0 is reserved for host/owner only':
        showSnackBar('Seat 0 is reserved for the host.');
        break;
      default:
        showSnackBar(data['message']);
    }
  }
});
```

## Best Practices

1. **Always listen for `seatUpdated`** to keep UI synchronized
2. **Handle disconnections gracefully** - seats are automatically freed
3. **Validate permissions** before showing lock/unlock options
4. **Show visual indicators** for seat states (occupied, locked, host seat)
5. **Implement retry logic** for failed seat requests
6. **Cache seat state locally** for better UX during network issues

## Testing

### Test Scenarios

1. **Join with specific seat**: Test seat assignment
2. **Join with auto-assignment**: Test automatic seat allocation
3. **Lock/unlock seats**: Test host permissions
4. **Disconnect handling**: Test seat cleanup
5. **Multiple users**: Test concurrent seat operations
6. **Permission validation**: Test non-host restrictions

This documentation provides everything needed to implement the real-time seat management system in a Flutter application.
