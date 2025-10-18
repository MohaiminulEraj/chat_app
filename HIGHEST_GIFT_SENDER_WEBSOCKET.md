# Highest Gift Sender WebSocket Events

## Overview

These WebSocket events allow clients to query and track the highest gift senders to specific users within a room. This is **independent of PK battles** and focuses on regular gift transactions between users.

## Events

### 1. `getHighestGiftSender`

Get the user who sent the most gifts (by value) to a specific user in a room.

#### Request Payload

```typescript
{
  roomId: string          // UUID of the room
  receiverId: string      // UUID of the user receiving gifts
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'all'  // Optional timeframe (default: 'all')
}
```

#### Example Request

```javascript
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    period: 'weekly'
})
```

#### Success Response Event: `highestGiftSender:response`

```typescript
{
  success: true,
  data: {
    roomId: string
    receiverId: string
    receiverName: string
    receiverAvatar: string
    highestSender: {
      userId: string
      userName: string
      userAvatar: string
      totalGiftValue: number      // Total value of gifts sent
      totalGiftCount: number       // Total number of gifts
      topGift: {
        giftId: string
        giftName: string
        giftImage: string
        value: number              // Value of this gift
        quantity: number
      } | null
    } | null,  // null if no gifts sent
    allSenders: Array<{
      userId: string
      userName: string
      userAvatar: string
      totalGiftValue: number
      totalGiftCount: number
      rank: number                 // Ranking position
    }>,
    timeframe: string              // 'hourly', 'daily', 'weekly', 'monthly', or 'all'
    timestamp: string              // ISO timestamp
  }
}
```

#### Error Response Event: `highestGiftSender:error`

```typescript
{
  success: false,
  error: string  // Error message
}
```

#### Broadcast Event: `highestGiftSender:update`

Sent to all users in the room when someone queries the highest sender:

```typescript
{
  roomId: string
  receiverId: string
  receiverName: string
  highestSender: {
    userId: string
    userName: string
    totalGiftValue: number
  } | null,
  timestamp: string
}
```

---

### 2. `getTopGiftSenders`

Get the top N users who sent the most gifts to a specific user in a room.

#### Request Payload

```typescript
{
  roomId: string          // UUID of the room
  receiverId: string      // UUID of the user receiving gifts
  limit?: number          // Number of top senders to return (default: 10)
  period?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'all'
}
```

#### Example Request

```javascript
socket.emit('getTopGiftSenders', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    limit: 5,
    period: 'daily'
})
```

#### Success Response Event: `topGiftSenders:response`

```typescript
{
  success: true,
  data: {
    roomId: string
    receiverId: string
    topSenders: Array<{
      userId: string
      userName: string
      userAvatar: string
      totalGiftValue: number
      totalGiftCount: number
      rank: number
    }>,
    totalSenders: number       // Total number of unique senders
    timeframe: string
    timestamp: string
  }
}
```

#### Error Response Event: `topGiftSenders:error`

```typescript
{
  success: false,
  error: string
}
```

---

## Usage Examples

### JavaScript/TypeScript Client

```typescript
import { io, Socket } from 'socket.io-client'

const socket: Socket = io('http://localhost:3000', {
    transports: ['websocket'],
    query: { token: 'your-jwt-token' }
})

// Listen for responses
socket.on('highestGiftSender:response', (response) => {
    console.log('Highest Gift Sender:', response.data.highestSender)
    console.log('All Senders:', response.data.allSenders)
})

socket.on('highestGiftSender:error', (error) => {
    console.error('Error:', error.error)
})

socket.on('highestGiftSender:update', (update) => {
    console.log('Highest sender update for room:', update)
})

// Request highest gift sender (weekly)
socket.emit('getHighestGiftSender', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    period: 'weekly'
})

// Request top 5 gift senders (all time)
socket.emit('getTopGiftSenders', {
    roomId: 'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    receiverId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    limit: 5,
    period: 'all'
})
```

### Flutter/Dart Client

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

class GiftSenderService {
  late IO.Socket socket;

  void initializeSocket(String token) {
    socket = IO.io('http://localhost:3000', <String, dynamic>{
      'transports': ['websocket'],
      'query': {'token': token}
    });

    socket.on('connect', (_) {
      print('Connected to WebSocket');
    });

    socket.on('highestGiftSender:response', (data) {
      print('Highest Gift Sender: ${data['data']['highestSender']}');
      // Update UI with highest sender data
    });

    socket.on('highestGiftSender:error', (error) {
      print('Error: ${error['error']}');
    });

    socket.on('highestGiftSender:update', (update) {
      print('Highest sender update: ${update}');
      // Update UI in real-time
    });
  }

  void getHighestGiftSender(String roomId, String receiverId, {String? period}) {
    socket.emit('getHighestGiftSender', {
      'roomId': roomId,
      'receiverId': receiverId,
      'period': period ?? 'all'
    });
  }

