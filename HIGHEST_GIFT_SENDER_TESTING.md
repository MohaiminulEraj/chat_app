# Testing Guide: Highest Gift Sender WebSocket Events

## Prerequisites

1. Server running on `http://localhost:3000`
2. Valid JWT token for authentication
3. Room with UUID
4. Users who have sent gifts in the room

## Test Scenarios

### Scenario 1: Get Highest Gift Sender (All Time)

**Setup:**

1. User A sends 5 gifts (100 coins each) to User B in Room X
2. User C sends 3 gifts (150 coins each) to User B in Room X
3. User D sends 10 gifts (50 coins each) to User B in Room X

**Expected Result:**

- Highest Sender: User A (500 coins total)
- Rank 2: User D (500 coins total)
- Rank 3: User C (450 coins total)

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'user-b-uuid',
    period: 'all'
})
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
        "receiverId": "user-b-uuid",
        "receiverName": "User B",
        "highestSender": {
            "userId": "user-a-uuid",
            "userName": "User A",
            "totalGiftValue": 500,
            "totalGiftCount": 5,
            "topGift": {
                "giftName": "Diamond Ring",
                "value": 100,
                "quantity": 1
            }
        },
        "allSenders": [
            {
                "userId": "user-a-uuid",
                "userName": "User A",
                "totalGiftValue": 500,
                "totalGiftCount": 5,
                "rank": 1
            },
            {
                "userId": "user-d-uuid",
                "userName": "User D",
                "totalGiftValue": 500,
                "totalGiftCount": 10,
                "rank": 2
            },
            {
                "userId": "user-c-uuid",
                "userName": "User C",
                "totalGiftValue": 450,
                "totalGiftCount": 3,
                "rank": 3
            }
        ],
        "timeframe": "all"
    }
}
```

---

### Scenario 2: Get Highest Gift Sender (Weekly)

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'user-b-uuid',
    period: 'weekly'
})
```

**Expected:** Only gifts sent in the last 7 days are counted.

---

### Scenario 3: No Gifts Sent Yet

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'user-with-no-gifts-uuid',
    period: 'all'
})
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
        "receiverId": "user-with-no-gifts-uuid",
        "receiverName": "User X",
        "highestSender": null,
        "allSenders": [],
        "timeframe": "all"
    }
}
```

---

### Scenario 4: Get Top 5 Gift Senders

**Test Request:**

```javascript
socket.emit('getTopGiftSenders', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'user-b-uuid',
    limit: 5,
    period: 'all'
})
```

**Expected Response:**

```json
{
    "success": true,
    "data": {
        "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
        "receiverId": "user-b-uuid",
        "topSenders": [
            {
                "userId": "...",
                "userName": "User A",
                "totalGiftValue": 500,
                "rank": 1
            },
            {
                "userId": "...",
                "userName": "User D",
                "totalGiftValue": 500,
                "rank": 2
            },
            {
                "userId": "...",
                "userName": "User C",
                "totalGiftValue": 450,
                "rank": 3
            },
            {
                "userId": "...",
                "userName": "User E",
                "totalGiftValue": 200,
                "rank": 4
            },
            {
                "userId": "...",
                "userName": "User F",
                "totalGiftValue": 100,
                "rank": 5
            }
        ],
        "totalSenders": 10,
        "timeframe": "all"
    }
}
```

---

### Scenario 5: Error - Missing Required Fields

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb'
    // Missing receiverId
})
```

**Expected Response:**

```json
{
    "success": false,
    "error": "Missing required fields: roomId and receiverId are required"
}
```

---

### Scenario 6: Error - Room Not Found

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'invalid-room-uuid',
    receiverId: 'user-b-uuid',
    period: 'all'
})
```

**Expected Response:**

```json
{
    "success": false,
    "error": "Room not found"
}
```

---

### Scenario 7: Error - User Not Found

**Test Request:**

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'invalid-user-uuid',
    period: 'all'
})
```

**Expected Response:**

```json
{
    "success": false,
    "error": "Receiver user not found"
}
```

---

### Scenario 8: Real-time Broadcast Update

**Setup:**

1. User A is viewing User B's profile
2. User C sends a gift to User B
3. User C becomes the new highest sender

**Expected Broadcast to Room:**

```json
{
    "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
    "receiverId": "user-b-uuid",
    "receiverName": "User B",
    "highestSender": {
        "userId": "user-c-uuid",
        "userName": "User C",
        "totalGiftValue": 600
    },
    "timestamp": "2025-10-18T21:30:00.000Z"
}
```

---

## Manual Testing Steps

