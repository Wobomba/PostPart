-- Enable Realtime subscriptions for instant updates without page refresh
-- This allows the mobile app and admin dashboard to receive live updates

-- Enable realtime for parent_notifications table (for instant notification delivery)
ALTER PUBLICATION supabase_realtime ADD TABLE parent_notifications;

-- Enable realtime for notifications table (for admin dashboard to see sent notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for centers table (for instant center updates in mobile and admin)
ALTER PUBLICATION supabase_realtime ADD TABLE centers;

-- Enable realtime for profiles table (for instant parent updates in admin)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for organizations table (for instant organization updates)
ALTER PUBLICATION supabase_realtime ADD TABLE organizations;

-- Enable realtime for checkins table (for instant check-in updates)
ALTER PUBLICATION supabase_realtime ADD TABLE checkins;

-- Enable realtime for center_qr_codes table (for instant QR code updates)
ALTER PUBLICATION supabase_realtime ADD TABLE center_qr_codes;

-- Enable realtime for activity_log table (for instant activity log updates)
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- Enable realtime for allocations table (for instant allocation updates)
ALTER PUBLICATION supabase_realtime ADD TABLE allocations;

-- Verify which tables have realtime enabled
SELECT 
    schemaname,
    tablename
FROM 
    pg_publication_tables
WHERE 
    pubname = 'supabase_realtime'
ORDER BY 
    tablename;

-- Note: After running this script, clients can subscribe to real-time changes using:
-- supabase.channel('table-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, callback)

