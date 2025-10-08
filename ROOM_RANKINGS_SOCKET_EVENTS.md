# Room Rankings Socket Events Documentation

## Overview

The ranking system tracks user performance in rooms based on gift transactions (sending and receiving gifts). Rankings are calculated across four time periods: **Hourly**, **Weekly**, **Total**, and **Online**.

## Score Calculation

```
Total Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
```

- **50% weight** on gifts sent value
- **50% weight** on gifts received value
- Rankings sorted by highest score first

---

## Socket Events

### 1. Get Room Rankings (Specific Period)

**Event Name:** `getRoomRankings`

**Request Payload:**

```json
{
    "roomId": "room-uuid-here",
    "period": "hourly", // Options: "hourly" | "weekly" | "total" | "online"
    "limit": 50 // Optional, default: 50, max users to return
}
```

**Response Event:** `roomRankingsResponse`

**Response Payload:**

```json
{
    "status": "success",
    "roomId": "room-uuid-here",
    "period": "hourly",
    "rankings": [
        {
            "userId": "user-uuid-1",
            "userName": "John Doe",
            "userAvatar": "https://avatar-url.com/user1.jpg",
            "rank": 1,
            "giftsSent": {
                "value": 5000.0,
                "count": 25,
                "topGift": {
                    "giftId": "gift-uuid",
                    "giftName": "Diamond Ring",
                    "value": 500.0
                }
            },
            "giftsReceived": {
                "value": 3000.0,
                "count": 15,
                "topGift": {
                    "giftId": "gift-uuid-2",
                    "giftName": "Rose Bouquet",
                    "value": 200.0
                }
            },
            "totalScore": 4000.0,
            "interactions": {
                "uniqueSenders": 8,
                "uniqueReceivers": 12
            },
            "isOnline": true,
            "period": "hourly"
        },
        {
            "userId": "user-uuid-2",
            "userName": "Jane Smith",
            "userAvatar": "https://avatar-url.com/user2.jpg",
            "rank": 2,
            "giftsSent": {
                "value": 3500.0,
                "count": 20,
                "topGift": {
                    "giftId": "gift-uuid-3",
                    "giftName": "Golden Crown",
                    "value": 400.0
                }
            },
            "giftsReceived": {
                "value": 2500.0,
                "count": 10,
                "topGift": {
                    "giftId": "gift-uuid-4",
                    "giftName": "Star",
                    "value": 150.0
                }
            },
            "totalScore": 3000.0,
            "interactions": {
                "uniqueSenders": 5,
                "uniqueReceivers": 10
            },
            "isOnline": false,
            "period": "hourly"
        }
    ],
    "totalCount": 45,
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

**Error Response:**

```json
{
    "status": "error",
    "message": "Error message here",
    "roomId": "room-uuid-here",
    "period": "hourly",
    "rankings": [],
    "totalCount": 0,
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

### 2. Get All Room Rankings (All Periods)

**Event Name:** `getAllRoomRankings`

**Request Payload:**

```json
{
    "roomId": "room-uuid-here",
    "limit": 10 // Optional, default: 10, top N users per period
}
```

**Response Event:** `allRoomRankingsResponse`

**Response Payload:**

```json
{
    "status": "success",
    "roomId": "room-uuid-here",
    "rankings": {
        "hourly": [
            {
                "userId": "user-uuid-1",
                "userName": "John Doe",
                "userAvatar": "https://avatar-url.com/user1.jpg",
                "rank": 1,
                "giftsSent": {
                    "value": 5000.0,
                    "count": 25,
                    "topGift": {
                        "giftId": "gift-uuid",
                        "giftName": "Diamond Ring",
                        "value": 500.0
                    }
                },
                "giftsReceived": {
                    "value": 3000.0,
                    "count": 15,
                    "topGift": {
                        "giftId": "gift-uuid-2",
                        "giftName": "Rose Bouquet",
                        "value": 200.0
                    }
                },
                "totalScore": 4000.0,
                "interactions": {
                    "uniqueSenders": 8,
                    "uniqueReceivers": 12
                },
                "isOnline": true,
                "period": "hourly"
            }
            // ... more users (up to limit)
        ],
        "weekly": [
            // Same structure as hourly
        ],
        "total": [
            // Same structure as hourly
        ],
        "online": [
            // Same structure as hourly
        ],
        "updatedAt": "2025-10-08T12:00:00.000Z"
    },
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

**Error Response:**

```json
{
    "status": "error",
    "message": "Error message here",
    "roomId": "room-uuid-here",
    "rankings": {
        "hourly": [],
        "weekly": [],
        "total": [],
        "online": [],
        "updatedAt": "2025-10-08T12:00:00.000Z"
    },
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

### 3. Subscribe to Ranking Updates

**Event Name:** `subscribeToRankings`

**Request Payload:**

```json
{
    "roomId": "room-uuid-here",
    "periods": ["hourly", "weekly", "total", "online"] // Optional, default: all periods
}
```

**Response Event:** `rankingsSubscribed`

**Response Payload:**

```json
{
    "status": "success",
    "roomId": "room-uuid-here",
    "subscribedPeriods": ["hourly", "weekly", "total", "online"],
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

**After subscribing, you will receive real-time updates via the `rankingUpdate` event (see below)**

---

### 4. Real-time Ranking Updates (Auto-sent)

**Event Name:** `rankingUpdate` (Listen only, not sent)

**This event is automatically sent to subscribed users when rankings change after gift transactions**

**Response Payload:**

```json
{
    "roomId": "room-uuid-here",
    "period": "hourly",
    "rankings": [
        {
            "userId": "user-uuid-1",
            "userName": "John Doe",
            "userAvatar": "https://avatar-url.com/user1.jpg",
            "rank": 1,
            "giftsSent": {
                "value": 5000.0,
                "count": 25,
                "topGift": {
                    "giftId": "gift-uuid",
                    "giftName": "Diamond Ring",
                    "value": 500.0
                }
            },
            "giftsReceived": {
                "value": 3000.0,
                "count": 15,
                "topGift": {
                    "giftId": "gift-uuid-2",
                    "giftName": "Rose Bouquet",
                    "value": 200.0
                }
            },
            "totalScore": 4000.0,
            "interactions": {
                "uniqueSenders": 8,
                "uniqueReceivers": 12
            },
            "isOnline": true,
            "period": "hourly"
        }
        // ... top 10 users only
    ],
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

### 5. Unsubscribe from Ranking Updates

**Event Name:** `unsubscribeFromRankings`

**Request Payload:**

```json
{
    "roomId": "room-uuid-here",
    "periods": ["hourly", "weekly"] // Optional specific periods, default: all
}
```

**Response Event:** `rankingsUnsubscribed`

**Response Payload:**

```json
{
    "status": "success",
    "roomId": "room-uuid-here",
    "unsubscribedPeriods": ["hourly", "weekly"],
    "timestamp": "2025-10-08T12:00:00.000Z"
}
```

---

## Ranking Period Definitions

| Period   | Time Range                                      | Description                              |
| -------- | ----------------------------------------------- | ---------------------------------------- |
| `hourly` | Last 60 minutes from current time               | Recent activity rankings                 |
| `weekly` | Last 7 days from current time                   | Weekly performance rankings              |
| `total`  | From room creation to current time              | All-time rankings since room was created |
| `online` | Last 24 hours (only for currently online users) | Rankings for active users in the room    |

---

## User Ranking Object Structure

```typescript
{
    userId: string // User's unique identifier
    userName: string // User's display name
    userAvatar: string // User's avatar URL
    rank: number // Ranking position (1 = highest)
    giftsSent: {
        value: number // Total value of gifts sent
        count: number // Number of gifts sent
        topGift: {
            // Most expensive gift sent
            giftId: string
            giftName: string
            value: number
        }
    }
    giftsReceived: {
        value: number // Total value of gifts received
        count: number // Number of gifts received
        topGift: {
            // Most expensive gift received
            giftId: string
            giftName: string
            value: number
        }
    }
    totalScore: number // Calculated ranking score
    interactions: {
        uniqueSenders: number // Number of unique users who sent gifts to this user
        uniqueReceivers: number // Number of unique users who received gifts from this user
    }
    isOnline: boolean // Whether user is currently online in the room
    period: string // The ranking period this data represents
}
```

---

## Usage Flow Examples

### Example 1: Fetch Hourly Rankings

```javascript
// Request
socket.emit('getRoomRankings', {
    roomId: 'abc-123-xyz',
    period: 'hourly',
    limit: 20
})

// Listen for response
socket.on('roomRankingsResponse', (data) => {
    if (data.status === 'success') {
        console.log(`Received ${data.totalCount} hourly rankings`)
        data.rankings.forEach((user, index) => {
            console.log(
                `${user.rank}. ${user.userName} - Score: ${user.totalScore}`
            )
        })
    }
})
```

### Example 2: Fetch All Rankings

```javascript
// Request
socket.emit('getAllRoomRankings', {
    roomId: 'abc-123-xyz',
    limit: 10
})

// Listen for response
socket.on('allRoomRankingsResponse', (data) => {
    if (data.status === 'success') {
        console.log('Hourly Top 10:', data.rankings.hourly)
        console.log('Weekly Top 10:', data.rankings.weekly)
        console.log('Total Top 10:', data.rankings.total)
        console.log('Online Top 10:', data.rankings.online)
    }
})
```

### Example 3: Subscribe to Real-time Updates

```javascript
// Subscribe
socket.emit('subscribeToRankings', {
    roomId: 'abc-123-xyz',
    periods: ['hourly', 'weekly', 'online']
})

// Confirmation
socket.on('rankingsSubscribed', (data) => {
    console.log('Subscribed to:', data.subscribedPeriods)
})

// Listen for real-time updates
socket.on('rankingUpdate', (data) => {
    console.log(`Rankings updated for ${data.period}:`, data.rankings)
    // Update UI with new rankings
})
```

### Example 4: Unsubscribe

```javascript
socket.emit('unsubscribeFromRankings', {
    roomId: 'abc-123-xyz'
})

socket.on('rankingsUnsubscribed', (data) => {
    console.log('Unsubscribed from:', data.unsubscribedPeriods)
})
```

---

## Performance & Caching

- **Cache Duration:** 60 seconds (1 minute)
- **Automatic Updates:** Rankings update after every gift transaction
- **Broadcast Limit:** Real-time updates include top 10 users only
- **Database Persistence:** Hourly, Weekly, and Total rankings are stored in database
- **Online Rankings:** Calculated in real-time, not persisted

---

## Notes

1. **Online Rankings** only include users currently connected to the room
2. Rankings automatically update when gifts are sent in the room
3. Subscribe to rankings to receive real-time updates
4. Cache is cleared hourly via scheduled cron job
5. Rankings are calculated based on **completed** gift transactions only
6. If a user has no gift activity, they won't appear in rankings
7. Score formula can be updated by modifying the `RoomRankingService`

---

## Error Handling

All ranking events return structured error responses:

```json
{
    "status": "error",
    "message": "Detailed error message",
    "roomId": "room-uuid-here"
    // ... other context-specific fields
}
```

Common errors:

- Room not found
- Invalid period specified
- User not authenticated
- Database connection issues

---

## Integration Steps

1. **Connect to WebSocket** with authentication token
2. **Join Room** to establish room context
3. **Fetch Initial Rankings** using `getRoomRankings` or `getAllRoomRankings`
4. **Subscribe** to real-time updates using `subscribeToRankings`
5. **Listen** for `rankingUpdate` events
6. **Unsubscribe** when leaving room or closing rankings view

---

## Database Schema

Rankings are stored in the `room_rankings` table with the following structure:

- `uuid` - Primary key
- `roomId` - Foreign key to rooms table
- `userId` - Foreign key to users table
- `period` - Enum: 'hourly', 'weekly', 'total', 'online'
- `giftsSentValue` - Decimal(15,2)
- `giftsSentCount` - Integer
- `giftsReceivedValue` - Decimal(15,2)
- `giftsReceivedCount` - Integer
- `totalScore` - Decimal(15,2)
- `rank` - Integer
- `lastActivityAt` - Timestamp
- `metadata` - JSONB (top gifts, unique interactions)
- `createdAt` / `updatedAt` - Timestamps

Indexes are optimized for:

- Fast lookups by room + period
- Efficient ranking queries
- Quick score-based sorting
