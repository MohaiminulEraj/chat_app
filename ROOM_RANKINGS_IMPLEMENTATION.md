# Room Rankings Implementation Summary

## ✅ Implementation Complete

### Files Created/Modified

#### New Files:

1. **`src/modules/room/entities/room-ranking.entity.ts`**

    - TypeORM entity for storing rankings
    - Supports 4 periods: hourly, weekly, total, online
    - Indexes for performance optimization

2. **`src/modules/room/services/room-ranking.service.ts`**

    - Core ranking calculation logic
    - Score formula: `(Gifts Sent × 0.5) + (Gifts Received × 0.5)`
    - In-memory caching (60-second TTL)
    - Online user tracking
    - Scheduled hourly cache clearing

3. **`migrations/add-room-rankings.sql`**

    - Database migration script
    - Creates `room_rankings` table
    - Creates indexes for performance
    - Adds triggers for timestamp management

4. **`ROOM_RANKINGS_SOCKET_EVENTS.md`**
    - Complete documentation of socket events
    - Request/response payload examples
    - Integration guide
    - Error handling documentation

#### Modified Files:

1. **`src/modules/room/room.module.ts`**

    - Added `RoomRanking` entity to TypeORM
    - Added `RoomRankingService` to providers
    - Added `ScheduleModule` for cron jobs
    - Exported `RoomRankingService`

2. **`src/modules/room/room.gateway.ts`**
    - Added `RoomRankingService` to constructor
    - Added 4 new socket event handlers:
        - `getRoomRankings` - Fetch specific period rankings
        - `getAllRoomRankings` - Fetch all periods at once
        - `subscribeToRankings` - Subscribe to real-time updates
        - `unsubscribeFromRankings` - Unsubscribe from updates
    - Added `broadcastRankingUpdates()` - Broadcast to subscribers
    - Modified `handleJoinRoom` - Track online users
    - Modified `handleLeaveRoom` - Remove from online tracking
    - Modified `handleSendGiftInRoom` - Update rankings and broadcast

---

## Socket Events Implemented

### 1. Get Room Rankings

```
Event: getRoomRankings
Request: { roomId, period, limit? }
Response: roomRankingsResponse
```

### 2. Get All Rankings

```
Event: getAllRoomRankings
Request: { roomId, limit? }
Response: allRoomRankingsResponse
```

### 3. Subscribe to Rankings

```
Event: subscribeToRankings
Request: { roomId, periods? }
Response: rankingsSubscribed
```

### 4. Ranking Updates (Auto)

```
Event: rankingUpdate (Listen only)
Triggered: After gift transactions
```

### 5. Unsubscribe

```
Event: unsubscribeFromRankings
Request: { roomId, periods? }
Response: rankingsUnsubscribed
```

---

## Ranking Periods

| Period     | Time Range             | Description        |
| ---------- | ---------------------- | ------------------ |
| **hourly** | Last 60 minutes        | Recent activity    |
| **weekly** | Last 7 days            | Weekly performance |
| **total**  | Room creation to now   | All-time rankings  |
| **online** | Last 24h (online only) | Active users only  |

---

## Score Calculation

```
Total Score = (Gifts Sent Value × 0.5) + (Gifts Received Value × 0.5)
```

**Formula Location:** `src/modules/room/services/room-ranking.service.ts` line ~147-149

To modify:

```typescript
const sentScore = stats.giftsSentValue * 0.5 // Change weight here
const receivedScore = stats.giftsReceivedValue * 0.5 // Change weight here
stats.totalScore = sentScore + receivedScore
```

---

## Features

✅ **Real-time Updates** - Rankings update after every gift transaction
✅ **Caching** - 60-second cache to reduce database load
✅ **Online Tracking** - Tracks currently active users in rooms
✅ **Subscription Model** - Users opt-in to real-time updates
✅ **Database Persistence** - Rankings stored for hourly, weekly, total
✅ **Performance Optimized** - Indexes on all query paths
✅ **Scheduled Cleanup** - Hourly cron job clears caches
✅ **Comprehensive Stats** - Sent/received counts, top gifts, unique interactions

---

## Database Migration

Run the migration:

```bash
psql -U your_user -d your_database -f migrations/add-room-rankings.sql
```

Or if using a migration tool, apply the SQL in `migrations/add-room-rankings.sql`

---

## Testing

### 1. Test Basic Ranking Fetch

```javascript
socket.emit('getRoomRankings', {
    roomId: 'your-room-id',
    period: 'hourly',
    limit: 10
})

socket.on('roomRankingsResponse', (data) => {
    console.log('Rankings:', data.rankings)
})
```

### 2. Test Real-time Updates