  void getTopGiftSenders(String roomId, String receiverId, {int limit = 10, String? period}) {
    socket.emit('getTopGiftSenders', {
      'roomId': roomId,
      'receiverId': receiverId,
      'limit': limit,
      'period': period ?? 'all'
    });
  }
}
```

### React/React Native Client

```typescript
import { useEffect, useState } from 'react'
import io from 'socket.io-client'

interface HighestSender {
  userId: string
  userName: string
  userAvatar: string
  totalGiftValue: number
  totalGiftCount: number
  topGift: {
    giftId: string
    giftName: string
    giftImage: string
    value: number
    quantity: number
  } | null
}

function useHighestGiftSender(roomId: string, receiverId: string, period: string = 'all') {
  const [highestSender, setHighestSender] = useState<HighestSender | null>(null)
  const [allSenders, setAllSenders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      query: { token: 'your-jwt-token' }
    })

    socket.on('highestGiftSender:response', (response) => {
      setHighestSender(response.data.highestSender)
      setAllSenders(response.data.allSenders)
      setLoading(false)
    })

    socket.on('highestGiftSender:error', (error) => {
      setError(error.error)
      setLoading(false)
    })

    socket.on('highestGiftSender:update', (update) => {
      // Real-time update
      if (update.receiverId === receiverId) {
        setHighestSender(update.highestSender)
      }
    })

    // Request data
    setLoading(true)
    socket.emit('getHighestGiftSender', { roomId, receiverId, period })

    return () => {
      socket.disconnect()
    }
  }, [roomId, receiverId, period])

  return { highestSender, allSenders, loading, error }
}

// Usage in component
function GiftSenderDisplay() {
  const { highestSender, allSenders, loading, error } = useHighestGiftSender(
    'd5cebdc0-87e7-4168-8881-1da369c2f1bb',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'weekly'
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!highestSender) return <div>No gifts sent yet</div>

  return (
    <div>
      <h2>Highest Gift Sender</h2>
      <div>
        <img src={highestSender.userAvatar} alt={highestSender.userName} />
        <h3>{highestSender.userName}</h3>
        <p>Total Value: {highestSender.totalGiftValue}</p>
        <p>Total Gifts: {highestSender.totalGiftCount}</p>
        {highestSender.topGift && (
          <div>
            <p>Top Gift: {highestSender.topGift.giftName}</p>
            <img src={highestSender.topGift.giftImage} alt={highestSender.topGift.giftName} />
          </div>
        )}
      </div>

      <h3>All Senders</h3>
      <ul>
        {allSenders.map((sender) => (
          <li key={sender.userId}>
            {sender.rank}. {sender.userName} - {sender.totalGiftValue} coins
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Time Periods

| Period    | Description        | Time Range         |
| --------- | ------------------ | ------------------ |
| `hourly`  | Last hour          | 60 minutes         |
| `daily`   | Last 24 hours      | 1 day              |
| `weekly`  | Last 7 days        | 7 days             |
| `monthly` | Last 30 days       | 30 days            |
| `all`     | All time (default) | Since room created |

---

## Use Cases

1. **Profile Display**: Show who is the biggest supporter of a user in a room
2. **Leaderboard**: Display top gift senders to popular users
3. **Analytics**: Track gift patterns and user interactions
4. **Appreciation**: Highlight and thank top supporters
5. **Gamification**: Create badges/achievements for top senders
6. **Real-time Updates**: Show live updates when someone becomes the new top sender

---

## Notes

- **Performance**: Results are calculated in real-time from gift transactions
- **Filtering**: Only includes completed transactions (status = 'completed')
- **Privacy**: All data is visible to room participants
- **Real-time**: The `highestGiftSender:update` broadcast keeps all clients in sync
- **Sorting**: Senders are ranked by total gift value (amount × quantity)
- **Top Gift**: Shows the single most valuable gift sent by the highest sender

---

## Error Handling

Common errors:

- `Missing required fields: roomId and receiverId are required` - Invalid request payload
- `Room not found` - Room ID doesn't exist
- `Receiver user not found` - Receiver ID doesn't exist
- `Failed to get highest gift sender data` - Internal server error

---

## Testing with Postman

1. Connect to WebSocket: `ws://localhost:3000`
2. Add authentication in connection query: `?token=your-jwt-token`
3. Send event:

```json
{
    "event": "getHighestGiftSender",
    "data": {
        "roomId": "d5cebdc0-87e7-4168-8881-1da369c2f1bb",
        "receiverId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "period": "weekly"
    }
}
```

4. Listen for: `highestGiftSender:response`, `highestGiftSender:error`, `highestGiftSender:update`

---

## Related Features

- **Room Rankings**: Use `getRoomRankings` for overall room leaderboards
- **PK Battle Gifts**: Use `getPKBattleHighestSender` for battle-specific data
- **Gift Transactions**: All calculations based on `gift_transactions` table
