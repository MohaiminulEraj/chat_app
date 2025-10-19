# Claim Task Rewards Implementation

## Overview

Users must manually claim rewards after completing daily tasks. Rewards are not automatically distributed when tasks are completed.

---

## API Endpoints

### 1. **Claim User Daily Task Reward**

**Endpoint:** `POST /api/v1/users/claim-task-reward/:taskId`

**Description:** Claim reward for a completed user daily task

**Authentication:** Required (JWT Bearer Token)

**Parameters:**

- **Path:**

    - `taskId` (string, required): Task UUID

- **Query:**
    - `roomId` (string, optional): Room UUID for room-specific tasks

**Request Example:**

```bash
POST /api/v1/users/claim-task-reward/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
    "statusCode": 200,
    "message": "Reward claimed successfully",
    "data": {
        "success": true,
        "reward": 100,
        "rewardType": "bins"
    }
}
```

**Error Responses:**

**400 - Task Not Completed:**

```json
{
    "statusCode": 400,
    "message": "Task not completed yet"
}
```

**400 - Reward Already Claimed:**

```json
{
    "statusCode": 400,
    "message": "Reward already claimed"
}
```

**404 - Task Not Found:**

```json
{
    "statusCode": 404,
    "message": "Task not found"
}
```

**404 - Progress Not Found:**

```json
{
    "statusCode": 404,
    "message": "Task progress not found"
}
```

---

### 2. **Claim Room Daily Task Reward**

**Endpoint:** `POST /api/v1/rooms/:roomId/claim-task-reward/:taskId`

**Description:** Claim reward for a completed room-specific daily task

**Authentication:** Required (JWT Bearer Token)

**Parameters:**

- **Path:**
    - `roomId` (string, required): Room UUID
    - `taskId` (string, required): Task UUID

**Request Example:**

```bash
POST /api/v1/rooms/room-uuid-123/claim-task-reward/task-uuid-456
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
    "statusCode": 200,
    "message": "Room task reward claimed successfully",
    "data": {
        "success": true,
        "reward": 200,
        "rewardType": "diamonds"
    }
}
```

**Error Responses:** Same as user task claim endpoint

---

## Workflow

### 1. **Complete Task**

- User performs actions (e.g., sends messages, joins calls)
- Progress is tracked automatically
- When `progress >= total`, task is marked as `isCompleted: true`
- **NO automatic reward distribution**

### 2. **Check Task Status**

```bash
GET /api/v1/users/daily-tasks
GET /api/v1/rooms/:roomId/daily-tasks
```

Response shows:

```json
{
    "id": "send_messages",
    "title": "Send Messages",
    "progress": 10,
    "total": 10,
    "reward": 100,
    "isCompleted": true, // ✅ Task completed
    "rewardClaimed": false // ❌ Reward not claimed yet
}
```

### 3. **Claim Reward**

```bash
POST /api/v1/users/claim-task-reward/:taskId
```

Response:

```json
{
    "statusCode": 200,
    "message": "Reward claimed successfully",
    "data": {
        "success": true,
        "reward": 100,
        "rewardType": "bins"
    }
}
```

### 4. **Verify Claim**

```bash
GET /api/v1/users/daily-tasks
```

Response shows:

```json
{
    "id": "send_messages",
    "title": "Send Messages",
    "progress": 10,
    "total": 10,
    "reward": 100,
    "isCompleted": true, // ✅ Task completed
    "rewardClaimed": true, // ✅ Reward claimed
    "rewardClaimedAt": "2025-10-19T20:45:30.000Z"
}
```

---

## Database Schema

### UserTaskProgress Entity

```typescript
{
    userId: string
    taskId: string
    progress: number
    isCompleted: boolean
    rewardClaimed: boolean // ✅ New field
    rewardClaimedAt: Date | null // ✅ New field
    date: Date
    completedAt: Date | null
}
```

### RoomTaskProgress Entity

```typescript
{
    roomId: string
    userId: string
    taskId: string
    progress: number
    isCompleted: boolean
    rewardClaimed: boolean // ✅ New field
    rewardClaimedAt: Date | null // ✅ New field
    date: Date
    completedAt: Date | null
}
```

---

## Validation Rules

### ✅ Can Claim If:

1. Task exists
2. User has progress record for today
3. Task is completed (`isCompleted: true`)
4. Reward not already claimed (`rewardClaimed: false`)

