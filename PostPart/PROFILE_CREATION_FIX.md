# 🔧 Profile Creation Fix - Complete Solution

## Problem Identified ✅

You were correct! The issue is that when using **traditional email/password registration**, if email confirmation is enabled (default in Supabase), the user is **not authenticated immediately** after `signUp()`.

This means:
1. User calls `signUp()`
2. Supabase creates the auth user but doesn't log them in
3. App tries to insert profile
4. `auth.uid()` returns `null` (no session)
5. RLS policy check fails ❌

---

## 🎯 Solution: Database Trigger (Best Practice)

Instead of manually creating profiles in the app, use a **database trigger** to automatically create profiles when users sign up. This:
- ✅ Runs at the database level (bypasses RLS)
- ✅ Always works, regardless of authentication state
- ✅ Is more reliable and secure
- ✅ Reduces app code complexity

---

## 📝 Step-by-Step Fix

### Step 1: Run SQL in Supabase

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this complete SQL:

```sql
-- Function to auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger that runs when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

3. Click **"Run"** (or press Ctrl+Enter)
4. ✅ Should see: "Success. No rows returned"

---

### Step 2: Disable Email Confirmation (Optional, for Testing)

**For easier testing**, disable email confirmation:

1. Go to **Authentication** → **Settings**
2. Find **"Email Auth"** section
3. Find **"Enable email confirmations"**
4. **Uncheck** it
5. Click **"Save"**

This allows users to sign up and immediately log in.

---

### Step 3: Test Registration

I've already updated the app code to remove manual profile creation.

Now test:

1. **Refresh your mobile app** (in browser or Expo Go)
2. Click **"Create Account"**
3. Fill in the form:
   - Full Name: John Doe
   - Email: john@example.com
   - Password: test123
   - Confirm: test123
4. Click **"Create Account"**
5. ✅ Should succeed now!
6. Click **"Sign In"** and log in
7. ✅ Should go to Home screen

---

## 🔍 How It Works

### Before (Manual Creation - ❌ Broken):
```
User SignUp
    ↓
Auth user created (not logged in yet if email confirmation enabled)
    ↓
App tries to insert profile
    ↓
auth.uid() = null ❌
    ↓
RLS policy check fails ❌
```

### After (Database Trigger - ✅ Works):
```
User SignUp
    ↓
Auth user created
    ↓
Database trigger fires automatically
    ↓
Profile inserted (SECURITY DEFINER bypasses RLS) ✅
    ↓
User receives success message ✅
```

---

## 📋 Verification

After running the SQL, verify the trigger was created:

### Check in Supabase:
1. Go to **Database** → **Triggers**
2. Look for: **`on_auth_user_created`** on table **`auth.users`**
3. Should see it listed ✅

### Check the Function:
1. Go to **Database** → **Functions**
2. Look for: **`handle_new_user`**
3. Should see it listed ✅

---

## 🧪 Test Scenarios

### Test 1: Registration
- Create new account
- Profile should be auto-created ✅
- No RLS errors ✅

### Test 2: Login
- Sign in with created account
- Should work ✅
- Can see home screen ✅

### Test 3: Profile Data
1. After registration, check the profiles table in Supabase:
   - Go to **Table Editor** → **profiles**
   - Should see new row with your user data ✅

---

## ⚙️ Code Changes Made

### ✅ Updated Files:
1. **`mobile/app/(auth)/register.tsx`**
   - Removed manual profile creation code
   - Now relies on database trigger

2. **`supabase/schema.sql`**
   - Added `handle_new_user()` function
   - Added `on_auth_user_created` trigger

3. **`supabase/auto-create-profile-trigger.sql`**
   - New standalone SQL file with the trigger
   - Can be run independently if needed

---

## 🔐 Security Notes

**`SECURITY DEFINER`** keyword means:
- The function runs with the privileges of the user who created it (admin)
- This allows it to bypass RLS policies
- This is safe because the function only inserts a profile for the newly created user
- The trigger ensures it only runs on INSERT to `auth.users`

---

## 🎯 Summary

**Run the SQL trigger** and your registration will work perfectly! The profile will be automatically created whenever a new user signs up, regardless of email confirmation settings.

**No more RLS errors!** 🎉

