# PK Battle Host Participation System Update

## Overview

The PK Battle system has been updated to support the new seat management model where hosts can participate in battles as contestants. This aligns with the democratic host assignment system where anyone sitting in seat 0 becomes the host.

## Key Changes

### 1. Host Can Now Participate in PK Battles

#### Previous System:

- Hosts were excluded from participating in battles
- Only seated participants could compete
- Host was purely a moderator role

#### New System:

- **Hosts can participate** as PK battle contestants
- Hosts can create battles and include themselves as participants
- Hosts can sit in seats (especially seat 0) and compete
- Democratic host model allows anyone to become host by sitting in seat 0

### 2. Updated Participant Validation

#### Room Service Changes (`room.service.ts`)

```typescript
// OLD: Only seated participants could participate
for (const participantId of participantIds) {
    const isInRoom = await this.isUserInRoom(participantId, roomId)
    if (!isInRoom) {
        throw new BadRequestException(
            `User ${user?.name || participantId} is not in the room`
        )
    }
}

// NEW: Seated participants OR hosts can participate
for (const participantId of participantIds) {
    // Check if user is seated in the room OR is the host
    const isInRoom = await this.isUserInRoom(participantId, roomId)
    const userRoles = await this.getUserRolesInRoom(roomId, participantId)
    const isHost =
        userRoles.includes(RoomRole.HOST) || userRoles.includes(RoomRole.OWNER)

    if (!isInRoom && !isHost) {
        throw new BadRequestException(
            `User ${user?.name || participantId} must be seated in the room or be the host to participate in PK battle`
        )
    }
}
```

### 3. Battle Creation Permission Matrix

| User Role       | Can Create Battle | Can Participate | Can Start Battle |
| --------------- | ----------------- | --------------- | ---------------- |
| **Host**        | ✅ Yes            | ✅ **NEW: Yes** | ✅ Yes           |
| **Owner**       | ✅ Yes            | ✅ Yes          | ✅ Yes           |
| **Admin**       | ✅ Yes            | ✅ Yes          | ❌ No            |
| **Seated User** | ❌ No             | ✅ Yes          | ❌ No            |
| **Observer**    | ❌ No             | ❌ No           | ❌ No            |

### 4. Battle Workflow with Host Participation

#### Step 1: Battle Creation

```typescript
// Host can create battle and include themselves
const battle = await this.roomService.createPKBattle(
    roomId,
    hostId, // Host as creator
    [hostId, participantId], // Host as participant + another user
    durationMinutes,
    PKBattleType.HOST_SELECTED,
    description
)
```

#### Step 2: Participant Response

- Host (if participating) must accept their own battle invitation
- Other participant must accept
- Battle starts when both participants accept

#### Step 3: Battle Execution

- Host can compete while retaining moderation powers
- Host can end battle early if needed
- Host receives gifts and competes like any participant

### 5. Seat Management Integration

#### Democratic Host Model:

- **Seat 0 = Auto Host**: Anyone sitting in seat 0 becomes host automatically
- **Host Can Compete**: Host retains their seat and can participate in battles
- **Host Transfer**: If host leaves seat 0, role transfers to next available user

#### Battle Scenarios:

1. **Host in Seat 0 vs User in Seat 1**: Both compete while host retains powers
2. **Host vs Non-seated User**: Host (seated) vs admin/owner (not seated)
3. **Two Hosts**: If multiple hosts exist, both can participate

### 6. WebSocket Events

#### Battle Creation (Updated)

```javascript
// Client creates battle with host as participant
socket.emit('createPKBattle', {
    roomId: 'room-123',
    participantIds: [hostId, 'other-user-id'], // Host included
    durationMinutes: 5,
    battleType: 'host_selected',
    description: 'Host challenge battle'
})

// Server response includes host as participant
socket.on('pkBattleCreated', {
    battleId: 'battle-456',
    roomId: 'room-123',
    hostId: hostId,
    participants: [
        { userId: hostId, position: 1, status: 'invited' },
        { userId: 'other-user-id', position: 2, status: 'invited' }
    ]
})
```

