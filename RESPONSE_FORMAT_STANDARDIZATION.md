# Response Format Standardization

## Overview

This document outlines the standardized response formats for `acceptParticipantResponse` and `joinRoomResponse` events to ensure consistency across the application.

## Response Formats

### 1. acceptParticipantResponse Format

**Event**: `acceptParticipantResponse`
**Usage**: Sent to host when they accept/reject a participant
**Format**: Standard accept/reject response format

```typescript
{
    status: 'accepted' | 'rejected',
    user: {
        id: string,           // Participant user ID
        name: string,         // Participant display name
        email: string,        // Participant email
        sitIndex: string,     // Seat index as string (e.g., "0", "1")
        image: string         // Participant avatar URL
    },
    seated: boolean,          // True if participant was given a seat
    message: string           // Human-readable status message
}
```

### 2. joinRoomResponse Format

**Event**: `joinRoomResponse`
**Usage**: Sent to participant when they join a room (Flutter-compatible format)
**Format**: Participant data format for client state management

```typescript
{
    userId: string,           // Participant user ID
    name: string,             // Participant display name
    avatar: string | null,    // Participant avatar URL or null
    seatIndex: number,        // Seat index as number (0-based)
    isSpeaking: boolean,      // Currently speaking status
    micOn: boolean,           // Microphone state
    role: 'participant'       // User role in room
}
```

## Implementation Details

### acceptParticipant Event Response Flow

1. **Host receives**: `acceptParticipantResponse` (standard format)
2. **Participant receives**:
    - `participantAcceptanceNotification` (detailed notification)
    - `sitInSeatResponse` (if seated)
    - `joinRoomResponse` (if seated - Flutter compatibility)

### Event Consistency

Both events now follow this pattern:

- **Standard Response**: Used for status/action confirmations
- **Flutter Response**: Used for client state management and UI updates

### Benefits

1. **Consistency**: Both events now emit similar formats for similar actions
2. **Compatibility**: Maintains Flutter client compatibility with `joinRoomResponse`
3. **Clarity**: Clear separation between status responses and state data
4. **Extensibility**: Easy to add new fields without breaking existing clients

## Example Responses

### Successful Acceptance (with seat)

**acceptParticipantResponse**:

```json
{
    "status": "accepted",
    "user": {
        "id": "1bf10e3c-9031-47d9-9fe3-ac3767ecf9e6",
        "name": "John Doe",
        "email": "john@example.com",
        "sitIndex": "0",
        "image": "https://example.com/avatar.jpg"
    },
    "seated": true,
    "message": "Accepted and seated in seat 0"
}
```

**joinRoomResponse** (sent to participant):

```json
{
    "userId": "1bf10e3c-9031-47d9-9fe3-ac3767ecf9e6",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg",
    "seatIndex": 0,
    "isSpeaking": false,
    "micOn": true,
    "role": "participant"
}
```

### Successful Acceptance (observer only)

**acceptParticipantResponse**:

```json
{
    "status": "accepted",
    "user": {
        "id": "1bf10e3c-9031-47d9-9fe3-ac3767ecf9e6",
        "name": "John Doe",
        "email": "john@example.com",
        "sitIndex": "",
        "image": "https://example.com/avatar.jpg"
    },
    "seated": false,
    "message": "Accepted as observer"
}
```

**No joinRoomResponse sent** (participant joins as observer, no seat assigned)

## Usage in Client Applications

### Flutter/Mobile Clients

- Listen for `joinRoomResponse` to update participant state
- Use the participant data format directly for UI updates
- Handle `seatIndex` as number for seat management

### Host/Admin Interfaces

- Listen for `acceptParticipantResponse` to show action results
- Use `status` and `message` fields for user feedback
- Check `seated` flag to determine if participant was given a seat

## Migration Notes

- **Backward Compatible**: Existing clients continue to work
- **Enhanced Data**: More detailed information available
- **Consistent Patterns**: Similar events follow similar response patterns
