# Room Profile API Documentation

## Overview

The Room Profile API provides detailed user information when someone taps on a user profile within a room context. This API returns comprehensive data including user role, privileges, intimacy connections, and room-specific interactions.

## Endpoint

```
GET /rooms/{roomId}/user-profile/{userId}
```

## Authentication

- **Required**: Yes (JWT Bearer Token)
- **Headers**: `Authorization: Bearer <token>`

## Path Parameters

| Parameter | Type          | Required | Description                            |
| --------- | ------------- | -------- | -------------------------------------- |
| `roomId`  | string (UUID) | Yes      | The room identifier                    |
| `userId`  | string (UUID) | Yes      | The user identifier to get profile for |

## Response Structure

### Success Response (200 OK)

```json
{
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
        "userId": "456e7890-e89b-12d3-a456-426614174001",
        "name": "Alice Johnson",
        "displayName": "AliceGamer",
        "role": "host",
        "location": "New York, USA",
        "followersCount": 1250,
        "profile": {
            "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1640123456/sample_avatar.jpg",
            "coverPhoto": "https://res.cloudinary.com/demo/image/upload/v1640123456/sample_cover.jpg",
            "bio": "Gaming enthusiast and community leader. Love connecting with people through interactive experiences.",
            "level": 25,
            "badge": ["VIP", "Top Gifter", "Host Master", "Community Champion"]
        },
        "privileges": {
            "giftWall": {
                "count": 847,
                "totalValue": 15420.5,
                "recentGifts": [
                    {
                        "giftId": "gift-001",
                        "name": "Golden Rose",
                        "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1640123456/golden_rose.png",
                        "value": 250.0,
                        "senderName": "Bob Wilson",
                        "receivedAt": "2025-09-12T10:30:00Z"
                    }
                ]
            },
            "decoration": {
                "count": 23,
                "totalSpent": 3450.75,
                "activeDecorations": [
                    {
                        "decorationId": "deco-001",
                        "name": "Golden Frame",
                        "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1640123456/golden_frame.png",
                        "type": "frame",
                        "isActive": true,
                        "purchasedAt": "2025-09-10T14:30:00Z",
                        "price": 299.99
                    }
                ]
            }
        },
        "intimacy": {
            "totalConnections": 156,
            "intimacyScore": 8.7,
            "topConnections": [
                {
                    "userId": "user-int-001",
                    "name": "Bob Wilson",
                    "displayName": "BobTheBuilder",
                    "avatarUrl": "https://res.cloudinary.com/demo/image/upload/v1640123456/bob_avatar.jpg",
                    "intimacyLevel": 95,
                    "connectionType": "gift_exchange",
                    "giftExchangeCount": 127,
                    "totalGiftValue": 2340.5,
                    "mutualGifts": 89,
                    "lastInteraction": "2025-09-12T11:45:00Z",
                    "relationshipDuration": "3 months",
                    "connectionStrength": "Very Strong"
                }
            ]
        },
        "roomContext": {
            "joinedAt": "2025-09-12T08:00:00Z",
            "timeInRoom": "3 hours 45 minutes",
            "seatNumber": 1,
            "isHost": true,
            "contributions": {
                "commentsCount": 47,
                "giftsGivenInRoom": 12,
                "giftsReceivedInRoom": 28
            }
        },
        "stats": {
            "totalRoomsJoined": 342,
            "totalTimeInRooms": "287 hours",
            "favoriteRoomType": "Gaming",
            "hostingExperience": "15 months",
            "communityRating": 4.8,
            "totalGiftsReceived": 2847,
            "totalGiftsSent": 1923,
            "achievements": [
                "Top Host of the Month",
                "Community Builder",
                "Gift Master"
            ]
        }
    }
}
```

## Data Structure Breakdown

### 1. Basic User Information

```typescript
{
    userId: string,           // User unique identifier
    name: string,            // Full name
    displayName: string,     // Display/username
    role: string,            // Room role: 'owner' | 'host' | 'admin' | 'speaker' | 'listener'
    location: string,        // User's location/address
    followersCount: number   // Number of followers
}
```

### 2. Profile Details

