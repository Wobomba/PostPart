-- Diagnostic script to check what's preventing user registration
-- Run this in Supabase SQL Editor to see what's wrong

-- Check 1: Verify organization_id is nullable
SELECT 
  column_name, 
  is_nullable, 
  column_default,
  data_type
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check 2: View all RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check 3: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' 
  AND schemaname = 'public';

-- Check 4: Verify the trigger exists and is active
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
  AND trigger_schema = 'auth';

-- Check 5: Test the trigger function directly
SELECT handle_new_user();

-- Check 6: Check grants on profiles table
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'profiles' 
  AND table_schema = 'public';

