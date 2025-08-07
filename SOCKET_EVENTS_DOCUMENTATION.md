# Socket Events Documentation

## Overview

This document describes all the socket events emitted by the Room Gateway after each action to provide real-time updates to connected clients.

## Connection Events

### `connected`

Emitted when a client successfully connects to the WebSocket server.

```typescript
{
  success: true,
  message: 'Connected to real-time server',
  socketId: string,
  timestamp: string
}
```

### `connectionStatusUpdate`

Additional connection status update event.

```typescript
{
  status: 'connected',
  socketId: string,
  timestamp: string
}
```

### `setupComplete`

Emitted after successful user setup/authentication.

```typescript
{
  status: 'success',
  userId: string,
  socketId: string,
  timestamp: string
}
```

## Room Events

### `roomJoinUpdate`

Emitted when a user joins a room (via `roomID` or `joinRoom` events).

```typescript
{
  action: 'user_joined',
  roomId: string,
  userId: string,
  userName: string,
  participant: RoomParticipant,
  seatIndex: number,
  roomUserCount: number,
  timestamp: string
}
```

### `roomLeaveUpdate`

Emitted when a user leaves a room or disconnects.

```typescript
{
  action: 'user_left' | 'user_disconnected',
  roomId: string,
  userId: string,
  userName: string,
  roomUserCount: number,
  timestamp: string
}
```

### `roomSeatsUpdate`

Emitted when room seats are updated (after kicks, joins, leaves).

```typescript
{
  roomId: string,
  seats: RoomSeat[]
}
```

### `roomUpdate`

Comprehensive room state update event.

```typescript
{
  action: 'participant_removed' | 'state_changed',
  roomId: string,
  removedUserId?: string,
  removedUserName?: string,
  seats: RoomSeat[],
  participantCount: number,
  timestamp: string
}
```

### `roomStateUpdate`

Utility event for comprehensive room state updates.

```typescript
{
  action: string,
  roomId: string,
  roomUserCount: number,
  seats: RoomSeat[],
  participantCount: number,
  timestamp: string,
  ...additionalData
}
```

## User Status Events

### `toggleMute`

Original mute toggle event (maintained for compatibility).

```typescript
{
  roomId: string,
  userInfo: {
    userId: string,
    name: string,
    avatar: string | null,
    seatIndex: number,
    isSpeaking: boolean,
    micOn: boolean,
    role: string
  }
}
```

### `muteStatusUpdate`

Enhanced mute status update event.

```typescript
{
  action: 'muted' | 'unmuted',
  roomId: string,
  targetUserId: string,
  targetUserName: string,
  seatIndex: number,
  isMuted: boolean,
  micOn: boolean,
  actionBy: {
    userId: string,
    userName: string
  },
  timestamp: string
}
```

### `deafenStatusUpdate`

Emitted when a user toggles deafen status.

```typescript
{
  action: 'deafened' | 'undeafened',
  roomId: string,
  userId: string,
  userName: string,
  isDeafened: boolean,
  timestamp: string
}
```

### `videoStatusUpdate`

Emitted when a user toggles video status.

```typescript
{
  action: 'video_on' | 'video_off',
  roomId: string,
  userId: string,
  userName: string,
  isVideoOn: boolean,
  timestamp: string
}
```

### `speakingStatusUpdate`

Emitted when a user starts/stops speaking.

```typescript
{
  action: 'started_speaking' | 'stopped_speaking',
  roomId: string,
  userId: string,
  userName: string,
  isSpeaking: boolean,
  timestamp: string
}
```

### `participantStatusUpdate`

General participant status update event.

```typescript
{
  roomId: string,
  userId: string,
  userName: string,
  status: {
    isMuted?: boolean,
    micOn?: boolean,
    isDeafened?: boolean,
    isVideoOn?: boolean,
    isSpeaking?: boolean
  },
  timestamp: string
}
```

## Kick Events

### `userKicked`

Emitted to the kicked user specifically.

```typescript
{
  roomId: string,
  participantID: string,
  seatIndex?: number,
  reason: string,
  kickedBy: {
    userId: string,
    userName: string
  }
}
```

### `participantKicked`

Emitted to all room participants about a kick.

```typescript
{
  roomId: string,
  participantID: string,
  seatIndex?: number,
  kickedUserId: string,
  kickedUserName: string,
  kickedBy: {
    userId: string,
    userName: string
  },
  timestamp: string
}
```

### `kickActivityUpdate`

Enhanced kick activity update event.

