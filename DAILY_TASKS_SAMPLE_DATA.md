# Daily Tasks - Sample Data & API Examples

## 📋 Sample Task Payloads for Admin Creation

### **User Tab Tasks (Global)**

#### 1. Join Video Calls Task

```json
POST /admin/tasks
{
  "taskId": "join_video_calls",
  "icon": "video_call",
  "title": "Join 3 Video Calls",
  "description": "Join video calls with friends to earn rewards",
  "total": 3,
  "reward": 50,
  "color": "#8E24AA",
  "taskType": "global",
  "category": "user_tab",
  "sortOrder": 1,
  "metadata": {
    "rewardType": "bins",
    "requiredLevel": 1,
    "repeatDaily": true
  }
}
```

#### 2. Send Messages Task

```json
POST /admin/tasks
{
  "taskId": "send_messages",
  "icon": "message",
  "title": "Send 20 Messages",
  "description": "Chat with friends and send 20 messages today",
  "total": 20,
  "reward": 30,
  "color": "#1976D2",
  "taskType": "global",
  "category": "user_tab",
  "sortOrder": 2,
  "metadata": {
    "rewardType": "bins",
    "repeatDaily": true
  }
}
```

#### 3. Send Gifts Task

```json
POST /admin/tasks
{
  "taskId": "send_gifts",
  "icon": "favorite",
  "title": "Send 10 Gifts",
  "description": "Show your appreciation by sending gifts",
  "total": 10,
  "reward": 100,
  "color": "#EC407A",
  "taskType": "global",
  "category": "user_tab",
  "sortOrder": 3,
  "metadata": {
    "rewardType": "diamonds",
    "repeatDaily": true,
    "requirements": {
      "minGiftValue": 10
    }
  }
}
```

#### 4. Collect Daily Bonus Task

```json
POST /admin/tasks
{
  "taskId": "collect_bonus",
  "icon": "star",
  "title": "Collect Daily Bonus",
  "description": "Claim your daily login bonus",
  "total": 1,
  "reward": 25,
  "color": "#FFB300",
  "taskType": "global",
  "category": "user_tab",
  "sortOrder": 4,
  "metadata": {
    "rewardType": "bins",
    "repeatDaily": true
  }
}
```

#### 5. Invite Friends Task

```json
POST /admin/tasks
{
  "taskId": "invite_friends",
  "icon": "people",
  "title": "Invite 2 Friends",
  "description": "Invite friends to join the platform",
  "total": 2,
  "reward": 200,
  "color": "#388E3C",
  "taskType": "global",
  "category": "user_tab",
  "sortOrder": 5,
  "metadata": {
    "rewardType": "diamonds",
    "repeatDaily": false,
    "requirements": {
      "friendsMustJoin": true
    }
  }
}
```

---

### **Room Tab Tasks (Room-Specific)**

#### 6. Room Gifts Task

```json
POST /admin/tasks
{
  "taskId": "room_gifts_vip",
  "icon": "favorite",
  "title": "Send 15 Gifts in Room",
  "description": "Support your favorite broadcasters by sending gifts",
  "total": 15,
  "reward": 250,
  "color": "#FF6B6B",
  "taskType": "room",
  "category": "room_tab",
  "roomId": "123e4567-e89b-12d3-a456-426614174000",
  "sortOrder": 1,
  "metadata": {
    "rewardType": "diamonds",
    "requiredLevel": 5,
    "repeatDaily": true
  }
}
```

#### 7. Room Comments Task

```json
POST /admin/tasks
{
  "taskId": "room_comments",
  "icon": "chat_bubble",
  "title": "Send 30 Comments",
  "description": "Engage with the community by commenting",
  "total": 30,
  "reward": 40,
  "color": "#42A5F5",
  "taskType": "room",
  "category": "room_tab",
  "roomId": "123e4567-e89b-12d3-a456-426614174000",
  "sortOrder": 2,
  "metadata": {
    "rewardType": "bins",
    "repeatDaily": true
  }
}
```