```javascript
// Subscribe
socket.emit('subscribeToRankings', {
    roomId: 'your-room-id'
})

// Listen for updates
socket.on('rankingUpdate', (data) => {
    console.log('Ranking updated:', data.period, data.rankings)
})

// Send a gift to trigger update
socket.emit('sendGiftInRoom', {
    roomId: 'your-room-id',
    giftId: 'gift-id',
    receiverId: ['receiver-id'],
    quantity: 1
})
```

### 3. Test All Rankings

```javascript
socket.emit('getAllRoomRankings', {
    roomId: 'your-room-id',
    limit: 5
})

socket.on('allRoomRankingsResponse', (data) => {
    console.log('Hourly:', data.rankings.hourly)
    console.log('Weekly:', data.rankings.weekly)
    console.log('Total:', data.rankings.total)
    console.log('Online:', data.rankings.online)
})
```

---

## Performance Considerations

1. **Cache TTL:** 60 seconds - Adjust in `room-ranking.service.ts`
2. **Broadcast Limit:** Top 10 users - Prevents excessive data transfer
3. **Query Optimization:** Indexes on roomId, period, rank, score
4. **Async Operations:** Gift transaction → ranking update is non-blocking
5. **Online Tracking:** In-memory Set for fast lookups

---

## Monitoring

Check logs for ranking events:

```
📊 GET_ROOM_RANKINGS: User requesting hourly rankings
✅ GET_ROOM_RANKINGS: Sent 45 hourly rankings
📊 RANKING_UPDATES: Broadcast to all subscribed users in room
⏰ Updating hourly rankings...
✅ Hourly rankings cache cleared for 12 active rooms
```

---

## Future Enhancements (Optional)

1. **Custom Score Weights** - Make weights configurable per room
2. **Combo Multipliers** - Bonus for gift streaks
3. **Achievement Badges** - Award badges for top performers
4. **Historical Rankings** - Store daily/weekly snapshots
5. **Leaderboard Categories** - Separate rankings for different gift types
6. **Ranking Rewards** - Auto-reward top-ranked users
7. **Export Rankings** - Export to CSV/PDF
8. **Ranking Notifications** - Alert users when they rank up/down

---

## API Endpoints (Optional REST Alternative)

If you want REST endpoints in addition to WebSocket:

```typescript
// In room.controller.ts
@Get(':roomId/rankings/:period')
async getRankings(
  @Param('roomId') roomId: string,
  @Param('period') period: string,
  @Query('limit') limit?: number
) {
  return this.rankingService.getHourlyRankings(roomId, limit)
}
```

---

## Troubleshooting

### Rankings Not Updating?

1. Check if gift transactions are completing successfully
2. Verify cache is being cleared after gift send
3. Check user is subscribed to rankings channel
4. Confirm WebSocket connection is active

### Empty Online Rankings?

- Users must join the room first
- Online tracking starts on `joinRoom` event
- Users removed on `leaveRoom` or disconnect

### Performance Issues?

- Increase cache TTL to reduce DB queries
- Limit broadcast to fewer users
- Add Redis for distributed caching
- Optimize gift transaction queries

---

## Documentation

Full socket events documentation: **`ROOM_RANKINGS_SOCKET_EVENTS.md`**

This includes:

- Complete payload structures
- All ranking periods explained
- User ranking object structure
- Usage flow examples
- Error handling
- Integration steps

---

## Completion Checklist

✅ RoomRanking entity created
✅ RoomRankingService implemented
✅ Socket events added to RoomGateway
✅ Online user tracking implemented
✅ Real-time broadcast functionality
✅ Database migration script
✅ Comprehensive documentation
✅ Score calculation: 50/50 split
✅ Caching system
✅ Scheduled cleanup
✅ Error handling
✅ No compilation errors

---

## Next Steps

1. **Run Database Migration**

    ```bash
    psql -U postgres -d kitty_backend -f migrations/add-room-rankings.sql
    ```

2. **Restart NestJS Server**

    ```bash
    npm run start:dev
    ```

3. **Test Socket Events**

    - Use Postman WebSocket or custom client
    - Test all 5 socket events
    - Verify real-time updates after gift send

4. **Monitor Logs**

    - Watch for ranking calculation logs
    - Check scheduled cron job execution
    - Verify broadcast messages

5. **Frontend Integration**
    - Use documentation in `ROOM_RANKINGS_SOCKET_EVENTS.md`
    - Implement UI for displaying rankings
    - Add real-time update handlers

---

## Support

All ranking logic is centralized in:

- **Service:** `src/modules/room/services/room-ranking.service.ts`
- **Gateway:** `src/modules/room/room.gateway.ts` (lines 5236-5505)
- **Entity:** `src/modules/room/entities/room-ranking.entity.ts`

Modify score calculation in `room-ranking.service.ts` line 147-149.
