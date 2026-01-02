-- COMPREHENSIVE FIX: Admin Dashboard RLS Policies
-- Run this to enable full admin functionality

-- ============================================
-- 1. PROFILES (Parents) - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Parents can read own profile" ON profiles;

CREATE POLICY "Authenticated users can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 2. CHILDREN - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Parents can read own children" ON children;
DROP POLICY IF EXISTS "Users can read own children" ON children;

CREATE POLICY "Authenticated users can read all children"
ON children
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 3. ORGANIZATIONS - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Public can read active organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON organizations;

CREATE POLICY "Authenticated users can read all organizations"
ON organizations
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 4. CHECK-INS - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Parents can read own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can read own checkins" ON checkins;

CREATE POLICY "Authenticated users can read all checkins"
ON checkins
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 5. CENTERS - Already public, but ensure it
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read centers" ON centers;

CREATE POLICY "Authenticated users can read all centers"
ON centers
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION - Check all policies created
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('profiles', 'children', 'organizations', 'checkins', 'centers')
  AND cmd = 'SELECT'
ORDER BY tablename, policyname;

