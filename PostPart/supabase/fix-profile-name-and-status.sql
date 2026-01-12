-- ============================================
-- Fix Profile Name and Status Issues
-- ============================================
-- This script fixes existing profiles that have:
-- 1. Empty full_name (should sync from auth metadata)
-- 2. Null status (should default to 'active' if admin activated)
-- 3. Missing full_name in profiles but present in auth metadata

-- Step 1: Create a helper function to get auth metadata (runs with elevated privileges)
CREATE OR REPLACE FUNCTION get_auth_metadata(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  auth_meta JSONB;
BEGIN
  SELECT raw_user_meta_data INTO auth_meta
  FROM auth.users
  WHERE id = user_id;
  
  RETURN auth_meta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update profiles with empty full_name from auth metadata
UPDATE public.profiles p
SET 
  full_name = COALESCE(
    NULLIF(p.full_name, ''), -- If full_name is empty string, treat as null
    NULLIF((get_auth_metadata(p.id)->>'full_name'), ''),
    NULLIF((get_auth_metadata(p.id)->>'name'), ''),
    '' -- Keep empty if nothing found
  ),
  updated_at = NOW()
WHERE 
  p.full_name IS NULL 
  OR p.full_name = ''
  OR TRIM(p.full_name) = '';

-- Step 3: Update profiles with null status to 'active' if they have an organization
-- (This handles cases where admin activated but status wasn't set)
UPDATE public.profiles
SET 
  status = 'active',
  updated_at = NOW()
WHERE 
  status IS NULL
  AND organization_id IS NOT NULL;

-- Step 4: Improve the trigger to handle name syncing better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''), -- Handle empty strings
      NULLIF(NEW.raw_user_meta_data->>'name', ''),     -- Try 'name' field too
      '' -- Default to empty if not found
    ),
    'inactive' -- Default to inactive until admin activates
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(EXCLUDED.full_name, ''), -- Only update if new name is not empty
      profiles.full_name -- Keep existing if new is empty
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create a function to sync auth metadata to existing profiles
CREATE OR REPLACE FUNCTION sync_auth_metadata_to_profiles()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
  auth_meta JSONB;
  auth_email TEXT;
  auth_name TEXT;
BEGIN
  -- Loop through profiles that need name syncing
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE full_name IS NULL 
       OR full_name = '' 
       OR TRIM(full_name) = ''
  LOOP
    -- Get auth metadata for this user
    SELECT raw_user_meta_data, email 
    INTO auth_meta, auth_email
    FROM auth.users
    WHERE id = profile_record.id;
    
    -- Extract name from auth metadata
    IF auth_meta IS NOT NULL THEN
      auth_name := COALESCE(
        NULLIF(auth_meta->>'full_name', ''),
        NULLIF(auth_meta->>'name', '')
      );
    END IF;
    
    -- Update profile if we found a name
    IF auth_name IS NOT NULL AND auth_name != '' THEN
      UPDATE public.profiles
      SET 
        full_name = auth_name,
        email = COALESCE(email, auth_email, email),
        updated_at = NOW()
      WHERE id = profile_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Run the sync function
SELECT sync_auth_metadata_to_profiles();

-- Step 7: Report results
DO $$
DECLARE
  profiles_with_name INTEGER;
  profiles_without_name INTEGER;
  profiles_with_status INTEGER;
  profiles_without_status INTEGER;
BEGIN
  SELECT COUNT(*) INTO profiles_with_name 
  FROM profiles 
  WHERE full_name IS NOT NULL AND full_name != '' AND TRIM(full_name) != '';
  
  SELECT COUNT(*) INTO profiles_without_name 
  FROM profiles 
  WHERE full_name IS NULL OR full_name = '' OR TRIM(full_name) = '';
  
  SELECT COUNT(*) INTO profiles_with_status 
  FROM profiles 
  WHERE status IS NOT NULL;
  
  SELECT COUNT(*) INTO profiles_without_status 
  FROM profiles 
  WHERE status IS NULL;
  
  RAISE NOTICE '✅ Profiles with name: %', profiles_with_name;
  RAISE NOTICE '⚠️  Profiles without name: %', profiles_without_name;
  RAISE NOTICE '✅ Profiles with status: %', profiles_with_status;
  RAISE NOTICE '⚠️  Profiles without status: %', profiles_without_status;
END $$;

