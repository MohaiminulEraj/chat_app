# Room Rankings - Flutter Backend Synchronization Guide

## Overview

This document explains the room ranking system's synchronization between the Flutter frontend and NestJS backend.

## Flutter Integration

### Flutter Code Structure

```dart
void sendEmitForRoomRankings() {
  // Subscribe to all ranking periods
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "periods": ["hourly", "weekly", "total", "online"]
  }, "subscribeToRankings");

  // Get hourly rankings
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "period": "hourly",
    "limit": "50"  // Note: limit sent as STRING
  }, "getRoomRankings");

  // Get weekly rankings
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "period": "weekly",
    "limit": "50"
  }, "getRoomRankings");

  // Get total rankings
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "period": "total",
    "limit": "50"
  }, "getRoomRankings");

  // Get online rankings
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "period": "online",
    "limit": "50"
  }, "getRoomRankings");

  // Get highest gift sender
  socket.sendMessage({
    "roomId": selectedRoom.roomId.toString(),
    "receiverId": getUserID,
    "period": 'all'
  }, "getHighestGiftSender");
}
```

### Flutter Response Handler

```dart
case "roomRankingsResponse":
  print("roomRankingsResponse: ${event.data}");
  if(event.data["period"] == "hourly") {
    hourlyRankings.clear();
    hourlyRankings = (event.data["rankings"] as List)
      .map((e) => RankingModel.fromJson(e))
      .toList();
  }
  else if(event.data["period"] == "weekly") {
    weeklyRankings.clear();
    weeklyRankings = (event.data["rankings"] as List)
      .map((e) => RankingModel.fromJson(e))
      .toList();
  }
  else if(event.data["period"] == "total") {
    totalRankings.clear();
    totalRankings = (event.data["rankings"] as List)
      .map((e) => RankingModel.fromJson(e))
      .toList();
  }
  else if(event.data["period"] == "online") {
    onlineRankings.clear();
    onlineRankings = (event.data["rankings"] as List)
      .map((e) => RankingModel.fromJson(e))
      .toList();
  }
  break;
```

## Backend Changes

### 1. Fixed `limit` Parameter Type Handling

**Issue**: Flutter sends `limit` as string `"50"` but backend expected number.

**Fix**: Updated `getRoomRankings` to accept both string and number:

```typescript
data: {
    roomId: string
    period: 'hourly' | 'weekly' | 'total' | 'online'
    limit?: number | string  // Accept both types
}

// In handler
const limit = typeof data.limit === 'string'
    ? parseInt(data.limit, 10)
    : (data.limit || 50)
```

### 2. Fixed `period` Handling for `getHighestGiftSender`

**Issue**: Flutter sends `period: 'all'` but backend didn't default properly.

**Fix**: Added default value and explicit handling:

```typescript
const period = data.period || 'all'

this.logger.log(`📊 GET_HIGHEST_GIFT_SENDER: ... Period: ${period}`)

const result = await this.roomService.getHighestGiftSenderToUser(
    data.roomId,
    data.receiverId,
    period // Use the defaulted period
)
```

### 3. Fixed Online Rankings to Show ALL Online Users

**Issue**: Online rankings only showed users with gift activity. If only 1 user is online with no gifts, rankings were empty.

**Fix**: Updated `getOnlineRankings` to include ALL online users:

```typescript
async getOnlineRankings(roomId: string, limit?: number): Promise<any[]> {
    const onlineUsers = this.onlineUsersCache.get(roomId)
    if (!onlineUsers || onlineUsers.size === 0) {
        return []
    }

    const userIds = Array.from(onlineUsers)

    // Calculate rankings for users with gift activity
    const rankings = await this.calculateRankings(
        roomId,
        RankingPeriod.ONLINE,
        oneDayAgo,
        new Date(),
        userIds
    )

    // CRITICAL: Include ALL online users even with no gift activity
    const rankedUserIds = new Set(rankings.map(r => r.userId))
    const unrankedUserIds = userIds.filter(id => !rankedUserIds.has(id))

    if (unrankedUserIds.length > 0) {
        const unrankedUsers = await this.userRepository.findByIds(unrankedUserIds)

        const unrankedRankings = unrankedUsers.map(user => ({
            userId: user.uuid,
            userName: user.name || user.displayName || 'Unknown',
            userAvatar: user.avatarUrl || null,
            rank: 0,
            giftsSent: { value: 0, count: 0, topGift: null },
            giftsReceived: { value: 0, count: 0, topGift: null },
            totalScore: 0,
            interactions: { uniqueSenders: 0, uniqueReceivers: 0 },
            isOnline: true,
            period: RankingPeriod.ONLINE
        }))

        rankings.push(...unrankedRankings)
        rankings.sort((a, b) => b.totalScore - a.totalScore)
        rankings.forEach((ranking, index) => {
            ranking.rank = index + 1
        })
    }

    return limit ? rankings.slice(0, limit) : rankings
}
```

