# Daily Tasks System - Complete Implementation Guide

## 📋 Overview

The Daily Tasks system allows users to complete daily challenges and earn rewards (coins/diamonds). Tasks can be:

- **User-specific**: Individual tasks displayed in the user tab
- **Room-specific**: Tasks for specific rooms displayed in the room tab
- **Global**: Tasks available to all users

---

## 🗄️ Database Schema

### **DailyTask Entity**

Main table for task definitions.

```typescript
{
  uuid: string (PK)
  taskId: string (unique) // e.g., 'join_video_calls'
  icon: string            // e.g., '📹'
  title: string
  description: string
  total: number           // Required progress (e.g., 5 for "Join 5 calls")
  reward: number          // Coins/diamonds to award
  color: string           // Hex color (e.g., '#1976D2')
  taskType: enum          // USER | ROOM | GLOBAL
  category: enum          // USER_TAB | ROOM_TAB
  roomId?: string         // Room UUID (nullable for global tasks)
  isActive: boolean
  sortOrder: number
  metadata: JSONB         // {rewardType, requiredLevel, expiresAt, repeatDaily, requirements}
  createdBy: string       // Admin UUID
}
```

**Indexes:**

- `idx_daily_task_type_room_active` on (taskType, roomId, isActive)
- `idx_daily_task_category_active` on (category, isActive)

---

### **UserTaskProgress Entity**

Tracks individual user progress on tasks.

```typescript
{
  uuid: string (PK)
  userId: string          // User UUID
  taskId: string          // DailyTask UUID
  progress: number        // Current progress (0 to total)
  isCompleted: boolean
  rewardClaimed: boolean
  date: Date              // Date for daily tracking (time set to 00:00:00)
  completedAt?: Date
  rewardClaimedAt?: Date
  metadata: JSONB         // {lastActionAt, actionsToday, details}
}
```

**Unique Constraint:** `userId + taskId + date` (prevents duplicate daily entries)
**Indexes:**

- `idx_user_task_progress_user_date` on (userId, date)
- `idx_user_task_progress_task_completed` on (taskId, isCompleted)

---

### **RoomTaskProgress Entity**

Tracks room-specific task progress per user.

```typescript
{
  uuid: string (PK)
  roomId: string          // Room UUID
  userId: string          // User UUID
  taskId: string          // DailyTask UUID
  progress: number
  isCompleted: boolean
  rewardClaimed: boolean
  date: Date
  completedAt?: Date
  rewardClaimedAt?: Date
  metadata: JSONB
}
```

**Unique Constraint:** `roomId + userId + taskId + date`
**Indexes:**

- `idx_room_task_progress_room_user_date` on (roomId, userId, date)
- `idx_room_task_progress_task_completed` on (taskId, isCompleted)

---

## 🔌 API Endpoints

### **1. Get User Daily Tasks**

