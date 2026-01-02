-- Fix Row Level Security Policies for PostPart
-- Run this in Supabase SQL Editor to fix 400 errors

-- ========================================
-- 1. PROFILES TABLE POLICIES
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Enable RLS (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 2. CHILDREN TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Parents can view own children" ON children;
DROP POLICY IF EXISTS "Parents can insert own children" ON children;
DROP POLICY IF EXISTS "Parents can update own children" ON children;
DROP POLICY IF EXISTS "Parents can delete own children" ON children;

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

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

-- ========================================
-- 3. CENTERS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Anyone can view active centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can view all centers" ON centers;

ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all centers
CREATE POLICY "Authenticated users can view all centers"
  ON centers FOR SELECT
  USING (auth.role() = 'authenticated');

-- ========================================
-- 4. CHECKINS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Parents can view own checkins" ON checkins;
DROP POLICY IF EXISTS "Parents can create own checkins" ON checkins;

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- ========================================
-- 5. NOTIFICATIONS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can view notifications" ON notifications;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view notifications
CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR SELECT
  USING (auth.role() = 'authenticated');

-- ========================================
-- 6. PARENT_NOTIFICATIONS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Parents can view own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Parents can update own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Parents can insert own notifications" ON parent_notifications;

ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own notifications"
  ON parent_notifications FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update own notifications"
  ON parent_notifications FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own notifications"
  ON parent_notifications FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- ========================================
-- 7. ORGANIZATIONS TABLE POLICIES (Admin only)
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- For now, allow authenticated users to view
-- Later, restrict to admins only
CREATE POLICY "Authenticated users can view organizations"
  ON organizations FOR SELECT
  USING (auth.role() = 'authenticated');

-- ========================================
-- 8. ALLOCATIONS TABLE POLICIES
-- ========================================

DROP POLICY IF EXISTS "Authenticated users can view allocations" ON allocations;

ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view allocations"
  ON allocations FOR SELECT
  USING (auth.role() = 'authenticated');

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies updated successfully!';
  RAISE NOTICE 'All tables now have proper Row Level Security.';
  RAISE NOTICE 'Refresh your app to see the changes.';
END $$;

