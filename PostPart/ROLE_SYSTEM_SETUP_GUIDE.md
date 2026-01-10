# 🚀 Role-Based Access Control System - Setup & Testing Guide

## ✅ What We've Built

A complete production-ready role-based access control (RBAC) system with:

1. **Database Layer**
   - `user_roles` table for role management
   - Helper functions (`is_admin()`, `is_parent()`, `get_user_role()`)
   - Updated RLS policies for all tables
   - Automatic role assignment trigger for new users

2. **Application Layer**
   - Type-safe role definitions
   - Role management utilities
   - Admin authentication middleware
   - Protected routes
   - Activity logging for all role changes

3. **User Interface**
   - User Management page
   - Create/Edit/Delete users
   - Assign and change roles
   - Search and filter functionality
   - Real-time updates
   - Unauthorized access page

---

## 📋 Setup Instructions

### Step 1: Run Database Setup Script

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/setup-admin-roles.sql`
4. Click **Run**
5. Verify you see success messages at the bottom

**Expected Output:**
```
✅ user_roles table created
✅ Helper functions created (is_admin, is_parent, get_user_role)
✅ RLS Policies updated for all tables
✅ Trigger created for auto-assigning parent role
```

### Step 2: Create Your First Admin Account

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Fill in:
   - Email: `admin@postpart.com` (or your preferred email)
   - Password: `[Strong password - save this!]`
   - ✅ Check "Email Confirm" (auto-confirms email)
4. Click **"Create user"**
5. Note the User ID that appears

#### Option B: Run SQL Script

1. First, create user via Dashboard (steps above)
2. Then run `supabase/create-first-admin.sql`
3. Update the email in the script before running:
   ```sql
   admin_email TEXT := 'admin@postpart.com'; -- Change this
   ```

### Step 3: Assign Admin Role

If you used Option A above, manually assign the admin role:

1. Go to **Table Editor** → **user_roles**
2. Click **"Insert"** → **"Insert row"**
3. Fill in:
   - user_id: `[UUID from step 2]`
   - role: `admin`
4. Click **"Save"**

Or run this SQL (replace the email):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@postpart.com';
```

### Step 4: Verify Setup

1. Open your admin dashboard: `http://localhost:3000`
2. Login with your admin credentials
3. You should see the new **"User Management"** menu item
4. Click on it to access the User Management page

---

## 🧪 Testing the Role System

### Test 1: Admin Access ✅

1. Login with your admin account
2. Verify you can access all pages:
   - Dashboard
   - Organisations
   - Parents
   - Centres
   - **User Management** (new!)
   - Activity Logs
   - Bulk Notifications

### Test 2: Create a New User

1. Go to **User Management**
2. Click **"Create User"**
3. Fill in:
   - Email: `testparent@example.com`
   - Password: `TestPassword123!`
   - Role: `Parent`
4. Click **"Create User"**
5. Verify the user appears in the table
6. Check **Activity Logs** - should show "New parent user created"

### Test 3: Parent Role Restriction

1. Open an **Incognito/Private browser window**
2. Go to `http://localhost:3000`
3. Login as the parent user you just created
4. You should be redirected to `/auth/unauthorized`
5. The page should show "Access Denied" with explanation

### Test 4: Change User Role

1. As admin, go to **User Management**
2. Find the test parent user
3. Click the **Edit** icon (pencil)
4. Change role to `Support`
5. Click **"Update Role"**
6. Verify the role chip updates in the table
7. Check **Activity Logs** - should show "User role changed"

### Test 5: Delete User

1. Go to **User Management**
2. Find a test user
3. Click the **Delete** icon (trash)
4. Confirm deletion in the dialog
5. Verify user disappears from the table
6. Check **Activity Logs** - should show "User account deleted"

### Test 6: Real-time Updates

1. Open **User Management** in two browser windows (both as admin)
2. In Window 1: Create a new user
3. In Window 2: The new user should appear automatically (no refresh needed)
4. Same should work for role changes and deletions

### Test 7: Search and Filter

1. Go to **User Management**
2. Test search:
   - Type part of an email in the search box
   - Verify only matching users show
3. Test filter:
   - Select "Administrator" from role filter
   - Verify only admins show
   - Try other roles

---

## 🔒 Security Verification

### Check 1: RLS Policies

Run this SQL to verify all policies are in place:

```sql
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see policies for:
- `user_roles` (2 policies)
- `organizations` (1 policy)
- `allocations` (1 policy)
- `activity_log` (2 policies)
- `notifications` (1 policy)
- `centers` (2 policies)
- `center_qr_codes` (2 policies)
- `profiles` (3 policies)
- `children` (2 policies)
- `checkins` (2 policies)
- `parent_notifications` (3 policies)

### Check 2: Helper Functions

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin', 'get_user_role', 'is_parent', 'assign_parent_role_on_signup');
```