```http
GET /users/daily-tasks
Authorization: Bearer <token>
```

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": "join_video_calls",
            "icon": "📹",
            "title": "Join Video Calls",
            "description": "Join 5 video calls today",
            "progress": 2,
            "total": 5,
            "reward": 100,
            "color": "#1976D2",
            "isCompleted": false,
            "rewardClaimed": false
        }
    ]
}
```

---

### **2. Get Room Daily Tasks**

```http
GET /rooms/:roomId/daily-tasks
Authorization: Bearer <token>
```

**Response:**

```json
{
    "success": true,
    "data": [
        {
            "id": "send_gifts_in_room",
            "icon": "🎁",
            "title": "Send Gifts in Room",
            "description": "Send 10 gifts in this room today",
            "progress": 3,
            "total": 10,
            "reward": 200,
            "color": "#FF6B6B",
            "isCompleted": false,
            "rewardClaimed": false
        }
    ]
}
```

---

### **3. Admin: Create Task**

```http
POST /admin/tasks
Authorization: Bearer <admin-token>
```

**Request Body:**

```json
{
    "taskId": "send_gifts",
    "icon": "🎁",
    "title": "Gift Sender",
    "description": "Send 10 gifts to friends",
    "total": 10,
    "reward": 150,
    "color": "#FF6B6B",
    "taskType": "USER",
    "category": "USER_TAB",
    "sortOrder": 1,
    "metadata": {
        "rewardType": "coins",
        "requiredLevel": 1,
        "repeatDaily": true
    }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": { ...task }
}
```

---

### **4. Admin: Get All Tasks**

```http
GET /admin/tasks?category=USER_TAB&roomId=xyz
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": [...]
}
```

---

### **5. Admin: Update Task**

```http
PUT /admin/tasks/:taskId
Authorization: Bearer <admin-token>
```

**Request Body:**

```json
{
    "title": "Updated Title",
    "reward": 200,
    "isActive": false
}
```

---

### **6. Admin: Delete Task**

```http
POST /admin/tasks/:taskId/delete
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
    "success": true,
    "message": "Task deleted successfully"
}
```

---

## ⚙️ Service Methods

### **TaskService Methods**

#### **getUserDailyTasks(userId: string)**

- Fetches all active USER tasks
- Joins with user's progress for today
- Returns formatted task list with progress

#### **getRoomDailyTasks(roomId: string, userId: string)**

- Fetches room-specific tasks
- Joins with room task progress for today
- Returns formatted task list with progress

#### **createTask(createTaskDto, adminId)**

- Validates unique taskId
- Creates new task
- Logs admin action

#### **updateTask(taskId, updateTaskDto)**

- Updates existing task
- Supports partial updates

#### **deleteTask(taskId)**

- Removes task from system
- Progress records remain (historical data)

#### **updateUserTaskProgress(userId, taskId, increment)**

- Increments user task progress
- Auto-completes when progress >= total
- Updates metadata with lastActionAt

#### **updateRoomTaskProgress(roomId, userId, taskId, increment)**

- Same as user progress but for room tasks
- Tracks room+user progress

#### **claimReward(userId, taskId, roomId?)**

- Validates task completion
- Prevents double-claiming
- Returns reward amount
- **Note:** Actual wallet/balance update should be done by caller

---

## 🎯 Usage Examples

### **Example 1: Creating a Global User Task**

```typescript
// Admin creates "Join 5 video calls" task for all users
POST /admin/tasks
{
  "taskId": "join_video_calls",
  "icon": "📹",
  "title": "Video Call Champion",
  "description": "Join 5 video calls today",
  "total": 5,
  "reward": 100,
  "color": "#1976D2",
  "taskType": "GLOBAL",
  "category": "USER_TAB",
  "sortOrder": 1
}
```

### **Example 2: Creating a Room-Specific Task**

```typescript
// Admin creates task for a specific room
POST /admin/tasks
{
  "taskId": "room_xyz_gifts",
  "icon": "🎁",
  "title": "Gift Master",
  "description": "Send 20 gifts in this room",
  "total": 20,
  "reward": 300,
  "color": "#FF6B6B",
  "taskType": "ROOM",
  "category": "ROOM_TAB",
  "roomId": "abc-123-room-uuid",
  "sortOrder": 1
}
```

### **Example 3: Updating Task Progress**

```typescript
// When user joins a video call
await taskService.updateUserTaskProgress(userId, 'join_video_calls', 1)

// When user sends a gift in a room
await taskService.updateRoomTaskProgress(
    roomId,
    userId,
    'send_gifts_in_room',
    1
)
```

### **Example 4: Claiming Reward**

```typescript
// User claims reward after completing task
const result = await taskService.claimReward(
    userId,
    taskUuid,
    roomId // optional
)

if (result.success) {
    // Update user's wallet/balance
    await userService.addCoins(userId, result.reward)
}
```

---

## 🔒 Security

### **AdminGuard Protection**

All admin endpoints are protected with:

```typescript
@UseGuards(JwtAuthGuard, AdminGuard)
@AdminOnly()
```

Only users with `userType === UserTypes.ADMIN` can:

- Create tasks
- Update tasks
- Delete tasks
- View all tasks

---

## 📱 Frontend Integration

### **User Tasks Tab**

```typescript
// Fetch user tasks
const response = await fetch('/users/daily-tasks', {
    headers: { Authorization: `Bearer ${token}` }
})

const { data: tasks } = await response.json()

// Display progress bars
tasks.forEach((task) => {
    const percentage = (task.progress / task.total) * 100
    // Render: icon, title, progress bar, reward
})
```

### **Room Tasks Tab**

```typescript
// Fetch room tasks
const response = await fetch(`/rooms/${roomId}/daily-tasks`, {
    headers: { Authorization: `Bearer ${token}` }
})

const { data: tasks } = await response.json()

