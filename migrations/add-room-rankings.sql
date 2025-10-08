-- Room Rankings Migration
-- Add room_rankings table for tracking user rankings based on gift transactions

-- Create enum type for ranking periods
DO $$ BEGIN
    CREATE TYPE ranking_period AS ENUM ('hourly', 'weekly', 'total', 'online');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create room_rankings table
CREATE TABLE IF NOT EXISTS room_rankings (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" UUID NOT NULL REFERENCES rooms(uuid) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(uuid) ON DELETE CASCADE,
    period ranking_period NOT NULL,
    "giftsSentValue" DECIMAL(15,2) DEFAULT 0,
    "giftsSentCount" INTEGER DEFAULT 0,
    "giftsReceivedValue" DECIMAL(15,2) DEFAULT 0,
    "giftsReceivedCount" INTEGER DEFAULT 0,
    "totalScore" DECIMAL(15,2) DEFAULT 0,
    rank INTEGER DEFAULT 0,
    "lastActivityAt" TIMESTAMP,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_rankings_room_period_created
ON room_rankings("roomId", period, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_room_rankings_user_room_period
ON room_rankings("userId", "roomId", period);

CREATE INDEX IF NOT EXISTS idx_room_rankings_room_period_rank
ON room_rankings("roomId", period, rank);

CREATE INDEX IF NOT EXISTS idx_room_rankings_room_period_score
ON room_rankings("roomId", period, "totalScore" DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_room_rankings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS room_rankings_updated_at_trigger ON room_rankings;
CREATE TRIGGER room_rankings_updated_at_trigger
BEFORE UPDATE ON room_rankings
FOR EACH ROW
EXECUTE FUNCTION update_room_rankings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE room_rankings IS 'Stores user rankings in rooms based on gift transactions across different time periods';
COMMENT ON COLUMN room_rankings."roomId" IS 'Reference to the room';
COMMENT ON COLUMN room_rankings."userId" IS 'Reference to the user';
COMMENT ON COLUMN room_rankings.period IS 'Time period for ranking calculation: hourly, weekly, total, or online';
COMMENT ON COLUMN room_rankings."giftsSentValue" IS 'Total value of gifts sent by user';
COMMENT ON COLUMN room_rankings."giftsSentCount" IS 'Number of gifts sent by user';
COMMENT ON COLUMN room_rankings."giftsReceivedValue" IS 'Total value of gifts received by user';
COMMENT ON COLUMN room_rankings."giftsReceivedCount" IS 'Number of gifts received by user';
COMMENT ON COLUMN room_rankings."totalScore" IS 'Calculated ranking score: (giftsSentValue × 0.5) + (giftsReceivedValue × 0.5)';
COMMENT ON COLUMN room_rankings.rank IS 'Current rank position (1 is highest)';
COMMENT ON COLUMN room_rankings.metadata IS 'Additional ranking data (top gifts, unique interactions, online status)';
