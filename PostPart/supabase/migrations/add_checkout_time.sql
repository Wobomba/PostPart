-- Migration: Add check_out_time column to checkins table
-- This migration adds support for check-out functionality

-- Add check_out_time column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'checkins' 
        AND column_name = 'check_out_time'
    ) THEN
        ALTER TABLE checkins 
        ADD COLUMN check_out_time TIMESTAMP WITH TIME ZONE;
        
        -- Add comment
        COMMENT ON COLUMN checkins.check_out_time IS 'Timestamp when parent checked out their child';
    END IF;
END $$;

-- Create index for faster queries on active check-ins
CREATE INDEX IF NOT EXISTS idx_checkins_check_out_time 
ON checkins(check_out_time) 
WHERE check_out_time IS NULL;

-- Create index for faster queries on check-in/check-out times
CREATE INDEX IF NOT EXISTS idx_checkins_times 
ON checkins(check_in_time, check_out_time);