#### 8. Room Seat Time Task

```json
POST /admin/tasks
{
  "taskId": "room_seat_time",
  "icon": "event_seat",
  "title": "Sit for 30 Minutes",
  "description": "Stay in a room seat for 30 minutes",
  "total": 30,
  "reward": 150,
  "color": "#9C27B0",
  "taskType": "room",
  "category": "room_tab",
  "roomId": "123e4567-e89b-12d3-a456-426614174000",
  "sortOrder": 3,
  "metadata": {
    "rewardType": "bins",
    "repeatDaily": true,
    "requirements": {
      "unit": "minutes",
      "mustBeInSeat": true
    }
  }
}
```

#### 9. Win PK Battles Task

```json
POST /admin/tasks
{
  "taskId": "win_pk_battles",
  "icon": "emoji_events",
  "title": "Win 3 PK Battles",
  "description": "Compete and win PK battles in rooms",
  "total": 3,
  "reward": 300,
  "color": "#FF5722",
  "taskType": "global",
  "category": "room_tab",
  "sortOrder": 4,
  "metadata": {
    "rewardType": "diamonds",
    "requiredLevel": 10,
    "repeatDaily": true
  }
}
```

#### 10. Room Ranking Task

```json
POST /admin/tasks
{
  "taskId": "room_top_10",
  "icon": "leaderboard",
  "title": "Reach Top 10 in Room",
  "description": "Climb the room leaderboard to top 10",
  "total": 1,
  "reward": 500,
  "color": "#FFC107",
  "taskType": "room",
  "category": "room_tab",
  "roomId": "123e4567-e89b-12d3-a456-426614174000",
  "sortOrder": 5,
  "metadata": {
    "rewardType": "diamonds",
    "requiredLevel": 15,
    "repeatDaily": false,
    "requirements": {
      "rankingType": "daily",
      "maxRank": 10
    }
  }
}
```

---

## 📊 Expected Response Format

### GET /users/daily-tasks

```json
{
    "success": true,
    "data": [
        {
            "id": "join_video_calls",
            "icon": "video_call",
            "title": "Join 3 Video Calls",
            "description": "Join video calls with friends to earn rewards",
            "progress": 2,
            "total": 3,
            "reward": 50,
            "color": "#8E24AA",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "bins",
                "requiredLevel": 1,
                "repeatDaily": true
            }
        },
        {
            "id": "send_messages",
            "icon": "message",
            "title": "Send 20 Messages",
            "description": "Chat with friends and send 20 messages today",
            "progress": 15,
            "total": 20,
            "reward": 30,
            "color": "#1976D2",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "bins",
                "repeatDaily": true
            }
        },
        {
            "id": "send_gifts",
            "icon": "favorite",
            "title": "Send 10 Gifts",
            "description": "Show your appreciation by sending gifts",
            "progress": 7,
            "total": 10,
            "reward": 100,
            "color": "#EC407A",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "diamonds",
                "repeatDaily": true,
                "requirements": {
                    "minGiftValue": 10
                }
            }
        },
        {
            "id": "collect_bonus",
            "icon": "star",
            "title": "Collect Daily Bonus",
            "description": "Claim your daily login bonus",
            "progress": 0,
            "total": 1,
            "reward": 25,
            "color": "#FFB300",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "bins",
                "repeatDaily": true
            }
        },
        {
            "id": "invite_friends",
            "icon": "people",
            "title": "Invite 2 Friends",
            "description": "Invite friends to join the platform",
            "progress": 1,
            "total": 2,
            "reward": 200,
            "color": "#388E3C",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "diamonds",
                "repeatDaily": false,
                "requirements": {
                    "friendsMustJoin": true
                }
            }
        }
    ]
}
```

### GET /rooms/:roomId/daily-tasks

