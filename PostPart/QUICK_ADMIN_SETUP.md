# 🚀 Quick Admin Setup Guide

## Option 1: Basic Setup (5 minutes) ⚡

**Use this for development/testing**

### Step 1: Create Admin User in Supabase
1. Go to: https://supabase.com/dashboard
2. Select your PostPart project
3. Click **Authentication** → **Users**
4. Click **"Add User"** button
5. Fill in:
   ```
   Email: admin@postpart.com
   Password: [Strong password - save this!]
   ☑️ Auto Confirm Email
   ```
6. Click **"Create user"**

### Step 2: Login to Dashboard
1. Go to: `http://localhost:3000`
2. Login with your admin credentials
3. ✅ Done!

---

## Option 2: Production Setup (30 minutes) 🔒

**Use this for production/live deployment**

### Step 1: Setup Role-Based Access Control
```bash
# Run in Supabase SQL Editor
# File: supabase/setup-admin-roles.sql
```

This creates:
- `user_roles` table
- Admin/parent role system
- Helper functions (`is_admin()`, `is_parent()`)
- Updated RLS policies

### Step 2: Create Admin User
1. Create user in Supabase Dashboard (same as Option 1)
2. Run this script:
   ```bash
   # File: supabase/create-first-admin.sql
   # Remember to change the email in the script!
   ```

### Step 3: Test Access
1. Login to admin dashboard
2. Verify you can access all features
3. Create a test parent account
4. Verify parents cannot access admin features

---

## 📋 Admin Credentials Template

Save this in your password manager:

```
System: PostPart Admin Dashboard
URL: http://localhost:3000 (or your deployed URL)
Email: admin@postpart.com
Password: [Your secure password]
Role: admin
Created: 2025-01-02
Notes: Main admin account for PostPart daycare management system
```

---

## 🔐 Security Checklist

Before Production:
- [ ] Used strong password (12+ characters, mixed case, numbers, symbols)
- [ ] Saved credentials in password manager
- [ ] Tested login works
- [ ] Enabled 2FA on admin email account
- [ ] Created backup admin account
- [ ] Documented admin access procedures
- [ ] Reviewed all RLS policies
- [ ] Tested that parents cannot access admin features

---

## 🆘 Troubleshooting

### Can't login?
- Check email is correct (case sensitive)
- Check password (no spaces)
- Verify user exists in Supabase Dashboard
- Clear browser cache and try again

### Getting "Access Denied"?
- Check user has admin role in `user_roles` table
- Run `create-first-admin.sql` again
- Check RLS policies are enabled

### Tables not showing data?
- Check RLS policies allow admin access
- Run `setup-admin-roles.sql` if not done yet
- Verify you're logged in

---

## 📞 Quick Reference

### Create Additional Admins
1. Create user in Supabase Dashboard
2. Run this SQL (replace email):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'new-admin@postpart.com';
```

### Change User Role
```sql
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

### Check All Admins
```sql
SELECT 
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

---

## 🎯 Recommended Approach

For your situation, I recommend:

1. **Now (Development)**: Use **Option 1** (Basic Setup)
   - Fast and simple
   - Gets you up and running immediately
   - Good enough for testing

2. **Before Production**: Implement **Option 2** (Role-Based Access)
   - Proper security
   - Scalable for multiple admins
   - Protects against unauthorized access

---

## ⏱️ Time Estimates

| Task | Basic Setup | Production Setup |
|------|-------------|------------------|
| Create admin user | 2 min | 2 min |
| Setup roles | - | 10 min |
| Run SQL scripts | - | 5 min |
| Testing | 3 min | 13 min |
| **Total** | **5 min** | **30 min** |

---

**Need more details?** See: `ADMIN_ACCOUNT_SETUP.md`

**Created:** 2025-01-02  
**Version:** 1.0