## WebSocket Events

### 1. `getRoomRankings`

**Request**:

```json
{
  "roomId": "room-uuid",
  "period": "hourly" | "weekly" | "total" | "online",
  "limit": "50"  // Can be string or number
}
```

**Response** (`roomRankingsResponse`):

```json
{
    "status": "success",
    "roomId": "room-uuid",
    "period": "hourly",
    "rankings": [
        {
            "userId": "user-uuid",
            "userName": "John Doe",
            "name": "John Doe",
            "userAvatar": "https://...",
            "image": "https://...",
            "country": "United States",
            "diamond": 1500.5,
            "diamondBalance": 1500.5,
            "isEmailVerified": true,
            "isVerified": true,
            "level": 25,
            "rank": 1,
            "giftsSent": {
                "value": 1500.5,
                "count": 25,
                "topGift": {
                    "giftId": "gift-uuid",
                    "giftName": "Diamond",
                    "value": 500
                }
            },
            "giftsReceived": {
                "value": 2300.75,
                "count": 40,
                "topGift": {
                    "giftId": "gift-uuid",
                    "giftName": "Crown",
                    "value": 800
                }
            },
            "totalScore": 1900.625,
            "interactions": {
                "uniqueSenders": 12,
                "uniqueReceivers": 8
            },
            "isOnline": true,
            "period": "hourly"
        }
    ],
    "totalCount": 25,
    "timestamp": "2025-10-18T12:00:00.000Z"
}
```

### 2. `subscribeToRankings`

**Request**:

```json
{
    "roomId": "room-uuid",
    "periods": ["hourly", "weekly", "total", "online"]
}
```

**Response**:

```json
{
    "status": "success",
    "message": "Subscribed to ranking updates",
    "roomId": "room-uuid",
    "periods": ["hourly", "weekly", "total", "online"]
}
```

### 3. `getHighestGiftSender`

**Request**:

```json
{
    "roomId": "room-uuid",
    "receiverId": "user-uuid",
    "period": "all" // "hourly" | "daily" | "weekly" | "monthly" | "all"
}
```

**Response** (`highestGiftSender:response`):

```json
{
  "success": true,
  "data": {
    "roomId": "room-uuid",
    "receiverId": "user-uuid",
    "receiverName": "Jane Doe",
    "receiverAvatar": "https://...",
    "highestSender": {
      "userId": "sender-uuid",
      "userName": "John Doe",
      "userAvatar": "https://...",
      "totalGiftValue": 5000.50,
      "giftCount": 50,
      "lastGiftAt": "2025-10-18T12:00:00.000Z"
    },
    "allSenders": [...],
    "timeframe": "all",
    "timestamp": "2025-10-18T12:00:00.000Z"
  }
}
```

## Ranking Response Fields

### User Information Fields

Each ranking entry includes comprehensive user information:

| Field             | Type    | Description                                    | Alias                       |
| ----------------- | ------- | ---------------------------------------------- | --------------------------- |
| `userId`          | string  | User UUID                                      | -                           |
| `userName`        | string  | User's display name                            | -                           |
| `name`            | string  | User's display name                            | Alias for `userName`        |
| `userAvatar`      | string  | User's avatar URL                              | -                           |
| `image`           | string  | User's avatar URL                              | Alias for `userAvatar`      |
| `country`         | string  | User's country                                 | -                           |
| `diamond`         | number  | User's diamond balance (rounded to 2 decimals) | -                           |
| `diamondBalance`  | number  | User's diamond balance                         | Alias for `diamond`         |
| `isEmailVerified` | boolean | Email verification status                      | -                           |
| `isVerified`      | boolean | Email verification status                      | Alias for `isEmailVerified` |
| `level`           | number  | User's level                                   | -                           |
| `rank`            | number  | User's rank in this period (1-based)           | -                           |

### Gift Statistics Fields