```json
{
    "success": true,
    "data": [
        {
            "id": "room_gifts_vip",
            "icon": "favorite",
            "title": "Send 15 Gifts in Room",
            "description": "Support your favorite broadcasters by sending gifts",
            "progress": 8,
            "total": 15,
            "reward": 250,
            "color": "#FF6B6B",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "diamonds",
                "requiredLevel": 5,
                "repeatDaily": true
            }
        },
        {
            "id": "room_comments",
            "icon": "chat_bubble",
            "title": "Send 30 Comments",
            "description": "Engage with the community by commenting",
            "progress": 22,
            "total": 30,
            "reward": 40,
            "color": "#42A5F5",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "bins",
                "repeatDaily": true
            }
        },
        {
            "id": "room_seat_time",
            "icon": "event_seat",
            "title": "Sit for 30 Minutes",
            "description": "Stay in a room seat for 30 minutes",
            "progress": 15,
            "total": 30,
            "reward": 150,
            "color": "#9C27B0",
            "isCompleted": false,
            "rewardClaimed": false,
            "metadata": {
                "rewardType": "bins",
                "repeatDaily": true,
                "requirements": {
                    "unit": "minutes",
                    "mustBeInSeat": true
                }
            }
        }
    ]
}
```

---

## 🎨 Icon Reference Guide

### User Tab Icons

- `video_call` - 📹 Video calling
- `message` - 💬 Messaging
- `favorite` - ❤️ Gifts/likes
- `star` - ⭐ Bonus/rewards
- `people` - 👥 Social/friends
- `emoji_events` - 🏆 Achievements
- `workspace_premium` - 💎 Premium features

### Room Tab Icons

- `chat_bubble` - 💭 Comments
- `event_seat` - 💺 Seating
- `leaderboard` - 📊 Rankings
- `military_tech` - 🎖️ Competitions
- `emoji_events` - 🏆 Battles/wins

---

## 🔄 Task Type Definitions

### TaskType Enum

- `USER` - Individual user tasks (independent of rooms)
- `ROOM` - Room-specific tasks (requires roomId)
- `GLOBAL` - Available to all users system-wide

### TaskCategory Enum

- `USER_TAB` - Displayed in user profile/dashboard
- `ROOM_TAB` - Displayed in room interface

---

## 💾 Database Seeding Script

```sql
-- Insert User Tab Tasks
INSERT INTO daily_tasks (task_id, icon, title, description, total, reward, color, task_type, category, is_active, sort_order, metadata, created_by)
VALUES
  ('join_video_calls', 'video_call', 'Join 3 Video Calls', 'Join video calls with friends to earn rewards', 3, 50, '#8E24AA', 'global', 'user_tab', true, 1, '{"rewardType":"bins","requiredLevel":1,"repeatDaily":true}', 'system'),
  ('send_messages', 'message', 'Send 20 Messages', 'Chat with friends and send 20 messages today', 20, 30, '#1976D2', 'global', 'user_tab', true, 2, '{"rewardType":"bins","repeatDaily":true}', 'system'),
  ('send_gifts', 'favorite', 'Send 10 Gifts', 'Show your appreciation by sending gifts', 10, 100, '#EC407A', 'global', 'user_tab', true, 3, '{"rewardType":"diamonds","repeatDaily":true,"requirements":{"minGiftValue":10}}', 'system'),
  ('collect_bonus', 'star', 'Collect Daily Bonus', 'Claim your daily login bonus', 1, 25, '#FFB300', 'global', 'user_tab', true, 4, '{"rewardType":"bins","repeatDaily":true}', 'system'),
  ('invite_friends', 'people', 'Invite 2 Friends', 'Invite friends to join the platform', 2, 200, '#388E3C', 'global', 'user_tab', true, 5, '{"rewardType":"diamonds","repeatDaily":false,"requirements":{"friendsMustJoin":true}}', 'system');

-- Insert Room Tab Tasks (Template - use specific roomId when creating)
-- Note: Replace 'your-room-uuid-here' with actual room UUIDs
INSERT INTO daily_tasks (task_id, icon, title, description, total, reward, color, task_type, category, room_id, is_active, sort_order, metadata, created_by)
VALUES
  ('room_gifts_vip', 'favorite', 'Send 15 Gifts in Room', 'Support your favorite broadcasters by sending gifts', 15, 250, '#FF6B6B', 'room', 'room_tab', 'your-room-uuid-here', true, 1, '{"rewardType":"diamonds","requiredLevel":5,"repeatDaily":true}', 'system'),
  ('room_comments', 'chat_bubble', 'Send 30 Comments', 'Engage with the community by commenting', 30, 40, '#42A5F5', 'room', 'room_tab', 'your-room-uuid-here', true, 2, '{"rewardType":"bins","repeatDaily":true}', 'system'),
  ('room_seat_time', 'event_seat', 'Sit for 30 Minutes', 'Stay in a room seat for 30 minutes', 30, 150, '#9C27B0', 'room', 'room_tab', 'your-room-uuid-here', true, 3, '{"rewardType":"bins","repeatDaily":true,"requirements":{"unit":"minutes","mustBeInSeat":true}}', 'system');
```