### 7. Permission Checks

#### Battle Creation Validation:

```typescript
// Check if user is host/owner/admin
const hostRoles = await this.getUserRolesInRoom(roomId, hostId)
const canCreateBattle =
    hostRoles.includes(RoomRole.HOST) ||
    hostRoles.includes(RoomRole.OWNER) ||
    hostRoles.includes(RoomRole.ADMIN) ||
    room.ownerId === hostId
```

#### Participation Validation:

```typescript
// Allow seated users OR hosts/owners to participate
const isInRoom = await this.isUserInRoom(participantId, roomId)
const userRoles = await this.getUserRolesInRoom(roomId, participantId)
const isHost =
    userRoles.includes(RoomRole.HOST) || userRoles.includes(RoomRole.OWNER)

if (!isInRoom && !isHost) {
    throw new BadRequestException('User must be seated or be host/owner')
}
```

## Benefits of Host Participation

### 1. Enhanced Engagement

- Hosts can actively compete rather than just moderate
- Creates more dynamic room interactions
- Encourages user participation through host leadership

### 2. Democratic Leadership

- Anyone can become host by sitting in seat 0
- Temporary host role allows different users to lead battles
- Reduces rigid hierarchy in room management

### 3. Flexible Competition

- More possible battle combinations
- Hosts can demonstrate platform features
- Better user onboarding through host participation

## Implementation Status

### ✅ Completed Changes:

1. **Updated participant validation** in `createPKBattle` method
2. **Enhanced permission checks** for host participation
3. **Maintained WebSocket compatibility** with existing clients
4. **Preserved battle workflow** with expanded participant eligibility
5. **Integrated with seat management** system

### 🔄 Maintains Compatibility:

- Existing WebSocket events work unchanged
- Previous battle creation flow supported
- Non-participating host mode still available
- All existing permission structures preserved

## Usage Examples

### Example 1: Host Creates and Participates

```typescript
// Host in seat 0 challenges user in seat 3
await roomService.createPKBattle(
    'room-123',
    'host-user-id', // Creator (host)
    ['host-user-id', 'user-in-seat-3'], // Participants (host + user)
    5, // 5 minutes
    PKBattleType.HOST_SELECTED
)
```

### Example 2: Host Creates, Others Compete

```typescript
// Host creates battle between two other users
await roomService.createPKBattle(
    'room-123',
    'host-user-id', // Creator (host)
    ['user-in-seat-1', 'user-in-seat-2'], // Participants (two users)
    3, // 3 minutes
    PKBattleType.HOST_SELECTED
)
```

### Example 3: Owner vs Host Battle

```typescript
// Room owner challenges current host
await roomService.createPKBattle(
    'room-123',
    'owner-user-id', // Creator (owner)
    ['owner-user-id', 'current-host-id'], // Owner vs Host
    10, // 10 minutes
    PKBattleType.HOST_SELECTED
)
```

## Testing Scenarios

### 1. Host Participation Flow

1. User sits in seat 0 (becomes host)
2. Host creates battle including themselves
3. Host accepts invitation
4. Other participant accepts
5. Battle starts with host competing
6. Verify host retains moderation powers during battle

### 2. Host Role Transfer During Battle

1. Host participating in active battle
2. Host leaves seat 0
3. Verify role transfers to next user
4. Verify battle continues uninterrupted
5. Original host continues competing without host powers

### 3. Multiple Host Scenario

1. Owner creates battle
2. Current host (seat 0) is one participant
3. Owner is other participant
4. Verify both can compete with their respective permissions

This update significantly enhances the PK Battle system by allowing hosts to actively participate while maintaining their moderation capabilities, creating a more engaging and dynamic room experience.
