# Gift System Implementation Guide

## Overview

The new gift system introduces categorized gifts with dual currency support (bins/diamonds) and advanced features like rarity levels, special effects, and VIP requirements.

## System Architecture

### Categories

- **Hot**: Popular and trending gifts (bins/diamonds)
- **Activity**: Interactive and engaging gifts (bins/diamonds)
- **SVIP**: Super VIP exclusive gifts (diamonds only)
- **Noble**: Premium luxurious gifts (diamonds only)

### Gift Properties

Each gift contains:

- `id`: Unique identifier
- `name`: Gift name/identifier
- `title`: Display title
- `description`: Gift description
- `giftImage`: Image URL
- `category`: Category ID
- `price`: Currency type and amount
- `effects`: Animation and sound effects
- `rarity`: Rarity level (common to cosmic)
- `popularity`: Popularity score (1-100)
- `requiredLevel`: Minimum user level (optional)
- `vipRequired`: VIP status requirement (optional)
- `specialRequirements`: Additional requirements (optional)

### Currency System Integration

- **Bins**: Base currency for common/uncommon gifts
- **Diamonds**: Premium currency for rare/legendary gifts
- Price validation against user balance
- Transaction logging for all gift purchases

### Rarity System

1. **Common** (50-150 bins)
2. **Uncommon** (150-300 bins, 5-10 diamonds)
3. **Rare** (5-15 diamonds)
4. **Legendary** (50-100 diamonds, VIP required)
5. **Mythical** (100-300 diamonds, level + VIP required)
6. **Divine** (300-500 diamonds, noble status required)
7. **Cosmic** (500+ diamonds, special achievements required)

## API Endpoints

### Get All Gift Categories and Gifts

```
GET /api/v1/gifts/categories
Authorization: Bearer {jwt_token}
```

### Get Gifts by Category

```
GET /api/v1/gifts/category/{categoryId}
Authorization: Bearer {jwt_token}
```

### Send Gift

```
POST /api/v1/gifts/send
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "giftId": "gift_hot_001",
  "receiverId": "user-uuid",
  "roomId": "room-uuid", // optional
  "message": "Enjoy this gift!", // optional
  "quantity": 1 // optional, default 1
}
```

## Database Schema Updates

### Gifts Table Enhancement

```sql
ALTER TABLE gifts ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'hot';
ALTER TABLE gifts ADD COLUMN currency_type VARCHAR(20) NOT NULL DEFAULT 'bins';
ALTER TABLE gifts ADD COLUMN rarity VARCHAR(20) DEFAULT 'common';
ALTER TABLE gifts ADD COLUMN popularity INT DEFAULT 0;
ALTER TABLE gifts ADD COLUMN required_level INT DEFAULT 0;
ALTER TABLE gifts ADD COLUMN vip_required BOOLEAN DEFAULT false;
ALTER TABLE gifts ADD COLUMN special_requirements JSONB;
ALTER TABLE gifts ADD COLUMN effects JSONB;
ALTER TABLE gifts ADD COLUMN sort_order INT DEFAULT 0;
```

### Gift Categories Table

```sql
CREATE TABLE gift_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Frontend Integration

### Display Categories

```typescript
interface GiftCategory {
    id: string
    name: string
    description: string
    iconUrl: string
    isActive: boolean
    sortOrder: number
}
```

### Display Gifts

```typescript
interface Gift {
    id: string
    name: string
    title: string
    description: string
    giftImage: string
    category: string
    price: {
        currency: 'bins' | 'diamonds'
        amount: number
    }
    effects: {
        animation: string
        duration: number
        sound: string
    }
    rarity: string
    popularity: number
    requiredLevel?: number
    vipRequired?: boolean
    specialRequirements?: string[]
}
```

### Gift Sending Flow

1. User selects category
2. Frontend displays available gifts
3. User selects gift and recipient
4. Frontend validates user balance
5. User confirms purchase
6. API processes transaction
7. Real-time notification to recipient
8. Animation/effect plays in room

## Implementation Phases

### Phase 1: Basic Structure

- [ ] Create gift categories table
- [ ] Update gifts table schema
- [ ] Create dummy data endpoints
- [ ] Frontend category display

### Phase 2: Enhanced Features

- [ ] Implement currency validation
- [ ] Add rarity system
- [ ] VIP/level requirements
- [ ] Gift effects system

### Phase 3: Advanced Features

- [ ] Real-time gift animations
- [ ] Gift history tracking
- [ ] Popular gifts ranking
- [ ] Special events/limited gifts

## Currency Integration

### Balance Validation

```typescript
// Before allowing gift purchase
const userBalance = await currencyService.getUserBalances(userId)
const gift = await giftService.findOne(giftId)

if (
    gift.price.currency === 'bins' &&
    userBalance.binsBalance < gift.price.amount
) {
    throw new BadRequestException('Insufficient bins balance')
}

if (
    gift.price.currency === 'diamonds' &&
    userBalance.diamondBalance < gift.price.amount
) {
    throw new BadRequestException('Insufficient diamonds balance')
}
```

### Transaction Processing

```typescript
// Deduct currency when sending gift
await currencyService.deductCurrency(
    senderId,
    gift.price.currency === 'bins' ? CurrencyType.BINS : CurrencyType.DIAMOND,
    gift.price.amount,
    TransactionType.GIFT_SENT,
    `Gift sent: ${gift.name}`,
    {
        giftId: gift.id,
        giftName: gift.name,
        receiverId,
        roomId
    }
)
```

## Real-time Features

### WebSocket Events

- `gift_sent`: Notify room when gift is sent
- `gift_received`: Notify recipient
- `gift_animation`: Trigger visual effects
- `popularity_update`: Update gift popularity

### Animation System

- Screen effects based on gift rarity
- Duration varies by gift value
- Sound effects for immersion
- Particle systems for premium gifts

## Admin Controls

### Gift Management

- Create/edit/delete gifts
- Set currency types and prices
- Configure rarity and requirements
- Enable/disable gifts
- View gift statistics

### Category Management

- Create/edit gift categories
- Reorder categories
- Set category icons
- Category analytics

## Security Considerations

### Validation

- User balance verification
- VIP status checking
- Level requirement validation
- Rate limiting on gift sending
- Transaction atomicity

### Anti-fraud

- Gift sending limits per minute
- Suspicious pattern detection
- Transaction logging
- Balance audit trails

This comprehensive system provides a rich, engaging gift experience while maintaining proper currency controls and user progression mechanics.
