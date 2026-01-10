# Registration Error Troubleshooting Guide

## Current Error
```
POST https://etajqqnejfolsmslbsom.supabase.co/auth/v1/signup 500 (Internal Server Error)
Registration error: AuthApiError: Database error saving new user
```

## Potential Causes & Solutions

### Cause 1: RLS Policies Blocking INSERT
**Solution:** Run `fix-registration-v2-aggressive.sql`

This script:
- Makes the trigger function run with `SECURITY DEFINER` (elevated privileges)
- Creates permissive INSERT policy
- Grants proper permissions to anon/authenticated roles

### Cause 2: Auth Hook Configuration
Supabase might have Auth Hooks enabled that are interfering.

**Check:**
1. Go to Supabase Dashboard → Authentication → Hooks
2. Look for any enabled hooks
3. Temporarily disable them and test

### Cause 3: Email Confirmations Blocking
**Check:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Under "Email Auth" section
3. Check "Enable email confirmations" setting
4. If enabled, ensure you have email templates configured

### Cause 4: Database Trigger Failing Silently
**Run Diagnostic:**
```sql
-- In Supabase SQL Editor, run:
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'users';
```

### Cause 5: Missing created_at/updated_at Columns
**Check if columns exist:**
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('created_at', 'updated_at');
```

If missing, add them:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

## Step-by-Step Troubleshooting

### Step 1: Run Diagnostics
```bash
# In Supabase SQL Editor
Run: supabase/diagnose-registration-issue.sql
```

### Step 2: Apply Aggressive Fix
```bash
# In Supabase SQL Editor  
Run: supabase/fix-registration-v2-aggressive.sql
```

### Step 3: Check Supabase Logs
1. Go to Dashboard → Logs → Postgres Logs
2. Filter by "error" or "INSERT"
3. Look for specific error messages

### Step 4: Test with Simple SQL
Try manually inserting a test profile:
```sql
-- In SQL Editor
INSERT INTO profiles (id, email, full_name, organization_id, status)
VALUES (
  gen_random_uuid()::text,
  'test@example.com',
  'Test User',
  NULL,
  'inactive'
);
```

If this fails, you'll see the exact error message.

### Step 5: Check Auth Settings

#### Option A: Disable Email Confirmation Temporarily
1. Dashboard → Authentication → Providers → Email
2. Uncheck "Confirm email"
3. Try registration again

#### Option B: Configure Email Templates
1. Dashboard → Authentication → Email Templates
2. Ensure "Confirm signup" template exists
3. Check for any errors in template

### Step 6: Nuclear Option - Recreate Profiles Table
⚠️ **WARNING: This will delete all existing profiles!**

```sql
-- Backup existing profiles first
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Drop and recreate
DROP TABLE profiles CASCADE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  organization_id UUID REFERENCES organizations(id),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add policies
-- (Copy policies from fix-registration-v2-aggressive.sql)

-- Restore data
INSERT INTO profiles SELECT * FROM profiles_backup;
```

## Quick Fixes to Try First

### Fix 1: Simplest Possible Trigger
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fix 2: Disable RLS Temporarily
```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Try registration
-- Then re-enable:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### Fix 3: Check for Conflicting Triggers
```sql
-- List all triggers on auth.users
SELECT * FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;

-- If you see multiple triggers, you might need to clean them up
```

## Common Issues

### Issue: "permission denied for table profiles"
**Solution:** Grant permissions:
```sql
GRANT ALL ON profiles TO authenticated, anon, postgres;
```

### Issue: "null value in column violates not-null constraint"
**Solution:** Make sure ALL nullable columns allow NULL:
```sql
ALTER TABLE profiles 
  ALTER COLUMN organization_id DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN full_name DROP NOT NULL;
```

### Issue: "duplicate key value violates unique constraint"
**Solution:** User already exists, delete and retry:
```sql
-- Find the user
SELECT * FROM auth.users WHERE email = 'your-test-email@example.com';

-- Delete if needed
DELETE FROM auth.users WHERE email = 'your-test-email@example.com';
```

## Still Not Working?

1. **Export Current Schema:**
```sql
-- In psql or SQL Editor
\d profiles
```

2. **Check Supabase Version:**
   - Go to Dashboard → Settings → General
   - Note the Postgres version

3. **Contact Supabase Support:**
   - https://supabase.com/support
   - Include:
     - Error message
     - SQL queries you've run
     - Schema definition
     - Logs from Dashboard

4. **Alternative: Use Supabase Edge Functions**
   Instead of database triggers, handle profile creation in an Edge Function.

## Next Steps

1. Run `fix-registration-v2-aggressive.sql`
2. Check Supabase logs for specific errors
3. Try registering again
4. If still fails, run diagnostics and send me the output

