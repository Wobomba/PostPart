-- ============================================================
-- FIX INFINITE RECURSION IN user_roles RLS POLICIES
-- ============================================================
-- This script fixes the infinite recursion issue in the user_roles table
-- by using the is_admin() function instead of directly querying user_roles
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Ensure is_admin() function exists (create if it doesn't)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop the problematic policy and any existing policies we'll recreate
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Step 3: Create separate policies for INSERT, UPDATE, and DELETE
-- (SELECT is already handled by "Users can read their own role" policy)

-- Policy: Only admins can insert roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy: Only admins can update roles
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Step 4: Verify the policies
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
WHERE tablename = 'user_roles'
ORDER BY policyname;

