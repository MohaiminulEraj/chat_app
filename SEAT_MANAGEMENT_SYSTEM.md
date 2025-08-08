# 🪑 Seat Management System Documentation

## Overview

The enhanced seat management system provides a comprehensive room joining experience with specific seat selection, locking mechanisms, and waiting list functionality.

## System Architecture

### Two-Phase Room Joining Process

1. **Phase 1: Join Room as Observer** (`joinRoom` event)

    - User joins room to observe without taking a seat
    - Receives real-time updates about seat availability
    - Can see all available/occupied/locked seats

2. **Phase 2: Sit in Specific Seat** (`sitInSeat` event)
    - User clicks on a specific empty seat to sit
    - System validates seat availability and lock status
    - Handles password requirements and waiting list

## Event Specifications

### 1. `joinRoom` Event

**Purpose**: Join room as observer to view seats and participate in chat

#### Request:

```typescript
{
  roomId: string;
  password?: string; // Only if room requires password
}
```

#### Success Response:

```typescript
{
    status: 'success'
    action: 'room_joined_as_observer'
    roomId: string
    userId: string
    userName: string
    userRole: 'observer'
    seats: Array<{
        seatIndex: number
        isOccupied: boolean
        isLocked: boolean
        occupantUserId: string | null
        occupantUserName: string | null
        occupantAvatar: string | null
    }>
    roomUserCount: number
    waitingListPosition: number | null
    message: string
    timestamp: string
}
```

#### Client Implementation:

```dart
// Flutter/Dart
socket.emit('joinRoom', {
  'roomId': roomId,
  'password': roomPassword, // optional
});

socket.on('joinRoomResponse', (data) {
  if (data['status'] == 'success') {
    print('Joined room as observer');
    // Update UI to show available seats
    updateSeatDisplay(data['seats']);
  }
});
```

### 2. `sitInSeat` Event

**Purpose**: Attempt to sit in a specific seat

#### Request:

```typescript
{
  roomId: string;
  seatIndex: number;
  password?: string; // Required if seat is locked
}
```

#### Success Response:

```typescript
{
    status: 'success'
    action: 'user_seated'
    roomId: string
    userId: string
    userName: string
    participant: ParticipantObject
    seatIndex: number
    userRole: 'participant'
    seats: Array<SeatObject>
    roomUserCount: number
    message: string
    timestamp: string
}
```

#### Waiting List Response:

```typescript
{
    status: 'waiting'
    action: 'added_to_waiting_list'
    roomId: string
    seatIndex: number
    userId: string
    userName: string
    position: number
    message: string
    timestamp: string
}
```

#### Client Implementation:

```dart
// Flutter/Dart
socket.emit('sitInSeat', {
  'roomId': roomId,
  'seatIndex': targetSeatIndex,
  'password': seatPassword, // if seat is locked
});

socket.on('sitInSeatResponse', (data) {
  switch (data['status']) {
    case 'success':
      print('Successfully seated in seat ${data['seatIndex']}');
      // Update UI to show user as seated
      break;
    case 'waiting':
      print('Added to waiting list at position ${data['position']}');
      // Show waiting list UI
      break;
    case 'error':
      print('Failed to sit: ${data['message']}');
      // Show error message
      break;
  }
});
```

## Seat States

### 1. Empty & Unlocked

- **Appearance**: Green/Available
- **Action**: Click to sit immediately
- **Result**: User sits instantly

### 2. Empty & Locked

- **Appearance**: Yellow/Locked with password icon
- **Action**: Click shows password prompt
- **With Password**: User sits if password correct
- **Without Password**: Added to waiting list

### 3. Occupied

- **Appearance**: Red/Occupied with user avatar
- **Action**: No action available
- **Result**: Cannot sit

### 4. Reserved (Waiting List)

- **Appearance**: Orange/Reserved
- **Action**: Shows waiting list position
- **Result**: User can join waiting list

## Real-Time Events

### Server-to-Client Events

#### 1. `roomJoinUpdate`

Comprehensive room state updates

```typescript
{
    action: 'room_joined_as_observer' |
        'user_seated' |
        'added_to_waiting_list' |
        'user_promoted_and_seated'
    roomId: string
    userId: string
    userName: string
    userRole: 'observer' | 'participant'
    seats: Array<SeatObject>
    roomUserCount: number
    timestamp: string
}
```

#### 2. `userSeated`

When someone sits in a seat

```typescript
{
    roomId: string
    participant: ParticipantObject
    userName: string
    seatIndex: number
    userId: string
}
```

#### 3. `seatUpdated`

When seat states change

```typescript
{
  roomId: string;
  seats: Array<SeatObject>;
  action: 'user_seated' | 'user_left' | 'seat_locked' | 'seat_unlocked';
  seatIndex?: number;
  userId?: string;
}
```

#### 4. `userPromotedFromWaitingList`

When a waiting user gets promoted to a seat

```typescript
{
    roomId: string
    userId: string
    userName: string
    seatIndex: number
    participant: ParticipantObject
    seats: Array<SeatObject>
    message: string
    timestamp: string
}
```

## Waiting List System

### How It Works

1. User attempts to sit in locked seat without password
2. User is added to room waiting list (not seat-specific)
3. When any seat becomes available and unlocked:
    - First user in waiting list is automatically promoted
    - User is seated in the first available unlocked seat
    - Real-time notifications sent to all participants

### Waiting List Events

```dart
// Listen for waiting list updates
socket.on('userPromotedFromWaitingList', (data) {
  print('${data['userName']} was promoted to seat ${data['seatIndex']}');
  updateSeatDisplay(data['seats']);
});
```

