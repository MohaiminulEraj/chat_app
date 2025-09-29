# Popular Rooms API Documentation

## Overview

The Popular Rooms API provides a list of rooms sorted by popularity based on user activity patterns. This complements the existing Recommended Rooms API by focusing on engagement metrics rather than simple chronological ordering.

## Endpoints

### GET /api/v1/rooms/popular

Returns a list of all active rooms sorted by popularity score.

**Authentication:** Required (JWT Bearer Token)

**Parameters:** None

**Response Format:**

```json
{
    "statusCode": 200,
    "message": "Popular rooms fetched successfully",
    "data": [
        {
            "_id": "room-uuid-here",
            "name": "Gaming Room #1",
            "description": "A fun place to chat and game",
            "level": 2,
            "country": "US",
            "roomAvatarUrl": "https://cloudinary.com/avatar.jpg",
            "popularity": {
                "totalVisits": 45,
                "uniqueVisitors": 12,
                "popularityScore": 15.5
            },
            "roomOwner": {
                "id": 123,
                "uuid": "user-uuid-here",
                "name": "John Doe",
                "email": "john@example.com",
                "phoneNumber": "+1234567890",
                "userType": "premium",
                "authProvider": "email",
                "avatarUrl": "https://cloudinary.com/user-avatar.jpg",
                "isEmailVerified": true,
                "isPhoneVerified": true
            },
            "host": {
                // Same structure as roomOwner
            },
            "members": [
                {
                    "_id": "member-uuid",
                    "name": "Jane Smith",
                    "email": "jane@example.com",
                    "image": "https://cloudinary.com/jane-avatar.jpg",
                    "role": "speaker",
                    "status": true,
                    "join": true,
                    "invitedBy": "host-uuid",
                    "blocked": false
                }
            ]
        }
    ]
}
```

## Popularity Algorithm

### Scoring System

The popularity score is calculated based on:

1. **Visit Count Weight**: Number of times users join the room
2. **Recency Weight**: Recent activity is weighted higher

    - Last 7 days: 3.0x multiplier
    - Last 14 days: 2.0x multiplier
    - Last 30 days: 1.0x multiplier
    - Older than 30 days: 0.5x multiplier

3. **Unique Visitors**: Diversity of users visiting the room

### Formula

```
popularityScore = Σ(visitCount × recencyMultiplier)
```

### Sorting and Shuffling

Rooms are organized into popularity tiers to prevent stagnation:

- **Hot** (score > 10): Top 20% of rooms
- **Trending** (score > 5): Next 30% of rooms
- **Popular** (score > 1): Next 30% of rooms
- **Regular** (score ≤ 1): Remaining rooms

Within each tier, rooms are shuffled to provide variety while maintaining relative popularity order.

## Activity Tracking

### Automatic Tracking

Room activity is automatically tracked when:

- Users join rooms via WebSocket (`joinRoom` event)
- Users sit in seats via WebSocket (`sitInSeat` event)

### Database Schema

```sql
CREATE TABLE room_activity_tracking (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE DEFAULT gen_random_uuid(),
    roomId UUID NOT NULL,
    userId UUID NOT NULL,
    activityDate DATE NOT NULL,
    visitCount INTEGER DEFAULT 1,
    lastVisitTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(roomId, userId, activityDate)
);
```

### Privacy Considerations

- Only aggregate data is exposed via the API
- Individual user activity is not revealed
- Activity data is anonymized in the popularity calculations

## Differences from Recommended Rooms

| Feature          | Recommended Rooms            | Popular Rooms                    |
| ---------------- | ---------------------------- | -------------------------------- |
| **Sorting**      | Creation date (newest first) | Popularity score (highest first) |
| **Query Params** | `userId` (optional)          | None                             |
| **Data**         | Basic room info              | Includes popularity metrics      |
| **Algorithm**    | Static ordering              | Dynamic scoring with shuffling   |
| **Purpose**      | Show all available rooms     | Highlight engaging rooms         |

## Usage Examples

### Basic Request

```javascript
const response = await fetch('/api/v1/rooms/popular', {
    headers: {
        Authorization: 'Bearer your-jwt-token'
    }
})
const data = await response.json()
```

### React Integration

```jsx
const [popularRooms, setPopularRooms] = useState([])

useEffect(() => {
    fetchPopularRooms().then(setPopularRooms)
}, [])

const fetchPopularRooms = async () => {
    const response = await fetch('/api/v1/rooms/popular', {
        headers: { Authorization: `Bearer ${token}` }
    })
    const data = await response.json()
    return data.data
}
```

### Flutter Integration

```dart
Future<List<Room>> fetchPopularRooms() async {
  final response = await http.get(
    Uri.parse('$baseUrl/rooms/popular'),
    headers: {'Authorization': 'Bearer $token'},
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    return (data['data'] as List)
        .map((room) => Room.fromJson(room))
        .toList();
  }
  throw Exception('Failed to load popular rooms');
}
```

## Error Handling

### Common Error Responses

**401 Unauthorized**

```json
{
    "statusCode": 401,
    "message": "Unauthorized access"
}
```

**400 Bad Request**

```json
{
    "statusCode": 400,
    "message": "Failed to fetch popular rooms"
}
```

### Fallback Behavior

If the popularity calculation fails, the API will fallback to the recommended rooms logic to ensure consistent service availability.

## Performance Considerations

- Popular rooms are calculated using optimized SQL queries
- Results can be cached for improved performance
- Activity tracking uses efficient upsert operations
- Pagination can be added in future versions if needed

## Future Enhancements

1. **Caching**: Redis caching for popular rooms list
2. **Pagination**: Support for `limit` and `offset` parameters
3. **Time Ranges**: Custom time range filters (e.g., "popular today", "popular this week")
4. **Categories**: Popular rooms by category or genre
5. **Regional**: Popular rooms by geographic region
6. **Real-time Updates**: WebSocket updates for popularity changes
