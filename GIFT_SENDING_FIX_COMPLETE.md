# Gift Sending Room Participation Fix

## Problem Analysis

The error "Sender must be in the room to send a gift" was occurring because:

1. **Socket Room vs Database Participation**: Users were joining socket rooms (`room:${roomId}`) but weren't necessarily **seated participants** in the database (`room_participants` table)
2. **Observer vs Participant Distinction**: In live streaming contexts, observers (viewers) should be able to send gifts to seated participants (performers)
3. **Missing Error Feedback**: No specific error events were being sent to frontend for different error scenarios

## Solution Implemented

### 1. Enhanced GiftService with Flexible Room Validation

**File**: `/src/modules/gift/gift.service.ts`

Added `allowNonParticipants` parameter to support two modes:

#### Strict Mode (`allowNonParticipants = false`)

- Both sender and receivers must be seated participants
- Used for traditional room-based interactions

#### Relaxed Mode (`allowNonParticipants = true`)

- Only receivers need to be seated participants
- Observers can send gifts to seated users
- Used for live streaming scenarios

```typescript
async sendGift(
    senderId: string,
    receiverIds: string[],
    giftId: string,
    quantity: number = 1,
    roomId?: string,
    message?: string,
    allowNonParticipants: boolean = false // New parameter
)
```

### 2. Updated Room Gateway to Use Relaxed Mode

**File**: `/src/modules/room/room.gateway.ts`

```typescript
// Use allowNonParticipants = true for WebSocket gift sending
const result = await this.giftService.sendGift(
    userId,
    data.receiverId,
    data.giftId,
    data.quantity,
    data.roomId,
    data.message,
    true // Allow observers to send gifts
)
```

### 3. Enhanced Error Handling with Specific Events

Added comprehensive error events for different scenarios:

```typescript
// Emit specific error types to frontend
client.emit('giftError', {
    type: 'not_in_room' | 'insufficient_balance' | 'general_error',
    message: string,
    roomId: string,
    senderId: string
})
```

## Frontend Integration

### Flutter Error Handling

```dart
socket.on('giftError', (data) {
  final errorType = data['type'];
  final message = data['message'];

  switch (errorType) {
    case 'not_in_room':
      showErrorDialog('You must be seated in the room to send gifts to participants');
      break;
    case 'insufficient_balance':
      showErrorDialog('Insufficient balance: $message');
      break;
    case 'general_error':
    default:
      showErrorDialog('Error sending gift: $message');
      break;
  }
});
```

## Database Changes

### Transaction Metadata Enhancement

Added `senderType` tracking to gift transactions:

```typescript
metadata: {
    binsReceived: number,
    conversionRate: number,
    giftPrice: number,
    totalQuantity: number,
    senderType: 'participant' | 'observer' // New field
}
```

## Use Cases Supported

### ✅ Now Supported:

1. **Observer to Participant**: Non-seated user sends gift to seated user
2. **Participant to Participant**: Seated user sends gift to another seated user
3. **Specific Error Feedback**: Clear error messages for different failure reasons
4. **Transaction Tracking**: Know whether gift came from observer or participant

### ❌ Still Restricted:

1. **Invalid Recipients**: Can't send gifts to users not seated in room
2. **Self-Gifting**: Can't send gifts to yourself
3. **Insufficient Balance**: Must have enough diamonds

## Testing Scenarios

### 1. Observer Sending Gift (Should Work)

```javascript
// User joins room as observer (not seated)
socket.emit('joinRoom', { userId: 'user1', roomID: 'room1' })

// Observer sends gift to seated user (should succeed)
socket.emit('sendGiftInRoom', {
    senderId: 'user1',
    giftId: 'gift1',
    receiverId: ['seated_user'],
    quantity: 1,
    roomId: 'room1'
})
```

### 2. Invalid Recipient (Should Fail with Error Event)

```javascript
// Try to send gift to non-seated user (should fail)
socket.emit('sendGiftInRoom', {
    senderId: 'user1',
    giftId: 'gift1',
    receiverId: ['non_seated_user'],
    quantity: 1,
    roomId: 'room1'
})
// Expected: giftError event with type 'not_in_room'
```

### 3. Insufficient Balance (Should Fail with Error Event)

```javascript
// Try to send expensive gift without enough diamonds
socket.emit('sendGiftInRoom', {
    senderId: 'poor_user',
    giftId: 'expensive_gift',
    receiverId: ['seated_user'],
    quantity: 100,
    roomId: 'room1'
})
// Expected: giftError event with type 'insufficient_balance'
```

## Deployment Notes

1. **Backward Compatibility**: ✅ Existing API endpoints work unchanged
2. **Database Migration**: Not required - metadata updates are handled dynamically
3. **Frontend Updates**: Required to handle new `giftError` events
4. **Build Status**: ✅ Successfully compiled

## Performance Considerations

- Added one additional database query to check sender participation status in relaxed mode
- Query is only executed when `allowNonParticipants = true` and `roomId` is provided
- Impact: Minimal (single indexed lookup)

## Security Considerations

- ✅ Maintains all existing validations (balance, user existence, gift validity)
- ✅ Only relaxes sender participation requirement, not recipient validation
- ✅ Proper error messages without exposing sensitive data
- ✅ Transaction logging includes sender type for audit purposes
