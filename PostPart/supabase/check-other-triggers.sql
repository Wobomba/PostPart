-- Check the OTHER trigger functions that are causing the failure

-- Function 1: assign_parent_role_on_signup
SELECT 
  '=== assign_parent_role_on_signup FUNCTION ===' AS section,
  pg_get_functiondef(p.oid) AS code
FROM pg_proc p
WHERE p.proname = 'assign_parent_role_on_signup';

-- Function 2: log_user_account_creation
SELECT 
  '=== log_user_account_creation FUNCTION ===' AS section,
  pg_get_functiondef(p.oid) AS code
FROM pg_proc p
WHERE p.proname = 'log_user_account_creation';

-- Check if user_roles table exists
SELECT 
  '=== CHECK user_roles TABLE ===' AS section,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_roles' AND table_schema = 'public'
  ) AS user_roles_exists;

-- Test what happens when we try to insert into user_roles
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE '=== TESTING user_roles INSERT ===';
  
  BEGIN
    INSERT INTO user_roles (user_id, role)
    VALUES (test_id, 'parent');
    
    RAISE NOTICE '✓ user_roles insert succeeded';
    DELETE FROM user_roles WHERE user_id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ user_roles insert FAILED: %', SQLERRM;
    RAISE WARNING 'This might be blocking registration!';
  END;
END $$;

-- Test what happens when we try to insert into activity_log
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE '=== TESTING activity_log INSERT ===';
  
  BEGIN
    INSERT INTO activity_log (
      activity_type, 
      entity_type, 
      entity_id, 
      description
    )
    VALUES (
      'user_created', 
      'user', 
      test_id, 
      'Test user creation'
    );
    
    RAISE NOTICE '✓ activity_log insert succeeded';
    DELETE FROM activity_log WHERE entity_id = test_id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ activity_log insert FAILED: %', SQLERRM;
    RAISE WARNING 'This might be blocking registration!';
  END;
END $$;





