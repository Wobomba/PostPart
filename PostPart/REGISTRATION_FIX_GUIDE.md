# Fixing User Registration Error

## Problem
Users cannot register because the `organization_id` field in the `profiles` table is NOT NULL, but new users don't have an organization assigned yet (they select it on first login).

## Error Message
```
Registration error: AuthApiError: Database error saving new user
POST https://etajqqnejfolsmslbsom.supabase.co/auth/v1/signup 500 (Internal Server Error)
```

## Solution

### Step 1: Access Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/etajqqnejfolsmslbsom
2. Log in with your Supabase account

### Step 2: Run the Migration

#### Method A: Using SQL Editor (Recommended)
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the entire contents of `supabase/fix-registration-with-org-selection.sql`
4. Paste into the editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

#### Method B: Manual Table Edit (Quick Fix)
1. Click on **Table Editor** in the left sidebar
2. Select the **profiles** table
3. Find the **organization_id** column
4. Click the column name to edit
5. Check the box for **"Is Nullable"**
6. Click **Save**

### Step 3: Verify the Fix

Try registering a new user:
1. Open the mobile app
2. Tap "Create Account"
3. Fill in the registration form
4. Submit

You should now:
1. ✅ Successfully create an account
2. ✅ Receive email verification code
3. ✅ Verify email and login
4. ✅ See the organization selection modal on first login
5. ✅ Select organization and continue

### Step 4: Test the Full Flow

1. **Register**: Create a new account → Should work now
2. **Verify**: Enter OTP code from email → Should redirect to login
3. **Login**: Sign in with credentials → Should show organization modal
4. **Select Org**: Choose organization → Profile updated
5. **Admin Review**: Admin can now see the user and their organization in the dashboard

## What Changed

**Before:**
- `organization_id` was NOT NULL
- New users couldn't register because they had no organization
- Registration failed with database error

**After:**
- `organization_id` is NULLABLE
- New users can register with `organization_id = NULL`
- On first login, modal appears to select organization
- Admin can see pending users and approve them

## Technical Details

The migration does the following:

```sql
-- 1. Make organization_id nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL;

-- 2. Update trigger to insert NULL for new users
-- (Updated handle_new_user() function)

-- 3. Fix RLS policies to allow inserts with NULL organization_id

-- 4. Add index for performance
CREATE INDEX idx_profiles_organization_id 
  ON profiles(organization_id) 
  WHERE organization_id IS NOT NULL;
```

## Troubleshooting

### If registration still fails:

1. **Check RLS policies**: Make sure the insert policy allows authenticated users
   ```sql
   -- In SQL Editor, run:
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **Check trigger function**: Verify the trigger is working
   ```sql
   -- In SQL Editor, run:
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Check table structure**:
   ```sql
   -- In SQL Editor, run:
   SELECT column_name, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

4. **View recent errors**: Check Supabase logs
   - Go to **Logs** → **Postgres Logs** in dashboard
   - Look for recent INSERT errors

## Need Help?

If you're still having issues:
1. Check the Supabase dashboard logs
2. Look for error messages in the browser console
3. Verify your Supabase project is on a paid plan (if using auth features)
4. Contact Supabase support if the issue persists

## Files Created

- `supabase/fix-registration-with-org-selection.sql` - Complete migration script
- `supabase/fix-organization-id-nullable.sql` - Simple nullable fix
- `REGISTRATION_FIX_GUIDE.md` - This guide

