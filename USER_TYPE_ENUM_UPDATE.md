# User Type Enum Update Documentation

## Overview

Updated the `userType` field in the User entity to use a proper TypeScript enum for better type safety and consistency.

## Changes Made

### 1. User Entity Updates (`src/modules/user/entities/user.entity.ts`)

- Added import for existing `UserTypes` enum from `../data/user-type.enum`
- Updated `userType` column configuration:
    - Changed from `string` type to `UserTypes` enum
    - Added proper enum column definition with database enum type
    - Set default value to `UserTypes.USER`
    - Made field non-nullable (`nullable: false`)

### 2. Auth Service Updates (`src/modules/auth/service/auth.service.ts`)

- Added import for `UserTypes` enum
- Auth response now properly typed with enum values
- Login/registration functionality unchanged but now uses enum types

### 3. Migration Script (`src/migrations/update-user-type-to-enum.migration.ts`)

- Created migration to update existing database schema
- Creates PostgreSQL enum type: `user_usertype_enum`
- Updates existing `userType` column to use enum
- Sets NOT NULL constraint and default value
- Includes rollback functionality

### 4. Existing Integration

- Leverages existing `UserTypes` enum with values:
    - `USER = 'user'` (default)
    - `ADMIN = 'admin'`
    - `MODERATOR = 'moderator'`
- Compatible with existing seeds and decorators
- Maintains backward compatibility with API responses

## Available User Types

```typescript
export enum UserTypes {
    ADMIN = 'admin',
    USER = 'user',
    MODERATOR = 'moderator'
}
```

## Database Schema

```sql
-- New enum type
CREATE TYPE "user_usertype_enum" AS ENUM('user', 'admin', 'moderator');

-- Updated column
ALTER TABLE "users"
ALTER COLUMN "userType" TYPE "user_usertype_enum"
USING "userType"::"user_usertype_enum";

ALTER TABLE "users"
ALTER COLUMN "userType" SET NOT NULL;

ALTER TABLE "users"
ALTER COLUMN "userType" SET DEFAULT 'user';
```

## Usage Examples

### In Controllers/Services

```typescript
import { UserTypes } from '../user/data/user-type.enum'

// Check user type
if (user.userType === UserTypes.ADMIN) {
    // Admin logic
}

// Create user with specific type
const newUser = {
    ...userData,
    userType: UserTypes.USER // Default
}
```

### In Guards/Decorators

The existing permission and access control guards will continue to work as before since the enum values are still strings.

## Benefits

1. **Type Safety**: Compile-time checks for valid user types
2. **IntelliSense**: Auto-completion in IDEs
3. **Consistency**: Single source of truth for user types
4. **Validation**: Database-level constraints
5. **Documentation**: Self-documenting code with enum values

## Migration Instructions

1. Run the migration: `npm run migration:run`
2. Verify enum is created in database
3. Test user creation and authentication
4. Confirm existing users maintain their types

## API Impact

- Login responses now include properly typed `userType` field
- Registration maintains default `user` type assignment
- Forget password API returns simplified response as requested
- All authentication responses include `binsBalance` and `diamondBalance`
