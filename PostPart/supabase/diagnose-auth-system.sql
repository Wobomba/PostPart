-- COMPREHENSIVE AUTH DIAGNOSTIC
-- Check what's blocking Supabase Auth from creating users

-- Step 1: Check if there are any constraints on auth.users
SELECT 
  'Checking auth.users constraints...' AS step;

SELECT
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
  END AS type,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'users'
  AND nsp.nspname = 'auth'
ORDER BY con.contype;

-- Step 2: Check RLS on auth.users
SELECT 
  'Checking auth.users RLS...' AS step;

SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'auth' 
  AND tablename = 'users';

-- Step 3: Check for policies on auth.users
SELECT 
  'Checking auth.users policies...' AS step;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'users'
  AND schemaname = 'auth';

-- Step 4: Check all triggers on auth.users
SELECT 
  'Checking all triggers on auth.users...' AS step;

SELECT 
  t.tgname AS trigger_name,
  t.tgenabled AS enabled,
  t.tgtype AS trigger_type,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users'
  AND n.nspname = 'auth'
ORDER BY t.tgname;

-- Step 5: Check if we can query auth.users at all
SELECT 
  'Checking if we can read auth.users...' AS step;

SELECT 
  COUNT(*) AS total_users,
  COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) AS confirmed_users,
  COUNT(CASE WHEN email_confirmed_at IS NULL THEN 1 END) AS unconfirmed_users
FROM auth.users;

-- Step 6: Check for any foreign keys FROM other tables TO auth.users
SELECT 
  'Checking what references auth.users...' AS step;

SELECT
  c.relname AS table_name,
  n.nspname AS schema_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE con.confrelid = (
  SELECT oid FROM pg_class 
  WHERE relname = 'users' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
)
ORDER BY n.nspname, c.relname;

-- Step 7: Try a test insert into profiles (simulate what trigger would do)
DO $$
DECLARE
  test_uuid UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
BEGIN
  -- First, check if this UUID would work
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = test_uuid) THEN
    RAISE NOTICE 'Test UUID already exists in auth.users';
  ELSE
    RAISE NOTICE 'Test UUID does not exist in auth.users (expected)';
  END IF;
  
  -- Try inserting a profile with a non-existent user ID
  BEGIN
    INSERT INTO public.profiles (
      id, email, full_name, status, created_at, updated_at
    ) VALUES (
      test_uuid,
      'test@example.com',
      'Test User',
      'inactive',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✗ PROBLEM: Profile insert succeeded without user in auth.users!';
    RAISE NOTICE 'This means the FK constraint is not enforcing properly.';
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_uuid;
    
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '✓ GOOD: FK constraint is working (profile rejected without auth.users entry)';
    WHEN OTHERS THEN
      RAISE WARNING 'Unexpected error: %', SQLERRM;
  END;
END $$;

-- Step 8: Summary
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'AUTH DIAGNOSTIC COMPLETE';
  RAISE NOTICE 'Check results above for any auth.users issues.';
  RAISE NOTICE '================================================';
END $$;












