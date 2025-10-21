# Leave Seat WebSocket Event Documentation

## Overview
The `leaveSeat` event allows users to leave their seat in a room **without leaving the room entirely**. When a user leaves their seat:
- Their microphone is automatically muted
- Their video is turned off
- They stop speaking
- Their seat becomes available for other users
- They remain as a participant in the room (can still chat, send gifts, etc.)

---

## WebSocket Event

### Event Name: `leaveSeat`

**Description:** Remove user from their current seat while keeping them in the room

---

## Request Payload

```typescript
{
  roomId: string       // Required: Room UUID
  userId?: string      // Optional: User UUID (defaults to authenticated user)
}
```

### Payload Example
```json
{
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-uuid-123"
}
```

**Notes:**
- If `userId` is not provided, the authenticated user's ID from the socket connection will be used
- Only the user sitting in a seat or room moderators can trigger this action

---

## Response Events

### 1. **Direct Response to Client** (Acknowledgment)

**Event:** Return value from `leaveSeat` event

```typescript
{
  status: 'success' | 'error'
  roomId: string
  userId: string
  previousSeatIndex: number           // The seat index user left from
  seats: Array<SeatInfo>              // Updated seat state for all seats
  message: string
  microphoneMuted: boolean            // Always true on success
}
```

**Success Response Example:**
```json
{
  "status": "success",
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-uuid-123",
  "previousSeatIndex": 3,
  "seats": [
    {
      "seatIndex": 0,
      "isLocked": false,
      "isAdminSeat": true,
      "isOccupied": true,
      "userId": "owner-uuid",
      "userName": "Room Owner",
      "userAvatar": "https://example.com/avatar.jpg",
      "micOn": true,
      "isSpeaking": false,
      "videoOn": false
    },
    {
      "seatIndex": 1,
      "isLocked": false,
      "isAdminSeat": false,
      "isOccupied": false,
      "userId": null,
      "userName": null,
      "userAvatar": null,
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    },
    {
      "seatIndex": 2,
      "isLocked": true,
      "isAdminSeat": false,
      "isOccupied": false,
      "userId": null,
      "userName": null,
      "userAvatar": null,
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    },
    {
      "seatIndex": 3,
      "isLocked": false,
      "isAdminSeat": false,
      "isOccupied": false,
      "userId": null,
      "userName": null,
      "userAvatar": null,
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    }
  ],
  "message": "Successfully left seat 3",
  "microphoneMuted": true
}
```

**Error Response Example:**
```json
{
  "status": "error",
  "message": "User is not sitting in any seat",
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-uuid-123"
}
```

---

### 2. **Broadcast Event: `seatLeft`** (To All Room Participants)

**Description:** Notifies all participants in the room that a user has left their seat

**⭐ Use this event in your Flutter client** - It contains all necessary information

```typescript
{
  status: 'success'
  roomId: string
  userId: string
  userName: string
  previousSeatIndex: number
  seats: Array<SeatInfo>              // Complete updated seat state
  timestamp: string                   // ISO 8601 format
  message: string
}
```

**Complete Example:**
```json
{
  "status": "success",
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "userId": "user-uuid-123",
  "userName": "John Doe",
  "previousSeatIndex": 3,
  "seats": [
    {
      "seatIndex": 0,
      "isLocked": false,
      "isAdminSeat": true,
      "isOccupied": true,
      "userId": "owner-uuid-456",
      "userName": "Room Owner",
      "userAvatar": "https://example.com/owner-avatar.jpg",
      "micOn": true,
      "isSpeaking": false,
      "videoOn": true
    },
    {
      "seatIndex": 1,
      "isLocked": false,
      "isAdminSeat": false,
      "isOccupied": true,
      "userId": "user-uuid-789",
      "userName": "Alice Smith",
      "userAvatar": "https://example.com/alice-avatar.jpg",
      "micOn": true,
      "isSpeaking": true,
      "videoOn": false
    },
    {
      "seatIndex": 2,
      "isLocked": true,
      "isAdminSeat": false,
      "isOccupied": false,
      "userId": null,
      "userName": null,
      "userAvatar": null,
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    },
    {
      "seatIndex": 3,
      "isLocked": false,
      "isAdminSeat": false,
      "isOccupied": false,
      "userId": null,
      "userName": null,
      "userAvatar": null,
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    },
    {
      "seatIndex": 4,
      "isLocked": false,
      "isAdminSeat": false,
      "isOccupied": true,
      "userId": "user-uuid-999",
      "userName": "Bob Johnson",
      "userAvatar": "https://example.com/bob-avatar.jpg",
      "micOn": false,
      "isSpeaking": false,
      "videoOn": false
    }
  ],
  "timestamp": "2025-10-21T15:30:45.123Z",
  "message": "John Doe left seat 3"
}
```

---

## Seat Info Object Structure

```typescript
interface SeatInfo {
  seatIndex: number
  isLocked: boolean
  isAdminSeat: boolean
  isOccupied: boolean
  userId: string | null
  userName: string | null
  userAvatar?: string | null
  micOn?: boolean
  isSpeaking?: boolean
  videoOn?: boolean
}
```

