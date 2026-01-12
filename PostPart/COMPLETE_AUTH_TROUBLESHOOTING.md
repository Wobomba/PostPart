# COMPLETE AUTH TROUBLESHOOTING GUIDE

## Current Status
✅ Database schema fixed (status column, nullable fields)
✅ Foreign keys made deferrable
✅ RLS policies updated
✅ Trigger function created
❌ **Supabase Auth still failing to create users**

## The Problem

The error happens at the **Supabase Auth level** (before our trigger), not in our database trigger. This means:

```
User clicks "Create Account"
   ↓
Mobile app calls: supabase.auth.signUp()
   ↓
Supabase Auth tries to INSERT into auth.users
   ↓
❌ FAILS HERE with "Database error saving new user"
   ↓
Our trigger never runs because user was never created
```

## Possible Causes

### 1. **Auth Hooks Enabled and Failing**
**Location:** Dashboard → Authentication → Hooks

Auth hooks run BEFORE the user is created and can block registration.

**Fix:**
- Disable all hooks temporarily
- Try registration
- If it works, one of the hooks was failing

### 2. **Email Provider Not Configured**
**Location:** Dashboard → Authentication → Providers → Email

If email confirmation is required but no SMTP is configured:
- User creation might fail
- Verification emails can't be sent

**Fix:**
- Temporarily disable "Confirm email"
- OR configure SMTP properly

### 3. **Rate Limiting**
Supabase has rate limits on auth endpoints.

**Check:**
- Dashboard → Logs → Auth Logs
- Look for rate limit errors

### 4. **Auth Schema Corruption**
The auth schema itself might have issues.

**Run:**
```sql
supabase/diagnose-auth-system.sql
```

This checks:
- Constraints on auth.users
- RLS policies
- Triggers
- Foreign key references

### 5. **Project-Level Issues**
- Database full
- Paused project
- Invalid API keys

## IMMEDIATE FIXES TO TRY

### Fix 1: Disable Email Confirmation (Quickest)

1. Go to **Dashboard → Authentication → Providers**
2. Click **Email**
3. **Uncheck** "Confirm email"
4. Click **Save**
5. Try registration

This is the most common cause!

### Fix 2: Check Auth Hooks

1. Go to **Dashboard → Authentication → Hooks**
2. If any hooks are enabled, **disable them**
3. Try registration

### Fix 3: Check Auth Logs in Real-Time

1. Open **Dashboard → Logs → Auth Logs**
2. Try registration in mobile app
3. **Immediately** check the Auth Logs
4. Look for the exact error message

### Fix 4: Run Auth Diagnostic

```sql
-- In Supabase SQL Editor
Run: supabase/diagnose-auth-system.sql
```

This will show:
- What's blocking auth.users
- If triggers are interfering
- FK constraint status

### Fix 5: Check Database Health

1. **Dashboard → Database → Health**
2. Check for:
   - Connection limits reached
   - Disk space full
   - High CPU usage

## The NotFoundError Issue

The `NotFoundError` about `bootstrap-autofill-overlay.js` is **unrelated** to registration. It's a UI issue with React Bootstrap.

**It's safe to ignore** - it's not preventing registration.

## Testing Registration Without The App

To isolate if it's the mobile app or Supabase, test registration directly:

### Using Supabase Dashboard

1. Go to **Dashboard → Authentication → Users**
2. Click **"Add User"**
3. Enter email and password
4. Click **"Create New User"**

**If this works:** Issue is in mobile app code
**If this fails:** Issue is in Supabase configuration

### Using cURL

```bash
curl -X POST 'https://etajqqnejfolsmslbsom.supabase.co/auth/v1/signup' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "password": "test123456",
    "data": {"full_name": "Test User"}
  }'
```

## Next Steps

1. **Run** `diagnose-auth-system.sql` 
2. **Check** Dashboard → Authentication → Providers → Email (disable confirmation)
3. **Check** Dashboard → Authentication → Hooks (disable all)
4. **Try** creating user directly in Dashboard
5. **Check** Auth Logs in real-time during registration attempt

## Expected Working Flow

```
Register (mobile) 
   ↓
Supabase Auth creates entry in auth.users ✓
   ↓
Trigger fires: handle_new_user() ✓
   ↓
Profile created in public.profiles ✓
   ↓
If email confirmation disabled: User can login immediately
If email confirmation enabled: User gets verification email
   ↓
User verifies → Logs in → Organization modal appears ✓
```

Let's find out what's blocking that first step!




















