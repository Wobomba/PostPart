-- ================================================================
-- ENABLE REALTIME FOR ALLOCATIONS TABLE
-- ================================================================
-- This script enables Supabase Realtime subscriptions for the
-- allocations table, allowing the admin dashboard to receive
-- instant updates when allocation progress changes.
-- ================================================================

-- Enable realtime for allocations table
ALTER PUBLICATION supabase_realtime ADD TABLE allocations;

-- Verify allocations table is in the realtime publication
SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
    AND tablename = 'allocations';

-- Display confirmation
SELECT 'Realtime subscriptions enabled for allocations table. Admin dashboard will now receive instant updates.' AS status;

