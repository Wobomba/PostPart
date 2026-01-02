-- Quick diagnostic and fix for organizations visibility in admin

-- 1. Check current organizations RLS policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'organizations';

-- 2. View all organizations (to verify they exist)
SELECT id, name, status, created_at
FROM organizations
ORDER BY name;

-- 3. If organizations table has RLS enabled but no public read policy, add one:
DROP POLICY IF EXISTS "Public can read active organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can read organizations" ON organizations;

-- Allow all authenticated users to read all organizations
CREATE POLICY "Authenticated users can read all organizations"
ON organizations
FOR SELECT
TO authenticated
USING (true);

-- 4. Verify the policy
SELECT * FROM pg_policies WHERE tablename = 'organizations';

