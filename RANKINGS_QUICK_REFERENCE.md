# Room Rankings Socket Events - Quick Reference

## Score Formula

```
Total Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
```

---

## Socket Events Summary

### 1️⃣ Get Rankings (Single Period)

```javascript
// REQUEST
socket.emit('getRoomRankings', {
    roomId: 'room-uuid',
    period: 'hourly', // "hourly" | "weekly" | "total" | "online"
    limit: 50 // Optional
})

// RESPONSE
socket.on('roomRankingsResponse', (data) => {
    // data.status: "success" | "error"
    // data.rankings: Array of user ranking objects
    // data.totalCount: Number of users
})
```

### 2️⃣ Get All Rankings (All Periods)

```javascript
// REQUEST
socket.emit('getAllRoomRankings', {
    roomId: 'room-uuid',
    limit: 10 // Optional, top N per period
})

// RESPONSE
socket.on('allRoomRankingsResponse', (data) => {
    // data.rankings.hourly: Array
    // data.rankings.weekly: Array
    // data.rankings.total: Array
    // data.rankings.online: Array
})
```

### 3️⃣ Subscribe to Real-time Updates

```javascript
// REQUEST
socket.emit('subscribeToRankings', {
    roomId: 'room-uuid',
    periods: ['hourly', 'weekly', 'total', 'online'] // Optional
})

// CONFIRMATION
socket.on('rankingsSubscribed', (data) => {
    // data.status: "success"
    // data.subscribedPeriods: Array
})
```

### 4️⃣ Listen for Updates (Auto)

```javascript
// LISTEN (No request needed, after subscribing)
socket.on('rankingUpdate', (data) => {
    // Automatically sent when rankings change
    // data.roomId: string
    // data.period: "hourly" | "weekly" | "total" | "online"
    // data.rankings: Top 10 users
})
```

### 5️⃣ Unsubscribe

```javascript
// REQUEST
socket.emit('unsubscribeFromRankings', {
    roomId: 'room-uuid',
    periods: ['hourly'] // Optional specific periods
})

// CONFIRMATION
socket.on('rankingsUnsubscribed', (data) => {
    // data.status: "success"
})
```

---

## Ranking User Object

```javascript
{
  userId: "user-uuid",
  userName: "John Doe",
  userAvatar: "https://avatar-url.jpg",
  rank: 1,  // Position (1 = highest)
  giftsSent: {
    value: 5000.00,
    count: 25,
    topGift: { giftId, giftName, value }
  },
  giftsReceived: {
    value: 3000.00,
    count: 15,
    topGift: { giftId, giftName, value }
  },
  totalScore: 4000.00,  // Calculated score
  interactions: {
    uniqueSenders: 8,    // Unique users who sent gifts to this user
    uniqueReceivers: 12  // Unique users who received gifts from this user
  },
  isOnline: true,
  period: "hourly"
}
```

---

## Ranking Periods

| Period     | Time Range          | Users       |
| ---------- | ------------------- | ----------- |
| **hourly** | Last 60 minutes     | All users   |
| **weekly** | Last 7 days         | All users   |
| **total**  | Room creation → now | All users   |
| **online** | Last 24 hours       | Online only |

---

## Complete Integration Flow

```javascript
// 1. Connect & Join Room
socket.connect()
socket.emit('joinRoom', { userId, roomID })

// 2. Fetch Initial Rankings
socket.emit('getAllRoomRankings', { roomId, limit: 10 })

// 3. Listen for Response
socket.on('allRoomRankingsResponse', (data) => {
    if (data.status === 'success') {
        displayRankings(data.rankings)
    }
})

// 4. Subscribe for Updates
socket.emit('subscribeToRankings', { roomId })

// 5. Listen for Real-time Updates
socket.on('rankingUpdate', (data) => {
    updateRankingUI(data.period, data.rankings)
})

// 6. Cleanup on Leave
socket.emit('unsubscribeFromRankings', { roomId })
socket.emit('leaveRoom', roomId)
```

---

## Error Handling

All events return structured errors:

```javascript
{
  status: "error",
  message: "Error description",
  // ... context fields
}
```

---

## Performance Notes

- **Cache:** 60-second TTL
- **Auto-update:** After every gift transaction
- **Broadcast:** Top 10 users only
- **Database:** Hourly cron job clears cache

---

## Full Documentation

See **`ROOM_RANKINGS_SOCKET_EVENTS.md`** for complete details:

- Full payload structures
- All error scenarios
- Advanced usage examples
- Database schema
- Troubleshooting guide
