# Agora Token Generation Fix

## Issue Summary

The Flutter app was receiving `ErrorCodeType.errInvalidToken` and `ConnectionChangedReasonType.connectionChangedInvalidToken` errors when trying to join Agora channels.

## Root Cause

**Mismatch between token generation method and Flutter join method:**

- ❌ **Backend was using**: `buildTokenWithUid()` (numeric UID-based tokens)
- ❌ **Flutter was using**: `joinChannelWithUserAccount()` (string userAccount-based joining)

According to Agora documentation: **The token generation method MUST match the join method**.

## Solution Applied

### 1. Updated Token Generation Method

**File**: `src/modules/agora/agora.service.ts`

**Before**:

```typescript
// Using buildTokenWithUid with converted string-to-number UID
const uid = this.stringToUid(userId)
const token = RtcTokenBuilder.buildTokenWithUid(
    this.appID,
    this.appCertificate,
    channelName,
    uid, // numeric UID
    role,
    privilegeExpire,
    privilegeExpire
)
```

**After**:

```typescript
// Using buildTokenWithUserAccount with string userAccount
const token = RtcTokenBuilder.buildTokenWithUserAccount(
    this.appID,
    this.appCertificate,
    channelName,
    userId, // string userAccount directly
    role,
    privilegeExpire,
    privilegeExpire
)
```

### 2. Enhanced Logging and Debugging

- ✅ Added comprehensive logging for token generation process
- ✅ Added token format validation (007 prefix check)
- ✅ Added debug endpoint: `GET /agora/debug/config`
- ✅ Added token validation endpoint: `POST /agora/validate-token`
- ✅ Enhanced error messages with more context

### 3. Configuration Validation

- ✅ Added App ID and Certificate length validation
- ✅ Enhanced startup configuration checks
- ✅ Better environment variable validation

## Flutter Compatibility

### Token Generation Process

1. **Backend generates token** using `buildTokenWithUserAccount()`
2. **Token format**: AccessToken2 (starts with "007")
3. **Compatible with**: `engine.joinChannelWithUserAccount()`

### Flutter Join Process

```dart
await engine.joinChannelWithUserAccount(
    userAccount: getUserID,  // String UUID from backend
    token: rtcToken,         // Token generated with buildTokenWithUserAccount
    channelId: channelName,
    options: ChannelMediaOptions(
        publishMicrophoneTrack: publishMicForJoin,
        autoSubscribeAudio: true,
        channelProfile: ChannelProfileType.channelProfileLiveBroadcasting,
        clientRoleType: serverRole,
    ),
);
```

## Key Requirements Met

### ✅ Token Format Validation

- Tokens now start with "007" (AccessToken2 format)
- Proper length validation (minimum 100 characters)
- No invalid characters (spaces, etc.)

### ✅ Method Matching

- `buildTokenWithUserAccount()` ↔ `joinChannelWithUserAccount()`
- String userAccount consistency throughout
- Proper role mapping (PUBLISHER/SUBSCRIBER)

### ✅ Debug Capabilities

- Detailed logging for troubleshooting
- Configuration validation endpoints
- Token format validation tools

## API Endpoints

### Generate Token

```http
POST /agora/generate-token
Content-Type: application/json

{
    "channelName": "room_123",
    "role": "publisher"
}
```

**Response includes**:

- ✅ Token (007 format)
- ✅ Compatibility info
- ✅ Debug information
- ✅ Format validation

### Debug Configuration

```http
GET /agora/debug/config
```

**Returns**:

- App ID status
- Certificate configuration
- Environment validation
- Available roles

### Validate Token

```http
POST /agora/validate-token
Content-Type: application/json

{
    "token": "007abc123...",
    "channelName": "room_123",
    "userAccount": "user-uuid"
}
```

## Testing Checklist

### ✅ Backend Validation

1. Environment variables configured (AGORA_APP_ID, AGORA_APP_CERTIFICATE)
2. Token generation endpoint working
3. Debug endpoint accessible
4. Logs showing "007" format tokens

### ✅ Flutter Integration

1. Token starts with "007"
2. No `errInvalidToken` errors
3. Successful channel join
4. Proper role assignment

## Migration Notes

### For Other Clients

If you have other clients using **numeric UIDs**, create separate endpoints:

- `/agora/generate-token-uid` - for numeric UID-based clients
- `/agora/generate-token` - for string userAccount-based clients (Flutter)

### Environment Variables Required

```env
AGORA_APP_ID=your_32_character_app_id
AGORA_APP_CERTIFICATE=your_32_character_certificate
```

## Expected Results

After this fix:

- ✅ No more `errInvalidToken` errors
- ✅ Successful Agora channel joins
- ✅ Proper AccessToken2 (007) format
- ✅ Flutter compatibility ensured
- ✅ Enhanced debugging capabilities

The token generation now properly matches Flutter's `joinChannelWithUserAccount()` method, resolving the authentication issues.
