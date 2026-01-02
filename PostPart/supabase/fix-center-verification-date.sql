-- Ensure verification_date column exists in centers table and is nullable
-- This allows centres to be unverified (verification_date = null)

-- Add verification_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'centers' AND column_name = 'verification_date'
  ) THEN
    ALTER TABLE centers ADD COLUMN verification_date TIMESTAMPTZ;
    COMMENT ON COLUMN centers.verification_date IS 'Date when centre was verified. NULL means unverified.';
  END IF;
END $$;

-- Ensure the column is nullable (can be NULL when unverified)
ALTER TABLE centers ALTER COLUMN verification_date DROP NOT NULL;

-- Update existing verified centres to have a verification_date if they don't have one
UPDATE centers 
SET verification_date = updated_at 
WHERE is_verified = true 
AND verification_date IS NULL;

-- Clear verification_date for unverified centres
UPDATE centers 
SET verification_date = NULL 
WHERE is_verified = false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_centers_verification_date ON centers(verification_date);

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'centers' 
AND column_name IN ('is_verified', 'verification_date')
ORDER BY column_name;

