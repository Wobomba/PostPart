-- Simplified diagnostic - shows everything clearly

-- Show the trigger function code
SELECT 
  '=== TRIGGER FUNCTION CODE ===' AS section,
  pg_get_functiondef(p.oid) AS code
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- Show all triggers on auth.users
SELECT 
  '=== TRIGGERS ON auth.users ===' AS section,
  t.tgname AS trigger_name,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'users' AND n.nspname = 'auth';

-- Test the actual insert
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'diagnose-' || substring(test_id::TEXT, 1, 6) || '@test.com';
BEGIN
  RAISE NOTICE '=== TESTING PROFILE INSERT ===';
  RAISE NOTICE 'Test ID: %', test_id;
  RAISE NOTICE 'Test Email: %', test_email;
  RAISE NOTICE '';
  
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, status, created_at, updated_at)
    VALUES (test_id, test_email, 'Test User', 'inactive', NOW(), NOW());
    
    RAISE NOTICE '✓✓✓ SUCCESS! Insert worked!';
    RAISE NOTICE 'The trigger function should work fine.';
    RAISE NOTICE '';
    RAISE NOTICE 'If registration still fails, the issue is:';
    RAISE NOTICE '1. Supabase Auth settings blocking signups';
    RAISE NOTICE '2. Or another trigger failing before ours';
    
    -- Cleanup
    DELETE FROM public.profiles WHERE id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗✗✗ INSERT FAILED! ✗✗✗';
    RAISE WARNING 'Error: %', SQLERRM;
    RAISE WARNING 'SQLSTATE: %', SQLSTATE;
    RAISE WARNING '';
    RAISE WARNING 'THIS IS THE ACTUAL ERROR BLOCKING REGISTRATION!';
  END;
END $$;












