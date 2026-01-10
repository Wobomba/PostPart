-- Add status_before_org_change column to profiles table
-- This tracks the parent's status before organization status changes
-- Used to restore parents to their original state when organization becomes active again

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status_before_org_change TEXT;

-- Add constraint to match status values
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_status_before_org_change_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_before_org_change_check 
CHECK (status_before_org_change IS NULL OR status_before_org_change IN ('active', 'inactive', 'suspended'));

-- Add comment
COMMENT ON COLUMN profiles.status_before_org_change IS 
  'Stores the parent status before organization status change. Used to restore original status when organization becomes active again.';

