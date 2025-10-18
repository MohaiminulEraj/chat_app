# Country System Implementation

## Overview

Comprehensive country management system for users and rooms with dropdown selection support and filtering capabilities.

## Database Schema

### Country Entity

```typescript
@Entity('countries')
export class Country extends CustomBaseEntity {
    name: string // e.g., "United States"
    code: string // ISO 3166-1 alpha-3 (e.g., "USA")
    flagUrl: string // URL to flag image
    emoji: string // Flag emoji (e.g., "🇺🇸")
    isActive: boolean // Active/inactive status
    displayOrder: number // Sorting order for dropdown
    phoneCode: string // International dialing code (e.g., "+1")
}
```

### User Entity Changes

```typescript
// OLD:
country: string  // Plain text field

// NEW:
countryId: string (UUID)
@ManyToOne(() => Country)
country: Country  // Relation to Country entity
```

### Room Entity Changes

```typescript
// NEW FIELDS:
countryId: string (UUID)
@ManyToOne(() => Country)
country: Country  // Relation to Country entity
```

## API Endpoints

### 1. Country Management

#### Get All Countries

```http
GET /api/v1/countries
```

**Response:**

```json
[
    {
        "id": "uuid",
        "uuid": "uuid",
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
]
```

#### Get Active Countries Only

```http
GET /api/v1/countries/active
```

**Response:** Same as above, filtered for `isActive: true`

#### Get Country by ID

```http
GET /api/v1/countries/:id
```

**Response:** Single country object

#### Create Country (Admin Only)

```http
POST /api/v1/countries
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:**

```json
{
    "name": "United States",
    "code": "USA",
    "emoji": "🇺🇸",
    "flagUrl": "https://flagcdn.com/w320/us.png",
    "phoneCode": "+1",
    "displayOrder": 1
}
```

#### Update Country (Admin Only)

```http
PATCH /api/v1/countries/:id
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Request Body:**

```json
{
    "name": "United States of America",
    "isActive": true,
    "displayOrder": 1
}
```

#### Seed Countries Database (Admin Only)

```http
POST /api/v1/countries/seed
Authorization: Bearer {admin_token}
```

**Response:**

```json
{
    "message": "Countries seeded successfully"
}
```

