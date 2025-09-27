-- Migration: Update gift system to use diamonds and add conversion functionality
-- This migration script updates the existing gift system to use diamonds as the primary currency
-- and adds the conversion system for bins to diamonds and USD withdrawals

-- Step 1: Backup current gift data
CREATE TABLE IF NOT EXISTS gift_currency_backup AS
SELECT id, uuid, price, "currencyType", updated_at
FROM gifts;

-- Step 2: Update all gifts to use diamonds
UPDATE gifts
SET "currencyType" = 'diamonds',
    updated_at = CURRENT_TIMESTAMP
WHERE "currencyType" != 'diamonds';

-- Step 3: Create conversion configuration table
CREATE TABLE IF NOT EXISTS conversion_config (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "conversionType" VARCHAR(50) UNIQUE NOT NULL,
    "sourceValue" DECIMAL(15,4) DEFAULT 1,
    "targetValue" DECIMAL(15,4) DEFAULT 1,
    "adminCommissionPercent" DECIMAL(5,2) DEFAULT 0,
    "isActive" BOOLEAN DEFAULT true,
    metadata JSONB,
    "lastUpdatedBy" VARCHAR(255),
    "lastUpdatedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create conversion transactions table
CREATE TABLE IF NOT EXISTS conversion_transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "conversionType" VARCHAR(50) NOT NULL,
    "sourceAmount" DECIMAL(15,2) NOT NULL,
    "targetAmount" DECIMAL(15,2) NOT NULL,
    "adminCommissionAmount" DECIMAL(15,2) DEFAULT 0,
    "conversionRate" DECIMAL(15,4) NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description TEXT,
    metadata JSONB,
    "processedAt" TIMESTAMP,
    "processedBy" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create admin wallet table
CREATE TABLE IF NOT EXISTS admin_wallet (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    "binsBalance" DECIMAL(15,2) DEFAULT 0,
    "diamondBalance" DECIMAL(15,2) DEFAULT 0,
    "usdBalance" DECIMAL(15,2) DEFAULT 0,
    "totalCommissionsEarned" DECIMAL(15,2) DEFAULT 0,
    statistics JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Insert default conversion configurations
INSERT INTO conversion_config ("conversionType", "sourceValue", "targetValue", "adminCommissionPercent", "isActive")
VALUES
    ('diamond_to_bins', 1, 2, 0, true),
    ('bins_to_diamond', 3, 1, 70, true),
    ('bins_to_usd', 1, 210, 0, true)
ON CONFLICT ("conversionType") DO NOTHING;

-- Step 7: Initialize admin wallet
INSERT INTO admin_wallet ("binsBalance", "diamondBalance", "usdBalance", "totalCommissionsEarned")
VALUES (0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversion_config_type ON conversion_config("conversionType");
CREATE INDEX IF NOT EXISTS idx_conversion_transactions_user ON conversion_transactions("userId");
CREATE INDEX IF NOT EXISTS idx_conversion_transactions_type ON conversion_transactions("conversionType");
CREATE INDEX IF NOT EXISTS idx_conversion_transactions_status ON conversion_transactions(status);
CREATE INDEX IF NOT EXISTS idx_conversion_transactions_created ON conversion_transactions("createdAt");

-- Step 9: Add metadata column to gift_transactions for storing conversion info
ALTER TABLE gift_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Step 10: Add comment to document the changes
COMMENT ON TABLE conversion_config IS 'Stores conversion rates and commission settings configurable by admin';
COMMENT ON TABLE conversion_transactions IS 'Tracks all currency conversions and withdrawal requests';
COMMENT ON TABLE admin_wallet IS 'Stores admin commissions and earnings from conversions';

-- Step 11: Create constraints for data integrity
ALTER TABLE conversion_transactions
ADD CONSTRAINT chk_source_amount_positive CHECK ("sourceAmount" > 0),
ADD CONSTRAINT chk_target_amount_positive CHECK ("targetAmount" >= 0),
ADD CONSTRAINT chk_commission_amount_positive CHECK ("adminCommissionAmount" >= 0),
ADD CONSTRAINT chk_commission_percent_range CHECK ("commissionPercent" >= 0 AND "commissionPercent" <= 100);

ALTER TABLE conversion_config
ADD CONSTRAINT chk_source_value_positive CHECK ("sourceValue" > 0),
ADD CONSTRAINT chk_target_value_positive CHECK ("targetValue" > 0),
ADD CONSTRAINT chk_admin_commission_range CHECK ("adminCommissionPercent" >= 0 AND "adminCommissionPercent" <= 100);

-- Step 12: Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_conversion_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversion_config_timestamp
    BEFORE UPDATE ON conversion_config
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_config_timestamp();

CREATE OR REPLACE FUNCTION update_conversion_transactions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversion_transactions_timestamp
    BEFORE UPDATE ON conversion_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_transactions_timestamp();

CREATE OR REPLACE FUNCTION update_admin_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_admin_wallet_timestamp
    BEFORE UPDATE ON admin_wallet
    FOR EACH ROW
    EXECUTE FUNCTION update_admin_wallet_timestamp();

-- Step 13: Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Gift currency migration completed successfully';
    RAISE NOTICE 'All gifts now use diamonds as currency';
    RAISE NOTICE 'Conversion configurations initialized with default rates:';
    RAISE NOTICE '  - 1 Diamond = 2 Bins (gift receiving)';
    RAISE NOTICE '  - 3 Bins = 1 Diamond (70%% commission for purchases)';
    RAISE NOTICE '  - 210 Bins = 1 USD (withdrawal rate)';
    RAISE NOTICE 'Admin wallet initialized';
    RAISE NOTICE 'Database indexes and constraints created';
END $$;
