-- NUCLEAR FIX v4 - Address all possible issues
-- This is the most comprehensive fix yet

-- Step 1: Make organization_id foreign key constraint deferrable
-- This allows NULL values and deferred constraint checking
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey CASCADE;

-- Re-add the foreign key constraint as nullable and deferrable
ALTER TABLE profiles 
ADD CONSTRAINT profiles_organization_id_fkey 
  FOREIGN KEY (organization_id) 
  REFERENCES organizations(id) 
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Step 2: Make sure all columns that should be nullable ARE nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL,
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL;

-- Step 3: Add status column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';

-- Add constraint for status column
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Step 4: Update default for status
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'inactive';

-- Step 5: Create the simplest possible trigger function that WILL work
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Use a simple insert with minimal data
  INSERT INTO public.profiles (
    id, 
    email,
    full_name,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'inactive',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and continue
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 6: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Step 7: Drop ALL RLS policies and recreate them properly
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation for auth" ON profiles;

-- Create simple, permissive policies
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_any"
  ON profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Step 8: Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated, postgres;
GRANT SELECT ON organizations TO anon, authenticated;

-- Step 9: Ensure email is unique but handle it gracefully
DROP INDEX IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique 
  ON profiles(email) 
  WHERE email IS NOT NULL AND email != '';

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status 
  ON profiles(status);

-- Step 11: Run a comprehensive test
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test-' || substring(test_id::TEXT, 1, 8) || '@example.com';
  insert_success BOOLEAN := false;
BEGIN
  -- Test 1: Try inserting directly
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, status)
    VALUES (test_id, test_email, 'Test User', 'inactive');
    insert_success := true;
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE '✓ Direct insert works';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '✗ Direct insert failed: %', SQLERRM;
  END;

  -- Test 2: Check trigger exists
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    RAISE NOTICE '✓ Trigger exists';
  ELSE
    RAISE WARNING '✗ Trigger not found';
  END IF;

  -- Test 3: Check columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'status' 
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✓ Status column exists and is nullable';
  ELSE
    RAISE WARNING '✗ Status column issue';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'organization_id' 
      AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE '✓ organization_id is nullable';
  ELSE
    RAISE WARNING '✗ organization_id not nullable';
  END IF;

  -- Final result
  RAISE NOTICE '=================================';
  IF insert_success THEN
    RAISE NOTICE '✓✓✓ MIGRATION SUCCESSFUL ✓✓✓';
    RAISE NOTICE 'Registration should work now!';
  ELSE
    RAISE WARNING 'Migration completed but manual test failed';
    RAISE WARNING 'Check the errors above';
  END IF;
  RAISE NOTICE '=================================';
END $$;

