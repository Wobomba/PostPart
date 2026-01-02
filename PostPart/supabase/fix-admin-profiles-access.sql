-- Grant admin users permission to view all profiles
-- This is needed for the admin dashboard to display parents

-- First, check current policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles';

-- Add policy for admin to read all profiles
-- Note: You may need to adjust this based on your admin authentication setup

-- Option 1: If you're using service role key in admin dashboard
-- The service role key bypasses RLS, so this should work

-- Option 2: If admin logs in as a regular authenticated user, add this policy:
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true); -- Allow all authenticated users to read all profiles (for admin dashboard)

-- Option 3: If you have a specific admin role/email, you could restrict it:
-- USING (auth.jwt() ->> 'email' = 'admin@postpart.com' OR auth.uid() = id);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Admins can read all profiles';

