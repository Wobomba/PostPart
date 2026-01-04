-- Better Diagnostic Script - Check what's actually wrong
-- This won't call trigger functions directly

-- Check 1: See the actual profiles table structure
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 2: See all constraints on profiles table
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
    WHEN 'x' THEN 'EXCLUSION'
  END AS constraint_type_desc,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = connamespace
WHERE rel.relname = 'profiles'
  AND nsp.nspname = 'public';

-- Check 3: View RLS policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Check 4: Check if trigger exists and its definition
SELECT 
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';

-- Check 5: View the trigger function code
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- Check 6: Check permissions
SELECT 
  grantee,
  string_agg(privilege_type, ', ') AS privileges
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
GROUP BY grantee;

-- Check 7: Try a manual insert to see what fails
-- This simulates what the trigger does
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test-' || test_id::TEXT || '@example.com';
BEGIN
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
      test_id,
      test_email,
      'Test User',
      NULL,
      'inactive',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'SUCCESS: Manual insert worked! The trigger should work too.';
    
    -- Clean up the test record
    DELETE FROM public.profiles WHERE id = test_id;
    RAISE NOTICE 'Test record cleaned up.';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'FAILED: Manual insert failed with error: %', SQLERRM;
      RAISE NOTICE 'This is probably why registration is failing!';
  END;
END $$;

