# Country System - Quick Start Guide

## ✅ What's Been Implemented

### 1. Database Entities

- ✅ **Country Entity** - Complete with name, code, flags, emojis, phone codes
- ✅ **User Entity** - Updated with `countryId` relation
- ✅ **Room Entity** - Updated with `countryId` relation

### 2. API Endpoints

- ✅ `GET /api/v1/countries` - Get all countries
- ✅ `GET /api/v1/countries/active` - Get active countries (for dropdowns)
- ✅ `GET /api/v1/countries/:id` - Get single country
- ✅ `POST /api/v1/countries` - Create country (Admin)
- ✅ `PATCH /api/v1/countries/:id` - Update country (Admin)
- ✅ `DELETE /api/v1/countries/:id` - Delete country (Admin)
- ✅ `POST /api/v1/countries/seed` - Seed 50 countries (Admin)
- ✅ `GET /api/v1/rooms/by-country/:countryId` - Filter rooms by country
- ✅ `PATCH /api/v1/users/:id` - Update user with `countryId`
- ✅ `POST /api/v1/rooms` - Create room with `countryId`
- ✅ `PATCH /api/v1/rooms/:id` - Update room with `countryId`

### 3. Services & Business Logic

- ✅ **CountryService** - Full CRUD + seed functionality
- ✅ **UserService** - Country relation loading
- ✅ **RoomService** - `getRoomsByCountry()` method + country in room details

### 4. DTOs Updated

- ✅ `CreateCountryDto` & `UpdateCountryDto`
- ✅ `UpdateUserDto` - Added `countryId` field
- ✅ `CreateRoomDto` & `UpdateRoomDto` - Added `countryId` field

## 🚀 Quick Setup Steps

### Step 1: Seed Countries Database

```bash
# Using curl (replace {admin_token} with actual admin JWT)
curl -X POST http://localhost:3000/api/v1/countries/seed \
  -H "Authorization: Bearer {admin_token}"
```

**Expected Response:**

```json
{
    "message": "Countries seeded successfully"
}
```

This will populate 50 countries with:

- Name, ISO code, flag emoji, flag URL
- International phone codes
- Display order for dropdowns

### Step 2: Verify Countries

```bash
curl http://localhost:3000/api/v1/countries/active
```

You should see 50 countries ordered by `displayOrder`.

### Step 3: Test User Update

```bash
# Get a country UUID from step 2, then:
curl -X PATCH http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "countryId": "paste-country-uuid-here"
  }'
```

### Step 4: Test Room Creation with Country

```bash
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer {user_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group-uuid",
    "name": "USA Gaming Room",
    "description": "Voice chat for gamers",
    "maxSeats": 8,
    "type": "voice",
    "countryId": "usa-country-uuid"
  }'
```

### Step 5: Test Room Filtering by Country

```bash
curl http://localhost:3000/api/v1/rooms/by-country/{country-uuid}
```

## 📱 Frontend Integration

### Get Countries for Dropdown

```javascript
// Fetch active countries
const response = await fetch('/api/v1/countries/active')
const countries = await response.json()

// Render dropdown
countries.forEach((country) => {
    console.log(`${country.emoji} ${country.name} (${country.code})`)
    // Example: 🇺🇸 United States (USA)
})
```

### Update User Country

```javascript
await fetch(`/api/v1/users/${userId}`, {
    method: 'PATCH',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        countryId: selectedCountryUuid
    })
})
```

### Filter Rooms by Country

```javascript
const response = await fetch(`/api/v1/rooms/by-country/${countryId}`)
const data = await response.json()
console.log(data.data) // Array of rooms
```

## 🏗️ Database Schema

```sql
-- Countries Table
CREATE TABLE countries (
  id SERIAL PRIMARY KEY,
  uuid UUID UNIQUE NOT NULL,
  name VARCHAR NOT NULL UNIQUE,
  code VARCHAR(3) NOT NULL UNIQUE,
  flagUrl VARCHAR,
  emoji VARCHAR,
  phoneCode VARCHAR,
  displayOrder INT DEFAULT 0,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Users Table (updated)
ALTER TABLE users
ADD COLUMN countryId UUID REFERENCES countries(uuid);

-- Rooms Table (updated)
ALTER TABLE rooms
ADD COLUMN countryId UUID REFERENCES rooms(uuid);
```

