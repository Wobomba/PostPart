-- COMPLETE FIX v3 - Based on actual schema analysis
-- This addresses the real issues found in the database

-- Step 1: Add the missing status column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Step 2: Make columns nullable that should be nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL,
ALTER COLUMN full_name DROP NOT NULL;

-- Step 3: Update the default value for status
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'inactive';

-- Step 4: Create the correct trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    organization_id, 
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL,
    'inactive',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Step 6: Fix RLS policies
-- Drop old policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;

-- Create new permissive insert policy
CREATE POLICY "Allow profile creation for auth"
  ON profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Ensure other policies exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 7: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON profiles TO anon, authenticated;
GRANT SELECT ON organizations TO anon, authenticated;

-- Step 8: Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status 
  ON profiles(status);

CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON profiles(email);

-- Step 9: Add column comments
COMMENT ON COLUMN profiles.status IS 
  'User status: inactive (new/pending org), active (approved), suspended (blocked)';

COMMENT ON COLUMN profiles.organization_id IS 
  'Organization ID - null until selected on first login';

COMMENT ON COLUMN profiles.full_name IS 
  'Full name - can be empty if not provided during registration';

-- Step 10: Verify the changes
DO $$
DECLARE
  status_exists BOOLEAN;
  org_nullable BOOLEAN;
  name_nullable BOOLEAN;
BEGIN
  -- Check if status column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) INTO status_exists;
  
  -- Check if organization_id is nullable
  SELECT is_nullable = 'YES' INTO org_nullable
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'organization_id';
  
  -- Check if full_name is nullable
  SELECT is_nullable = 'YES' INTO name_nullable
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'full_name';
  
  RAISE NOTICE '=== Migration Status ===';
  RAISE NOTICE 'Status column exists: %', status_exists;
  RAISE NOTICE 'organization_id nullable: %', org_nullable;
  RAISE NOTICE 'full_name nullable: %', name_nullable;
  RAISE NOTICE 'Trigger exists: %', (SELECT COUNT(*) > 0 FROM pg_trigger WHERE tgname = 'on_auth_user_created');
  RAISE NOTICE '======================';
  
  IF status_exists AND org_nullable AND name_nullable THEN
    RAISE NOTICE 'SUCCESS: All changes applied correctly!';
  ELSE
    RAISE WARNING 'Some changes may not have been applied. Please review.';
  END IF;
END $$;