```typescript
{
  action: 'user_kicked',
  roomId: string,
  kickedUserId: string,
  kickedUserName: string,
  seatIndex?: number,
  kickedBy: {
    userId: string,
    userName: string
  },
  roomUserCount: number,
  timestamp: string
}
```

## Comment Events

### `ReceivedComment`

Emitted when a new comment is posted.

```typescript
{
  content: string,
  senderId: string,
  senderName: string,
  senderImage: string | null,
  createdAt: string,
  roomId: string,
  commentId: string,
  messageType: string,
  replyToId?: string,
  metadata?: any
}
```

### `commentDeleted`

Emitted when a comment is deleted.

```typescript
{
  roomId: string,
  commentId: string,
  deletedBy: string,
  deletedByName: string,
  timestamp: string
}
```

### `commentActivityUpdate`

Enhanced comment activity tracking.

```typescript
{
  action: 'comment_added' | 'comment_deleted',
  roomId: string,
  commentId: string,
  senderId?: string,
  senderName?: string,
  deletedBy?: string,
  deletedByName?: string,
  timestamp: string
}
```

### `commentReaction`

Emitted when someone reacts to a comment.

```typescript
{
  roomId: string,
  commentId: string,
  reaction: string,
  action: 'add' | 'remove',
  userId: string,
  userName: string,
  reactions: object,
  timestamp: string
}
```

## Gift Events

### `giftSent`

Emitted to the gift sender.

```typescript
{
  success: true,
  transaction: GiftTransaction,
  roomId: string
}
```

### `giftReceived`

Emitted to the gift receiver.

```typescript
{
  transaction: GiftTransaction,
  roomId: string
}
```

### `roomGiftSent`

Emitted to all room participants about a gift.

```typescript
{
  roomId: string,
  transaction: GiftTransaction,
  sender: { id: string, name: string },
  receiver: { id: string }
}
```

### `giftActivityUpdate`

Enhanced gift activity tracking.

```typescript
{
  action: 'gift_sent',
  roomId: string,
  transactionId: string,
  senderId: string,
  senderName: string,
  receiverId: string,
  giftId: string,
  timestamp: string
}
```

## Disconnect Events

### `disconnectActivityUpdate`

Emitted when a user disconnects from a room.

```typescript
{
  action: 'user_disconnected',
  roomId: string,
  userId: string,
  userName: string,
  roomUserCount: number,
  timestamp: string
}
```

## Activity Tracking Events

### `userActivityUpdate`

General user activity tracking (emitted to room participants).

```typescript
{
  action: string,
  userId: string,
  userName: string,
  roomId: string,
  timestamp: string,
  ...additionalData
}
```

### `activityUpdate`

Personal activity update (emitted to user's personal channel).

```typescript
{
  action: string,
  userId: string,
  userName: string,
  timestamp: string,
  ...additionalData
}
```

## Legacy Events (Maintained for Compatibility)

### `userJoined`

```typescript
{
  roomId: string,
  participant: RoomParticipant,
  userName: string,
  seatIndex: number
}
```

### `userLeft`

```typescript
{
  roomId: string,
  userId: string,
  userName: string
}
```

### `seatUpdated`

```typescript
{
  roomId: string,
  seats: RoomSeat[],
  action?: string,
  userId?: string
}
```

## Client Usage

### Flutter/Dart Example

```dart
// Listen to multiple events for comprehensive updates
socket.on('roomJoinUpdate', (data) => handleRoomJoinUpdate(data));
socket.on('muteStatusUpdate', (data) => handleMuteStatusUpdate(data));
socket.on('kickActivityUpdate', (data) => handleKickActivity(data));
socket.on('commentActivityUpdate', (data) => handleCommentActivity(data));
socket.on('roomStateUpdate', (data) => handleRoomStateUpdate(data));
```

### JavaScript Example

```javascript
// Listen to enhanced events
socket.on('connectionStatusUpdate', (data) => console.log('Connection:', data))
socket.on('roomJoinUpdate', (data) => updateRoomUI(data))
socket.on('muteStatusUpdate', (data) => updateMuteUI(data))
socket.on('participantStatusUpdate', (data) => updateParticipantStatus(data))
```

## Notes

1. **Backward Compatibility**: Original events like `toggleMute`, `userJoined`, `userLeft` are maintained alongside new enhanced events.

2. **Enhanced Tracking**: New events provide more detailed information including timestamps, action types, and user context.

3. **Consistent Structure**: All new events follow a consistent structure with `action`, `timestamp`, and relevant context data.

4. **Multiple Events**: Most actions now emit both the original event and an enhanced tracking event for better client flexibility.

5. **Real-time Updates**: All events are emitted immediately after successful database operations to ensure real-time synchronization.
