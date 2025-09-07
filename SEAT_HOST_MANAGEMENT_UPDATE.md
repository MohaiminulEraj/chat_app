# Seat and Host Management System Update

## 🎯 Overview

Updated the room seat management system to implement a new host assignment model based on seat positioning, with enhanced permission controls for admins.

## 🔄 Key Changes Made

### 1. **Automatic Seat Assignment Removed**

- **Before**: Users were automatically assigned seats when joining rooms (except hosts)
- **After**: All users join as observers and must explicitly tap/click on a seat to sit down
- **Impact**: More intentional seat selection, better user control

### 2. **Seat 0 = Host Rule**

- **New Logic**: Whoever sits in seat 0 (index 0, first seat) automatically becomes the room host
- **Dynamic Host Transfer**: Host role is automatically transferred when someone new sits in seat 0
- **Host Role Removal**: When someone leaves seat 0, host role transfers to the next seated user (lowest seat number)

### 3. **Enhanced Permission System**

- **Admins can kick hosts**: Room admins can now kick users from any seat, including seat 0 (the host)
- **Host role transfer on kick**: When host (seat 0 occupant) is kicked, role automatically transfers to next seated user
- **Permission hierarchy**: Owner > Admin > Host > Regular User

## 🛠️ Technical Implementation

### Gateway Changes (`room.gateway.ts`)

#### `handleRoomID` Method

```typescript
// All users join as observers initially - they must explicitly sit in a seat
const roomDetails = await this.roomService.getRoomDetails(data.roomID)

let participant: any = null
let joinedAsObserver = true

// No automatic seat assignment - users must tap on a seat to sit
```

#### `handleJoinRoom` Method

```typescript
// Format participant data if user is seated
const participantData = currentUserParticipant
    ? {
          userId: currentUserParticipant.userId,
          name: currentUserParticipant.user?.name || userName,
          avatar: currentUserParticipant.user?.avatarUrl || null,
          seatIndex: currentUserParticipant.seatNumber - 1,
          isSpeaking: currentUserParticipant.isSpeaking || false,
          micOn: !currentUserParticipant.isMuted,
          role: 'participant'
      }
    : null

// Only emit joinRoomResponse when user is actually seated
if (participantData) {
    client.emit('joinRoomResponse', participantData)
}
```

#### `handleSitInSeat` Method

```typescript
// If user sits in seat 0 (index 0), they become the host
if (data.seatIndex === 0) {
    try {
        const currentHostId = roomDetails?.hostId

        // Only transfer ownership if the user is not already the host
        if (currentHostId !== userId) {
            await this.roomService.transferRoomOwnership(
                roomId,
                userId,
                currentHostId || roomDetails?.ownerId || userId
            )

            // Broadcast host change to all room participants
            this.server.to(`room:${roomId}`).emit('hostChanged', {
                roomId,
                newHostId: userId,
                newHostName: participant.user?.name || userName,
                previousHostId: currentHostId,
                timestamp: new Date().toISOString(),
                reason: 'seat_0_assignment'
            })
        }
    } catch (error) {
        this.logger.warn(`Failed to transfer host role: ${error.message}`)
    }
}
```

### Service Changes (`room.service.ts`)

#### Enhanced Kick Permissions

```typescript
const isOwner = userRoles.includes(RoomRole.OWNER) || room?.ownerId === kickedBy
const isAdmin = userRoles.includes(RoomRole.ADMIN)
const isHost = userRoles.includes(RoomRole.HOST)

// Admins can kick anyone (including hosts), hosts can kick regular users, owners can kick anyone
const canKick = isOwner || isAdmin || isHost
```

#### Host Role Assignment in `joinRoom`

```typescript
// If user sits in seat 0, they become the host
if (assignedSeat === 0) {
    try {
        // First, remove HOST role from current host (if any)
        const currentHostAssignments = await this.roomRoleRepository.find({
            where: { roomId, role: RoomRole.HOST, isActive: true }
        })

        for (const assignment of currentHostAssignments) {
            await this.removeRoomRole(
                roomId,
                assignment.userId,
                RoomRole.HOST,
                userId
            )
        }

        // Assign HOST role to the new user
        await this.assignRoomRole(roomId, userId, RoomRole.HOST, userId)
    } catch (error) {
        this.logger.warn(`Failed to assign host role: ${error.message}`)
    }
}
```

