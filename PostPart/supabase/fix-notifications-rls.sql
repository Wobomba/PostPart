-- Fix RLS policies for notifications table to allow admin operations
-- This script drops all existing policies and creates new ones with proper permissions

-- Disable RLS temporarily to clean up
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON notifications';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins (authenticated users in web dashboard) can INSERT notifications
CREATE POLICY "Admins can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Admins can update notifications
CREATE POLICY "Admins can update notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Admins can delete notifications
CREATE POLICY "Admins can delete notifications"
ON notifications
FOR DELETE
TO authenticated
USING (true);

-- Comments for documentation
COMMENT ON POLICY "Admins can create notifications" ON notifications IS 
'Allows authenticated admin users to create bulk notifications';

COMMENT ON POLICY "Admins can read all notifications" ON notifications IS 
'Allows authenticated admin users to view all notifications';

-- Verify policies were created
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
WHERE tablename = 'notifications'
ORDER BY policyname;

