-- Migration Script: Dual Currency System Implementation
-- This script safely migrates existing users from single balance to dual currency system
-- Run this script after deploying the new code changes
-- Database: PostgreSQL

-- Step 1: Create backup of current user balance data (PostgreSQL syntax)
CREATE TABLE IF NOT EXISTS user_balance_backup AS
SELECT id, email, balance, created_at, updated_at
FROM users
WHERE balance IS NOT NULL AND balance > 0;

-- Step 2: Update existing users with dual currency fields
-- Convert existing balance to binsBalance, set diamondBalance to 0
UPDATE users
SET
    binsBalance = COALESCE(balance, 0),
    diamondBalance = 0
WHERE binsBalance IS NULL OR binsBalance = 0;

-- Step 3: Create initial currency configuration (if not exists)
INSERT INTO currency_config (
    currency_type,
    bins_to_diamond_rate,
    minimum_purchase,
    maximum_purchase,
    is_active,
    metadata
) VALUES (
    'DIAMOND',
    10.00, -- 10 bins = 1 diamond
    100.00, -- minimum 100 bins purchase
    10000.00, -- maximum 10000 bins purchase
    true,
    '{"description": "Default diamond purchase configuration", "created_by": "migration_script"}'
) ON CONFLICT (currency_type) DO NOTHING;

-- Step 4: Verify migration results
-- Check total balance conversion
DO $$
DECLARE
    original_total DECIMAL;
    new_bins_total DECIMAL;
    conversion_count INTEGER;
BEGIN
    -- Get original balance total from backup
    SELECT COALESCE(SUM(balance), 0) INTO original_total FROM user_balance_backup;

    -- Get new bins balance total
    SELECT COALESCE(SUM(binsBalance), 0) INTO new_bins_total FROM users;

    -- Count converted users
    SELECT COUNT(*) INTO conversion_count FROM users WHERE binsBalance > 0;

    -- Log migration results
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE 'Original total balance: %', original_total;
    RAISE NOTICE 'New bins balance total: %', new_bins_total;
    RAISE NOTICE 'Users with converted balance: %', conversion_count;

    -- Verify totals match
    IF ABS(original_total - new_bins_total) > 0.01 THEN
        RAISE EXCEPTION 'Balance mismatch detected! Original: %, New: %', original_total, new_bins_total;
    ELSE
        RAISE NOTICE 'Balance migration successful - totals match!';
    END IF;
END $$;

-- Step 5: Clean up old balance column (OPTIONAL - run only after thorough testing)
-- Uncomment the following lines ONLY after confirming migration success
-- ALTER TABLE users DROP COLUMN IF EXISTS balance;

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_bins_balance ON users (binsBalance);
CREATE INDEX IF NOT EXISTS idx_users_diamond_balance ON users (diamondBalance);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_user_id ON currency_transaction (userId);
CREATE INDEX IF NOT EXISTS idx_currency_transactions_type ON currency_transaction (transactionType);

-- Migration complete
-- Next steps:
-- 1. Test the application thoroughly with the new currency system
-- 2. Verify all API endpoints work correctly
-- 3. Test currency purchase flow
-- 4. Only after thorough testing, consider dropping the old balance column