### Step 1: Connect to WebSocket

```javascript
const socket = io('http://localhost:3000', {
    query: { token: 'your-jwt-token' }
})
```

### Step 2: Set Up Listeners

```javascript
socket.on('connect', () => {
    console.log('✅ Connected to server')
})

socket.on('highestGiftSender:response', (response) => {
    console.log('📊 Highest Gift Sender Response:', response)
})

socket.on('highestGiftSender:error', (error) => {
    console.error('❌ Error:', error)
})

socket.on('highestGiftSender:update', (update) => {
    console.log('🔄 Real-time Update:', update)
})

socket.on('topGiftSenders:response', (response) => {
    console.log('📊 Top Gift Senders Response:', response)
})

socket.on('topGiftSenders:error', (error) => {
    console.error('❌ Error:', error)
})
```

### Step 3: Send Test Requests

```javascript
// Test 1: Get all-time highest sender
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    period: 'all'
})

// Test 2: Get weekly highest sender
setTimeout(() => {
    socket.emit('getHighestGiftSender', {
        roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
        receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        period: 'weekly'
    })
}, 2000)

// Test 3: Get top 5 senders
setTimeout(() => {
    socket.emit('getTopGiftSenders', {
        roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
        receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        limit: 5,
        period: 'all'
    })
}, 4000)
```

---

## Postman WebSocket Testing

1. **Create New WebSocket Request**

    - URL: `ws://localhost:3000`
    - Add query param: `token=your-jwt-token`

2. **Connect**

    - Click "Connect"
    - Wait for connection confirmation

3. **Send Message**

    ```json
    {
        "event": "getHighestGiftSender",
        "data": {
            "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
            "receiverId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "period": "all"
        }
    }
    ```

4. **Listen for Events**
    - `highestGiftSender:response`
    - `highestGiftSender:error`
    - `highestGiftSender:update`

---

## Database Verification

After testing, verify data in database:

```sql
-- Get all gift transactions for a specific receiver in a room
SELECT
    gt.uuid,
    s.name as sender_name,
    r.name as receiver_name,
    g.name as gift_name,
    gt.amount,
    gt.quantity,
    (gt.amount * gt.quantity) as total_value,
    gt.created_at
FROM gift_transactions gt
JOIN users s ON s.uuid = gt."senderId"
JOIN users r ON r.uuid = gt."receiverId"
JOIN gifts g ON g.uuid = gt."giftId"
WHERE gt."roomId" = 'd5cebdc0-87e7-4168-8881-1da369c2f1bb'
    AND gt."receiverId" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    AND gt.status = 'completed'
ORDER BY gt.created_at DESC;

-- Get aggregated data by sender
SELECT
    s.uuid as sender_id,
    s.name as sender_name,
    COUNT(*) as gift_count,
    SUM(gt.amount * gt.quantity) as total_value
FROM gift_transactions gt
JOIN users s ON s.uuid = gt."senderId"
WHERE gt."roomId" = 'd5cebdc0-87e7-4168-8881-1da369c2f1bb'
    AND gt."receiverId" = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    AND gt.status = 'completed'
GROUP BY s.uuid, s.name
ORDER BY total_value DESC;
```

---

## Expected Server Logs

```
📊 GET_HIGHEST_GIFT_SENDER: User John (user-a-uuid) requesting highest sender to user user-b-uuid in room d5cebdc0-87e7-4168-8881-1da369c2f1bb | Period: all
📊 Getting highest gift sender to user user-b-uuid in room d5cebdc0-87e7-4168-8881-1da369c2f1bb (period: all)
✅ Found 3 gift senders to user user-b-uuid in room d5cebdc0-87e7-4168-8881-1da369c2f1bb
   ├─ Highest Sender: User A (user-a-uuid)
   ├─ Total Value: 500
   └─ Total Gifts: 5
✅ GET_HIGHEST_GIFT_SENDER: Successfully retrieved data for receiver User B (user-b-uuid)
   ├─ Highest Sender: User A (user-a-uuid)
   ├─ Total Value: 500
   ├─ Total Senders: 3
   └─ Timeframe: all
```

---

## Performance Testing

Test with large datasets:

1. **100 senders** - Should respond in < 1 second
2. **1000 senders** - Should respond in < 2 seconds
3. **10000 senders** - Should respond in < 5 seconds

Monitor:

- Query execution time
- Memory usage
- Response time
- Server logs

---

## Integration Testing

Test integration with:

1. Gift sending flow
2. Room rankings
3. User profiles
4. Real-time updates
5. Multiple concurrent requests