**Note:** This endpoint seeds 50 countries with flag URLs and emojis. Safe to run multiple times (won't create duplicates).

### 2. User API Updates

#### Update User Profile

```http
PATCH /api/v1/users/:id
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
    "displayName": "John Doe",
    "bio": "Software Developer",
    "countryId": "country-uuid-here"
}
```

**Response:**

```json
{
    "id": 123,
    "uuid": "user-uuid",
    "displayName": "John Doe",
    "bio": "Software Developer",
    "countryId": "country-uuid",
    "country": {
        "id": "country-uuid",
        "name": "United States",
        "code": "USA",
        "emoji": "🇺🇸",
        "flagUrl": "https://flagcdn.com/w320/us.png"
    }
}
```

#### Get User Achievement Data

```http
GET /api/v1/users/:id/achievements
```

**Response includes:**

```json
{
  "userId": "uuid",
  "name": "John Doe",
  "country": "United States",
  "countryCode": "USA",
  "countryFlag": "🇺🇸",
  "email": "john@example.com",
  "level": 5,
  "binsBalance": 1000.00,
  "diamondBalance": 50.00,
  ...
}
```

### 3. Room API Updates

#### Create Room

```http
POST /api/v1/rooms
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
    "groupId": "group-uuid",
    "name": "My Gaming Room",
    "description": "Voice chat for gaming",
    "maxSeats": 8,
    "type": "voice",
    "countryId": "country-uuid"
}
```

#### Update Room

```http
PATCH /api/v1/rooms/:id
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

```json
{
    "name": "Updated Room Name",
    "description": "New description",
    "countryId": "new-country-uuid"
}
```

#### Get Room Details

```http
GET /api/v1/rooms/:id/details
```

**Response includes:**

```json
{
  "roomId": "uuid",
  "roomName": "My Gaming Room",
  "description": "Voice chat for gaming",
  "level": 0,
  "ownerId": "owner-uuid",
  "ownerName": "John Doe",
  "ownerImage": "avatar-url",
  "hostId": "host-uuid",
  "hostName": "Jane Smith",
  "hostImage": "host-avatar-url",
  "country": {
    "id": "country-uuid",
    "name": "United States",
    "code": "USA",
    "flag": "🇺🇸",
    "flagUrl": "https://flagcdn.com/w320/us.png"
  },
  "participants": [...],
  "seats": [...],
  "maxSeats": 8,
  "roomAvatarUrl": "room-avatar-url",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Get Rooms by Country (NEW)

```http
GET /api/v1/rooms/by-country/:countryId
```

**Response:**

```json
{
    "statusCode": 200,
    "message": "Rooms fetched successfully",
    "data": [
        {
            "id": "room-uuid",
            "roomId": "room-uuid",
            "roomName": "Gaming Hub USA",
            "description": "Best gaming room in USA",
            "level": 5,
            "roomAvatarUrl": "avatar-url",
            "country": {
                "id": "country-uuid",
                "name": "United States",
                "code": "USA",
                "flag": "🇺🇸",
                "flagUrl": "https://flagcdn.com/w320/us.png"
            },
            "hostId": "host-uuid",
            "hostName": "John Doe",
            "hostImage": "host-avatar",
            "ownerId": "owner-uuid",
            "ownerName": "Jane Smith",
            "ownerImage": "owner-avatar",
            "maxSeats": 8,
            "currentParticipants": 5,
            "isLocked": false,
            "type": "voice",
            "createdAt": "2024-01-01T00:00:00.000Z",
            "updatedAt": "2024-01-01T00:00:00.000Z"
        }
    ]
}
```

## Frontend/Mobile Integration

### 1. Country Dropdown Implementation

#### Flutter Example

```dart
class CountryDropdown extends StatefulWidget {
  final String? selectedCountryId;
  final Function(String) onChanged;

  const CountryDropdown({
    Key? key,
    this.selectedCountryId,
    required this.onChanged,
  }) : super(key: key);

  @override
  _CountryDropdownState createState() => _CountryDropdownState();
}

class _CountryDropdownState extends State<CountryDropdown> {
  List<Country> countries = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    fetchCountries();
  }

  Future<void> fetchCountries() async {
    try {
      final response = await http.get(
        Uri.parse('$BASE_URL/api/v1/countries/active'),
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        setState(() {
          countries = data.map((json) => Country.fromJson(json)).toList();
          isLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching countries: $e');
      setState(() => isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return CircularProgressIndicator();
    }

    return DropdownButtonFormField<String>(
      value: widget.selectedCountryId,
      decoration: InputDecoration(
        labelText: 'Select Country',
        border: OutlineInputBorder(),
      ),
      items: countries.map((country) {
        return DropdownMenuItem<String>(
          value: country.uuid,
          child: Row(
            children: [
              Text(country.emoji ?? '', style: TextStyle(fontSize: 24)),
              SizedBox(width: 8),
              Text(country.name),
            ],
          ),
        );
      }).toList(),
      onChanged: (value) {
        if (value != null) {
          widget.onChanged(value);
        }
      },
    );
  }
}

// Country Model
class Country {
  final String uuid;
  final String name;
  final String code;
  final String? emoji;
  final String? flagUrl;
  final String? phoneCode;

  Country({
    required this.uuid,
    required this.name,
    required this.code,
    this.emoji,
    this.flagUrl,
    this.phoneCode,
  });

  factory Country.fromJson(Map<String, dynamic> json) {
    return Country(
      uuid: json['uuid'],
      name: json['name'],
      code: json['code'],
      emoji: json['emoji'],
      flagUrl: json['flagUrl'],
      phoneCode: json['phoneCode'],
    );
  }
}
```

### 2. Update User Profile with Country

```dart
Future<void> updateUserCountry(String userId, String countryId) async {
  try {
    final response = await http.patch(
      Uri.parse('$BASE_URL/api/v1/users/$userId'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'countryId': countryId,
      }),
    );

    if (response.statusCode == 200) {
      print('Country updated successfully');
    }
  } catch (e) {
    print('Error updating country: $e');
  }
}
```

### 3. Create Room with Country

```dart
Future<void> createRoom({
  required String groupId,
  required String name,
  String? description,
  String? countryId,
  int maxSeats = 8,
}) async {
  try {
    final response = await http.post(
      Uri.parse('$BASE_URL/api/v1/rooms'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: json.encode({
        'groupId': groupId,
        'name': name,
        'description': description,
        'maxSeats': maxSeats,
        'type': 'voice',
        'countryId': countryId,
      }),
    );

    if (response.statusCode == 201) {
      print('Room created successfully');
    }
  } catch (e) {
    print('Error creating room: $e');
  }
}
```

### 4. Filter Rooms by Country

```dart
Future<List<Room>> getRoomsByCountry(String countryId) async {
  try {
    final response = await http.get(
      Uri.parse('$BASE_URL/api/v1/rooms/by-country/$countryId'),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      final List<dynamic> roomsData = data['data'];
      return roomsData.map((json) => Room.fromJson(json)).toList();
    }
  } catch (e) {
    print('Error fetching rooms by country: $e');
  }
  return [];
}
```

## Database Migration Notes

### Existing Data Handling

Since the `country` field is changing from `string` to `countryId` (UUID):

1. **User Table:**

    - Old `country` field (string) → New `countryId` field (UUID)
    - Existing users will have `countryId = null` initially
    - Users can update their country via profile update API

2. **Room Table:**
    - New `countryId` field added (nullable)
    - Existing rooms will have `countryId = null` initially
    - Room owners can update country via room update API

### Migration Steps

1. **Seed Countries:**

```bash
curl -X POST http://localhost:3000/api/v1/countries/seed \
  -H "Authorization: Bearer {admin_token}"
```

2. **Verify Countries:**

```bash
curl http://localhost:3000/api/v1/countries/active
```

3. **Update existing users/rooms** (if needed) via admin script or manual updates

## Seeded Countries (50)

The system comes pre-seeded with 50 countries:

- United States, United Kingdom, Canada, Australia, Germany, France, India, China, Japan, South Korea
- Brazil, Mexico, Spain, Italy, Netherlands, Russia, Turkey, Saudi Arabia, UAE, Indonesia
- Thailand, Vietnam, Philippines, Malaysia, Singapore, Pakistan, Bangladesh, Egypt, South Africa, Nigeria
- Poland, Sweden, Norway, Denmark, Finland, Switzerland, Austria, Belgium, Greece, Portugal
- Argentina, Chile, Colombia, Peru, Venezuela, Israel, New Zealand, Ireland, Czech Republic, Romania

Each includes:

- ISO 3166-1 alpha-3 code
- Flag emoji (🇺🇸, 🇬🇧, etc.)
- Flag URL from flagcdn.com (320px width)
- International phone code
- Display order for dropdown sorting

## Testing

### 1. Seed Countries

```bash
curl -X POST http://localhost:3000/api/v1/countries/seed \
  -H "Authorization: Bearer {admin_token}"
```

### 2. Get Active Countries

```bash
curl http://localhost:3000/api/v1/countries/active
```

### 3. Update User Country

```bash
curl -X PATCH http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "countryId": "country-uuid-here"
  }'
```

### 4. Create Room with Country

```bash
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "group-uuid",
    "name": "Test Room",
    "countryId": "country-uuid",
    "maxSeats": 8,
    "type": "voice"
  }'
```

### 5. Filter Rooms by Country

```bash
curl http://localhost:3000/api/v1/rooms/by-country/{country-uuid}
```

## Benefits

1. **Data Integrity:** Using foreign keys ensures valid country references
2. **Easy Updates:** Centralized country management - update once, reflects everywhere
3. **Flag Support:** Built-in emoji and URL support for country flags
4. **Dropdown Ready:** Sorted by display order, perfect for dropdowns
5. **Scalable:** Easy to add new countries or update existing ones
6. **Phone Codes:** Included for potential phone number validation features
7. **Filtering:** Efficient room filtering by country using database indexes
8. **Rich Response:** All room APIs now include complete country information

## Future Enhancements

1. **Geolocation:** Auto-detect user country from IP address
2. **Language:** Link countries to supported languages
3. **Timezone:** Add timezone information to countries
4. **Currency:** Link to currency information for in-app purchases
5. **Regional Settings:** Custom settings per country (date format, etc.)
6. **Analytics:** Track user distribution by country
7. **Content Moderation:** Country-specific moderation rules
8. **Recommendations:** Show nearby rooms based on country proximity
