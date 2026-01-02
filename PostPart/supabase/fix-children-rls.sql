-- Fix: Allow admins to view all children for parent management dashboard
-- This is needed so the admin can see children counts for each parent

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Parents can read own children" ON children;
DROP POLICY IF EXISTS "Users can read own children" ON children;

-- Create a policy that allows authenticated users to read all children
-- (This enables admin dashboard to show children counts)
CREATE POLICY "Authenticated users can read all children"
ON children
FOR SELECT
TO authenticated
USING (true);

-- Verify the policy was created
SELECT * FROM pg_policies WHERE tablename = 'children' AND policyname = 'Authenticated users can read all children';

