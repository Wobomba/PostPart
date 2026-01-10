-- Add organization_name column to profiles table
-- This allows users to enter their organization name before it's validated and linked to an organization_id

-- Add the column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_name TEXT;

-- Add a comment to document this behavior
COMMENT ON COLUMN profiles.organization_name IS 'Organization name entered by user - pending validation and linking to organizations table by admin';

