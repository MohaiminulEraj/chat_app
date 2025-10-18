# Daily Tasks - Integration & Progress Tracking Guide

## 🔄 Automatic Progress Tracking

The system includes a `TaskProgressTracker` service that automatically tracks task progress based on user actions.

### **Available Tracking Methods**

#### 1. **Video Call Tracking**

```typescript
await taskProgressTracker.trackVideoCallJoin(userId)
```

**When to call**: When user successfully joins a video call

#### 2. **Message/Comment Tracking**

```typescript
await taskProgressTracker.trackMessageSend(userId, roomId?)
```

**When to call**:

- User sends a message in chat
- User sends a comment in a room

#### 3. **Gift Tracking**

```typescript
await taskProgressTracker.trackGiftSend(userId, giftCount, roomId?)
```

**When to call**: When user successfully sends gifts
**Parameters**:

- `giftCount`: Number of gifts sent (default: 1)
- `roomId`: Optional room context

#### 4. **Daily Bonus Tracking**

```typescript
await taskProgressTracker.trackDailyBonus(userId)
```

**When to call**: When user claims daily login bonus

#### 5. **Friend Invite Tracking**

```typescript
await taskProgressTracker.trackFriendInvite(userId)
```

**When to call**: When user sends a friend invitation

#### 6. **Room Seat Time Tracking**

```typescript
await taskProgressTracker.trackRoomSeatTime(roomId, userId, minutes)
```

**When to call**: Periodically while user is seated (e.g., every minute)

#### 7. **PK Battle Win Tracking**

```typescript
await taskProgressTracker.trackPKBattleWin(userId, roomId?)
```

**When to call**: When user wins a PK battle

#### 8. **Room Ranking Tracking**

```typescript
await taskProgressTracker.trackRoomRanking(roomId, userId, rank)
```

**When to call**: When user achieves top 10 ranking in room

#### 9. **Custom Task Tracking**

```typescript
await taskProgressTracker.trackCustomTask(taskId, userId, increment, roomId?)
```

**When to call**: For any custom task tracking

---

## 🏗️ Integration Examples

### **Example 1: Room Gateway Integration**

```typescript
// In room.gateway.ts
import { TaskProgressTracker } from '../task/task-progress-tracker.service'

export class RoomGateway {
    constructor(private readonly taskProgressTracker: TaskProgressTracker) {}

    @SubscribeMessage('sendComment')
    async handleSendComment(client: Socket, payload: any) {
        // ... existing comment logic ...

        // Track task progress
        await this.taskProgressTracker.trackMessageSend(
            payload.userId,
            payload.roomId
        )

        // ... rest of the logic ...
    }

    @SubscribeMessage('sendGiftInRoom')
    async handleSendGift(client: Socket, payload: any) {
        // ... existing gift logic ...

        // Track gift task progress
        await this.taskProgressTracker.trackGiftSend(
            payload.senderId,
            payload.quantity || 1,
            payload.roomId
        )

        // ... rest of the logic ...
    }
}
```

### **Example 2: Auth Service Integration**

```typescript
// In auth.service.ts
import { TaskProgressTracker } from '../task/task-progress-tracker.service'

export class AuthService {
    constructor(private readonly taskProgressTracker: TaskProgressTracker) {}

    async login(emailOrPhone: string, password: string) {
        // ... existing login logic ...

        // Track daily bonus/login
        await this.taskProgressTracker.trackDailyBonus(user.uuid)

        return { token, user }
    }
}
```

### **Example 3: Friendship Service Integration**

```typescript
// In friendship.service.ts
import { TaskProgressTracker } from '../task/task-progress-tracker.service'

export class FriendshipService {
    constructor(private readonly taskProgressTracker: TaskProgressTracker) {}

    async sendFriendRequest(userId: string, targetUserId: string) {
        // ... existing friend request logic ...

        // Track friend invite task
        await this.taskProgressTracker.trackFriendInvite(userId)

        return { success: true }
    }
}
```

---

## 🗄️ Database Migration Script

