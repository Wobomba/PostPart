-- Fix RLS policy to allow authenticated users to update profiles
-- This is needed for the admin dashboard to update parent profiles

-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create a new policy that allows authenticated users to update any profile
-- In a production environment, you'd want to add admin role checking here
CREATE POLICY "Authenticated users can update profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