// Same rendering as user tasks
```

---

## 🎨 Task Categories

### **USER_TAB Tasks**

Displayed in user profile/dashboard:

- Join video calls
- Send friend requests
- Complete profile
- Collect daily bonus
- Invite friends

### **ROOM_TAB Tasks**

Displayed in room interface:

- Send gifts in room
- Sit in seat for X minutes
- Send comments
- Participate in PK battles
- Win room rankings

---

## 🔄 Daily Reset

Tasks are tracked per day using the `date` field (time set to 00:00:00).

**Automatic Reset:**

- When `getUserDailyTasks()` or `getRoomDailyTasks()` is called
- System checks today's date
- If no progress record exists for today, user starts fresh
- Previous day's completed tasks remain in history

---

## 🧪 Testing Checklist

- [ ] User can fetch their daily tasks
- [ ] Room tasks show correct room-specific tasks
- [ ] Progress increments correctly
- [ ] Task auto-completes when progress >= total
- [ ] Reward can only be claimed once
- [ ] Cannot claim reward before completion
- [ ] Admin can create/update/delete tasks
- [ ] Non-admin users cannot access admin endpoints
- [ ] Tasks reset daily (new date creates new progress record)
- [ ] Global tasks show for all users
- [ ] Room-specific tasks only show in that room

---

## 📊 Sample Task Ideas

### User Tasks:

1. **Daily Login** - Login for 7 consecutive days (500 coins)
2. **Social Butterfly** - Send 10 friend requests (200 coins)
3. **Gift Giver** - Send 20 gifts total (300 diamonds)
4. **Video Caller** - Join 5 video calls (100 coins)
5. **Profile Completion** - Complete your profile to 100% (500 coins)

### Room Tasks:

1. **Room Regular** - Sit in room for 30 minutes (150 coins)
2. **Gift Master** - Send 15 gifts in this room (250 diamonds)
3. **Comment King** - Send 50 comments (100 coins)
4. **PK Winner** - Win 3 PK battles (400 diamonds)
5. **Seat Warmer** - Sit in seat 0 for 10 minutes (200 coins - owner only)

---

## 🚀 Deployment Notes

1. **Database Migration**: Run TypeORM synchronize to create tables
2. **Seed Data**: Create initial tasks for users/rooms
3. **Cron Jobs** (optional): Auto-archive old progress records
4. **Monitoring**: Track task completion rates
5. **Analytics**: Which tasks are most/least popular

---

## ✅ Implementation Status

- ✅ Entity creation (DailyTask, UserTaskProgress, RoomTaskProgress)
- ✅ DTOs with validation
- ✅ TaskService with all methods
- ✅ TaskModule created
- ✅ User endpoint (GET /users/daily-tasks)
- ✅ Room endpoint (GET /rooms/:roomId/daily-tasks)
- ✅ Admin endpoints (POST/GET/PUT/DELETE /admin/tasks)
- ✅ Module integration (UserModule, RoomModule, AdminModule, AppModule)
- ✅ AdminGuard protection
- ✅ Build successful

---

## 📝 Next Steps

1. **Create database migration script** with sample tasks
2. **Integrate progress tracking** into existing features:
    - Room join → `updateUserTaskProgress('join_video_calls')`
    - Gift send → `updateRoomTaskProgress('send_gifts')`
    - Comment send → `updateRoomTaskProgress('send_comments')`
3. **Add wallet integration** for reward claiming
4. **Create frontend UI** for task display
5. **Add analytics** for task completion tracking

---

## 🎯 Example Postman Collection

### Create Task (Admin)

```
POST {{baseUrl}}/admin/tasks
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "taskId": "daily_login",
  "icon": "🔥",
  "title": "Daily Streak",
  "description": "Login 7 days in a row",
  "total": 7,
  "reward": 500,
  "color": "#FF4500",
  "taskType": "USER",
  "category": "USER_TAB",
  "sortOrder": 1,
  "metadata": {
    "rewardType": "coins",
    "repeatDaily": false,
    "requirements": {"consecutiveDays": 7}
  }
}
```

### Get User Tasks

```
GET {{baseUrl}}/users/daily-tasks
Authorization: Bearer {{userToken}}
```

### Get Room Tasks

```
GET {{baseUrl}}/rooms/{{roomId}}/daily-tasks
Authorization: Bearer {{userToken}}
```

---

**🎉 Daily Tasks System Implementation Complete!**
