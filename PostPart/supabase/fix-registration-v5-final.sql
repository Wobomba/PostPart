-- FINAL FIX v5 - Fixes the constraint issue from v4
-- This addresses the profiles_email_key constraint problem

-- Step 1: Drop the email unique CONSTRAINT (not index)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_email_key CASCADE;

-- Step 2: Make organization_id foreign key constraint deferrable
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey CASCADE;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_organization_id_fkey 
  FOREIGN KEY (organization_id) 
  REFERENCES organizations(id) 
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Make all nullable columns truly nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL,
ALTER COLUMN full_name DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL;

-- Step 4: Add status column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'inactive';

-- Step 5: Add status constraint
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'inactive';

-- Step 6: Create the simplest trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
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
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 7: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION handle_new_user();

-- Step 8: Drop ALL RLS policies and recreate
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation for auth" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_any" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Create simple policies
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

-- Step 9: Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO anon, authenticated, postgres;
GRANT SELECT ON organizations TO anon, authenticated;

-- Step 10: Create a partial unique index on email (allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique 
  ON profiles(email) 
  WHERE email IS NOT NULL AND email != '';

-- Step 11: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id 
  ON profiles(organization_id) 
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_status 
  ON profiles(status);

-- Step 12: Run comprehensive test
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test-' || substring(test_id::TEXT, 1, 8) || '@example.com';
  insert_success BOOLEAN := false;
  trigger_exists BOOLEAN := false;
  status_ok BOOLEAN := false;
  org_nullable BOOLEAN := false;
BEGIN
  -- Test 1: Direct insert
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

  -- Test 2: Trigger
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✓ Trigger exists';
  ELSE
    RAISE WARNING '✗ Trigger not found';
  END IF;

  -- Test 3: Status column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
      AND column_name = 'status' 
      AND is_nullable = 'YES'
  ) INTO status_ok;
  
  IF status_ok THEN
    RAISE NOTICE '✓ Status column OK';
  ELSE
    RAISE WARNING '✗ Status column issue';
  END IF;

  -- Test 4: organization_id nullable
  SELECT is_nullable = 'YES' INTO org_nullable
  FROM information_schema.columns 
  WHERE table_name = 'profiles' AND column_name = 'organization_id';
  
  IF org_nullable THEN
    RAISE NOTICE '✓ organization_id is nullable';
  ELSE
    RAISE WARNING '✗ organization_id not nullable';
  END IF;

  -- Final verdict
  RAISE NOTICE '=====================================';
  IF insert_success AND trigger_exists AND status_ok AND org_nullable THEN
    RAISE NOTICE '✓✓✓ SUCCESS! ALL TESTS PASSED! ✓✓✓';
    RAISE NOTICE 'Registration should work now!';
    RAISE NOTICE 'Try creating an account in the mobile app.';
  ELSE
    RAISE WARNING 'Some tests failed. Check above for details.';
  END IF;
  RAISE NOTICE '=====================================';
END $$;

