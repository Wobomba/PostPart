-- Add remaining admin policies (check-ins and centers only)
-- Run this since you already have profiles, children, and organizations policies

-- ============================================
-- 1. CHECK-INS - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Parents can read own checkins" ON checkins;
DROP POLICY IF EXISTS "Users can read own checkins" ON checkins;
DROP POLICY IF EXISTS "Authenticated users can read all checkins" ON checkins;

CREATE POLICY "Authenticated users can read all checkins"
ON checkins
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 2. CENTERS - Allow reading all
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can read centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can read all centers" ON centers;

CREATE POLICY "Authenticated users can read all centers"
ON centers
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- VERIFICATION - Check what you have now
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

