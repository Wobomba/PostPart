-- =====================================================
-- FIX: Centers Table RLS Policies for Admin Updates
-- =====================================================
-- This script ensures admins can fully manage centers
-- including INSERT, UPDATE, and DELETE operations

-- First, drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can update own centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can read centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can read all centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can insert centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can update all centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can delete centers" ON centers;
DROP POLICY IF EXISTS "Public can read verified centers" ON centers;
DROP POLICY IF EXISTS "Public users can view verified centers" ON centers;
DROP POLICY IF EXISTS "Users can read all centers" ON centers;

-- Create comprehensive policies for authenticated users (admins)

-- 1. SELECT: Allow all authenticated users to read all centers
CREATE POLICY "Authenticated users can read all centers"
ON centers
FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT: Allow all authenticated users to create centers
CREATE POLICY "Authenticated users can insert centers"
ON centers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. UPDATE: Allow all authenticated users to update all centers
CREATE POLICY "Authenticated users can update all centers"
ON centers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. DELETE: Allow all authenticated users to delete centers
CREATE POLICY "Authenticated users can delete centers"
ON centers
FOR DELETE
TO authenticated
USING (true);

-- 5. Public read access for mobile app (verified centers only)
CREATE POLICY "Public can read verified centers"
ON centers
FOR SELECT
TO anon
USING (is_verified = true);

-- Add helpful comments
COMMENT ON POLICY "Authenticated users can read all centers" ON centers IS 'Admin dashboard can view all centers';
COMMENT ON POLICY "Authenticated users can insert centers" ON centers IS 'Admin dashboard can create centers';
COMMENT ON POLICY "Authenticated users can update all centers" ON centers IS 'Admin dashboard can update any center';
COMMENT ON POLICY "Authenticated users can delete centers" ON centers IS 'Admin dashboard can delete centers';
COMMENT ON POLICY "Public can read verified centers" ON centers IS 'Mobile app can only view verified centers';

-- Verify policies are active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'centers'
ORDER BY policyname;

