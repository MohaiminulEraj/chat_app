# Dual Currency System Implementation Guide

## Overview

The dual currency system has been successfully implemented with two types of currencies:

- **Bins**: Base currency for regular transactions
- **Diamonds**: Premium currency purchased with bins

## Architecture Components

### 1. Database Entities

#### User Entity Updates

- `binsBalance`: Decimal field for bins currency (precision 15, scale 2)
- `diamondBalance`: Decimal field for diamonds currency (precision 15, scale 2)
- Replaced single `balance` field with dual currency system

#### CurrencyConfig Entity

- Manages admin-configurable exchange rates
- Controls purchase limits and currency settings
- Supports metadata for flexible configuration

#### CurrencyTransaction Entity

- Complete audit trail for all currency operations
- Tracks transaction types: PURCHASE_DIAMOND, GIFT_SENT, ADMIN_ADJUSTMENT, etc.
- Maintains transaction status and history

### 2. Service Layer

#### CurrencyService

- `purchaseDiamonds()`: Converts bins to diamonds with atomic transactions
- `addCurrency()`: Admin function to add currency to users
- `deductCurrency()`: Admin function to deduct currency from users
- `getUserBalances()`: Returns formatted currency balances
- `getTransactionHistory()`: Retrieves user transaction history

### 3. API Endpoints

#### Currency Controller

- `GET /api/currency/balance`: Get user currency balances
- `POST /api/currency/purchase-diamonds`: Purchase diamonds with bins
- `GET /api/currency/transactions`: Get transaction history
- `POST /api/currency/admin/add`: Admin add currency
- `POST /api/currency/admin/deduct`: Admin deduct currency
- `GET /api/currency/admin/config`: Get currency configuration
- `PUT /api/currency/admin/config`: Update currency configuration

## API Usage Examples

### Get User Balance

```http
GET /api/currency/balance
Authorization: Bearer {jwt_token}

Response:
{
  "success": true,
  "data": {
    "binsBalance": 1500.75,
    "diamondBalance": 25.50
  }
}
```

### Purchase Diamonds

```http
POST /api/currency/purchase-diamonds
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "binsAmount": 100
}

Response:
{
  "success": true,
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionType": "PURCHASE_DIAMOND",
      "binsAmount": 100,
      "diamondAmount": 10,
      "exchangeRate": 10,
      "status": "COMPLETED"
    },
    "newBalances": {
      "binsBalance": 1400.75,
      "diamondBalance": 35.50
    }
  }
}
```

### Admin Add Currency

```http
POST /api/currency/admin/add
Authorization: Bearer {admin_jwt_token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "currencyType": "BINS",
  "amount": 500,
  "reason": "Promotional bonus"
}
```

## Database Migration

### Migration Steps

1. **Backup existing data**: Create backup table with current balance data
2. **Update users**: Convert existing balance to binsBalance, set diamondBalance to 0
3. **Create currency config**: Set default exchange rates and limits
4. **Verify migration**: Check data integrity and totals
5. **Add indexes**: Optimize query performance
6. **Clean up**: Remove old balance column after testing

### Migration Script

Run the SQL script located at: `/migrations/migration-dual-currency.sql`

## Configuration

### Default Settings

- Exchange rate: 10 bins = 1 diamond
- Minimum purchase: 100 bins
- Maximum purchase: 10,000 bins
- Transaction precision: 2 decimal places

### Admin Configuration

Administrators can modify currency settings through the admin API endpoints:

- Update exchange rates
- Set purchase limits
- Enable/disable currency types
- Add custom metadata

## Integration Points

### Room Profile API

The room profile API has been updated to include currency balances in user profiles:

```json
{
    "profile": {
        "binsBalance": 2750.5,
        "diamondBalance": 185.25
    }
}
```

### Achievement System

User achievement data now includes both currency types:

```typescript
interface UserAchievementData {
    binsBalance: number
    diamondBalance: number
    // ... other fields
}
```

## Security Features

### Transaction Safety

- All currency operations use database transactions
- Atomic operations prevent partial updates
- Balance validation before operations
- Complete audit trail for all transactions

### Authentication

- JWT authentication required for all endpoints
- Admin-only endpoints for currency management
- Request validation and sanitization

## Testing

### Currency Purchase Flow

1. User has sufficient bins balance
2. Request diamond purchase with valid amount
3. System calculates diamond amount based on exchange rate
4. Atomic transaction updates both balances
5. Transaction record created for audit

### Admin Operations

1. Admin authentication validation
2. Currency addition/deduction with reason tracking
3. Configuration updates with validation
4. Transaction history accessible

## Error Handling

### Common Error Cases

- Insufficient balance for purchases
- Invalid currency amounts (negative, zero)
- User not found
- Invalid exchange rates
- Database transaction failures

### Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "INSUFFICIENT_BALANCE",
        "message": "Insufficient bins balance for this purchase"
    }
}
```

## Performance Considerations

### Database Indexes

- `idx_users_bins_balance`: Query optimization for balance checks
- `idx_users_diamond_balance`: Diamond balance queries
- `idx_currency_transactions_user_id`: Transaction history queries
- `idx_currency_transactions_type`: Transaction type filtering

### Number Formatting

All currency values are returned as numbers (not strings) for better client-side handling:

```typescript
// Service method example
return {
    binsBalance: parseFloat(user.binsBalance.toString()),
    diamondBalance: parseFloat(user.diamondBalance.toString())
}
```

## Future Enhancements

### Potential Features

1. **Currency Exchange**: Allow diamond-to-bins conversion
2. **Bulk Operations**: Admin bulk currency management
3. **Transaction Limits**: Daily/monthly transaction limits
4. **Currency Events**: Real-time currency update notifications
5. **Analytics**: Currency usage analytics and reporting
6. **Gift System Integration**: Currency-based gifting system

### Scaling Considerations

- Currency caching for high-frequency operations
- Transaction batching for bulk operations
- Read replicas for balance queries
- Event sourcing for complex transaction flows

## Troubleshooting

### Common Issues

1. **Migration errors**: Check database permissions and existing data
2. **Balance mismatches**: Verify transaction atomicity and rollback procedures
3. **Performance issues**: Review index usage and query optimization
4. **Authentication failures**: Verify JWT token validity and user permissions

### Debug Tools

- Transaction history API for audit trails
- Admin balance check endpoints
- Database migration verification scripts
- Currency operation logging

This implementation provides a robust, scalable foundation for the dual currency system with comprehensive admin controls, transaction safety, and clear audit trails.