| Field                   | Type   | Description                            |
| ----------------------- | ------ | -------------------------------------- |
| `giftsSent.value`       | number | Total value of gifts sent              |
| `giftsSent.count`       | number | Total number of gifts sent             |
| `giftsSent.topGift`     | object | Details of most valuable gift sent     |
| `giftsReceived.value`   | number | Total value of gifts received          |
| `giftsReceived.count`   | number | Total number of gifts received         |
| `giftsReceived.topGift` | object | Details of most valuable gift received |
| `totalScore`            | number | Calculated ranking score               |

### Additional Fields

| Field                          | Type    | Description                                            |
| ------------------------------ | ------- | ------------------------------------------------------ |
| `interactions.uniqueSenders`   | number  | Number of unique gift senders                          |
| `interactions.uniqueReceivers` | number  | Number of unique gift receivers                        |
| `isOnline`                     | boolean | Whether user is currently online                       |
| `period`                       | string  | Ranking period (`hourly`, `weekly`, `total`, `online`) |

### Field Aliases for Flutter Compatibility

Some fields have aliases to ensure compatibility with different Flutter models:

- `name` = `userName`
- `image` = `userAvatar`
- `diamond` = `diamondBalance`
- `isVerified` = `isEmailVerified`

## Ranking Periods Explained

### 1. **Hourly Rankings** (`period: "hourly"`)

- Shows gift activity from the last 1 hour
- Updates every hour via cron job
- Cached for 1 minute for performance
- Only includes users with gift activity in the period

### 2. **Weekly Rankings** (`period: "weekly"`)

- Shows gift activity from the last 7 days
- Updates every hour via cron job
- Cached for 1 minute for performance
- Only includes users with gift activity in the period

### 3. **Total Rankings** (`period: "total"`)

- Shows all-time gift activity since room creation
- Updates every hour via cron job
- Cached for 1 minute for performance
- Only includes users with gift activity ever

### 4. **Online Rankings** (`period: "online"`)

- Shows ONLY currently online users in the room
- Includes users even with zero gift activity
- Based on last 24 hours of gift activity for scoring
- **CRITICAL**: If only 1 user is online, response will contain exactly 1 ranking
- Real-time, no caching
- Users added to online cache when they:
    - Join room (`joinRoom` event)
    - Sit in seat (`sitInSeat` event)
    - Send comment (`sendComment` event)
    - Perform any room action

## Scoring Algorithm

### Total Score Calculation

```
Total Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
```

## Scoring Algorithm

### Total Score Calculation

```
Total Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
```

This balanced approach ensures that both giving and receiving gifts contribute equally to a user's ranking.

### Calculation Logic Breakdown

#### 1. Gift Transaction Collection

```typescript
// Collect all completed gift transactions in the period
const transactions = await giftTransactionRepository
    .createQueryBuilder('gt')
    .where('gt.roomId = :roomId', { roomId })
    .andWhere('gt.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
    })
    .andWhere("gt.status = 'completed'")
    .getMany()
```

#### 2. Gift Value Calculation

```typescript
// For each transaction
const giftValue = parseFloat(transaction.amount) * transaction.quantity

// Example:
// - Gift amount: 100 coins
// - Quantity: 5
// - Gift value: 100 × 5 = 500 coins
```

#### 3. User Score Accumulation

```typescript
// For senders
senderStats.giftsSentValue += giftValue
senderStats.giftsSentCount += transaction.quantity

// For receivers
receiverStats.giftsReceivedValue += giftValue
receiverStats.giftsReceivedCount += transaction.quantity
```

#### 4. Total Score Computation

```typescript
const sentScore = stats.giftsSentValue * 0.5
const receivedScore = stats.giftsReceivedValue * 0.5
stats.totalScore = sentScore + receivedScore

// Rounded to 2 decimal places
totalScore = Math.round(stats.totalScore * 100) / 100
```

#### 5. Ranking Assignment

```typescript
// Sort by totalScore (descending)
rankings.sort((a, b) => b.totalScore - a.totalScore)

// Assign sequential ranks
rankings.forEach((ranking, index) => {
    ranking.rank = index + 1
})
```

### Example Calculation

**User A's Activity:**

- Sent gifts worth: 1,000 coins (10 gifts)
- Received gifts worth: 2,000 coins (15 gifts)

**Calculation:**

```
Sent Score = 1,000 × 0.5 = 500
Received Score = 2,000 × 0.5 = 1,000
Total Score = 500 + 1,000 = 1,500 coins
```

