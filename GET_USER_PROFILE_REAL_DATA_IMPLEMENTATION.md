# getUserProfile Real Data Implementation

## Overview

The `getUserProfile` function in the Room module has been successfully converted from dummy data to real database queries while maintaining the exact same response structure for frontend compatibility.

## What Changed

### From Dummy Data to Real Database Queries

- ✅ **User Information**: Now fetches actual user data from the database
- ✅ **Role Detection**: Real room role assignment checking with proper priority
- ✅ **Follower Count**: Actual friendship relationship counting
- ✅ **Gift Wall**: Live gift transaction aggregation and statistics
- ✅ **Decorations**: Real user purchase data for frames, effects, and special items
- ✅ **Intimacy Connections**: Complex algorithm for calculating user relationships
- ✅ **Room Context**: Live room participation status and activities
- ✅ **Statistics**: Actual user activity and achievement tracking

## Response Structure (Maintained for Frontend Compatibility)

```json
{
    "userId": "string",
    "name": "string",
    "displayName": "string",
    "role": "owner|host|admin|speaker|listener",
    "location": "string",
    "followersCount": "number",
    "profile": {
        "avatarUrl": "string",
        "coverPhoto": "string",
        "bio": "string",
        "level": "number",
        "badge": "array",
        "binsBalance": "number",
        "diamondBalance": "number"
    },
    "privileges": {
        "giftWall": {
            "count": "number",
            "totalValue": "number",
            "recentGifts": "array[5]"
        },
        "decoration": {
            "count": "number",
            "totalSpent": "number",
            "activeDecorations": "array[4]"
        }
    },
    "intimacy": {
        "totalConnections": "number",
        "intimacyScore": "number (0-10)",
        "topConnections": "array[5]"
    },
    "roomContext": {
        "roomId": "string",
        "roomName": "string",
        "joinedAt": "datetime",
        "timeInRoom": "string",
        "seatNumber": "number",
        "isHost": "boolean",
        "contributions": "object",
        "roomInteractions": "array[3]"
    },
    "stats": {
        "totalRoomsJoined": "number",
        "totalTimeInRooms": "string",
        "favoriteRoomType": "string",
        "hostingExperience": "string",
        "communityRating": "number",
        "totalGiftsReceived": "number",
        "totalGiftsSent": "number",
        "achievements": "array"
    }
}
```

## Implementation Details

### 1. User Data Fetching

```typescript
const user = await this.userRepository.findOne({
    where: { uuid: userId },
    select: [
        'uuid',
        'name',
        'displayName',
        'email',
        'avatarUrl',
        'coverImage',
        'bio',
        'level',
        'badge',
        'binsBalance',
        'diamondBalance',
        'country',
        'frames',
        'entryEffects',
        'purchasedGifts'
    ]
})
```

### 2. Role Priority System

Roles are prioritized as: **owner > host > admin > speaker > listener**

```typescript
let primaryRole = 'listener'
if (userRoles.find((r) => r.role === RoomRole.OWNER)) {
    primaryRole = 'owner'
} else if (userRoles.find((r) => r.role === RoomRole.HOST)) {
    primaryRole = 'host'
}
// ... etc
```

### 3. Gift Wall Algorithm

- Aggregates all gifts received by the user
- Calculates total count and value
- Fetches the 5 most recent gifts with sender details
- Handles missing gift/sender data gracefully

### 4. Intimacy Calculation

Complex algorithm that considers:

- **Gift Exchange Count**: Number of gifts exchanged
- **Mutual Gifts**: Bidirectional gift giving (weighted higher)
- **Total Value**: Logarithmic scaling of gift values
- **Relationship Duration**: Time since first interaction
- **Connection Strength**: Categorized as Weak/Moderate/Good/Strong/Very Strong

**Formula**: `intimacyLevel = min(100, (exchangeCount * 2) + (mutualGifts * 5) + (log(totalValue + 1) * 3))`

### 5. Room Context Detection

- Checks if user is currently in any room
- Calculates actual time spent in room
- Counts real contributions (comments, gifts given/received)
- Fetches recent interactions with timestamps

## Helper Methods

### `getFollowersCount(userId: string)`

- Counts accepted friendship relationships where user is the friend
- Returns actual follower count from database

### `getUserProfileStats(userId: string)`

- Creates or retrieves user profile statistics
- Auto-updates room participation counts
- Handles default values for new users

### `getUserGiftWall(userId: string)`

- Aggregates gift transaction data
- Formats gift information with sender details
- Handles missing gift/sender data

### `getUserDecorations(user: any)`

- Processes frames, entry effects, and purchased gifts
- Calculates total spending on decorations
- Returns most recent active decorations

### `getUserIntimacyConnections(userId: string, currentUserId?: string)`

- Complex query for gift exchange patterns
- Calculates intimacy levels and relationship metrics
- Determines connection types and strengths

### `getUserCurrentRoomContext(userId: string)`

- Detects current room participation
- Calculates time spent and contributions
- Fetches recent room interactions

## Database Dependencies

### Required Repositories

- `userRepository`: User data and profile information
- `roomRoleRepository`: Room role assignments
- `friendshipRepository`: Follower/friend relationships
- `userProfileStatsRepository`: User statistics and achievements
- `giftTransactionRepository`: Gift exchange data
- `participantRepository`: Room participation data
- `roomCommentRepository`: Room comment history

### Required Entities

- `User`: Core user information
- `UserProfileStats`: User statistics and metrics
- `RoomRoleAssignment`: Room role assignments
- `Friendship`: Friend/follower relationships
- `GiftTransaction`: Gift exchange history
- `RoomParticipant`: Room participation records
- `RoomComment`: Room comment history

## Error Handling

- **User Not Found**: Throws `NotFoundException`
- **Missing Data**: Provides graceful defaults
- **Database Errors**: Properly logged and propagated
- **Invalid References**: Handled with null checks

## Performance Considerations

- Uses selective field queries to minimize data transfer
- Implements proper indexing on frequently queried fields
- Limits result sets (top 5 connections, recent 5 gifts, etc.)
- Uses efficient aggregation queries for statistics

## Testing

Use the provided `test-user-profile.js` script to validate:

1. Response structure compatibility
2. Real data vs dummy data
3. All helper method functionality
4. Error handling scenarios

## Migration Notes

- ✅ No breaking changes for frontend
- ✅ Same API endpoint: `GET /api/v1/rooms/user/:userId/profile`
- ✅ Same response structure maintained
- ✅ All existing keys preserved
- ✅ Data types remain consistent

## Future Enhancements

1. **Caching**: Add Redis caching for frequently accessed profiles
2. **Pagination**: Implement pagination for large datasets (connections, gifts)
3. **Real-time Updates**: WebSocket updates for live statistics
4. **Analytics**: Add tracking for profile view analytics
5. **Privacy Controls**: User-controlled profile visibility settings
