-- ================================================================
-- FIX RLS POLICIES FOR ALLOCATIONS TABLE
-- ================================================================
-- This script ensures that authenticated users (admins) can manage
-- all allocations, which is necessary for the admin dashboard.
-- ================================================================

-- Disable RLS temporarily to drop existing policies
ALTER TABLE allocations DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read access to allocations" ON allocations;
DROP POLICY IF EXISTS "Allow authenticated users to read allocations" ON allocations;
DROP POLICY IF EXISTS "Allow authenticated users to insert allocations" ON allocations;
DROP POLICY IF EXISTS "Allow authenticated users to update allocations" ON allocations;
DROP POLICY IF EXISTS "Allow authenticated users to delete allocations" ON allocations;
DROP POLICY IF EXISTS "Admins can manage all allocations" ON allocations;
DROP POLICY IF EXISTS "Allocations can be read by authenticated users" ON allocations;
DROP POLICY IF EXISTS "Allocations can be inserted by authenticated users" ON allocations;
DROP POLICY IF EXISTS "Allocations can be updated by authenticated users" ON allocations;
DROP POLICY IF EXISTS "Allocations can be deleted by authenticated users" ON allocations;

-- Enable RLS
ALTER TABLE allocations ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (Admins) - Full CRUD
CREATE POLICY "Admins can manage all allocations"
ON allocations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Admins can manage all allocations" ON allocations IS 'Allows authenticated users (admins) full CRUD access to all allocation data.';

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'allocations'
ORDER BY ordinal_position;

-- Display confirmation
SELECT 'RLS policies for allocations table have been fixed. Admins now have full CRUD access.' AS status;

