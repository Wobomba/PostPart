-- ============================================================
-- CREATE FIRST ADMIN ACCOUNT
-- ============================================================
-- This script assigns the admin role to an existing user
-- 
-- PREREQUISITES:
-- 1. Run setup-admin-roles.sql first
-- 2. Create user in Supabase Dashboard:
--    - Go to Authentication > Users
--    - Click "Add User" > "Create new user"
--    - Use email: admin@postpart.com (or your preferred email)
--    - Use a strong password
--    - Check "Email Confirm" to auto-confirm
-- 
-- INSTRUCTIONS:
-- 1. Replace 'admin@postpart.com' with your admin email
-- 2. Run this script in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  admin_email TEXT := 'admin@postpart.com'; -- ⚠️ CHANGE THIS to your admin email
  admin_user_id UUID;
  existing_role TEXT;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  -- Check if user exists
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION '❌ User with email "%" not found!', admin_email;
    RAISE NOTICE '';
    RAISE NOTICE '📋 To create the admin user:';
    RAISE NOTICE '1. Go to Supabase Dashboard';
    RAISE NOTICE '2. Navigate to Authentication > Users';
    RAISE NOTICE '3. Click "Add User" > "Create new user"';
    RAISE NOTICE '4. Enter email: %', admin_email;
    RAISE NOTICE '5. Enter a strong password';
    RAISE NOTICE '6. Check "Email Confirm" box';
    RAISE NOTICE '7. Click "Create user"';
    RAISE NOTICE '8. Run this script again';
    RETURN;
  END IF;

  -- Check if user_roles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    RAISE EXCEPTION '❌ user_roles table does not exist!';
    RAISE NOTICE 'Run setup-admin-roles.sql first to create the user_roles table.';
    RETURN;
  END IF;

  -- Check if user already has a role
  SELECT role INTO existing_role
  FROM public.user_roles
  WHERE user_id = admin_user_id;

  -- Assign admin role
  IF existing_role IS NOT NULL THEN
    -- Update existing role
    UPDATE public.user_roles
    SET role = 'admin',
        updated_at = NOW()
    WHERE user_id = admin_user_id;
    
    RAISE NOTICE '✅ Role updated from "%" to "admin" for user: %', existing_role, admin_email;
  ELSE
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin');
    
    RAISE NOTICE '✅ Admin role assigned to user: %', admin_email;
  END IF;

  -- Display user details
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 ADMIN ACCOUNT DETAILS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Email:    %', admin_email;
  RAISE NOTICE 'User ID:  %', admin_user_id;
  RAISE NOTICE 'Role:     admin';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 You can now login to the admin dashboard!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '1. Go to: http://localhost:3000 (or your admin dashboard URL)';
  RAISE NOTICE '2. Login with:';
  RAISE NOTICE '   - Email: %', admin_email;
  RAISE NOTICE '   - Password: [the password you set in Supabase]';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Reminder:';
  RAISE NOTICE '- Use a strong password (12+ characters)';
  RAISE NOTICE '- Enable 2FA on your email account';
  RAISE NOTICE '- Never share admin credentials';
  RAISE NOTICE '- Store credentials in a password manager';

END $$;

-- Verify the admin role was assigned
SELECT 
  u.email,
  u.id AS user_id,
  ur.role,
  ur.created_at,
  ur.updated_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;


