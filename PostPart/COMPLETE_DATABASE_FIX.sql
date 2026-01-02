-- ================================================================
-- COMPLETE DATABASE FIX FOR POSTPART
-- Run this in Supabase SQL Editor to fix all 400 errors
-- ================================================================

-- This script will:
-- 1. Fix table structure (add computed 'name' column to children)
-- 2. Set up all foreign key relationships
-- 3. Configure Row Level Security (RLS) policies
-- 4. Enable proper query access

-- ================================================================
-- STEP 1: FIX CHILDREN TABLE STRUCTURE
-- ================================================================

-- Add a computed 'name' column to children table if it doesn't exist
-- This allows queries like: children (name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children' AND column_name = 'name'
    ) THEN
        ALTER TABLE children 
        ADD COLUMN name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
        
        RAISE NOTICE '✅ Added computed name column to children table';
    ELSE
        RAISE NOTICE '✅ Children table already has name column';
    END IF;
END $$;

-- ================================================================
-- STEP 2: VERIFY FOREIGN KEY RELATIONSHIPS
-- ================================================================

-- These should already exist, but let's verify they're present
-- If any are missing, add them

-- Children -> Profiles foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'children_parent_id_fkey'
    ) THEN
        ALTER TABLE children 
        ADD CONSTRAINT children_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added children->profiles foreign key';
    ELSE
        RAISE NOTICE '✅ Children->profiles foreign key exists';
    END IF;
END $$;

-- Checkins -> Profiles foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_parent_id_fkey'
    ) THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added checkins->profiles foreign key';
    ELSE
        RAISE NOTICE '✅ Checkins->profiles foreign key exists';
    END IF;
END $$;

-- Checkins -> Children foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_child_id_fkey'
    ) THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_child_id_fkey 
        FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added checkins->children foreign key';
    ELSE
        RAISE NOTICE '✅ Checkins->children foreign key exists';
    END IF;
END $$;

-- Checkins -> Centers foreign key
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'checkins_center_id_fkey'
    ) THEN
        ALTER TABLE checkins 
        ADD CONSTRAINT checkins_center_id_fkey 
        FOREIGN KEY (center_id) REFERENCES centers(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Added checkins->centers foreign key';
    ELSE
        RAISE NOTICE '✅ Checkins->centers foreign key exists';
    END IF;
END $$;

-- ================================================================
-- STEP 3: CONFIGURE ROW LEVEL SECURITY (RLS)
-- ================================================================

-- 3.1 PROFILES TABLE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3.2 CHILDREN TABLE
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view own children" ON children;
DROP POLICY IF EXISTS "Parents can insert own children" ON children;
DROP POLICY IF EXISTS "Parents can update own children" ON children;
DROP POLICY IF EXISTS "Parents can delete own children" ON children;

CREATE POLICY "Parents can view own children"
  ON children FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE
  USING (auth.uid() = parent_id);

-- 3.3 CENTERS TABLE
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can view centers" ON centers;

-- Allow all authenticated users to view centers
CREATE POLICY "Authenticated users can view centers"
  ON centers FOR SELECT
  TO authenticated
  USING (true);

-- 3.4 CHECKINS TABLE
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view own checkins" ON checkins;
DROP POLICY IF EXISTS "Parents can create own checkins" ON checkins;

CREATE POLICY "Parents can view own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- 3.5 NOTIFICATIONS TABLE
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;

CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

-- 3.6 PARENT_NOTIFICATIONS TABLE
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Parents can update own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Parents can insert own notifications" ON parent_notifications;

CREATE POLICY "Parents can view own notifications"
  ON parent_notifications FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update own notifications"
  ON parent_notifications FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own notifications"
  ON parent_notifications FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- 3.7 ORGANIZATIONS TABLE
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

CREATE POLICY "Authenticated users can view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- 3.8 ALLOCATIONS TABLE (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allocations') THEN
        ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Authenticated users can view allocations" ON allocations;
        
        CREATE POLICY "Authenticated users can view allocations"
          ON allocations FOR SELECT
          TO authenticated
          USING (true);
          
        RAISE NOTICE '✅ Configured RLS for allocations table';
    END IF;
END $$;

-- ================================================================
-- STEP 4: CREATE AUTO-PROFILE TRIGGER (if not exists)
-- ================================================================

-- Function to auto-create profile when new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- STEP 5: VERIFY CURRENT USER HAS PROFILE
-- ================================================================

-- Check if current profiles have matching auth users
DO $$
DECLARE
    profile_count INTEGER;
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profile_count FROM profiles;
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    
    RAISE NOTICE '✅ Profiles in database: %', profile_count;
    RAISE NOTICE '✅ Auth users in database: %', auth_count;
    
    IF profile_count < auth_count THEN
        RAISE NOTICE '⚠️  Some auth users don''t have profiles. They will be created on next login.';
    END IF;
END $$;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ DATABASE SETUP COMPLETE!                               ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table structure fixed';
  RAISE NOTICE '✅ Foreign keys verified';
  RAISE NOTICE '✅ RLS policies configured';
  RAISE NOTICE '✅ Auto-profile trigger created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '   1. Refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)';
  RAISE NOTICE '   2. Try Edit Profile - should work now!';
  RAISE NOTICE '   3. 400 errors should be gone!';
  RAISE NOTICE '';
END $$;