```sql
-- Create daily_tasks table
CREATE TABLE IF NOT EXISTS daily_tasks (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) UNIQUE NOT NULL,
    icon VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    total INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#1976D2',
    task_type VARCHAR(20) DEFAULT 'user',
    category VARCHAR(20) DEFAULT 'user_tab',
    room_id UUID,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for daily_tasks
CREATE INDEX idx_daily_task_type_room_active ON daily_tasks(task_type, room_id, is_active);
CREATE INDEX idx_daily_task_category_active ON daily_tasks(category, is_active);

-- Create user_task_progress table
CREATE TABLE IF NOT EXISTS user_task_progress (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    reward_claimed BOOLEAN DEFAULT false,
    date DATE NOT NULL,
    completed_at TIMESTAMP,
    reward_claimed_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_task_progress_user FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_user_task_progress_task FOREIGN KEY (task_id) REFERENCES daily_tasks(uuid) ON DELETE CASCADE,
    CONSTRAINT unique_user_task_date UNIQUE (user_id, task_id, date)
);

-- Create indexes for user_task_progress
CREATE INDEX idx_user_task_progress_user_date ON user_task_progress(user_id, date);
CREATE INDEX idx_user_task_progress_task_completed ON user_task_progress(task_id, is_completed);

-- Create room_task_progress table
CREATE TABLE IF NOT EXISTS room_task_progress (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    progress INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    reward_claimed BOOLEAN DEFAULT false,
    date DATE NOT NULL,
    completed_at TIMESTAMP,
    reward_claimed_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_task_progress_room FOREIGN KEY (room_id) REFERENCES rooms(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_room_task_progress_user FOREIGN KEY (user_id) REFERENCES users(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_room_task_progress_task FOREIGN KEY (task_id) REFERENCES daily_tasks(uuid) ON DELETE CASCADE,
    CONSTRAINT unique_room_user_task_date UNIQUE (room_id, user_id, task_id, date)
);

-- Create indexes for room_task_progress
CREATE INDEX idx_room_task_progress_room_user_date ON room_task_progress(room_id, user_id, date);
CREATE INDEX idx_room_task_progress_task_completed ON room_task_progress(task_id, is_completed);

-- Insert sample user tab tasks
INSERT INTO daily_tasks (task_id, icon, title, description, total, reward, color, task_type, category, is_active, sort_order, metadata, created_by)
VALUES
  ('join_video_calls', 'video_call', 'Join 3 Video Calls', 'Join video calls with friends to earn rewards', 3, 50, '#8E24AA', 'global', 'user_tab', true, 1, '{"rewardType":"bins","requiredLevel":1,"repeatDaily":true}', 'system'),
  ('send_messages', 'message', 'Send 20 Messages', 'Chat with friends and send 20 messages today', 20, 30, '#1976D2', 'global', 'user_tab', true, 2, '{"rewardType":"bins","repeatDaily":true}', 'system'),
  ('send_gifts', 'favorite', 'Send 10 Gifts', 'Show your appreciation by sending gifts', 10, 100, '#EC407A', 'global', 'user_tab', true, 3, '{"rewardType":"diamonds","repeatDaily":true,"requirements":{"minGiftValue":10}}', 'system'),
  ('collect_bonus', 'star', 'Collect Daily Bonus', 'Claim your daily login bonus', 1, 25, '#FFB300', 'global', 'user_tab', true, 4, '{"rewardType":"bins","repeatDaily":true}', 'system'),
  ('invite_friends', 'people', 'Invite 2 Friends', 'Invite friends to join the platform', 2, 200, '#388E3C', 'global', 'user_tab', true, 5, '{"rewardType":"diamonds","repeatDaily":false,"requirements":{"friendsMustJoin":true}}', 'system');

-- Note: For room-specific tasks, you need to insert with actual room UUIDs
-- Example:
-- INSERT INTO daily_tasks (task_id, icon, title, description, total, reward, color, task_type, category, room_id, is_active, sort_order, metadata, created_by)
-- VALUES ('room_gifts_vip', 'favorite', 'Send 15 Gifts in Room', 'Support your favorite broadcasters', 15, 250, '#FF6B6B', 'room', 'room_tab', 'a71adf4a-221d-4d59-a60a-005e2552f6f8', true, 1, '{"rewardType":"diamonds","requiredLevel":5,"repeatDaily":true}', 'system');
```

---

## ✅ Verification Checklist

### **Database Setup**

- [ ] Run migration script to create tables
- [ ] Verify indexes are created
- [ ] Insert sample tasks
- [ ] Check foreign key constraints

### **Service Integration**

