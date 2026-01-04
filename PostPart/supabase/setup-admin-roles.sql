-- ============================================================
-- ADMIN ROLE-BASED ACCESS CONTROL SETUP
-- ============================================================
-- This script creates a proper role-based access control system
-- to distinguish between admin users and parent users
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create user_roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'parent', 'support')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add comment
COMMENT ON TABLE public.user_roles IS 'Stores user roles for role-based access control. Each user can have one role: admin, parent, or support.';

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 2: Create Helper Functions FIRST (before policies that use them)
-- ============================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin IS 'Returns true if the current user has admin role';

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role IS 'Returns the role of the current authenticated user';

-- Function to check if user is parent
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'parent'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_parent IS 'Returns true if the current user has parent role';

-- Step 3: Create RLS Policies for user_roles
-- ============================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Policy: Users can read their own role
CREATE POLICY "Users can read their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

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

-- Step 4: Update RLS Policies for Admin Tables
-- ============================================================
-- Update policies to use the new is_admin() function

-- Organizations table
DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can manage organizations" ON public.organizations;

CREATE POLICY "Admins can manage all organizations"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Allocations table
DROP POLICY IF EXISTS "Admins can manage all allocations" ON public.allocations;
DROP POLICY IF EXISTS "Authenticated users can manage allocations" ON public.allocations;

CREATE POLICY "Admins can manage all allocations"
  ON public.allocations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Activity log table
DROP POLICY IF EXISTS "Admins can manage activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can read activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Authenticated users can read activity logs" ON public.activity_log;

CREATE POLICY "Admins can read activity logs"
  ON public.activity_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert activity logs"
  ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Notifications table (admin notifications)
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.notifications;

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Centers table - Admins can manage, parents can read verified centers
DROP POLICY IF EXISTS "Admins can manage all centers" ON public.centers;
DROP POLICY IF EXISTS "Parents can read verified centers" ON public.centers;
DROP POLICY IF EXISTS "Authenticated users can manage centers" ON public.centers;

CREATE POLICY "Admins can manage all centers"
  ON public.centers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Parents can read verified centers"
  ON public.centers
  FOR SELECT
  TO authenticated
  USING (public.is_parent() AND is_verified = true);

-- Center QR Codes - Admins can manage, parents can read active codes
DROP POLICY IF EXISTS "Admins can manage QR codes" ON public.center_qr_codes;
DROP POLICY IF EXISTS "Admins can manage all QR codes" ON public.center_qr_codes;
DROP POLICY IF EXISTS "Parents can read active QR codes" ON public.center_qr_codes;

CREATE POLICY "Admins can manage all QR codes"
  ON public.center_qr_codes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Parents can read active QR codes"
  ON public.center_qr_codes
  FOR SELECT
  TO authenticated
  USING (public.is_parent() AND is_active = true);

-- Profiles table - Admins can manage all, parents can manage own
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can update own profile" ON public.profiles;

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Parents can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_parent() AND auth.uid() = id);

CREATE POLICY "Parents can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_parent() AND auth.uid() = id)
  WITH CHECK (public.is_parent() AND auth.uid() = id);

-- Children table - Admins can read all, parents can manage own
DROP POLICY IF EXISTS "Admins can read all children" ON public.children;
DROP POLICY IF EXISTS "Parents can manage own children" ON public.children;

CREATE POLICY "Admins can read all children"
  ON public.children
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Parents can manage own children"
  ON public.children
  FOR ALL
  TO authenticated
  USING (public.is_parent() AND auth.uid() = parent_id)
  WITH CHECK (public.is_parent() AND auth.uid() = parent_id);

-- Checkins table - Admins can read all, parents can manage own
DROP POLICY IF EXISTS "Admins can read all checkins" ON public.checkins;
DROP POLICY IF EXISTS "Parents can manage own checkins" ON public.checkins;
DROP POLICY IF EXISTS "Parents can create own checkins" ON public.checkins;

CREATE POLICY "Admins can read all checkins"
  ON public.checkins
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Parents can create own checkins"
  ON public.checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_parent() 
    AND auth.uid() = parent_id
    AND (SELECT status FROM public.profiles WHERE id = auth.uid()) = 'active'
  );

-- Parent notifications - Parents can read/update own, admins can manage all
DROP POLICY IF EXISTS "Admins can manage all parent notifications" ON public.parent_notifications;
DROP POLICY IF EXISTS "Parents can read own notifications" ON public.parent_notifications;
DROP POLICY IF EXISTS "Parents can update own notifications" ON public.parent_notifications;

CREATE POLICY "Admins can manage all parent notifications"
  ON public.parent_notifications
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Parents can read own notifications"
  ON public.parent_notifications
  FOR SELECT
  TO authenticated
  USING (public.is_parent() AND auth.uid() = parent_id);

CREATE POLICY "Parents can update own notifications"
  ON public.parent_notifications
  FOR UPDATE
  TO authenticated
  USING (public.is_parent() AND auth.uid() = parent_id)
  WITH CHECK (public.is_parent() AND auth.uid() = parent_id);

-- Step 6: Create Trigger to Auto-Assign Parent Role on Sign Up
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_parent_role_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign 'parent' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_parent_role_on_signup();

COMMENT ON FUNCTION public.assign_parent_role_on_signup IS 'Automatically assigns parent role to new users upon sign up';

-- Step 7: Verification and Summary
-- ============================================================

-- Check user_roles table
SELECT 'user_roles table created' AS status, COUNT(*) AS row_count FROM public.user_roles;

-- Check policies
SELECT 
  'RLS Policies' AS type,
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT 
  'Helper Functions' AS type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'get_user_role', 'is_parent', 'assign_parent_role_on_signup');

-- Display summary
SELECT '✅ Admin role-based access control setup complete!' AS status;
SELECT '📋 Next steps:' AS info;
SELECT '1. Create admin user in Supabase Dashboard (Authentication > Users)' AS step_1;
SELECT '2. Run create-first-admin.sql to assign admin role' AS step_2;
SELECT '3. Test login with admin credentials' AS step_3;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';


