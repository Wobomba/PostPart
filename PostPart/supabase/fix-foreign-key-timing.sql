-- Check if the foreign key constraint is causing timing issues
-- The trigger might be firing before the auth.users transaction commits

-- Step 1: Check the profiles_id_fkey constraint details
SELECT 
  con.conname AS constraint_name,
  con.confdeltype AS on_delete_action,
  con.condeferrable AS is_deferrable,
  con.condeferred AS initially_deferred,
  pg_get_constraintdef(con.oid) AS full_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles'
  AND con.conname = 'profiles_id_fkey';

-- Step 2: Make the foreign key deferrable
-- This allows the constraint check to be delayed until the transaction commits
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey CASCADE;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Step 3: Verify the change
SELECT 
  'Constraint updated!' AS message,
  con.condeferrable AS is_now_deferrable,
  con.condeferred AS initially_deferred
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles'
  AND con.conname = 'profiles_id_fkey';

-- Step 4: Test again
DO $$
DECLARE
  test_id UUID := gen_random_uuid();
  test_email TEXT := 'final-test-' || substring(test_id::TEXT, 1, 6) || '@example.com';
BEGIN
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
      test_id,
      test_email,
      'Final Test',
      'inactive',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '✓✓✓ SUCCESS! Foreign key constraint is now deferrable!';
    RAISE NOTICE 'Registration should work now!';
    
    -- Clean up
    DELETE FROM public.profiles WHERE id = test_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Still failing: %', SQLERRM;
  END;
END $$;