---

## Error Cases

### 1. **User Not in Room**
```json
{
  "status": "error",
  "message": "User is not a participant in this room"
}
```

### 2. **User Not in Any Seat**
```json
{
  "status": "error",
  "message": "User is not sitting in any seat"
}
```

### 3. **Invalid Room**
```json
{
  "status": "error",
  "message": "Room not found",
  "roomId": "invalid-room-id",
  "userId": "user-uuid-123"
}
```

---

## What Happens When User Leaves Seat

### ✅ User State Changes:
1. **Seat Number** → `null` (no longer occupying a seat)
2. **Microphone** → `muted` (isMuted: true)
3. **Speaking Status** → `false` (isSpeaking: false)
4. **Video** → `off` (isVideoOn: false)

### ✅ Seat State Changes:
1. **Seat becomes available** for other users to occupy
2. **Seat unlocks** if it was locked by this user
3. **Admin seat (seat 0)** rankings are updated if applicable

### ✅ Room State:
1. **User remains in room** (can still chat, view, send gifts)
2. **Room participant count** unchanged
3. **User still connected** via WebSocket

### ❌ What Does NOT Happen:
- User is NOT removed from room participants
- User does NOT disconnect from WebSocket
- User can still send messages and interact
- User's room membership is NOT affected

---

## Flutter/Mobile Client Implementation

### 1. **Send Leave Seat Request**

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class RoomSocketService {
  IO.Socket? socket;

  // Leave seat while staying in room
  Future<void> leaveSeat(String roomId) async {
    if (socket == null || !socket!.connected) {
      throw Exception('Socket not connected');
    }

    // Send leave seat request
    socket!.emit('leaveSeat', {
      'roomId': roomId,
      // userId is optional, will default to authenticated user
    });

    print('🪑 Sent leaveSeat request for room: $roomId');
  }

  // Alternative: Specify user ID explicitly
  Future<void> leaveSeatForUser(String roomId, String userId) async {
    socket!.emit('leaveSeat', {
      'roomId': roomId,
      'userId': userId,
    });
  }
}
```

---

### 2. **Listen for Leave Seat Events**

```dart
class RoomSocketService {

  // ⭐ BEST PRACTICE: Listen only to 'seatLeft' event
  // This event contains all necessary information for UI updates
  void setupLeaveSeatListeners() {

    // Listen for seatLeft broadcast (any user leaving their seat)
    socket!.on('seatLeft', (data) {
      print('🪑 User left seat: ${data['userName']} from seat ${data['previousSeatIndex']}');

      final response = SeatLeftResponse.fromJson(data);

      // Update UI with complete seat information
      _handleUserLeftSeat(response);
    });
  }

  void _handleUserLeftSeat(SeatLeftResponse response) {
    // 1. Update complete seat state (response.seats contains ALL seats)
    _updateAllSeats(response.seats);

    // 2. Show notification
    _showNotification(
      '${response.userName} left seat ${response.previousSeatIndex}'
    );

    // 3. If it's the current user, update local audio state
    if (response.userId == currentUserId) {
      _muteLocalMicrophone();
      _disableLocalVideo();
      _updateLocalSeatState(null); // No longer in a seat
    }

    // 4. Update specific seat as available
    _markSeatAsAvailable(response.previousSeatIndex);

    // 5. Enable "Sit" button for that seat
    _enableSeatButton(response.previousSeatIndex);
  }

  void _updateAllSeats(List<SeatInfo> seats) {
    // Update your entire seat grid/list with the latest state
    // This ensures all seats are in sync
    for (var seat in seats) {
      _updateSeatWidget(seat);
    }
  }
}
```

---

### 3. **Data Models**

```dart
class SeatLeftResponse {
  final String status;
  final String roomId;
  final String userId;
  final String userName;
  final int previousSeatIndex;
  final List<SeatInfo> seats;
  final String timestamp;
  final String message;

  SeatLeftResponse.fromJson(Map<String, dynamic> json)
      : status = json['status'],
        roomId = json['roomId'],
        userId = json['userId'],
        userName = json['userName'],
        previousSeatIndex = json['previousSeatIndex'],
        seats = (json['seats'] as List)
            .map((s) => SeatInfo.fromJson(s))
            .toList(),
        timestamp = json['timestamp'],
        message = json['message'];
}

class SeatInfo {
  final int seatIndex;
  final bool isLocked;
  final bool isAdminSeat;
  final bool isOccupied;
  final String? userId;
  final String? userName;
  final String? userAvatar;
  final bool? micOn;
  final bool? isSpeaking;
  final bool? videoOn;

