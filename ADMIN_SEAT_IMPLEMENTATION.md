# Admin Seat Implementation (seatIndex -1)

## Overview

Implemented a special admin seat with `seatIndex = -1` that is reserved exclusively for admin, host, or owner users. This seat includes a request/approval system when the seat is occupied.

## Features Implemented

### 1. Database Changes (RoomSeat Entity)

**File:** `src/modules/room/entities/room-seat.entity.ts`

Added two new columns:

- `isAdminSeat`: Boolean flag to identify admin seat
- `metadata`: JSONB field for flexible additional data

```typescript
@Column({ type: 'boolean', default: false })
isAdminSeat: boolean

@Column({ type: 'jsonb', nullable: true })
metadata: any
```

### 2. Room Service Methods

**File:** `src/modules/room/room.service.ts`

#### Modified Methods:

**`initializeRoomSeats()`**

- Now creates an admin seat with `seatIndex = -1` and `seatNumber = -1`
- Sets `isAdminSeat = true` and `metadata = { seatType: 'admin' }`
- Regular seats continue from 0 to maxSeats-1

**`validateAndAssignSeat()`**

- Added role validation for seatIndex === -1
- Only ADMIN, HOST, or OWNER roles can access admin seat
- Throws `ForbiddenException` if user lacks required role
- Throws `BadRequestException` if admin seat is already occupied

**`getRoomSeats()`**

- Updated to include admin seat in returned array
- Admin seat appears first with index -1
- Includes `isAdminSeat: true` and metadata fields

#### New Methods:

**`requestAdminSeat(roomId, requesterId)`**

- Validates requester has admin/host/owner role
- Checks if admin seat is occupied
- Returns `requestId` and `currentAdminId`
- Logs request creation

**`approveAdminSeatRequest(roomId, approverId, requesterId)`**

- Verifies approver is current admin in seat -1
- Removes current admin from seat
- Adds requester to seat -1
- Returns success confirmation

### 3. WebSocket Gateway Handlers

**File:** `src/modules/room/room.gateway.ts`

#### Modified Handler:

**`handleSitInSeat()`**

- Added special detection for seatIndex === -1
- Validates user role before allowing admin seat access
- Redirects to `handleRequestAdminSeat()` if seat is occupied
- Throws error if non-admin tries to access admin seat

#### New Handlers:

**`@SubscribeMessage('requestAdminSeat')`**

- Receives: `{ roomId, userId }`
- Validates user info
- Calls `roomService.requestAdminSeat()`
- Emits `requestAdminSeatResponse` to requester
- Emits `adminSeatRequested` event to current admin
- Returns status and requestId

**`@SubscribeMessage('approveAdminSeatRequest')`**

- Receives: `{ roomId, requestId, requesterId, approved, userId }`
- Handles both approval and rejection
- On rejection: Emits `adminSeatRequestRejected` to requester
- On approval:
    - Calls `roomService.approveAdminSeatRequest()`
    - Updates room seats state
    - Emits `adminSeatRequestApproved` to requester
    - Emits `approveAdminSeatResponse` to approver
    - Broadcasts `seatUpdated` to entire room
- Returns status and message

## WebSocket Events

### Client → Server

#### 1. `sitInSeat` (Enhanced)

```json
{
    "roomId": "room-uuid",
    "seatIndex": -1,
    "userId": "user-uuid"
}
```

- If seatIndex is -1 and seat is occupied, automatically triggers admin seat request

#### 2. `requestAdminSeat` (New)

```json
{
    "roomId": "room-uuid",
    "userId": "requester-uuid"
}
```

#### 3. `approveAdminSeatRequest` (New)

```json
{
    "roomId": "room-uuid",
    "requestId": "admin-seat-req-123",
    "requesterId": "requester-uuid",
    "approved": true,
    "userId": "approver-uuid"
}
```

### Server → Client

#### 1. `sitInSeatResponse` (Enhanced)

```json
{
    "status": "accepted",
    "message": "Successfully seated in seat -1",
    "user": {
        "id": "user-uuid",
        "name": "User Name",
        "sitIndex": "-1"
    }
}
```

#### 2. `requestAdminSeatResponse` (New)

```json
{
    "status": "pending",
    "message": "Admin seat request sent successfully",
    "requestId": "admin-seat-req-123"
}
```

#### 3. `adminSeatRequested` (New)