Should return 4 functions.

### Check 3: Trigger

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created_assign_role';
```

Should show the trigger on `auth.users`.

---

## 📊 User Management Features

### Statistics Dashboard

The User Management page displays:
- Total Users count
- Admins count
- Parents count
- Support Staff count

### User Table Columns

- **Email** - User's email address with role icon
- **Role** - Color-coded chip showing current role
- **Created** - Account creation date
- **Last Sign In** - Most recent login time
- **Actions** - Edit role and delete user buttons

### Available Roles

| Role | Description | Color | Icon |
|------|-------------|-------|------|
| **Administrator** | Full system access | Pink | AdminPanelSettings |
| **Parent** | Mobile app users | Blue | Person |
| **Support** | Support staff (future use) | Orange | Support |

### Permissions Matrix

| Feature | Admin | Parent | Support |
|---------|-------|--------|---------|
| Admin Dashboard | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |
| Organisations | ✅ | ❌ | ❌ |
| Parents | ✅ | ❌ | ❌ |
| Centres (Admin) | ✅ | ❌ | ❌ |
| Activity Logs | ✅ | ❌ | ❌ |
| Bulk Notifications | ✅ | ❌ | ❌ |
| Mobile App | ✅ | ✅ | ❌ |
| View Verified Centres | ✅ | ✅ | ❌ |
| Check-in | ❌ | ✅ | ❌ |

---

## 🚨 Common Issues & Solutions

### Issue 1: Can't Login After Setup

**Symptom:** Get redirected to unauthorized page after login

**Solution:**
1. Check that admin role was assigned correctly:
   ```sql
   SELECT u.email, ur.role
   FROM auth.users u
   LEFT JOIN public.user_roles ur ON u.id = ur.user_id
   WHERE u.email = 'admin@postpart.com';
   ```
2. If no role, manually assign it (see Step 3 above)

### Issue 2: User Management Page Not Showing

**Symptom:** Don't see "User Management" in sidebar

**Solution:**
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Restart development server

### Issue 3: Can't Create Users

**Symptom:** Error when trying to create new users

**Solution:**
1. Check that you have the service role key configured
2. Verify `user_roles` table exists
3. Check browser console for specific error message

### Issue 4: RLS Blocking Admin Access

**Symptom:** Can't see data in tables despite being admin

**Solution:**
1. Run the RLS policy update script again
2. Force schema reload:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. Wait 5-10 seconds for PostgREST to reload

### Issue 5: New Users Auto-Getting Parent Role

**Symptom:** Want to prevent auto-assignment of parent role

**Solution:**
This is by design (users signing up via mobile app should be parents).
To disable:
```sql
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
```

---

## 🎯 Next Steps

### Immediate
- ✅ Create your admin account
- ✅ Test all functionality
- ✅ Create a few test users
- ✅ Verify role restrictions work

### Before Production
- [ ] Create backup admin account
- [ ] Enable 2FA on admin emails
- [ ] Document admin credentials securely
- [ ] Set up monitoring/alerts
- [ ] Review all RLS policies
- [ ] Test edge cases (last admin deletion, etc.)

### Future Enhancements
- [ ] Add "Support" role functionality
- [ ] Implement role hierarchy
- [ ] Add bulk role changes
- [ ] Add user suspension (vs deletion)
- [ ] Add admin activity reports
- [ ] Add email notifications for role changes

---

## 📞 Support

If you encounter issues:

1. **Check Activity Logs** - Often shows what went wrong
2. **Supabase Logs** - Dashboard → Logs → Database
3. **Browser Console** - Check for JavaScript errors
4. **Network Tab** - Check for failed API requests

---

## 🔐 Security Best Practices

1. **Strong Passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Use a password manager

2. **Admin Accounts**
   - Create separate accounts for each admin
   - Never share admin credentials
   - Rotate passwords regularly

3. **Monitoring**
   - Review Activity Logs regularly
   - Watch for suspicious role changes
   - Alert on new admin creations

4. **Backup**
   - Always maintain at least 2 admin accounts
   - Document recovery procedures
   - Test recovery process

---

**Setup Date:** 2025-01-02  
**Version:** 1.0  
**Status:** Production-Ready ✅

---

## ✅ Setup Checklist

Copy this checklist and mark off as you complete each step:

```
□ Ran setup-admin-roles.sql successfully
□ Created first admin user in Supabase Dashboard
□ Assigned admin role to user
□ Logged in to admin dashboard
□ Verified User Management page is accessible
□ Created a test parent user
□ Tested that parent user cannot access admin dashboard
□ Tested role change functionality
□ Tested user deletion
□ Verified real-time updates work
□ Checked Activity Logs for all actions
□ Reviewed RLS policies
□ Created backup admin account
□ Documented admin credentials securely
□ Read security best practices
```

Once all items are checked, your role-based access control system is ready for production! 🎉


