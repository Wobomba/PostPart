# Mobile App Data Loading Debug Guide

## Issue
Data (centers, children, check-ins) not loading in production APK builds, but works fine in development.

## Potential Causes

### 1. Authentication State
The most common issue is that the user session is not properly persisted or restored in production builds.

**Check:**
- Open the app and check console logs for `[useProfile]`, `[useChildren]`, `[useCenters]` messages
- Look for `Auth error` messages
- Verify that `supabase.auth.getUser()` returns a valid user

**Solution:**
- Ensure AsyncStorage is properly configured (already done in `lib/supabase.ts`)
- Check if session is being cleared on app restart
- Verify that login persists across app restarts

### 2. Row Level Security (RLS) Policies
RLS policies might be blocking access in production if they're not properly configured.

**Check:**
- Review Supabase RLS policies for:
  - `profiles` table
  - `children` table
  - `centers` table
  - `checkins` table
- Ensure policies allow authenticated users to read their own data

**Solution:**
- Verify RLS policies are enabled and correctly configured
- Test with a service role key (temporarily) to see if data loads
- Check Supabase logs for RLS policy violations

### 3. Network/CORS Issues
Production builds might have different network behavior.

**Check:**
- Check if Supabase URL is accessible from the device
- Look for network errors in console logs
- Verify device has internet connection

**Solution:**
- Ensure Supabase URL is correct and accessible
- Check if device firewall/network is blocking requests
- Test with a different network connection

### 4. Environment Variables
Environment variables might not be set in EAS builds.

**Check:**
- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in EAS
- Check `eas.json` for environment variable configuration

**Solution:**
- Set environment variables in EAS dashboard or `eas.json`
- Currently using hardcoded values as fallback, but environment variables are preferred

## Debugging Steps

1. **Check Console Logs**
   - Look for `[useProfile]`, `[useChildren]`, `[useCenters]`, `[useRecentCheckIns]` messages
   - Check for error messages starting with `[use*]`
   - Look for `Auth error` or `Supabase error` messages

2. **Verify Authentication**
   - Check if user is logged in
   - Verify session is valid: `supabase.auth.getSession()`
   - Check if token is expired

3. **Test Supabase Connection**
   - Try a simple query: `supabase.from('centers').select('id').limit(1)`
   - Check Supabase dashboard for request logs
   - Verify RLS policies are not blocking

4. **Check React Query State**
   - Use React Query DevTools to see query states
   - Check if queries are enabled
   - Verify query keys are correct

## Added Logging

All hooks now include:
- Logging when queries start
- Authentication checks before queries
- Error logging for Supabase errors
- Data count logging when queries succeed
- Retry attempt logging

## Next Steps

1. Build a new APK with the added logging
2. Install and test the app
3. Check console logs (use `adb logcat` for Android)
4. Share the logs to identify the specific issue

## Console Log Commands

### Android (using adb)
```bash
adb logcat | grep -E "\[use|Supabase|Auth error"
```

### View all React Native logs
```bash
adb logcat | grep -E "ReactNativeJS|console"
```

