# Registration Error Fix 🔧

## Errors Found

### Error 1: RLS Policy Violation
```
new row violates row-level security policy for table "profiles"
```

**Cause**: The `profiles` table doesn't have an INSERT policy allowing users to create their own profile.

### Error 2: Email Validation
```
Email address "djane@gmail.com" is invalid
```

**Cause**: Supabase email confirmation settings might be enabled, or email provider validation is active.

---

## 🔧 Fix #1: Add Profile INSERT Policy

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project: https://supabase.com
2. Go to **SQL Editor**

### Step 2: Run This SQL

Copy and paste this SQL into the editor:

```sql
-- Add policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Click **"Run"** 

✅ This allows users to create their own profile during registration.

---

## 🔧 Fix #2: Email Confirmation Settings

### Option A: Disable Email Confirmation (Recommended for Development)

1. Go to **Authentication > Settings** in Supabase Dashboard
2. Scroll to **"Email Auth"** section
3. Find **"Enable email confirmations"**
4. **Uncheck** this option
5. Click **"Save"**

✅ Users can now sign up without email verification

### Option B: Keep Email Confirmation (Production)

If you want to keep email confirmation enabled:

1. Keep the setting enabled
2. Update the registration flow to show "Check your email" message
3. Users must click the confirmation link before they can log in

---

## 🧪 Test Registration Again

After applying Fix #1 (and optionally Fix #2):

1. **Clear your app** (refresh browser or reload app)
2. **Go to Create Account**
3. Fill in:
   - Full Name: Test User
   - Email: test@example.com
   - Password: test123
   - Confirm: test123
4. Click **"Create Account"**

### Expected Results:

✅ **If email confirmation is DISABLED:**
- Account created successfully
- Profile inserted in database
- Redirected to Login screen
- Can sign in immediately

✅ **If email confirmation is ENABLED:**
- Account created successfully
- "Check your email" message shown
- User must click confirmation link
- Then can sign in

---

## 🔍 Alternative Solution: Use Service Role

If you still have issues with the INSERT policy, you can use the service role key (admin access) for profile creation:

### Update the registration code:

```typescript
// In register.tsx, after successful signup:

// Instead of using regular supabase client
// Create a service role client (admin)
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY', // This is the service_role key (keep it secret!)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Then use supabaseAdmin for profile creation
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .insert({...});
```

⚠️ **Warning**: Service role key should ONLY be used server-side (Supabase Edge Functions), not in mobile apps!

---

## ✅ Recommended Steps

**For Development/Testing:**

1. ✅ Run the SQL to add INSERT policy (Fix #1)
2. ✅ Disable email confirmations (Fix #2, Option A)
3. ✅ Test registration again

**For Production:**

1. ✅ Run the SQL to add INSERT policy (Fix #1)
2. ✅ Keep email confirmations enabled (Fix #2, Option B)
3. ✅ Add email confirmation flow to app
4. ✅ Test complete signup process

---

## 📝 Summary

The main issue is the **missing INSERT policy** on the profiles table. Apply Fix #1 and registration should work!

The email validation error should resolve once you disable email confirmations or complete the email verification flow.

