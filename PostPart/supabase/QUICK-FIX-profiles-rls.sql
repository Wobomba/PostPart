-- Simple fix: Allow all authenticated users to read all profiles
-- This is needed for the admin dashboard

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;

-- Create a more permissive policy for reading profiles
CREATE POLICY "Authenticated users can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Keep the update policy restrictive (users can only update their own profile)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

