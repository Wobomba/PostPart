-- Find the REAL error in the handle_new_user trigger
-- The activity_log error is a red herring - something else is failing first

-- Step 1: Check the current trigger function code
SELECT 
  'Current trigger function:' AS info;

SELECT 
  pg_get_functiondef(p.oid) AS function_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- Step 2: Check if there are ANY other triggers or functions that might reference activity_log
SELECT 
  'Checking for other triggers on auth.users:' AS info;

SELECT 
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS trigger_def,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relname = 'users'
  AND n.nspname = 'auth'
ORDER BY t.tgname;

-- Step 3: Check if handle_new_user function has proper search_path
SELECT 
  'Checking function properties:' AS info;

SELECT 
  p.proname,
  p.prosecdef AS is_security_definer,
  pg_get_function_identity_arguments(p.oid) AS args,
  (SELECT array_agg(setting) 
   FROM unnest(p.proconfig) AS setting) AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'handle_new_user';

-- Step 4: Manually test the insert that the trigger does
-- This will reveal the ACTUAL error
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'test-real-error-' || substring(test_id::TEXT, 1, 6) || '@example.com';
  test_metadata JSONB := '{"full_name": "Test User"}'::jsonb;
BEGIN
  -- Simulate what Supabase Auth does
  RAISE NOTICE 'Testing profile insert with:';
  RAISE NOTICE '  ID: %', test_id;
  RAISE NOTICE '  Email: %', test_email;
  RAISE NOTICE '  Metadata: %', test_metadata;
  
  BEGIN
    -- Try the exact insert the trigger should do
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
      COALESCE(test_metadata->>'full_name', ''),
      NULL,
      'inactive',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✓ Insert succeeded!';
    
    -- Check if profile exists
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_id) THEN
      RAISE NOTICE '✓ Profile found in database';
      
      -- Clean up
      DELETE FROM public.profiles WHERE id = test_id;
      RAISE NOTICE '✓ Cleanup successful';
      
      RAISE NOTICE '';
      RAISE NOTICE '===================================';
      RAISE NOTICE 'TEST PASSED - Insert works fine!';
      RAISE NOTICE 'This means the error is elsewhere.';
      RAISE NOTICE '===================================';
    ELSE
      RAISE WARNING '✗ Profile not found after insert!';
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '';
      RAISE WARNING '✗✗✗ FOUND THE REAL ERROR! ✗✗✗';
      RAISE WARNING 'Error: %', SQLERRM;
      RAISE WARNING 'Detail: %', SQLSTATE;
      RAISE WARNING 'This is what is causing registration to fail!';
      RAISE WARNING '';
  END;
END $$;