---

## 🧪 Testing Scenarios

### Test 1: Create User Task

```bash
curl -X POST http://localhost:3000/admin/tasks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "join_video_calls",
    "icon": "video_call",
    "title": "Join 3 Video Calls",
    "description": "Join video calls with friends to earn rewards",
    "total": 3,
    "reward": 50,
    "color": "#8E24AA",
    "taskType": "global",
    "category": "user_tab",
    "sortOrder": 1,
    "metadata": {
      "rewardType": "bins",
      "requiredLevel": 1,
      "repeatDaily": true
    }
  }'
```

### Test 2: Create Room-Specific Task

```bash
curl -X POST http://localhost:3000/admin/tasks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "room_gifts_vip",
    "icon": "favorite",
    "title": "Send 15 Gifts in Room",
    "description": "Support your favorite broadcasters",
    "total": 15,
    "reward": 250,
    "color": "#FF6B6B",
    "taskType": "room",
    "category": "room_tab",
    "roomId": "123e4567-e89b-12d3-a456-426614174000",
    "sortOrder": 1,
    "metadata": {
      "rewardType": "diamonds",
      "requiredLevel": 5,
      "repeatDaily": true
    }
  }'
```

### Test 3: Get All User Tab Tasks

```bash
curl -X GET "http://localhost:3000/admin/tasks?category=user_tab" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Test 4: Get Room-Specific Tasks

```bash
curl -X GET "http://localhost:3000/admin/tasks?category=room_tab&roomId=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🎯 Frontend Color Palette

```javascript
const taskColors = {
    purple: '#8E24AA', // Video calls, premium features
    blue: '#1976D2', // Messages, communication
    pink: '#EC407A', // Gifts, favorites
    amber: '#FFB300', // Bonus, rewards, stars
    green: '#388E3C', // Social, friends, growth
    red: '#FF6B6B', // Room gifts, urgent
    lightBlue: '#42A5F5', // Comments, chat
    violet: '#9C27B0', // Seating, presence
    deepOrange: '#FF5722', // Battles, competition
    yellow: '#FFC107' // Rankings, achievements
}
```

---

## 📱 Mobile App Integration

### Flutter/React Native Example

```dart
// Task Model
class DailyTask {
  final String id;
  final String icon;
  final String title;
  final String description;
  final int progress;
  final int total;
  final int reward;
  final String color;
  final bool isCompleted;
  final bool rewardClaimed;

  double get percentage => (progress / total * 100).clamp(0, 100);
  bool get canClaim => isCompleted && !rewardClaimed;
}

// API Call
Future<List<DailyTask>> fetchUserTasks() async {
  final response = await http.get(
    Uri.parse('$baseUrl/users/daily-tasks'),
    headers: {'Authorization': 'Bearer $token'}
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return (data['data'] as List)
        .map((task) => DailyTask.fromJson(task))
        .toList();
  }
  throw Exception('Failed to load tasks');
}
```

---

**✅ Sample data generation complete!** All task examples are now documented with proper payloads matching the entity schema.