### ❌ Cannot Claim If:

1. Task doesn't exist → 404 Error
2. No progress record → 404 Error
3. Task not completed → 400 Error
4. Reward already claimed → 400 Error

---

## Frontend Integration

### Flutter Example - User Tasks

```dart
// 1. Get daily tasks
final tasks = await getDailyTasks();

// 2. Show completed tasks with claim button
for (var task in tasks) {
  if (task.isCompleted && !task.rewardClaimed) {
    // Show "Claim Reward" button
    showClaimButton(task);
  }
}

// 3. Claim reward
Future<void> claimReward(String taskId) async {
  final response = await dio.post(
    '/api/v1/users/claim-task-reward/$taskId',
    options: Options(
      headers: {'Authorization': 'Bearer $token'},
    ),
  );

  if (response.statusCode == 200) {
    final reward = response.data['data']['reward'];
    final rewardType = response.data['data']['rewardType'];
    showSuccessMessage('Claimed $reward $rewardType!');
  }
}
```

### Flutter Example - Room Tasks

```dart
// Claim room task reward
Future<void> claimRoomReward(String roomId, String taskId) async {
  final response = await dio.post(
    '/api/v1/rooms/$roomId/claim-task-reward/$taskId',
    options: Options(
      headers: {'Authorization': 'Bearer $token'},
    ),
  );

  if (response.statusCode == 200) {
    final reward = response.data['data']['reward'];
    final rewardType = response.data['data']['rewardType'];
    showSuccessMessage('Claimed $reward $rewardType from room task!');
  }
}
```

---

## Testing Guide

### Test Case 1: Complete and Claim User Task

```bash
# 1. Get tasks
curl -X GET http://localhost:3000/api/v1/users/daily-tasks \
  -H "Authorization: Bearer $TOKEN"

# 2. Complete task (automatic via user actions)
# Progress updates happen automatically in the background

# 3. Claim reward
curl -X POST http://localhost:3000/api/v1/users/claim-task-reward/task-uuid \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with reward details
```

### Test Case 2: Try to Claim Before Completion

```bash
# Claim reward when progress < total
curl -X POST http://localhost:3000/api/v1/users/claim-task-reward/task-uuid \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request - "Task not completed yet"
```

### Test Case 3: Try to Claim Twice

```bash
# Claim reward first time
curl -X POST http://localhost:3000/api/v1/users/claim-task-reward/task-uuid \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK

# Claim reward second time
curl -X POST http://localhost:3000/api/v1/users/claim-task-reward/task-uuid \
  -H "Authorization: Bearer $TOKEN"
# Expected: 400 Bad Request - "Reward already claimed"
```

### Test Case 4: Room Task Claim

```bash
# Claim room task reward
curl -X POST http://localhost:3000/api/v1/rooms/room-uuid/claim-task-reward/task-uuid \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with reward details
```

---

## Summary of Changes

### ✅ Added Endpoints:

1. `POST /api/v1/users/claim-task-reward/:taskId` - Claim user task reward
2. `POST /api/v1/rooms/:roomId/claim-task-reward/:taskId` - Claim room task reward

### ✅ Updated Service:

- `TaskService.claimReward()` now returns `rewardType` ('bins' | 'diamonds')

### ✅ Database Fields:

- `rewardClaimed: boolean` - Tracks if reward was claimed
- `rewardClaimedAt: Date` - Timestamp when reward was claimed

### ✅ Validation:

- Cannot claim if task not completed
- Cannot claim if reward already claimed
- Cannot claim if progress record doesn't exist

---

## Reward Types

### Bins (Default)

- General currency
- Used for: Purchases, gifts, etc.

### Diamonds (Premium)

- Premium currency
- Used for: Special items, VIP features

**Configure in Task Metadata:**

```json
{
    "metadata": {
        "rewardType": "diamonds" // or "bins"
    }
}
```

---

## Notes

1. **Daily Reset**: Task progress resets at midnight (00:00:00)
2. **Claim Window**: Rewards must be claimed on the same day task is completed
3. **No Auto-Distribution**: Rewards ONLY distributed when user clicks "Claim"
4. **One Claim Per Task**: Each completed task can only be claimed once per day
5. **Reward Type Configurable**: Set via task metadata (`bins` or `diamonds`)
