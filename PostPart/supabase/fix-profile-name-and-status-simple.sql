-- ============================================
-- Fix Profile Name and Status Issues (Simplified)
-- ============================================
-- Run each section separately if you get EXPLAIN errors
-- Click "Run" button (green), NOT "Explain" tablets 

-- ============================================
-- SECTION 1: Create Helper Function
-- ============================================
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

-- ============================================
-- SECTION 2: Update Profiles with Empty Names
-- ============================================
UPDATE public.profiles p
SET 
  full_name = COALESCE(
    NULLIF(p.full_name, ''),
    NULLIF((get_auth_metadata(p.id)->>'full_name'), ''),
    NULLIF((get_auth_metadata(p.id)->>'name'), ''),
    ''
  ),
  updated_at = NOW()
WHERE 
  p.full_name IS NULL 
  OR p.full_name = ''
  OR TRIM(p.full_name) = '';

-- ============================================
-- SECTION 3: Update Profiles with Null Status
-- ============================================
UPDATE public.profiles
SET 
  status = 'active',
  updated_at = NOW()
WHERE 
  status IS NULL
  AND organization_id IS NOT NULL;

-- ============================================
-- SECTION 4: Improve Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    'inactive'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(EXCLUDED.full_name, ''),
      profiles.full_name
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 5: Create Sync Function
-- ============================================
CREATE OR REPLACE FUNCTION sync_auth_metadata_to_profiles()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
  auth_meta JSONB;
  auth_email TEXT;
  auth_name TEXT;
BEGIN
  FOR profile_record IN 
    SELECT id FROM public.profiles 
    WHERE full_name IS NULL 
       OR full_name = '' 
       OR TRIM(full_name) = ''
  LOOP
    SELECT raw_user_meta_data, email 
    INTO auth_meta, auth_email
    FROM auth.users
    WHERE id = profile_record.id;
    
    IF auth_meta IS NOT NULL THEN
      auth_name := COALESCE(
        NULLIF(auth_meta->>'full_name', ''),
        NULLIF(auth_meta->>'name', '')
      );
    END IF;
    
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

-- ============================================
-- SECTION 6: Run Sync Function
-- ============================================
SELECT sync_auth_metadata_to_profiles();

-- ============================================
-- SECTION 7: Check Results
-- ============================================
SELECT 
  COUNT(*) FILTER (WHERE full_name IS NOT NULL AND full_name != '' AND TRIM(full_name) != '') as profiles_with_name,
  COUNT(*) FILTER (WHERE full_name IS NULL OR full_name = '' OR TRIM(full_name) = '') as profiles_without_name,
  COUNT(*) FILTER (WHERE status IS NOT NULL) as profiles_with_status,
  COUNT(*) FILTER (WHERE status IS NULL) as profiles_without_status
FROM profiles;

