-- ============================================================
-- VERIFY AND FIX ADMIN ROLE ASSIGNMENT
-- ============================================================
-- This script helps verify if a user has admin role and fixes it if needed
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Check if user_roles table exists and has data
SELECT 
  'user_roles table check' as check_type,
  COUNT(*) as total_roles,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
  COUNT(CASE WHEN role = 'parent' THEN 1 END) as parent_count,
  COUNT(CASE WHEN role = 'support' THEN 1 END) as support_count
FROM public.user_roles;

-- Step 2: List all users with their roles
SELECT 
  au.email,
  au.id as user_id,
  ur.role,
  ur.created_at as role_created_at
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
ORDER BY au.created_at DESC;

-- Step 3: Find the user you want to make admin (replace email)
-- Replace 'admin@postpart.com' with your actual admin email
DO $$
DECLARE
  target_email TEXT := 'admin@postpart.com';
  target_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found!', target_email;
  ELSE
    RAISE NOTICE 'Found user: % (ID: %)', target_email, target_user_id;
    
    -- Check if role exists
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id) THEN
      -- Update existing role to admin
      UPDATE public.user_roles
      SET role = 'admin', updated_at = NOW()
      WHERE user_id = target_user_id;
      RAISE NOTICE 'Updated existing role to admin for user: %', target_email;
    ELSE
      -- Insert new admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (target_user_id, 'admin')
      ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();
      RAISE NOTICE 'Assigned admin role to user: %', target_email;
    END IF;
  END IF;
END $$;

-- Step 4: Verify the admin role was assigned
SELECT 
  au.email,
  ur.role,
  ur.created_at,
  ur.updated_at
FROM auth.users au
JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

