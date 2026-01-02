-- Add status column to profiles table for parent management
-- This allows admins to enable/disable parents from accessing the service

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.status IS 'Parent account status: active (can use service), inactive (temporarily disabled), suspended (blocked due to policy violation)';

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Update existing records to have 'active' status
UPDATE profiles SET status = 'active' WHERE status IS NULL;

