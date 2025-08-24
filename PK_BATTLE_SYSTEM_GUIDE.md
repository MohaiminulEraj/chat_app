# PK Battle System Implementation Guide

## 🎯 Overview

The PK Battle system enables real-time competitions between participants in a room where users can send gifts to support their favorite participant. The participant who receives the most valuable gifts wins the battle.

## 🏗️ Architecture

### Database Entities

#### 1. PKBattle Entity

- **Purpose**: Main battle record
- **Key Fields**:
    - `roomId`, `hostId`, `battleType`, `status`, `duration`
    - `startTime`, `endTime`, `winnerId`, `totalGiftsValue`
- **Statuses**: `pending`, `approved`, `active`, `completed`, `cancelled`, `expired`

#### 2. PKBattleParticipant Entity

- **Purpose**: Tracks participants and their stats
- **Key Fields**:
    - `battleId`, `userId`, `position`, `status`
    - `totalGiftsReceived`, `giftCount`, `joinedAt`
- **Statuses**: `invited`, `accepted`, `declined`, `active`, `completed`

#### 3. PKBattleGift Entity

- **Purpose**: Records all gifts sent during battles
- **Key Fields**:
    - `battleId`, `giftId`, `senderId`, `receiverId`
    - `giftValue`, `quantity`, `message`, `sentAt`

## 🚀 API Endpoints

### Battle Management

#### Create PK Battle

```typescript
POST /api/v1/rooms/pk-battles
Content-Type: application/json
Authorization: Bearer <token>

{
  "roomId": "room-uuid",
  "battleType": "host_selected",
  "durationMinutes": 5,
  "participantIds": ["user1-uuid", "user2-uuid"],
  "description": "Epic singing battle"
}
```

#### Approve/Reject Battle

```typescript
POST /api/v1/rooms/pk-battles/{battleId}/approve
{
  "approved": true,
  "reason": "Optional rejection reason"
}
```

#### Start Battle

```typescript
POST / api / v1 / rooms / pk - battles / { battleId } / start
```

#### Participant Response

```typescript
POST /api/v1/rooms/pk-battles/{battleId}/respond
{
  "accepted": true
}
```

### Gift System

#### Send Gift to Participant

```typescript
POST /api/v1/rooms/pk-battles/{battleId}/gifts
{
  "giftId": "gift-uuid",
  "receiverId": "participant-uuid",
  "quantity": 1,
  "message": "You can do it! 🔥"
}
```

### Battle Information

#### Get Battle Details

```typescript
GET / api / v1 / rooms / pk - battles / { battleId }
```

#### Get Active Battle in Room

```typescript
GET / api / v1 / rooms / { roomId } / pk - battles / active
```

#### Get Battle History

```typescript
GET /api/v1/rooms/{roomId}/pk-battles/history?limit=10&offset=0
```

## 🔄 WebSocket Events

### Client → Server Events

#### Create Battle

```javascript
socket.emit('createPKBattle', {
    roomId: 'room-uuid',
    participantIds: ['user1-uuid', 'user2-uuid'],
    durationMinutes: 5,
    battleType: 'host_selected',
    description: 'Epic battle'
})
```

#### Respond to Invitation

```javascript
socket.emit('respondToPKBattle', {
    battleId: 'battle-uuid',
    accepted: true
})
```

#### Start Battle

```javascript
socket.emit('startPKBattle', {
    battleId: 'battle-uuid'
})
```

#### Send Gift (Real-time)

```javascript
socket.emit('sendPKBattleGift', {
    battleId: 'battle-uuid',
    giftId: 'gift-uuid',
    receiverId: 'participant-uuid',
    quantity: 1,
    message: 'Go go go!'
})
```

#### Get Battle Stats

```javascript
socket.emit('getPKBattleStats', {
    battleId: 'battle-uuid'
})
```

### Server → Client Events

#### Battle Created

```javascript
socket.on('pkBattleCreated', (data) => {
    console.log('New battle created:', data)
    // data: { battleId, roomId, hostName, participants, status, duration }
})
```

#### Battle Started

```javascript
socket.on('pkBattleStarted', (data) => {
    console.log('Battle started:', data)
    // data: { battleId, status, startTime, endTime, remainingTime, participants }
})
```

#### Gift Received (Real-time)

