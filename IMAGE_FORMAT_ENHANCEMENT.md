# Image Format Support Enhancement

## Overview

Enhanced the room creation function and all image upload endpoints across the application to support a comprehensive range of image formats for maximum compatibility.

## Changes Made

### Supported Image Formats

The application now supports all common image formats including:

#### Standard Formats

- **JPEG/JPG**: `image/jpeg`, `image/jpg`, `image/pjpeg` (Progressive JPEG)
- **PNG**: `image/png`, `image/x-png`
- **GIF**: `image/gif`
- **WebP**: `image/webp`

#### Extended Formats

- **BMP**: `image/bmp`, `image/x-bmp`, `image/x-bitmap`, `image/x-win-bitmap`, `image/x-windows-bmp`, `image/ms-bmp`
- **TIFF**: `image/tiff`, `image/tif`, `image/x-tiff`
- **SVG**: `image/svg+xml`, `image/svg`

#### Modern Formats

- **AVIF**: `image/avif`
- **HEIC/HEIF**: `image/heic`, `image/heif`

#### Icon Formats

- **ICO**: `image/x-icon`, `image/vnd.microsoft.icon`, `image/ico`

#### Additional Formats

- **JFIF**: `image/jfif`
- **JPEG 2000**: `image/pjp`, `image/jpg2`, `image/jp2`

### Files Modified

#### Room Module

- `src/modules/room/room.service.ts`
    - Updated `createRoom()` method image validation
    - Updated `uploadRoomAvatar()` method image validation
- `src/modules/room/room.controller.ts`
    - Room creation with avatar upload
    - Room update with avatar upload
    - Room avatar upload endpoint

#### User Module

- `src/modules/user/user.controller.ts`
    - User profile update with avatar
    - User achievement update with image/cover image uploads
    - Profile avatar update endpoint

#### Upload Module

- `src/modules/upload/upload.controller.ts`
    - Single image upload endpoint
    - Multiple images upload endpoint

#### Group Module

- `src/modules/group/group.controller.ts`
    - Group avatar update endpoint

### Utility Function Created

- `src/common/utils/image-validation.util.ts`
    - Centralized image validation logic
    - Reusable utility functions for future development
    - Consistent error messages across the application

### Features Enhanced

1. **Room Creation**: Now accepts all supported image formats for room avatars
2. **Room Updates**: Supports comprehensive image formats for avatar updates
3. **User Profiles**: Enhanced avatar upload compatibility
4. **Group Management**: Improved avatar upload support
5. **Generic Uploads**: All upload endpoints now support extended formats
6. **File Size Limits**: Standardized to 10MB across most endpoints (previously some were 5MB)

### Benefits

- **Better User Experience**: Users can upload images in their preferred format
- **Cross-Platform Compatibility**: Supports images from various devices and platforms
- **Modern Format Support**: Includes AVIF, HEIC, and other newer formats
- **Backward Compatibility**: Maintains support for all legacy formats
- **Consistent Validation**: Unified validation logic across all endpoints
- **Future-Proof**: Easy to add new formats via the utility function

### Error Messages

All endpoints now provide clear, consistent error messages indicating supported formats:

```
"Unsupported image format: [mimetype]. Supported formats: JPEG/JPG, PNG, GIF, WebP, BMP, TIFF, SVG, AVIF, HEIC, HEIF, ICO, JFIF"
```

### Usage

For future development, use the utility functions in `image-validation.util.ts` to maintain consistency:

```typescript
import { getImageUploadOptions, validateImageFile } from '../common/utils/image-validation.util'

// For FileInterceptor
@UseInterceptors(FileInterceptor('image', getImageUploadOptions()))

// For manual validation
validateImageFile(file, 10 * 1024 * 1024) // 10MB limit
```
