-- DETAILED DIAGNOSTIC - Find out exactly what's failing
-- This will show us the REAL error message

-- Step 1: Check if the trigger is actually being called
-- Look for any warnings in the logs
SELECT 
  'Checking trigger function...' AS step;

-- Step 2: Try to manually simulate what Supabase Auth does
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test-debug-' || substring(test_user_id::TEXT, 1, 6) || '@example.com';
  test_full_name TEXT := 'Test Debug User';
BEGIN
  -- Step 2a: Try inserting into auth.users (simulating Supabase Auth)
  BEGIN
    -- We can't actually insert into auth.users, so we'll just test the profile insert
    RAISE NOTICE 'Testing profile insert with user: %', test_email;
    
    -- Step 2b: Try the exact insert the trigger does
    INSERT INTO public.profiles (
      id, 
      email,
      full_name,
      status,
      created_at,
      updated_at
    )
    VALUES (
      test_user_id,
      test_email,
      test_full_name,
      'inactive',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✓ SUCCESS: Profile insert worked!';
    RAISE NOTICE 'User ID: %', test_user_id;
    
    -- Check if it's really there
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
      RAISE NOTICE '✓ Profile exists in database';
    ELSE
      RAISE WARNING '✗ Profile not found after insert!';
    END IF;
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_user_id;
    RAISE NOTICE '✓ Test cleanup completed';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '✗✗✗ FAILED: %', SQLERRM;
      RAISE WARNING 'Error detail: %', SQLSTATE;
      RAISE WARNING 'This is the error preventing registration!';
  END;
END $$;

-- Step 3: Check the trigger function definition
SELECT 
  'Checking trigger function definition...' AS step;
  
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- Step 4: Check if trigger is attached to auth.users
SELECT 
  'Checking trigger attachment...' AS step;

SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  n.nspname AS schema_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.tgname = 'on_auth_user_created'
  AND c.relname = 'users'
  AND n.nspname = 'auth';

-- Step 5: Check RLS is not blocking
SELECT 
  'Checking RLS policies...' AS step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Step 6: Check all constraints
SELECT 
  'Checking constraints...' AS step;

SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
  END AS type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'profiles'
  AND nsp.nspname = 'public'
ORDER BY con.contype;

-- Step 7: Final summary
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLETE';
  RAISE NOTICE 'Check the results above for the exact error.';
  RAISE NOTICE '================================================';
END $$;