```javascript
socket.on('pkBattleGiftReceived', (data) => {
    console.log('Gift received:', data)
    // data: { battleId, gift: { giftName, senderName, receiverName, value }, participants, totalGiftsValue }
})
```

#### Battle Ended

```javascript
socket.on('pkBattleEnded', (data) => {
    console.log('Battle ended:', data)
    // data: { battleId, winnerId, winnerName, finalStats, totalGiftsValue }
})
```

## 📱 Implementation Flow

### 1. Host Creates Battle

1. Host selects 2 participants from room
2. Sets duration (1 min - 3 hours)
3. Battle created with `pending` status
4. Participants receive invitations

### 2. Participant Approval

1. Each participant accepts/declines invitation
2. Host can approve/reject the battle
3. Battle status moves to `approved`

### 3. Battle Start

1. Host starts the battle
2. Battle status becomes `active`
3. Timer starts counting down
4. Real-time gift sending enabled

### 4. Gift Competition

1. Room users send gifts to participants
2. Real-time updates of gift values
3. Leaderboard updates automatically
4. WebSocket events for instant feedback

### 5. Battle End

1. Timer expires OR host manually ends
2. Winner determined by total gift value
3. Battle status becomes `completed`
4. Final stats broadcasted to room

## 🎮 Frontend Integration

### React/Flutter Example

```typescript
// Listen for battle events
useEffect(() => {
    socket.on('pkBattleCreated', handleBattleCreated)
    socket.on('pkBattleStarted', handleBattleStarted)
    socket.on('pkBattleGiftReceived', handleGiftReceived)
    socket.on('pkBattleEnded', handleBattleEnded)

    return () => {
        socket.off('pkBattleCreated')
        socket.off('pkBattleStarted')
        socket.off('pkBattleGiftReceived')
        socket.off('pkBattleEnded')
    }
}, [])

// Send gift during battle
const sendGift = (giftId, participantId) => {
    socket.emit('sendPKBattleGift', {
        battleId: activeBattle.id,
        giftId,
        receiverId: participantId,
        quantity: 1,
        message: 'Good luck!'
    })
}
```

## 🔒 Permissions & Security

### Host Permissions

- Create battles
- Approve/reject battles
- Start battles
- Cancel battles
- End battles manually

### Participant Permissions

- Accept/decline invitations
- Receive gifts during battles

### Room Member Permissions

- Send gifts to participants
- View battle details
- View battle history

## 📊 Battle Statistics

### Real-time Tracking

- Current gift values per participant
- Recent gifts sent (last 20)
- Remaining battle time
- Live leaderboard

### Historical Data

- Battle history per room
- Winner statistics
- Total gifts value
- Participant performance

## ⚙️ Configuration

### Duration Settings

- **Minimum**: 1 minute
- **Maximum**: 3 hours (180 minutes)
- **Random battles**: Fixed 5 minutes
- **Custom battles**: Host-defined

### Battle Types

- `host_selected`: Host manually picks participants
- `random`: System randomly selects (future)
- `room_vs_room`: Inter-room battles (future)

## 🚨 Error Handling

### Common Scenarios

- Battle already active in room
- Participants not in room
- Invalid permissions
- Battle time expired
- Insufficient participant responses

### Error Messages

- Clear, user-friendly messages
- Specific error codes
- Proper HTTP status codes
- WebSocket error events

## 🧪 Testing

### API Testing

Use the provided Swagger documentation at `/api/docs` to test all endpoints.

### WebSocket Testing

1. Connect to WebSocket server
2. Join a room
3. Create a test battle
4. Send test gifts
5. Verify real-time updates

### Load Testing

- Multiple concurrent battles
- High-frequency gift sending
- Large rooms with many spectators

## 🔮 Future Enhancements

### Planned Features

1. **Random Battles**: Auto-match participants
2. **Room vs Room**: Inter-room competitions
3. **Tournament Mode**: Multi-round battles
4. **Battle Themes**: Specific competition types
5. **Advanced Analytics**: Detailed battle insights

### Scaling Considerations

- Database indexing for performance
- Caching layer for active battles
- Message queuing for high-volume gifts
- Horizontal scaling for WebSocket connections

This implementation provides a robust, real-time PK Battle system with comprehensive API coverage, WebSocket support, and proper error handling.