**User B's Activity:**

- Sent gifts worth: 3,000 coins (20 gifts)
- Received gifts worth: 500 coins (5 gifts)

**Calculation:**

```
Sent Score = 3,000 × 0.5 = 1,500
Received Score = 500 × 0.5 = 250
Total Score = 1,500 + 250 = 1,750 coins
```

**Ranking Result:**

1. User B: 1,750 coins (rank 1)
2. User A: 1,500 coins (rank 2)

### Why 50/50 Weighting?

The 50/50 split ensures:

1. **Balance**: Active givers and popular receivers both rank well
2. **Engagement**: Encourages both gift sending and receiving
3. **Fairness**: Neither pure spending nor pure popularity dominates
4. **Community**: Promotes reciprocal interactions

### Special Cases

#### Zero Activity Users (Online Rankings Only)

Users online but with no gift activity get:

```json
{
  "giftsSent": { "value": 0, "count": 0 },
  "giftsReceived": { "value": 0, "count": 0 },
  "totalScore": 0,
  "rank": N  // Assigned after all active users
}
```

#### Tie Breaking

When users have identical `totalScore`:

- Ranks are assigned based on order in the array
- Users maintain their relative positions
- No special tie-breaking logic applied

### Validation & Accuracy

All values are rounded to 2 decimal places for consistency:

```typescript
Math.round(value * 100) / 100

// Examples:
// 1500.5047 → 1500.50
// 2300.758 → 2300.76
// 0 → 0.00
```

## Example

- User sent gifts worth: 1000 coins
- User received gifts worth: 2000 coins
- **Total Score = (1000 × 0.5) + (2000 × 0.5) = 500 + 1000 = 1500**

### Ranking

Users are sorted by `totalScore` in descending order, with rank assigned sequentially.

## Online User Tracking

### How Users Become "Online"

Users are tracked in `onlineUsersCache` when they:

1. Join a room (`joinRoom` event)
2. Sit in a seat (`sitInSeat` event)
3. Send a comment (`sendComment` event)
4. Perform any tracked activity

### Code Reference

```typescript
// In room.gateway.ts - handleJoinRoom
await this.roomRankingService.trackUserActivity(roomId, userId)

// In room-ranking.service.ts
async trackUserActivity(roomId: string, userId: string): Promise<void> {
    if (!this.onlineUsersCache.has(roomId)) {
        this.onlineUsersCache.set(roomId, new Set())
    }
    this.onlineUsersCache.get(roomId)?.add(userId)
}
```

### How Users Become "Offline"

Users are removed when they:

1. Disconnect from WebSocket
2. Leave the room (`leaveRoom` event)

```typescript
async removeUserActivity(roomId: string, userId: string): Promise<void> {
    this.onlineUsersCache.get(roomId)?.delete(userId)
    if (this.onlineUsersCache.get(roomId)?.size === 0) {
        this.onlineUsersCache.delete(roomId)
    }
}
```

## Testing Scenarios

### Test Case 1: Single Online User with No Gifts

**Scenario**: Only 1 user is in the room, no gifts sent/received

**Expected Response**:

```json
{
    "status": "success",
    "period": "online",
    "rankings": [
        {
            "userId": "user-123",
            "userName": "Lonely User",
            "userAvatar": "https://...",
            "rank": 1,
            "giftsSent": { "value": 0, "count": 0, "topGift": null },
            "giftsReceived": { "value": 0, "count": 0, "topGift": null },
            "totalScore": 0,
            "interactions": { "uniqueSenders": 0, "uniqueReceivers": 0 },
            "isOnline": true,
            "period": "online"
        }
    ],
    "totalCount": 1
}
```

### Test Case 2: Multiple Online Users, Mixed Activity

**Scenario**: 3 users online, 2 with gifts, 1 without

**Expected Response**:

```json
{
    "status": "success",
    "period": "online",
    "rankings": [
        {
            "userId": "user-1",
            "rank": 1,
            "totalScore": 5000,
            "isOnline": true
        },
        {
            "userId": "user-2",
            "rank": 2,
            "totalScore": 2000,
            "isOnline": true
        },
        {
            "userId": "user-3",
            "rank": 3,
            "totalScore": 0,
            "isOnline": true
        }
    ],
    "totalCount": 3
}
```

### Test Case 3: Period "all" for Highest Gift Sender

**Scenario**: Get highest sender for all time

**Request**:

```json
{
    "roomId": "room-123",
    "receiverId": "user-456",
    "period": "all"
}
```

**Expected**: System correctly defaults to 'all' period and returns lifetime data.

## Common Issues & Solutions

### Issue 1: Online Rankings Empty When Users Are Present

**Cause**: Users not being tracked in `onlineUsersCache`

**Solution**: Ensure `trackUserActivity()` is called in:

- `handleJoinRoom`
- `handleSitInSeat`
- `handleSendComment`

### Issue 2: Limit Not Working (All Results Returned)

**Cause**: Flutter sends limit as string `"50"` instead of number `50`

**Solution**: Backend now handles both:

```typescript
const limit =
    typeof data.limit === 'string' ? parseInt(data.limit, 10) : data.limit || 50
```

### Issue 3: Period "all" Not Working

**Cause**: Period not being defaulted properly

**Solution**: Explicit defaulting:

```typescript
const period = data.period || 'all'
```

## Postman Testing Collection

### Get Online Rankings

```json
{
    "event": "getRoomRankings",
    "data": {
        "roomId": "{{roomId}}",
        "period": "online",
        "limit": "50"
    }
}
```

### Subscribe to All Rankings

```json
{
    "event": "subscribeToRankings",
    "data": {
        "roomId": "{{roomId}}",
        "periods": ["hourly", "weekly", "total", "online"]
    }
}
```

### Get Highest Gift Sender

```json
{
    "event": "getHighestGiftSender",
    "data": {
        "roomId": "{{roomId}}",
        "receiverId": "{{userId}}",
        "period": "all"
    }
}
```

## Database Schema

### RoomRanking Entity

```sql
CREATE TABLE room_rankings (
  uuid UUID PRIMARY KEY,
  roomId UUID NOT NULL REFERENCES rooms(uuid),
  userId UUID NOT NULL REFERENCES users(uuid),
  period VARCHAR NOT NULL, -- 'hourly', 'weekly', 'total', 'online'
  giftsSentValue DECIMAL(15,2) DEFAULT 0,
  giftsSentCount INT DEFAULT 0,
  giftsReceivedValue DECIMAL(15,2) DEFAULT 0,
  giftsReceivedCount INT DEFAULT 0,
  totalScore DECIMAL(15,2) DEFAULT 0,
  rank INT DEFAULT 0,
  lastActivityAt TIMESTAMP,
  metadata JSONB,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_room_period ON room_rankings(roomId, period, createdAt);
CREATE INDEX idx_user_room_period ON room_rankings(userId, roomId, period);
CREATE INDEX idx_room_period_rank ON room_rankings(roomId, period, rank);
```

## Performance Considerations

### Caching Strategy

- **Cache TTL**: 1 minute (60,000ms)
- **Cache Keys**: `{period}_{roomId}` (e.g., `hourly_room-123`)
- **Cache Invalidation**: On gift transactions via `updateRankingsAfterGift()`

### Query Optimization

- Indexes on `(roomId, period, createdAt)`
- Indexes on `(userId, roomId, period)`
- Limit applied after ranking calculation
- Online rankings query filtered by `userIds`

### Scheduled Tasks

```typescript
@Cron(CronExpression.EVERY_HOUR)
async updateHourlyRankings(): Promise<void> {
    // Clear cache for all active rooms every hour
    const rooms = await this.roomRepository.find({
        where: { isActive: true }
    })

    for (const room of rooms) {
        await this.clearRoomCache(room.uuid)
    }
}
```

## Summary of Changes

✅ **Fixed**: `limit` parameter accepts both string and number
✅ **Fixed**: `period: 'all'` properly handled in `getHighestGiftSender`
✅ **Fixed**: Online rankings show ALL online users (even with 0 gifts)
✅ **Enhanced**: Logging for better debugging
✅ **Verified**: Build successful with TypeScript compilation
✅ **Documented**: Complete Flutter-Backend synchronization guide

## Next Steps

1. **Test with Flutter Client**: Verify all 4 ranking periods work correctly
2. **Test Edge Cases**:
    - Single user in room
    - No gift activity
    - All users with zero scores
3. **Monitor Logs**: Check WebSocket events are properly emitted
4. **Performance Test**: Large rooms (100+ users) with ranking requests
5. **Cache Optimization**: Tune TTL based on production load

---

**Last Updated**: October 18, 2025
**Backend Version**: NestJS + TypeORM + Socket.IO
**Flutter Version**: Compatible with Socket.IO client
