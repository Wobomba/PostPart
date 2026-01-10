# Complete Registration Debug Guide

## The Issue
Even after all fixes passed in the database, registration still fails with:
```
Registration error: AuthApiError: Database error saving new user
```

## Possible Causes

### 1. Supabase Auth Settings
The issue might be in Supabase Auth configuration, not the database.

**Check these settings:**
1. Go to **Dashboard → Authentication → Providers → Email**
2. Check if "Confirm email" is enabled
3. If enabled, check if email templates are configured properly

### 2. Auth Hooks Interfering
**Check:**
1. Go to **Dashboard → Authentication → Hooks**
2. See if any hooks are enabled
3. Temporarily disable them for testing

### 3. Database Trigger Not Firing
The trigger might not be executing due to:
- Wrong schema path
- Permission issues
- Trigger not attached properly

## Debug Steps

### Step 1: Run Detailed Diagnostic
```sql
-- In Supabase SQL Editor
Run: supabase/detailed-debug.sql
```

This will:
- Test the exact insert the trigger does
- Show the REAL error message
- Check if the trigger is properly attached
- Verify RLS policies

### Step 2: Check Supabase Logs
1. Go to **Dashboard → Logs → Postgres Logs**
2. Filter by "error" or "INSERT"
3. Try registration again
4. Look for the exact error in the logs

### Step 3: Check Auth Logs
1. Go to **Dashboard → Logs → Auth Logs**
2. Try registration
3. Look for auth-specific errors

### Step 4: Temporary Workaround - Disable Email Confirmation
If the issue is with email confirmation:
1. **Dashboard → Authentication → Providers → Email**
2. **Uncheck** "Confirm email"
3. Save
4. Try registration again

## Alternative Fix - Service Role Key

If RLS is still blocking, we might need to use the service role key in the trigger.

### Check Current Setup
The trigger function should have:
```sql
SECURITY DEFINER
SET search_path = public, auth
```

This should bypass RLS, but if it's not working, we might need a different approach.

## Next Steps

1. **Run `detailed-debug.sql`** - This will show the exact error
2. **Check Supabase Dashboard logs** - Real-time errors
3. **Share the output** - So we can see what's actually blocking

## Common Issues & Solutions

### Issue: "permission denied for table profiles"
**Solution:** Already fixed with GRANT statements

### Issue: "null value in column violates not-null constraint"
**Solution:** Already fixed - made columns nullable

### Issue: "duplicate key value"
**Solution:** Run cleanup-test-users.sql

### Issue: "trigger function doesn't exist"
**Solution:** Trigger was created in v5 fix

### Issue: "row-level security policy"
**Solution:** RLS policies were updated in v5

### Issue: "email confirmation required"
**Solution:** Disable email confirmation temporarily

## If Nothing Works

As a last resort, we can:
1. Create profiles manually via API route instead of trigger
2. Use Supabase Edge Functions for registration
3. Disable RLS temporarily for testing

But let's first see what `detailed-debug.sql` shows!