## Complete Client Implementation Example

### Flutter/Dart Implementation

```dart
class RoomSeatManager {
  Socket socket;
  String roomId;
  List<SeatData> seats = [];
  bool isObserver = true;
  int? currentSeatIndex;
  int? waitingListPosition;

  void joinRoom(String roomId, {String? password}) {
    socket.emit('joinRoom', {
      'roomId': roomId,
      'password': password,
    });
  }

  void sitInSeat(int seatIndex, {String? password}) {
    socket.emit('sitInSeat', {
      'roomId': roomId,
      'seatIndex': seatIndex,
      'password': password,
    });
  }

  void setupEventListeners() {
    // Join room response
    socket.on('joinRoomResponse', (data) {
      if (data['status'] == 'success') {
        updateSeats(data['seats']);
        waitingListPosition = data['waitingListPosition'];
        isObserver = true;
        notifyUI();
      }
    });

    // Sit in seat response
    socket.on('sitInSeatResponse', (data) {
      switch (data['status']) {
        case 'success':
          currentSeatIndex = data['seatIndex'];
          isObserver = false;
          updateSeats(data['seats']);
          showSuccessMessage('Seated in seat ${data['seatIndex']}');
          break;
        case 'waiting':
          waitingListPosition = data['position'];
          showWaitingMessage('Position ${data['position']} in waiting list');
          break;
        case 'error':
          showErrorMessage(data['message']);
          break;
      }
      notifyUI();
    });

    // Real-time room updates
    socket.on('roomJoinUpdate', (data) {
      updateSeats(data['seats']);
      notifyUI();
    });

    // Seat updates
    socket.on('seatUpdated', (data) {
      updateSeats(data['seats']);
      notifyUI();
    });

    // User seated events
    socket.on('userSeated', (data) {
      showNotification('${data['userName']} sat in seat ${data['seatIndex']}');
      notifyUI();
    });

    // Waiting list promotions
    socket.on('userPromotedFromWaitingList', (data) {
      showNotification('${data['userName']} was promoted to seat ${data['seatIndex']}');
      notifyUI();
    });
  }

  void updateSeats(List<dynamic> newSeats) {
    seats = newSeats.map((seat) => SeatData.fromJson(seat)).toList();
  }

  Widget buildSeatWidget(SeatData seat) {
    return GestureDetector(
      onTap: () => handleSeatTap(seat),
      child: Container(
        decoration: BoxDecoration(
          color: getSeatColor(seat),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: seat.seatIndex == currentSeatIndex ? Colors.blue : Colors.grey,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(getSeatIcon(seat)),
            Text('Seat ${seat.seatIndex}'),
            if (seat.isOccupied)
              Text(seat.occupantUserName ?? 'Unknown'),
            if (seat.isLocked && !seat.isOccupied)
              Icon(Icons.lock),
          ],
        ),
      ),
    );
  }

  void handleSeatTap(SeatData seat) {
    if (seat.isOccupied) {
      showMessage('Seat is occupied');
      return;
    }

    if (seat.isLocked) {
      showPasswordDialog((password) {
        sitInSeat(seat.seatIndex, password: password);
      });
    } else {
      sitInSeat(seat.seatIndex);
    }
  }

  Color getSeatColor(SeatData seat) {
    if (seat.isOccupied) return Colors.red[300]!;
    if (seat.isLocked) return Colors.orange[300]!;
    return Colors.green[300]!;
  }

  IconData getSeatIcon(SeatData seat) {
    if (seat.isOccupied) return Icons.person;
    if (seat.isLocked) return Icons.lock;
    return Icons.chair;
  }
}

class SeatData {
  final int seatIndex;
  final bool isOccupied;
  final bool isLocked;
  final String? occupantUserId;
  final String? occupantUserName;
  final String? occupantAvatar;

  SeatData({
    required this.seatIndex,
    required this.isOccupied,
    required this.isLocked,
    this.occupantUserId,
    this.occupantUserName,
    this.occupantAvatar,
  });

  factory SeatData.fromJson(Map<String, dynamic> json) {
    return SeatData(
      seatIndex: json['seatIndex'],
      isOccupied: json['isOccupied'],
      isLocked: json['isLocked'],
      occupantUserId: json['occupantUserId'],
      occupantUserName: json['occupantUserName'],
      occupantAvatar: json['occupantAvatar'],
    );
  }
}
```

## Error Handling

### Common Error Scenarios

1. **Seat Already Occupied**: `"Seat is already occupied"`
2. **Invalid Seat Index**: `"Invalid seat index"`
3. **Room Access Required**: `"You must join the room first before sitting"`
4. **Wrong Password**: Password required for locked seats
5. **No Available Seats**: `"No available seats found"`

### Error Response Format

```typescript
{
  status: 'error';
  message: string;
  roomId: string;
  seatIndex?: number;
}
```

## Best Practices

### UI/UX Recommendations

1. **Visual Seat States**: Use distinct colors/icons for different seat states
2. **Real-time Updates**: Update seat display immediately on events
3. **Waiting List Feedback**: Show clear waiting list position and estimated time
4. **Password Prompts**: Smooth password entry for locked seats
5. **Error Messages**: Clear, actionable error messages

### Performance Considerations

1. **Event Throttling**: Limit rapid seat clicking
2. **State Caching**: Cache seat states locally
3. **Optimistic Updates**: Update UI optimistically, rollback on error
4. **Connection Handling**: Handle reconnection gracefully

This seat management system provides a comprehensive, real-time, and user-friendly room experience with granular seat control and waiting list management.
