-- Update RLS policies to enforce parent status checks
-- This ensures only active parents can use the service

-- ============================================
-- 1. DROP OLD CHECK-INS POLICY (if exists)
-- ============================================
DROP POLICY IF EXISTS "Parents can create check-ins" ON checkins;
DROP POLICY IF EXISTS "Users can insert own checkins" ON checkins;
DROP POLICY IF EXISTS "Parents can insert checkins" ON checkins;

-- ============================================
-- 2. CREATE NEW CHECK-INS INSERT POLICY
-- ============================================
-- Only ACTIVE parents can create check-ins
CREATE POLICY "Active parents can create check-ins"
ON checkins
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = parent_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.status = 'active'
  )
);

-- ============================================
-- 3. UPDATE PROFILES READ POLICY (if needed)
-- ============================================
-- Parents can only read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- ============================================
-- 4. UPDATE CHILDREN POLICIES
-- ============================================
-- Only active parents can add children
DROP POLICY IF EXISTS "Parents can insert own children" ON children;
DROP POLICY IF EXISTS "Users can insert own children" ON children;

CREATE POLICY "Active parents can insert children"
ON children
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = parent_id
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.status = 'active'
  )
);

-- Parents can update their own children (regardless of status - for emergencies)
DROP POLICY IF EXISTS "Parents can update own children" ON children;
DROP POLICY IF EXISTS "Users can update own children" ON children;

CREATE POLICY "Parents can update own children"
ON children
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- ============================================
-- 5. ENSURE SELECT POLICIES EXIST
-- ============================================

-- Parents can read their own children
DROP POLICY IF EXISTS "Parents can read own children" ON children;
DROP POLICY IF EXISTS "Users can read own children" ON children;

CREATE POLICY "Parents can read own children"
ON children
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Parents can read their own check-ins
DROP POLICY IF EXISTS "Parents can read own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can read own checkins" ON checkins;

CREATE POLICY "Parents can read own checkins"
ON checkins
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- ============================================
-- 6. CENTERS ARE READABLE BY ALL AUTHENTICATED USERS
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read centers" ON centers;

CREATE POLICY "Authenticated users can read centers"
ON centers
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check all policies on checkins table
-- SELECT * FROM pg_policies WHERE tablename = 'checkins';

-- Check all policies on children table
-- SELECT * FROM pg_policies WHERE tablename = 'children';

-- Check all policies on profiles table
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Test: Try to get parent status
-- SELECT id, email, full_name, status FROM profiles WHERE id = auth.uid();