```json
{
    "roomId": "room-uuid",
    "requestId": "admin-seat-req-123",
    "requesterId": "requester-uuid",
    "requesterName": "Requester Name",
    "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 4. `adminSeatRequestApproved` (New)

```json
{
    "roomId": "room-uuid",
    "requestId": "admin-seat-req-123",
    "seatIndex": -1,
    "message": "You are now in the admin seat",
    "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 5. `adminSeatRequestRejected` (New)

```json
{
    "roomId": "room-uuid",
    "requestId": "admin-seat-req-123",
    "message": "Admin seat request was rejected",
    "timestamp": "2024-01-01T12:00:00.000Z"
}
```

#### 6. `approveAdminSeatResponse` (New)

```json
{
    "status": "success",
    "message": "Admin seat transferred successfully"
}
```

#### 7. `seatUpdated` (Enhanced)

```json
{
    "roomId": "room-uuid",
    "seatIndex": -1,
    "occupied": true,
    "user": {
        "id": "user-uuid",
        "name": "User Name",
        "avatar": "avatar-url"
    },
    "isAdminSeat": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Usage Flow

### Scenario 1: Empty Admin Seat

1. Admin user calls `sitInSeat` with seatIndex=-1
2. System validates user has admin/host/owner role
3. System checks seat is empty
4. User is seated immediately
5. `sitInSeatResponse` emitted with status "accepted"
6. `seatUpdated` broadcast to all room participants

### Scenario 2: Occupied Admin Seat

1. Admin user calls `sitInSeat` with seatIndex=-1
2. System validates user has admin/host/owner role
3. System detects seat is occupied
4. Automatically redirects to `requestAdminSeat`
5. Request is created and sent to current admin
6. Current admin receives `adminSeatRequested` event
7. Current admin approves/rejects via `approveAdminSeatRequest`
8. On approval:
    - Current admin is removed from seat
    - Requester is added to seat
    - Both users notified
    - Room broadcast sent
9. On rejection:
    - Requester receives rejection notification

### Scenario 3: Non-Admin Tries to Access

1. Regular user calls `sitInSeat` with seatIndex=-1
2. System validates user role
3. Throws `ForbiddenException`
4. `sitInSeatResponse` emitted with status "rejected"

## Database Schema

### room_seats Table

```sql
-- Existing columns
id              | integer (primary key)
"roomId"        | uuid
"seatIndex"     | integer  -- Now includes -1 for admin seat
"seatNumber"    | integer  -- Now includes -1 for admin seat
"isLocked"      | boolean
"lockedBy"      | uuid
"lockedAt"      | timestamp
"createdAt"     | timestamp
"updatedAt"     | timestamp

-- New columns
"isAdminSeat"   | boolean (default: false)
metadata        | jsonb (nullable)
```

### Sample Admin Seat Record

```json
{
    "roomId": "room-uuid",
    "seatIndex": -1,
    "seatNumber": -1,
    "isLocked": false,
    "isAdminSeat": true,
    "metadata": {
        "seatType": "admin"
    }
}
```

### Sample Participant Record with Admin Seat

```json
{
    "roomId": "room-uuid",
    "userId": "admin-user-uuid",
    "seatNumber": -1, // -1 indicates admin seat
    "isMuted": false,
    "createdAt": "2024-01-01T12:00:00.000Z"
}
```

## API Response Format

### getRoomSeats() Response

```json
[
    {
        "index": -1,
        "locked": false,
        "occupied": true,
        "occupantUserId": "admin-uuid",
        "isAdminSeat": true,
        "metadata": { "seatType": "admin" }
    },
    {
        "index": 0,
        "locked": false,
        "occupied": true,
        "occupantUserId": "user-uuid",
        "isAdminSeat": false
    },
    {
        "index": 1,
        "locked": false,
        "occupied": false,
        "occupantUserId": null,
        "isAdminSeat": false
    }
]
```

## Migration Required

To apply this feature to existing rooms, run:

```sql
-- Add new columns to room_seats table
ALTER TABLE room_seats
ADD COLUMN IF NOT EXISTS "isAdminSeat" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Create admin seats for existing rooms
INSERT INTO room_seats ("roomId", "seatIndex", "seatNumber", "isLocked", "isAdminSeat", metadata, "createdAt", "updatedAt")
SELECT
    r.uuid,
    -1,
    -1,
    false,
    true,
    '{"seatType": "admin"}'::jsonb,
    NOW(),
    NOW()
FROM rooms r
WHERE NOT EXISTS (
    SELECT 1 FROM room_seats rs
    WHERE rs."roomId" = r.uuid AND rs."seatIndex" = -1
);
```

## Security Considerations

1. **Role Validation**: Every request to sit in admin seat validates user role
2. **Approval Required**: Cannot forcibly remove current admin; requires approval
3. **Audit Trail**: All admin seat requests and approvals are logged
4. **Real-time Notifications**: All seat changes broadcast to participants

## Testing Checklist

- [ ] Admin user can sit in empty admin seat (-1)
- [ ] Host user can sit in empty admin seat (-1)
- [ ] Owner user can sit in empty admin seat (-1)
- [ ] Regular user CANNOT sit in admin seat (-1)
- [ ] Request is sent when admin seat is occupied
- [ ] Current admin receives request notification
- [ ] Admin can approve request and seat transfers
- [ ] Admin can reject request
- [ ] Requester receives approval/rejection notification
- [ ] All room participants see seat update
- [ ] Admin can switch from admin seat to regular seat
- [ ] Admin seat appears in getRoomSeats() response
- [ ] WebSocket events work correctly
- [ ] Database stores seatNumber=-1 correctly
- [ ] Migration adds admin seat to existing rooms

## Related Files

- `src/modules/room/entities/room-seat.entity.ts`
- `src/modules/room/room.service.ts`
- `src/modules/room/room.gateway.ts`
- `ADMIN_SEAT_IMPLEMENTATION.md` (this file)

## Notes

- Admin seat is stored as `seatNumber = -1` in the `participants` table
- Regular seats continue to use 1-based indexing (seatNumber 1 to maxSeats)
- Client should display admin seat separately or at the top of seat list
- Request IDs are generated as: `admin-seat-req-{timestamp}-{random}`
- Multiple admins can request the seat; first approval wins
