-- EMERGENCY FIX - Last Resort
-- If all else fails, this creates a completely permissive setup

-- WARNING: This temporarily reduces security for testing
-- DO NOT use in production without proper RLS policies

-- Step 1: Temporarily disable RLS on profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Try registration now
-- If this works, the issue is with RLS policies

-- Step 3: Re-enable RLS after testing
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Check if it worked
DO $$
BEGIN
  IF (SELECT rowsecurity FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public') THEN
    RAISE NOTICE '⚠ RLS is ENABLED';
  ELSE
    RAISE NOTICE '✓ RLS is DISABLED (for testing)';
    RAISE NOTICE 'Try registration now!';
    RAISE NOTICE 'If it works, the problem was RLS policies.';
  END IF;
END $$;

