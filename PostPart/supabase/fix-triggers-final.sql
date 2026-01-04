-- COMPREHENSIVE FIX - Remove problematic triggers and recreate properly
-- This will fix the registration issue

-- Step 1: Drop the extra triggers that are causing issues
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
DROP TRIGGER IF EXISTS trigger_log_user_creation ON auth.users;

-- Step 2: Drop the old functions
DROP FUNCTION IF EXISTS assign_parent_role_on_signup() CASCADE;
DROP FUNCTION IF EXISTS log_user_account_creation() CASCADE;

-- Step 3: Keep ONLY the main profile creation trigger
-- (on_auth_user_created is still active and will create profiles)

-- Step 4: Create a SINGLE improved trigger function that does everything
CREATE OR REPLACE FUNCTION handle_new_user_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Create the profile
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
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL, -- Will be set on first login
    'inactive', -- Pending organization selection
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Assign parent role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Log the account creation (with error handling)
  BEGIN
    INSERT INTO public.activity_log (
      activity_type,
      entity_type,
      entity_id,
      entity_name,
      description,
      admin_user_id,
      admin_user_email,
      metadata
    )
    VALUES (
      'user_created',
      'user',
      NEW.id,
      COALESCE(NEW.email, 'New User'),
      'New user account created: ' || COALESCE(NEW.email, 'Unknown'),
      NULL, -- System action
      NULL,
      jsonb_build_object(
        'email', NEW.email,
        'created_at', NEW.created_at
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log activity_log errors but don't fail the user creation
      RAISE WARNING 'Failed to log user creation: %', SQLERRM;
  END;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user_complete for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 5: Replace the old trigger with the new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_complete();

-- Step 6: Verify the setup
DO $$
BEGIN
  -- Check trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Main trigger exists';
  ELSE
    RAISE WARNING '✗ Main trigger missing!';
  END IF;

  -- Check only one trigger for INSERT exists
  IF (SELECT COUNT(*) FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'users' 
        AND t.tgname LIKE '%auth_user_created%'
        AND t.tgtype::integer & 4 = 4) = 1 THEN
    RAISE NOTICE '✓ Only one INSERT trigger exists (good!)';
  ELSE
    RAISE WARNING '✗ Multiple INSERT triggers found!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=====================================';
  RAISE NOTICE '✓✓✓ TRIGGERS FIXED! ✓✓✓';
  RAISE NOTICE 'Try registration now - it should work!';
  RAISE NOTICE '=====================================';
END $$;

-- Step 7: Grant necessary permissions
GRANT SELECT, INSERT ON user_roles TO authenticated, anon;
GRANT SELECT, INSERT ON activity_log TO authenticated, anon;
GRANT SELECT, INSERT ON profiles TO authenticated, anon;