## 📊 Response Formats

### Country Object

```json
{
    "id": 123,
    "uuid": "a1b2c3d4...",
    "name": "United States",
    "code": "USA",
    "emoji": "🇺🇸",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "phoneCode": "+1",
    "displayOrder": 1,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Room with Country

```json
{
  "roomId": "uuid",
  "roomName": "Gaming Hub",
  "country": {
    "id": "country-uuid",
    "name": "United States",
    "code": "USA",
    "flag": "🇺🇸",
    "flagUrl": "https://flagcdn.com/w320/us.png"
  },
  "hostId": "host-uuid",
  "hostName": "John Doe",
  ...
}
```

### User Achievement with Country

```json
{
  "userId": "uuid",
  "name": "John Doe",
  "country": "United States",
  "countryCode": "USA",
  "countryFlag": "🇺🇸",
  "email": "john@example.com",
  "level": 5,
  ...
}
```

## 🔧 Common Operations

### Add New Country (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/countries \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Country",
    "code": "NCO",
    "emoji": "🏴",
    "flagUrl": "https://flagcdn.com/w320/nc.png",
    "phoneCode": "+999",
    "displayOrder": 51
  }'
```

### Deactivate Country (Admin)

```bash
curl -X PATCH http://localhost:3000/api/v1/countries/{id} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "isActive": false
  }'
```

### Update Country Name (Admin)

```bash
curl -X PATCH http://localhost:3000/api/v1/countries/{id} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Country Name"
  }'
```

## 🎯 Use Cases

1. **User Registration/Profile:**

    - Display country dropdown
    - User selects country
    - Save `countryId` to user profile

2. **Room Creation:**

    - Display country dropdown (optional)
    - Room creator selects country
    - Room tagged with country for filtering

3. **Room Discovery:**

    - Show country filter in UI
    - User selects country
    - Display only rooms from that country

4. **User Profile Display:**

    - Show user's country flag/name
    - Display in profile cards, rankings, etc.

5. **Room Cards:**
    - Show room's country flag/name
    - Help users find local rooms

## 📝 Important Notes

1. **Nullable Fields:** `countryId` is nullable for both users and rooms
2. **Backward Compatible:** Existing users/rooms work without country
3. **No Migration Required:** TypeORM will auto-create columns
4. **Safe to Run:** Seed endpoint won't create duplicates
5. **Admin Only:** Create/Update/Delete country requires admin role
6. **Public Access:** GET endpoints are public (no auth required)

## 🐛 Troubleshooting

### Countries not showing?

```bash
# Check if seeded
curl http://localhost:3000/api/v1/countries | jq length
# Should return 50
```

### User update failing?

- Verify country UUID is valid
- Check user has valid auth token
- Ensure `countryId` field name is correct (not `country`)

### Room filtering returns empty?

- Verify rooms have `countryId` set
- Check country UUID is correct
- Ensure rooms are `isActive: true`

## 🎨 UI/UX Recommendations

1. **Dropdown:**

    - Show flag emoji + country name
    - Sort by display order
    - Add search/filter for large lists

2. **Display:**

    - Show flag emoji in room cards
    - Show country name in user profiles
    - Use flag as badge/icon

3. **Filtering:**
    - Add "All Countries" option
    - Show room count per country
    - Allow multi-country selection

## ✨ Features Completed

✅ Complete country management system
✅ User-country association
✅ Room-country association
✅ Country-based room filtering
✅ Dropdown-ready API with flags
✅ 50 pre-seeded countries
✅ Admin-only management endpoints
✅ Full TypeScript support
✅ Comprehensive documentation
✅ Flutter integration examples
✅ Build successful - zero errors

## 📚 Documentation Files

- `COUNTRY_SYSTEM_IMPLEMENTATION.md` - Complete technical documentation
- This file - Quick start guide

## 🚀 Next Steps

1. Run seed command to populate countries
2. Test endpoints with Postman/curl
3. Implement frontend dropdown
4. Update user/room creation forms
5. Add country filter to room list UI
6. Display country flags in UI
7. Consider geolocation auto-detect (future)

---

**Build Status:** ✅ Success (Zero errors)
**Database:** Ready for migration
**API:** Fully functional
**Documentation:** Complete