- [ ] TaskProgressTracker added to RoomModule
- [ ] TaskProgressTracker injected in RoomGateway
- [ ] Tracking calls added to relevant socket handlers
- [ ] Error handling implemented for tracking failures

### **API Endpoints Testing**

- [ ] GET /users/daily-tasks returns tasks with progress
- [ ] GET /rooms/:roomId/daily-tasks returns room tasks
- [ ] POST /admin/tasks creates new task
- [ ] PUT /admin/tasks/:taskId updates task
- [ ] DELETE /admin/tasks/:taskId deletes task
- [ ] GET /admin/tasks retrieves all tasks

### **Progress Tracking Testing**

- [ ] Send comment → progress increments
- [ ] Send gift → progress increments (both user & room tasks)
- [ ] Join video call → progress increments
- [ ] Daily bonus → progress increments
- [ ] Friend invite → progress increments
- [ ] Task auto-completes when progress >= total
- [ ] Reward can be claimed only once
- [ ] Daily reset works (new date = new progress)

---

## 🔍 Debugging Progress Issues

### **Check Progress Records**

```sql
-- Check user task progress
SELECT
    utp.uuid,
    u.name as user_name,
    dt.task_id,
    dt.title,
    utp.progress,
    dt.total,
    utp.is_completed,
    utp.reward_claimed,
    utp.date
FROM user_task_progress utp
JOIN users u ON utp.user_id = u.uuid
JOIN daily_tasks dt ON utp.task_id = dt.uuid
WHERE utp.user_id = 'YOUR_USER_UUID'
AND utp.date = CURRENT_DATE
ORDER BY dt.sort_order;

-- Check room task progress
SELECT
    rtp.uuid,
    r.name as room_name,
    u.name as user_name,
    dt.task_id,
    dt.title,
    rtp.progress,
    dt.total,
    rtp.is_completed,
    rtp.reward_claimed,
    rtp.date
FROM room_task_progress rtp
JOIN rooms r ON rtp.room_id = r.uuid
JOIN users u ON rtp.user_id = u.uuid
JOIN daily_tasks dt ON rtp.task_id = dt.uuid
WHERE rtp.room_id = 'YOUR_ROOM_UUID'
AND rtp.date = CURRENT_DATE
ORDER BY dt.sort_order;
```

### **Common Issues**

1. **Progress not incrementing**

    - Check if task exists with correct `task_id`
    - Verify `isActive` is true
    - Check date field is set to today
    - Ensure foreign keys are valid

2. **Duplicate progress records**

    - Unique constraint on `(userId, taskId, date)` should prevent this
    - Check if date is properly set to start of day (00:00:00)

3. **Task not auto-completing**

    - Verify `progress >= total` logic in service
    - Check if `isCompleted` flag is being set
    - Ensure `completedAt` timestamp is saved

4. **Reward claimed multiple times**
    - Check `rewardClaimed` flag before claiming
    - Verify transaction is atomic
    - Ensure proper error handling

---

## 📈 Performance Considerations

### **Batch Progress Updates**

For high-frequency actions (e.g., messages), consider batching updates:

```typescript
// Instead of updating on every message
// Update every 5 messages or every 10 seconds
const messageBatchSize = 5
let messageCount = 0

messageCount++
if (messageCount >= messageBatchSize) {
    await taskProgressTracker.trackMessageSend(userId, roomId)
    messageCount = 0
}
```

### **Caching Task Definitions**

```typescript
// Cache active tasks in memory to reduce DB queries
private taskCache: Map<string, DailyTask> = new Map()

async getActiveTask(taskId: string): Promise<DailyTask> {
    if (this.taskCache.has(taskId)) {
        return this.taskCache.get(taskId)
    }

    const task = await this.dailyTaskRepository.findOne({
        where: { taskId, isActive: true }
    })

    if (task) {
        this.taskCache.set(taskId, task)
    }

    return task
}
```

---

## 🎯 Best Practices

1. **Always use try-catch** when tracking progress (non-blocking)
2. **Log tracking failures** for debugging
3. **Set proper date to midnight** (00:00:00) for daily tracking
4. **Use transactions** when updating user balance with rewards
5. **Validate task existence** before tracking
6. **Clean up old progress records** periodically (archive after 30 days)
7. **Monitor task completion rates** for balancing
8. **Test edge cases** (date boundaries, timezone changes)

---

**✅ Integration guide complete!** Progress tracking is now ready for production use.
