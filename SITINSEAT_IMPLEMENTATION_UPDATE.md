# SitInSeat Backend Implementation Update

## Overview

Updated the `sitInSeat` WebSocket handler to match Flutter's expected response format with three possible statuses: `"waiting"`, `"rejected"`, and `"accepted"`.

## Flutter Expected Behavior

Flutter expects the following response structure:

```typescript
{
  status: "waiting" | "rejected" | "accepted",
  message?: string,
  user: {
    id: string,
    name: string,
    email: string,
    sitIndex: string,
    image: string
  }
}
```

## Updated Backend Logic

### 1. Status: "waiting"

**When**: Seat is locked AND user is not the host
**Action**: Add user to waiting list and notify host
**Response**:

```typescript
{
  status: 'waiting',
  message: 'Seat is locked. Added to waiting list for host approval.',
  user: {
    id: userId,
    name: userName,
    email: userEmail,
    sitIndex: seatIndex.toString(),
    image: avatarUrl
  }
}
```

### 2. Status: "rejected"

**When**:

- Seat is occupied
- Invalid seat index
- User information not available
- Any other error occurs

**Response**:

```typescript
{
  status: 'rejected',
  message: errorMessage,
  user: {
    id: userId,
    name: userName,
    email: '',
    sitIndex: seatIndex?.toString() || '',
    image: ''
  }
}
```

### 3. Status: "accepted"

**When**:

- Seat is available and unlocked
- OR user is host and can sit in locked seats

**Response**:

```typescript
{
  status: 'accepted',
  message: `Successfully seated in seat ${seatIndex}`,
  user: {
    id: userId,
    name: userName,
    email: userEmail,
    sitIndex: seatIndex.toString(),
    image: avatarUrl
  }
}
```

## Key Features Added

### ✅ Waiting List Support

- Users are added to waiting list when trying to sit in locked seats
- Host receives `participantWaiting` notification
- Position tracking for queue management

### ✅ Host Notifications

When a user is added to waiting list, the host receives:

```typescript
socket.emit('participantWaiting', {
    roomId,
    participantId: userId,
    participantName: userName,
    seatIndex: seatIndex,
    timestamp: new Date().toISOString()
})
```

### ✅ Automatic joinRoomResponse

When user successfully sits down, they automatically receive:

```typescript
socket.emit('joinRoomResponse', {
    userId,
    name: userName,
    avatar: avatarUrl,
    seatIndex,
    isSpeaking: false,
    micOn: !participant.isMuted,
    role: 'participant'
})
```

### ✅ Real-time Updates

All room participants receive seat updates via:

```typescript
socket.emit('seatUpdated', {
    roomId,
    seatIndex,
    occupied: true,
    user: { id, name, avatar },
    timestamp: new Date().toISOString()
})
```

## Flutter Integration

### Handle sitInSeatResponse

```dart
void _handleSitInSeatResponse(dynamic raw) {
  final data = Map<String, dynamic>.from(raw ?? {});
  final status = data['status'] as String?;
  final user = Map<String, dynamic>.from(data['user'] ?? {});
  final userId = user['id'] as String?;
  final seatIdx = user['sitIndex'];

  if (status == 'waiting') {
    // Add to waiting list
    final i = waitingList.indexWhere((w) => w.id == userId);
    if (i > -1) {
      waitingList[i].seatIndex = seatIdx?.toString();
    } else {
      data['seatIndex'] = seatIdx;
      waitingList.add(WaitingListModel.fromJson(user));
    }
    debugPrint('Added to waiting list');
    notifyListeners();
    return;
  }

  if (status == 'rejected') {
    // Remove from waiting list if exists
    waitingList.removeWhere((w) => w.id == data['id']);
    notifyListeners();
    return;
  }

  if (status == 'accepted') {
    // Remove from waiting list and update local state
    waitingList.removeWhere((w) => w.id == data['id']);
    notifyListeners();

    // If it's me, apply role and mic settings
    if (userId == getUserID) {
      _applyLocalRoleAndMicFromModel();
    }
    debugPrint("Sit user in seat confirmed by server");
  }
}
```

## Host Workflow

1. **User requests locked seat** → Backend adds to waiting list
2. **Host receives notification** → `participantWaiting` event
3. **Host can accept/reject** → Use `acceptParticipant`/`rejectParticipant` events
4. **User gets seated** → Automatic `joinRoomResponse` sent

## Error Handling

All errors are properly caught and return `"rejected"` status with descriptive messages:

- "Seat is already occupied"
- "Invalid seat index"
- "User information not available"
- "Room ID is required"
- "Seat index is required"

## Benefits

### ✅ Flutter Compatibility

- Exact response format matching Flutter expectations
- Three-state system (waiting/rejected/accepted)
- Proper user object structure

### ✅ Enhanced UX

- Clear waiting list management
- Host notifications for approval workflow
- Real-time seat state synchronization

### ✅ Robust Error Handling

- Descriptive error messages
- Graceful fallbacks
- Proper validation

### ✅ Real-time Features

- Immediate feedback to users
- Host approval workflow
- Live seat state updates

The updated implementation ensures seamless integration with the Flutter client while providing a robust seat management system with waiting list support and host approval workflows.