  SeatInfo.fromJson(Map<String, dynamic> json)
      : seatIndex = json['seatIndex'],
        isLocked = json['isLocked'],
        isAdminSeat = json['isAdminSeat'],
        isOccupied = json['isOccupied'],
        userId = json['userId'],
        userName = json['userName'],
        userAvatar = json['userAvatar'],
        micOn = json['micOn'],
        isSpeaking = json['isSpeaking'],
        videoOn = json['videoOn'];
}
```

---

### 4. **UI Implementation Example**

```dart
class RoomSeatWidget extends StatelessWidget {
  final RoomSocketService socketService;
  final String roomId;
  final int currentUserSeatIndex;

  Future<void> _handleLeaveSeat(BuildContext context) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Leave Seat?'),
        content: Text(
          'You will leave your seat and your microphone will be muted. '
          'You will remain in the room and can chat normally.'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Leave Seat'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await socketService.leaveSeat(roomId);

        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Left seat successfully. Microphone muted.'),
            backgroundColor: Colors.green,
          ),
        );
      } catch (e) {
        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to leave seat: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: Icon(Icons.chair_outlined),
      tooltip: 'Leave Seat',
      onPressed: () => _handleLeaveSeat(context),
    );
  }
}
```

---

## Testing Guide

### Test with Postman (WebSocket)

**1. Connect to WebSocket**
```
ws://localhost:3000
```

**2. Send Authentication/Setup**
```json
{
  "event": "setup",
  "data": {
    "userId": "user-uuid-123",
    "token": "your-jwt-token"
  }
}
```

**3. Join Room and Sit in Seat**
```json
{
  "event": "joinRoom",
  "data": {
    "userId": "user-uuid-123",
    "roomID": "room-uuid-456"
  }
}
```

```json
{
  "event": "sitInSeat",
  "data": {
    "roomId": "room-uuid-456",
    "seatIndex": 3,
    "userId": "user-uuid-123"
  }
}
```

**4. Leave Seat**
```json
{
  "event": "leaveSeat",
  "data": {
    "roomId": "room-uuid-456"
  }
}
```

**5. Listen for Events**
- `seatLeft` - User left seat notification
- `seatUpdated` - Seat state update

---

## Difference: Leave Seat vs Leave Room

| Feature | Leave Seat (`leaveSeat`) | Leave Room (`leaveRoom`) |
|---------|-------------------------|-------------------------|
| **Seat Occupied** | ❌ No (seat becomes available) | ❌ No (seat freed) |
| **In Room** | ✅ Yes (remains participant) | ❌ No (removed) |
| **Can Chat** | ✅ Yes | ❌ No |
| **Can Send Gifts** | ✅ Yes | ❌ No |
| **Can View Room** | ✅ Yes | ❌ No |
| **Microphone** | 🔇 Muted (forced) | 🔇 Disconnected |
| **Video** | 📹 Off (forced) | 📹 Disconnected |
| **Participant Count** | ➡️ Unchanged | ⬇️ Decreases |
| **WebSocket Connected** | ✅ Yes (in room) | ⚠️ May disconnect |
| **Use Case** | Temporary break, passive listening | Exit room completely |

---

## Use Cases

### ✅ When to Use `leaveSeat`:
1. **Taking a break** from active participation
2. **Passive listening** mode (no mic needed)
3. **Letting others speak** while still watching
4. **Seat rotation** in crowded rooms
5. **Temporary step away** without leaving room

### ✅ When to Use `leaveRoom`:
1. **Done with the room** entirely
2. **Switching to another room**
3. **App going to background**
4. **User wants to exit** completely

---

## Backend Logic Flow

```
1. Receive leaveSeat event
   ↓
2. Validate user is in room
   ↓
3. Check user has a seat
   ↓
4. Update RoomParticipant:
   - seatNumber = null
   - isMuted = true
   - isSpeaking = false
   - isVideoOn = false
   ↓
5. Update in-memory seat state
   ↓
6. Emit seatLeft to all room participants
   ↓
7. Emit seatUpdated to all room participants
   ↓
8. Update rankings (if leaving admin seat)
   ↓
9. Return success response to client
```

---

## Database Changes

### RoomParticipant Entity Updates:
```typescript
{
  userId: string
  roomId: string
  seatNumber: null              // ✅ Set to null
  isMuted: true                 // ✅ Set to true
  isSpeaking: false             // ✅ Set to false
  isVideoOn: false              // ✅ Set to false
  isDeafened: <unchanged>
  isSharingScreen: <unchanged>
  joinedAt: <unchanged>
}
```

### RoomSeat Entity:
- Seat record remains (not deleted)
- Seat becomes available for other users
- If seat was locked by this user, it may be unlocked

---

## Summary

### Request:
```json
{
  "event": "leaveSeat",
  "data": {
    "roomId": "room-uuid",
    "userId": "user-uuid"  // optional
  }
}
```

### Response Events:
1. **Direct Response** - Success/error acknowledgment with seat details
2. **`seatLeft` Broadcast** - Notify all participants about user leaving seat
3. **`seatUpdated` Broadcast** - Update seat state for all participants

### Key Points:
- ✅ User stays in room
- ✅ Can still chat and interact
- 🔇 Microphone is muted
- 📹 Video is turned off
- 🪑 Seat becomes available
- 💬 Can still send messages

