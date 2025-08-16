# Room Update API Testing Guide

## Overview

The room update API has been enhanced to support multi-part form data for uploading room avatars along with updating room details. The endpoint has been changed from PUT to PATCH for better RESTful practices.

## Updated Endpoint

- **Method**: `PATCH`
- **URL**: `/rooms/{roomId}`
- **Content-Type**: `multipart/form-data`

## Changes Made

### 1. Method Change

- Changed from `PUT` to `PATCH` for partial updates
- Added `async/await` for proper asynchronous handling

### 2. Multi-part Form Data Support

- Added support for file uploads alongside text data
- Uses `@UseInterceptors(FileInterceptor('file'))` for file handling
- Added `@ApiConsumes('multipart/form-data')` for proper Swagger documentation

### 3. Enhanced DTO

- Created `UpdateRoomWithFileDto` for multi-part requests
- Supports both text fields and file upload in single request

### 4. Added Async/Await

Updated the following methods to use async/await:

- `update()` - Now handles file uploads
- `delete()` - Added async/await
- `assignRole()` - Added async/await
- `transferOwnership()` - Added async/await
- `getUserRoles()` - Added async/await

## Request Format

### Text Fields (all optional)

- `name`: string - Room name
- `description`: string - Room description
- `maxSeats`: number - Maximum seats (6, 8, or 10)
- `isPrivate`: boolean - Whether room is private
- `password`: string - Password for private rooms
- `isLocked`: boolean - Whether room is locked
- `isActive`: boolean - Whether room is active

### File Field (optional)

- `file`: File - Room avatar image (JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO)

## Example Usage

### Using curl

```bash
# Update room with both text data and avatar
curl -X PATCH \
  'http://localhost:3000/rooms/{roomId}' \
  -H 'Authorization: Bearer {your-jwt-token}' \
  -F 'name=Updated Room Name' \
  -F 'description=Updated description' \
  -F 'maxSeats=10' \
  -F 'file=@/path/to/avatar.jpg'

# Update room with only text data
curl -X PATCH \
  'http://localhost:3000/rooms/{roomId}' \
  -H 'Authorization: Bearer {your-jwt-token}' \
  -F 'name=New Room Name' \
  -F 'isLocked=true'

# Update room with only avatar
curl -X PATCH \
  'http://localhost:3000/rooms/{roomId}' \
  -H 'Authorization: Bearer {your-jwt-token}' \
  -F 'file=@/path/to/new-avatar.png'
```

### Using Postman

1. Set method to `PATCH`
2. Set URL to `http://localhost:3000/rooms/{roomId}`
3. Add Authorization header with Bearer token
4. In Body tab, select `form-data`
5. Add text fields as needed (name, description, etc.)
6. Add file field by selecting `File` type and uploading image

### Using JavaScript/Fetch

```javascript
const formData = new FormData()
formData.append('name', 'Updated Room Name')
formData.append('description', 'New description')
formData.append('maxSeats', '8')
formData.append('file', fileInput.files[0]) // from input[type="file"]

fetch(`/rooms/${roomId}`, {
    method: 'PATCH',
    headers: {
        Authorization: `Bearer ${token}`
    },
    body: formData
})
```

## Response Format

### Success Response (200)

```json
{
    "statusCode": 200,
    "message": "Room updated successfully",
    "data": {
        "uuid": "room-uuid",
        "name": "Updated Room Name",
        "description": "Updated description",
        "type": "voice",
        "maxSeats": 8,
        "isLocked": false,
        "isActive": true,
        "roomAvatarUrl": "https://cloudinary.com/path/to/uploaded/avatar.jpg",
        "updatedAt": "2025-08-16T10:30:00Z"
    }
}
```

### Error Responses

#### 400 - Bad Request

```json
{
    "statusCode": 400,
    "message": "Invalid room data or file upload error"
}
```

#### 403 - Forbidden

```json
{
    "statusCode": 403,
    "message": "Insufficient permissions to update room"
}
```

#### 404 - Not Found

```json
{
    "statusCode": 404,
    "message": "Room not found"
}
```

## File Upload Constraints

- **Supported formats**: JPEG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO
- **Maximum size**: 10MB
- **Field name**: `file`

## Error Handling

The endpoint includes comprehensive error handling for:

- Invalid file types
- File size limits
- Missing room
- Insufficient permissions
- Invalid room data
- Service errors

## Testing Checklist

- [ ] Update room name only
- [ ] Update room description only
- [ ] Update room settings (maxSeats, isLocked, etc.)
- [ ] Upload room avatar only
- [ ] Update both text fields and avatar in single request
- [ ] Test with invalid file type
- [ ] Test with file size exceeding 10MB
- [ ] Test with non-existent room ID
- [ ] Test without authentication
- [ ] Test with insufficient permissions

## Notes

- All fields are optional in PATCH requests
- File upload is handled by Cloudinary service
- Room avatar URL is automatically updated when file is uploaded
- Previous avatar is replaced when new one is uploaded
- Authentication is required for all update operations
