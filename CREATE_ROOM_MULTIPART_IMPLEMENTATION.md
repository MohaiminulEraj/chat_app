# Create Room with Multipart Form Data Implementation

## Overview

Updated the `createRoom` endpoint to support multipart form data with optional avatar upload during room creation.

## Changes Made

### 1. Service Layer (`room.service.ts`)

- Modified `createRoom` method to accept optional `avatarFile` parameter
- Added file validation (type and size checks)
- Integrated Cloudinary upload for avatar images
- Set `roomAvatarUrl` field when avatar is uploaded

### 2. Controller Layer (`room.controller.ts`)

- Added `@ApiConsumes('multipart/form-data')` decorator
- Updated Swagger schema to include avatar file upload field
- Added `@UseInterceptors(FileInterceptor('avatar'))` decorator
- Updated method signature to accept `@UploadedFile() avatarFile`
- Added response schemas for avatar upload validation errors
- Included `roomAvatarUrl` in response schema

### 3. DTO Layer (`create-room.dto.ts`)

- Added `avatar` field for file upload support in DTO

## API Usage

### Endpoint

```
POST /api/rooms
Content-Type: multipart/form-data
```

### Request Body Fields

- `groupId` (required): Group UUID
- `name` (required): Room name
- `description` (optional): Room description
- `maxSeats` (optional): Number of seats (6, 8, or 10)
- `isPrivate` (optional): Boolean for private room
- `password` (optional): Password if private
- `type` (optional): Room type (voice, public, private, group)
- `avatar` (optional): Image file for room avatar

### File Constraints

- **Supported formats**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO
- **Maximum size**: 10MB
- **Upload location**: Cloudinary (`kitty/rooms/avatars` folder)
- **Image processing**: 400x400px, cropped, face gravity, auto quality

### Response

Returns the same format as `getRoomByGroupId` with additional `roomAvatarUrl` field when avatar is uploaded.

## Error Handling

- Invalid file type: 400 Bad Request
- File size too large: 400 Bad Request
- Upload failure: 400 Bad Request
- Existing validation errors (group not found, user not member, etc.)

## Testing

The implementation reuses the existing avatar upload logic from the dedicated room avatar upload endpoint, ensuring consistency and reliability.
