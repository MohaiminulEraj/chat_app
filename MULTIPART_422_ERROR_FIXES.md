# Room Creation 422 Validation Error - FIXES APPLIED

## Problem Identified

The 422 error was caused by **NestJS DTO validation failing** for multipart form data. The `CreateRoomDto` uses strict type validators like `@IsUUID()`, `@IsNumber()`, `@IsBoolean()` which expect properly typed data, but multipart form data arrives as strings.

## Root Cause

- **Multipart form data** is sent as strings (e.g., `"8"`, `"false"`, `"voice"`)
- **DTO validation decorators** expect typed values (numbers, booleans, enums)
- **No automatic transformation** happens for multipart requests in NestJS

## Solutions Implemented

### 1. **Created Multipart-Specific DTO**

📁 **File**: `src/modules/room/dto/create-room-multipart.dto.ts`

- **All fields as strings** with `@IsString()` validation
- **Optional fields** properly marked with `@IsOptional()`
- **Specific for multipart form data** without strict type validation

```typescript
export class CreateRoomMultipartDto {
    @IsString() groupId: string
    @IsString() name: string
    @IsString() @IsOptional() description?: string
    @IsString() @IsOptional() maxSeats?: string // ✅ String instead of number
    @IsString() @IsOptional() isPrivate?: string // ✅ String instead of boolean
    // ... other fields as strings
}
```

### 2. **Enhanced Data Transformation**

📁 **File**: `src/modules/room/room.service.ts`

- **Comprehensive validation** in `transformMultipartData()`
- **Type conversion** with proper error handling
- **UUID format validation** for groupId
- **Range validation** for maxSeats (6, 8, 10)
- **Boolean parsing** for isPrivate ("true"/"false")

```typescript
private transformMultipartData(data: any): any {
    // Validate required fields
    if (!data.groupId || !data.name) {
        throw new BadRequestException('groupId and name are required fields')
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(data.groupId)) {
        throw new BadRequestException('Invalid groupId format')
    }

    // Transform and validate maxSeats
    let maxSeats = 8
    if (data.maxSeats !== undefined && data.maxSeats !== '') {
        const parsed = parseInt(data.maxSeats, 10)
        if (isNaN(parsed) || ![6, 8, 10].includes(parsed)) {
            throw new BadRequestException('maxSeats must be 6, 8, or 10')
        }
        maxSeats = parsed
    }

    // Transform and validate isPrivate
    let isPrivate = false
    if (data.isPrivate === 'true') isPrivate = true
    else if (data.isPrivate === 'false') isPrivate = false
    else if (data.isPrivate !== undefined && data.isPrivate !== '') {
        throw new BadRequestException('isPrivate must be "true" or "false"')
    }

    return { groupId, name, description, maxSeats, isPrivate, password, type }
}
```

### 3. **Updated Controller**

📁 **File**: `src/modules/room/room.controller.ts`

- **Changed DTO type** from `CreateRoomDto` to `CreateRoomMultipartDto`
- **Added import** for the new multipart DTO
- **Same endpoint logic** but with proper validation

```typescript
async create(
    @Body() createRoomDto: CreateRoomMultipartDto,  // ✅ New DTO
    @Request() req: any,
    @UploadedFile() avatarFile?: Express.Multer.File
) {
    // ... rest remains the same
}
```

### 4. **Added Error Handling**

- **Try-catch wrapper** around the entire createRoom method
- **Detailed logging** for debugging multipart data
- **Proper error propagation** to controller

## Validation Flow Now

### ✅ **Before (Causing 422 Error)**

```
Multipart Data → CreateRoomDto → @IsNumber() fails on "8" → 422 Error
```

### ✅ **After (Working)**

```
Multipart Data → CreateRoomMultipartDto → @IsString() passes →
transformMultipartData() → Converts "8" to 8 → Validation Success
```

## Testing

Your Flutter payload should now work:

```json
{
    "groupId": "24660559-6196-4d7a-ad76-fb61182357bc",
    "name": "palying",
    "description": "paulo",
    "maxSeats": "8", // ✅ String accepted
    "isPrivate": "false", // ✅ String accepted
    "password": "",
    "type": "voice"
}
```

## Debug Logging Added

The service now logs detailed information:

```javascript
🔍 CreateRoom Debug Data: {
  groupId: "24660559-6196-4d7a-ad76-fb61182357bc",
  originalData: { groupId: "...", maxSeats: "8", isPrivate: "false" },
  transformedData: { groupId: "...", maxSeats: 8, isPrivate: false },
  currentUser: "b953f2fc-8e64-44a5-b0b0-a19abdab86bd",
  avatarFile: { fieldname: "avatar", originalname: "...", mimetype: "image/jpeg" }
}
```

## Expected Result

- ✅ **No more 422 errors** - validation now passes
- ✅ **Correct data types** - strings converted to proper types
- ✅ **Proper validation** - meaningful error messages for invalid data
- ✅ **File upload working** - avatar files processed correctly
- ✅ **Debug visibility** - can see exact data flow in logs

The multipart form data from your Flutter app should now be properly validated and processed!
