# 🔧 Comprehensive Name Sync Fix

## Problem
The user's name was not displaying correctly in the mobile app, even after registration, OTP verification, and login. This affected both new and existing users.

## Root Causes Identified

1. **Timing Issue**: Database trigger might run before `raw_user_meta_data` is fully committed
2. **Missing Sync Points**: Name wasn't being synced at all critical points in the user flow
3. **Empty String vs Null**: Profile might have empty string `''` instead of null, which wasn't being handled properly
4. **No Retry Logic**: If sync failed once, it wasn't retried

## Solutions Implemented

### 1. ✅ Added Name Syncing After Registration
**File**: `mobile/app/(auth)/register.tsx`

- After successful signup, wait 500ms for trigger to complete
- Then explicitly sync name from auth metadata to profile
- Handles cases where trigger runs before metadata is available

### 2. ✅ Added Name Syncing After OTP Verification
**File**: `mobile/app/(auth)/verify-otp.tsx`

- After email verification succeeds, immediately sync name
- Works for both 'signup' and 'email' OTP types
- Ensures name is set before user logs in

### 3. ✅ Enhanced Name Syncing in UserDataContext
**File**: `mobile/contexts/UserDataContext.tsx`

- More aggressive syncing when profile name is empty
- Automatically reloads profile after sync to get updated name
- Better error handling and logging

### 4. ✅ Improved Sync Function
**File**: `mobile/utils/profile.ts`

- Better handling of empty strings vs null
- More reliable error handling
- Clearer logging

### 5. ✅ Existing Sync Points (Already Working)
- **Login**: `mobile/app/(auth)/login.tsx` - Syncs on successful login
- **Organization Entry**: `mobile/app/(auth)/organization.tsx` - Syncs before saving organization

## Name Sync Flow (Complete)

```
1. User Registers
   ↓
   Name set in auth metadata (raw_user_meta_data)
   ↓
   Database trigger creates profile (may miss name if timing is off)
   ↓
   ✅ NEW: Explicit sync after registration (500ms delay)
   
2. User Verifies Email (OTP)
   ↓
   Email confirmed
   ↓
   ✅ NEW: Explicit sync after OTP verification
   
3. User Logs In
   ↓
   ✅ Existing: Sync on login
   ↓
   UserDataContext loads profile
   ↓
   ✅ ENHANCED: Aggressive sync if name is missing
   ↓
   Name displayed in app
```

## Database Trigger

The database trigger `handle_new_user()` should:
- Extract `full_name` from `raw_user_meta_data->>'full_name'`
- Fall back to `raw_user_meta_data->>'name'` if `full_name` is missing
- Handle empty strings properly

**Current trigger** (from `fix-profile-name-and-status-simple.sql`):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    'inactive'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(
      NULLIF(EXCLUDED.full_name, ''),
      profiles.full_name
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing Checklist

- [ ] New user registration → Name should appear after OTP verification
- [ ] Existing user login → Name should appear immediately
- [ ] User without name in profile → Should sync from auth metadata
- [ ] User with empty string in profile → Should be replaced with auth name
- [ ] UserDataContext refresh → Should sync if name is missing

## Next Steps

1. **Run the SQL script** (`fix-profile-name-and-status-simple.sql`) to:
   - Fix existing profiles with empty names
   - Update the trigger to handle names better

2. **Test the flow**:
   - Register a new user
   - Verify email
   - Check if name appears
   - Log in as existing user
   - Check if name appears

3. **Monitor logs**:
   - Check console for "Synced name to profile" messages
   - Verify sync is happening at all points

## Files Modified

1. `mobile/app/(auth)/register.tsx` - Added sync after registration
2. `mobile/app/(auth)/verify-otp.tsx` - Added sync after OTP verification
3. `mobile/contexts/UserDataContext.tsx` - Enhanced aggressive syncing
4. `mobile/utils/profile.ts` - Improved sync function reliability

## Expected Behavior

✅ **New User Flow**:
1. Register → Name set in auth metadata
2. Profile created by trigger (may or may not have name)
3. Sync after registration → Name synced to profile
4. Verify OTP → Name synced again (redundant but safe)
5. Login → Name synced again (redundant but safe)
6. UserDataContext loads → Name displayed ✅

✅ **Existing User Flow**:
1. Login → Name synced if missing
2. UserDataContext loads → Name synced if missing
3. Name displayed ✅

## Why Multiple Sync Points?

We sync at multiple points because:
- **Redundancy**: If one sync fails, others will catch it
- **Timing**: Different sync points handle different timing scenarios
- **Reliability**: Ensures name is always set, even if trigger fails

## Debugging

If name still doesn't appear:

1. **Check auth metadata**:
   ```sql
   SELECT id, email, raw_user_meta_data->>'full_name' as name
   FROM auth.users
   WHERE email = 'user@example.com';
   ```

2. **Check profile**:
   ```sql
   SELECT id, email, full_name
   FROM profiles
   WHERE email = 'user@example.com';
   ```

3. **Check console logs**:
   - Look for "Synced name to profile" messages
   - Look for sync errors

4. **Manual sync**:
   ```typescript
   import { syncAuthToProfile } from '../utils/profile';
   await syncAuthToProfile(userId);
   ```


