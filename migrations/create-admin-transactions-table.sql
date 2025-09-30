-- Migration: Create admin_transactions table
-- Purpose: Track all admin actions for currency management and rate changes
-- Date: 2025-09-30

-- Create admin_transactions table
CREATE TABLE IF NOT EXISTS admin_transactions (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "adminId" UUID NOT NULL,
    "userId" UUID,
    "transactionType" VARCHAR(50) NOT NULL,
    "currencyType" VARCHAR(20),
    amount DECIMAL(15,2) DEFAULT 0,
    "balanceBefore" DECIMAL(15,2),
    "balanceAfter" DECIMAL(15,2),
    reason TEXT NOT NULL,
    notes TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_transactions_admin FOREIGN KEY ("adminId") REFERENCES users(uuid) ON DELETE CASCADE,
    CONSTRAINT fk_admin_transactions_user FOREIGN KEY ("userId") REFERENCES users(uuid) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_transactions_admin_id_created
ON admin_transactions("adminId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_admin_transactions_user_id_created
ON admin_transactions("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_admin_transactions_type_created
ON admin_transactions("transactionType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_admin_transactions_created
ON admin_transactions("createdAt" DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_admin_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_transactions_updated_at_trigger ON admin_transactions;

CREATE TRIGGER admin_transactions_updated_at_trigger
BEFORE UPDATE ON admin_transactions
FOR EACH ROW
EXECUTE FUNCTION update_admin_transactions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE admin_transactions IS 'Tracks all administrative actions including currency gifts, adjustments, and rate changes';
COMMENT ON COLUMN admin_transactions."adminId" IS 'UUID of the admin who performed the action';
COMMENT ON COLUMN admin_transactions."userId" IS 'UUID of the affected user (null for system-wide changes)';
COMMENT ON COLUMN admin_transactions."transactionType" IS 'Type of transaction: gift, adjustment, compensation, bonus, penalty, rate_change';
COMMENT ON COLUMN admin_transactions."currencyType" IS 'Type of currency affected: bins or diamonds (null for rate changes)';
COMMENT ON COLUMN admin_transactions.amount IS 'Amount of currency added or deducted';
COMMENT ON COLUMN admin_transactions."balanceBefore" IS 'User balance before the transaction';
COMMENT ON COLUMN admin_transactions."balanceAfter" IS 'User balance after the transaction';
COMMENT ON COLUMN admin_transactions.reason IS 'Reason for the admin action';
COMMENT ON COLUMN admin_transactions.notes IS 'Additional notes or context';
COMMENT ON COLUMN admin_transactions.metadata IS 'JSON object with additional details (admin name, user name, old/new rates, etc.)';
