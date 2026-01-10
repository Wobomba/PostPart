# Admin Account Setup Guide

## 🚨 Current Situation

Your application currently **lacks proper role-based access control**. Any authenticated user can potentially access admin functions if they know the dashboard URL. This needs to be addressed for production!

---

## 📋 Quick Setup (Current Basic Approach)

### Method 1: Via Supabase Dashboard (Recommended for Now)

1. **Go to Supabase Dashboard**
   - Navigate to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`
   - Click on **Authentication** → **Users**

2. **Create Admin User**
   - Click **"Add User"** → **"Create new user"**
   - Choose **Email** authentication
   - Enter admin credentials:
     ```
     Email: admin@postpart.com
     Password: [Strong password - at least 12 characters]
     ```
   - ✅ Check **"Email Confirm"** (auto-confirm)
   - Click **"Create user"**

3. **Login to Admin Dashboard**
   - Go to: `http://localhost:3000` (or your deployed URL)
   - Login with the credentials you just created

### Method 2: Via SQL (For Multiple Admins)

Run this in Supabase SQL Editor:

```sql
-- Create admin user
SELECT auth.create_user(
  '{
    "email": "admin@postpart.com",
    "password": "YourSecurePassword123!",
    "email_confirm": true
  }'::jsonb
);

-- Note the returned user ID, you'll need it if implementing roles
```

---

## 🔒 Recommended Production Setup (With Role-Based Access Control)

### Step 1: Add User Roles to Database

Create a new table for user roles:

```sql
-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'parent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Policy: Users can read their own role
CREATE POLICY "Users can read their own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Only admins can insert/update/delete roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user role
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
```

### Step 2: Create First Admin Account

```sql
-- Create admin user in auth.users
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create the auth user
  new_user_id := (
    SELECT id FROM auth.users 
    WHERE email = 'admin@postpart.com'
  );
  
  -- If user doesn't exist, you need to create via Dashboard or auth.create_user
  -- Then assign admin role
  IF new_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Admin role assigned to user: %', new_user_id;
  ELSE
    RAISE NOTICE 'User not found. Create user first via Supabase Dashboard';
  END IF;
END $$;
```

### Step 3: Update RLS Policies

Update all admin table policies to check for admin role:

```sql
-- Example: Update organizations table policy
DROP POLICY IF EXISTS "Admins can manage all organizations" ON public.organizations;

CREATE POLICY "Admins can manage all organizations"
  ON public.organizations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Repeat for other admin tables:
-- - allocations
-- - activity_log
-- - notifications
-- - etc.
```

### Step 4: Update Admin Dashboard Code

Add role check to the dashboard layout:

```typescript
// admin/src/components/DashboardLayout.tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

// Add this check in your layout or protected route
useEffect(() => {
  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      // Not an admin - redirect or show error
      alert('Access denied. Admin privileges required.');
      await supabase.auth.signOut();
      router.push('/auth/login');
    }
  };

  checkAdminAccess();
}, [router]);
```

---

## 🎯 Best Practices

### 1. **Strong Passwords**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Use a password manager
- Example: `Adm!n2024#PostPart$Secure`

### 2. **Email Best Practices**
- Use a dedicated admin email (not personal)
- Consider: `admin@postpart.com` or `dashboard@postpart.com`
- Enable 2FA on the email account

### 3. **Multiple Admins**
Create separate accounts for each admin user:
```sql
-- Admin 1 (Super Admin)
-- Email: admin@postpart.com

-- Admin 2 (Operations)
-- Email: ops@postpart.com

-- Admin 3 (Support)
-- Email: support@postpart.com
```

### 4. **Role Hierarchy** (Future Enhancement)
Consider implementing different admin levels:
- `super_admin` - Full access
- `admin` - Standard access
- `support` - Read-only + notifications
- `parent` - Mobile app users

### 5. **Security Enhancements**
- ✅ Enable email confirmation
- ✅ Implement password reset flow
- ✅ Add session timeout (auto-logout after 1 hour of inactivity)
- ✅ Log all admin actions (already implemented via activity_log)
- ✅ Enable 2FA (Supabase supports this)
- ✅ IP whitelist for production (optional)

---

## 🔧 Quick Admin Creation Script

Save this as `supabase/create-admin.sql`:

```sql
-- ============================================================
-- CREATE ADMIN ACCOUNT
-- ============================================================
-- Instructions:
-- 1. Replace EMAIL and PASSWORD with your admin credentials
-- 2. Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  admin_email TEXT := 'admin@postpart.com'; -- CHANGE THIS
  admin_user_id UUID;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found. Create user in Supabase Dashboard first.', admin_email;
  END IF;

  -- Assign admin role (only if user_roles table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin', updated_at = NOW();
    
    RAISE NOTICE 'Admin role assigned to: % (ID: %)', admin_email, admin_user_id;
  ELSE
    RAISE NOTICE 'user_roles table does not exist. Run role setup SQL first.';
  END IF;
END $$;
```

---

## ⚠️ Current Security Gaps

1. **No Role Enforcement** - Any authenticated user can access admin dashboard
2. **No Admin Verification** - RLS policies allow all authenticated users
3. **No Session Management** - No auto-logout or session expiry
4. **No Audit Trail for Admin Creation** - Should log when admins are created

---

## 🚀 Recommended Action Plan

### Phase 1: Immediate (This Week)
1. ✅ Create admin account via Supabase Dashboard
2. ✅ Use strong password
3. ✅ Document admin credentials securely

### Phase 2: Short-term (Next Week)
1. 📋 Implement `user_roles` table
2. 📋 Add role-based RLS policies
3. 📋 Add admin role check to dashboard

### Phase 3: Medium-term (Before Production)
1. 📋 Implement 2FA
2. 📋 Add session timeout
3. 📋 Add IP whitelist (optional)
4. 📋 Create admin user management page

---

## 📞 Need Help?

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Database
2. Verify RLS policies: Table Editor → Select table → RLS tab
3. Check user exists: Authentication → Users

---

## 🔐 Security Checklist

Before going to production:

- [ ] Admin accounts created with strong passwords
- [ ] Role-based access control implemented
- [ ] RLS policies enforce admin-only access
- [ ] 2FA enabled for admin accounts
- [ ] Session timeout configured
- [ ] Admin activity logging enabled (✅ Already done)
- [ ] Admin credentials stored securely (password manager)
- [ ] Regular security audits scheduled
- [ ] Backup admin account created (in case primary is locked out)

---

**Last Updated:** 2025-01-02  
**Status:** Basic auth in place, Role-based access control recommended