```typescript
profile: {
    avatarUrl: string,       // Profile picture URL
    coverPhoto: string,      // Cover photo URL
    bio: string,            // User biography
    level: number,          // User level/experience
    badge: string[]         // Array of badges earned
}
```

### 3. Privileges Object

#### Gift Wall

```typescript
giftWall: {
    count: number,          // Total gifts received count
    totalValue: number,     // Total monetary value of gifts
    recentGifts: [          // Last 5 recent gifts
        {
            giftId: string,
            name: string,
            imageUrl: string,
            value: number,
            senderName: string,
            receivedAt: string (ISO 8601)
        }
    ]
}
```

#### Decoration

```typescript
decoration: {
    count: number,              // Total decorations purchased
    totalSpent: number,         // Total money spent on decorations
    activeDecorations: [        // Currently active decorations
        {
            decorationId: string,
            name: string,
            imageUrl: string,
            type: 'frame' | 'effect' | 'badge',
            isActive: boolean,
            purchasedAt: string (ISO 8601),
            price: number
        }
    ]
}
```

### 4. Intimacy Connections

```typescript
intimacy: {
    totalConnections: number,   // Total intimate connections
    intimacyScore: number,      // Overall intimacy score (0-10)
    topConnections: [           // Top 5 intimate connections
        {
            userId: string,
            name: string,
            displayName: string,
            avatarUrl: string,
            intimacyLevel: number,      // 0-100 intimacy level
            connectionType: 'gift_exchange' | 'frequent_interaction' | 'mutual_friend',
            giftExchangeCount: number,
            totalGiftValue: number,
            mutualGifts: number,
            lastInteraction: string (ISO 8601),
            relationshipDuration: string,
            connectionStrength: 'Very Strong' | 'Strong' | 'Good' | 'Moderate' | 'Weak'
        }
    ]
}
```

### 5. Room Context Information

```typescript
roomContext: {
    joinedAt: string (ISO 8601),    // When user joined this room
    timeInRoom: string,             // Duration in this room session
    seatNumber: number,             // Current seat number
    isHost: boolean,                // Is user the host
    contributions: {
        commentsCount: number,      // Comments in this room
        giftsGivenInRoom: number,   // Gifts given in this room
        giftsReceivedInRoom: number // Gifts received in this room
    },
    roomInteractions: [             // Recent room interactions
        {
            type: 'comment' | 'gift_received' | 'gift_sent',
            content?: string,
            from?: string,
            giftName?: string,
            timestamp: string (ISO 8601)
        }
    ]
}
```

### 6. Overall Statistics

```typescript
stats: {
    totalRoomsJoined: number,       // Total rooms ever joined
    totalTimeInRooms: string,       // Total time spent in rooms
    favoriteRoomType: string,       // Most frequented room type
    hostingExperience: string,      // How long user has been hosting
    communityRating: number,        // Community rating (0-5)
    totalGiftsReceived: number,     // All-time gifts received
    totalGiftsSent: number,         // All-time gifts sent
    achievements: string[]          // Array of achievements
}
```

## Frontend Implementation Examples

### 1. Basic API Call

```javascript
async function getUserProfileInRoom(roomId, userId) {
    try {
        const response = await fetch(
            `/api/rooms/${roomId}/user-profile/${userId}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        const data = await response.json()

        if (data.success) {
            return data.data
        } else {
            throw new Error(data.message)
        }
    } catch (error) {
        console.error('Error fetching user profile:', error)
        throw error
    }
}
```

### 2. React Hook Example

```typescript
import { useState, useEffect } from 'react'

interface UserProfile {
    userId: string
    name: string
    displayName: string
    role: string
    // ... other properties from the API response
}