#### Host Role Transfer on Leave/Kick

```typescript
// If leaving seat 0 (host seat), need to transfer host role
const wasHostSeat = participant.seatNumber === 1 // seat 0 is stored as seatNumber 1

if (wasHostSeat) {
    try {
        // Remove host role from leaving user
        await this.removeRoomRole(roomId, userId, RoomRole.HOST, userId)

        // Find someone to be the new host (prefer lowest seat number)
        const remainingParticipants = await this.participantRepository.find({
            where: { roomId: roomId as string },
            relations: ['user'],
            order: { seatNumber: 'ASC' }
        })

        if (remainingParticipants.length > 0) {
            const newHostId = remainingParticipants[0].userId
            await this.assignRoomRole(roomId, newHostId, RoomRole.HOST, userId)
        }
    } catch (error) {
        this.logger.warn(`Failed to transfer host role: ${error.message}`)
    }
}
```

## 🎮 User Experience Flow

### For Regular Users

1. **Join Room**: User joins as observer, sees all seats
2. **Select Seat**: User taps on any available, unlocked seat
3. **Become Host**: If user selects seat 0, they automatically become host
4. **Host Powers**: Can manage room, kick users, lock/unlock seats

### For Admins

1. **Enhanced Control**: Can kick any user, including hosts
2. **Override Locks**: Can sit in locked seats
3. **Host Management**: Can kick host from seat 0, causing automatic role transfer

### For Current Hosts

1. **Seat Flexibility**: Can sit in any seat, not restricted from seating
2. **Role Loss**: Lose host role if kicked from seat 0 or if someone else sits in seat 0
3. **Normal User**: Become regular participant if not in seat 0

## 🔧 WebSocket Events

### New Events Emitted

```typescript
// When host changes due to seat 0 assignment
this.server.to(`room:${roomId}`).emit('hostChanged', {
    roomId,
    newHostId: userId,
    newHostName: newHostName,
    previousHostId: currentHostId,
    timestamp: new Date().toISOString(),
    reason: 'seat_0_assignment' | 'kick_from_seat_0' | 'leave_seat_0'
})
```

### Existing Events Modified

```typescript
// All room join events now indicate observer status
this.server.to(`room:${roomId}`).emit('roomJoinUpdate', {
    action: 'observer_joined' // No more 'host_joined_as_observer'
    // ... other fields
})
```

## 🎯 Benefits

### 1. **Simplified Host Model**

- Clear rule: Seat 0 = Host
- No complex host assignment logic
- Visual clarity for users

### 2. **Enhanced Admin Control**

- Admins can remove problematic hosts
- Better moderation capabilities
- Maintains room order

### 3. **Dynamic Leadership**

- Host role can change hands naturally
- Encourages active participation
- Prevents host abandonment issues

### 4. **User Agency**

- Users choose their seats
- No surprise seat assignments
- More engaging interaction

## 📋 Database Impact

### Role Assignments

- HOST role dynamically assigned/removed based on seat 0 occupancy
- Automatic cleanup when users leave or are kicked
- Proper role hierarchy maintained

### Seat Management

- All seat assignments now require explicit user action
- Seat locking respected (except for admins)
- Waiting list still functional for locked seats

## 🚀 Future Enhancements

### Potential Additions

1. **Seat Preferences**: Allow users to mark favorite seats
2. **Host History**: Track who has been host in a room
3. **Seat Reservations**: Temporary seat holds for returning users
4. **Host Rotation**: Automatic host rotation based on time
5. **Seat Themes**: Different seat appearances based on position

### Configuration Options

1. **Disable Seat 0 Rule**: Option to use traditional host assignment
2. **Admin Override Settings**: Configure what admins can/cannot do
3. **Host Transfer Notifications**: Customizable notification settings

This update provides a more intuitive and manageable room experience while maintaining all existing functionality and adding powerful new admin capabilities.
