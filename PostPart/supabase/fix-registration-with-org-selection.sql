-- Comprehensive fix for user registration with organization selection on first login
-- This script addresses the database error during user registration

-- Step 1: Make organization_id nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL;

-- Step 2: Update the trigger function to handle null organization_id
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organization_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULL, -- Organization will be set on first login
    'inactive' -- Start as inactive until organization is selected and admin approves
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 4: Update RLS policies to allow profile creation with null organization_id
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- Recreate policies with proper permissions
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile (for the trigger)
CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  WITH CHECK (true); -- Allow insert from trigger context

-- Step 5: Add index for faster organization lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id) 
  WHERE organization_id IS NOT NULL;

-- Step 6: Add helpful comments
COMMENT ON COLUMN profiles.organization_id IS 
  'Organization ID - nullable until user selects organization on first login. Once set, admin must approve by changing status to active.';

COMMENT ON COLUMN profiles.status IS 
  'User status: inactive (new user/pending org selection), active (approved by admin), suspended (temporarily blocked)';

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON organizations TO authenticated;