export const useUserProfile = (roomId: string, userId: string) => {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (roomId && userId) {
            fetchUserProfile()
        }
    }, [roomId, userId])

    const fetchUserProfile = async () => {
        setLoading(true)
        setError(null)

        try {
            const profileData = await getUserProfileInRoom(roomId, userId)
            setProfile(profileData)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return { profile, loading, error, refetch: fetchUserProfile }
}
```

### 3. Profile Modal Component

```typescript
import React from 'react'

interface ProfileModalProps {
    roomId: string
    userId: string
    isOpen: boolean
    onClose: () => void
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
    roomId,
    userId,
    isOpen,
    onClose
}) => {
    const { profile, loading, error } = useUserProfile(roomId, userId)

    if (!isOpen) return null

    return (
        <div className="profile-modal-overlay">
            <div className="profile-modal">
                <div className="profile-header">
                    <img
                        src={profile?.profile.coverPhoto}
                        alt="Cover"
                        className="cover-photo"
                    />
                    <img
                        src={profile?.profile.avatarUrl}
                        alt={profile?.name}
                        className="avatar"
                    />
                    <h2>{profile?.name}</h2>
                    <span className="role-badge">{profile?.role}</span>
                </div>

                <div className="profile-content">
                    <div className="privileges-section">
                        <h3>Privileges</h3>
                        <div className="privilege-stats">
                            <div className="gift-wall">
                                <span>Gifts Received: {profile?.privileges.giftWall.count}</span>
                                <span>Total Value: ${profile?.privileges.giftWall.totalValue}</span>
                            </div>
                            <div className="decorations">
                                <span>Decorations: {profile?.privileges.decoration.count}</span>
                                <span>Total Spent: ${profile?.privileges.decoration.totalSpent}</span>
                            </div>
                        </div>
                    </div>

                    <div className="intimacy-section">
                        <h3>Intimacy Connections</h3>
                        <div className="connections-list">
                            {profile?.intimacy.topConnections.map(connection => (
                                <div key={connection.userId} className="connection-item">
                                    <img src={connection.avatarUrl} alt={connection.name} />
                                    <span>{connection.name}</span>
                                    <span>{connection.intimacyLevel}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={onClose}>Close</button>
            </div>
        </div>
    )
}
```

## Error Responses

### 400 Bad Request

```json
{
    "success": false,
    "message": "Invalid room ID or user ID format",
    "statusCode": 400
}
```

### 401 Unauthorized

```json
{
    "success": false,
    "message": "Authentication required",
    "statusCode": 401
}
```

### 404 Not Found

```json
{
    "success": false,
    "message": "Room or user not found",
    "statusCode": 404
}
```

### 403 Forbidden

```json
{
    "success": false,
    "message": "Access denied to room or user profile",
    "statusCode": 403
}
```

## Implementation Status

### Current Status: **DUMMY DATA READY** ✅

The API endpoint is currently implemented with comprehensive dummy data that matches the exact response structure needed by the frontend. This allows frontend development to proceed immediately without waiting for database integration.

### Dummy Data Includes:

- ✅ Complete user profile information
- ✅ Role and permission data
- ✅ Gift Wall with recent gifts (5 items)
- ✅ Decoration purchases with active items (4 items)
- ✅ Intimacy connections with top 5 users
- ✅ Room context and interaction history
- ✅ Comprehensive user statistics
- ✅ Achievement system data

### Future Implementation (TODO):

1. **Database Integration**: Replace dummy data with actual database queries
2. **Role Calculation**: Get real user role from room_roles table
3. **Gift Wall Data**: Query actual gifts received by user
4. **Decoration Data**: Query purchased decorations from user profile
5. **Intimacy Calculation**: Implement intimacy scoring algorithm
6. **Privacy Controls**: Add privacy settings for profile visibility
7. **Caching**: Implement Redis caching for frequently accessed profiles
8. **Real-time Updates**: Add WebSocket events for live profile updates

### Testing

```bash
# Example cURL request
curl -X GET "http://localhost:3000/api/rooms/123e4567-e89b-12d3-a456-426614174000/user-profile/456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## Notes for Frontend Teams

1. **Immediate Development**: You can start implementing the UI immediately using the dummy data structure
2. **Data Consistency**: The response structure is final and won't change during actual implementation
3. **Error Handling**: Implement proper error handling for network failures and API errors
4. **Loading States**: Always show loading indicators while fetching profile data
5. **Caching**: Consider implementing client-side caching to avoid repeated API calls
6. **Image Handling**: All image URLs in dummy data are placeholder URLs - replace with actual URLs when available
7. **Responsive Design**: Profile modals should work across different screen sizes

The API provides rich, detailed information that enables creating engaging and comprehensive user profile experiences within room contexts.
