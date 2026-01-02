-- Fix RLS policies for parent_notifications table to allow admin inserts
-- This script drops all existing policies and creates new ones with proper permissions

-- Disable RLS temporarily to clean up
ALTER TABLE parent_notifications DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'parent_notifications') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON parent_notifications';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins (authenticated users in web dashboard) can INSERT parent_notifications
CREATE POLICY "Admins can create parent_notifications"
ON parent_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Admins can read all parent_notifications
CREATE POLICY "Admins can read all parent_notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Admins can update parent_notifications (for managing read status, etc.)
CREATE POLICY "Admins can update parent_notifications"
ON parent_notifications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy 4: Admins can delete parent_notifications
CREATE POLICY "Admins can delete parent_notifications"
ON parent_notifications
FOR DELETE
TO authenticated
USING (true);

-- Policy 5: Parents can read their own notifications via the parent_id
CREATE POLICY "Parents can read their own notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Policy 6: Parents can update their own notifications (mark as read)
CREATE POLICY "Parents can update their notification read status"
ON parent_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Comments for documentation
COMMENT ON POLICY "Admins can create parent_notifications" ON parent_notifications IS 
'Allows authenticated admin users to create notification records for any parent';

COMMENT ON POLICY "Admins can read all parent_notifications" ON parent_notifications IS 
'Allows authenticated admin users to view all parent notification records';

COMMENT ON POLICY "Parents can read their own notifications" ON parent_notifications IS 
'Allows parents to view only their own notifications via parent_id matching auth.uid()';

COMMENT ON POLICY "Parents can update their notification read status" ON parent_notifications IS 
'Allows parents to mark their own notifications as read';

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
WHERE tablename = 'parent_notifications'
ORDER BY policyname;

