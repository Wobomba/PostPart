-- =====================================================
-- Bulk Notifications and Logging System
-- =====================================================
-- This migration sets up comprehensive notification tracking
-- for the bulk notifications feature

-- Ensure notifications table exists with proper structure
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('announcement', 'reminder', 'approval', 'center_update', 'alert')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'organization', 'center', 'individual')),
  target_id UUID,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_target_type ON notifications(target_type);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_by ON notifications(created_by);

-- Ensure parent_notifications table exists
CREATE TABLE IF NOT EXISTS parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for parent_notifications
CREATE INDEX IF NOT EXISTS idx_parent_notifications_notification_id ON parent_notifications(notification_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_parent_id ON parent_notifications(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_is_read ON parent_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_created_at ON parent_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read all notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON notifications;
DROP POLICY IF EXISTS "Parents can read their own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Parents can update their own notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Authenticated users can read parent_notifications" ON parent_notifications;
DROP POLICY IF EXISTS "Authenticated users can create parent_notifications" ON parent_notifications;

-- RLS Policies for notifications table

-- Admins can read all notifications
CREATE POLICY "Authenticated users can read all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (true);

-- Admins can create notifications
CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for parent_notifications table

-- Admins can read all parent_notifications
CREATE POLICY "Authenticated users can read parent_notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (true);

-- Admins can create parent_notifications
CREATE POLICY "Authenticated users can create parent_notifications"
ON parent_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Parents can read their own notifications
CREATE POLICY "Parents can read their own notifications"
ON parent_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = parent_id);

-- Parents can update their own notifications (mark as read)
CREATE POLICY "Parents can update their own notifications"
ON parent_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = parent_id)
WITH CHECK (auth.uid() = parent_id);

-- Create a view for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  n.id,
  n.title,
  n.type,
  n.priority,
  n.target_type,
  n.created_at,
  COUNT(pn.id) as total_recipients,
  COUNT(CASE WHEN pn.is_read = true THEN 1 END) as read_count,
  COUNT(CASE WHEN pn.is_read = false THEN 1 END) as unread_count,
  ROUND(
    (COUNT(CASE WHEN pn.is_read = true THEN 1 END)::DECIMAL / 
    NULLIF(COUNT(pn.id), 0) * 100), 2
  ) as read_percentage
FROM notifications n
LEFT JOIN parent_notifications pn ON pn.notification_id = n.id
GROUP BY n.id, n.title, n.type, n.priority, n.target_type, n.created_at
ORDER BY n.created_at DESC;

-- Grant access to the view
GRANT SELECT ON notification_stats TO authenticated;

-- Add helpful comments
COMMENT ON TABLE notifications IS 'Stores bulk notifications sent by admins to parents';
COMMENT ON TABLE parent_notifications IS 'Junction table linking notifications to individual parents with read status';
COMMENT ON VIEW notification_stats IS 'Provides statistics on notification delivery and read rates';

COMMENT ON COLUMN notifications.type IS 'Type of notification: announcement, reminder, approval, center_update, alert';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high';
COMMENT ON COLUMN notifications.target_type IS 'Who receives it: all, organization, center, individual';
COMMENT ON COLUMN notifications.target_id IS 'ID of the target (organization_id, center_id, or parent_id)';

COMMENT ON COLUMN parent_notifications.is_read IS 'Whether the parent has read the notification';
COMMENT ON COLUMN parent_notifications.read_at IS 'Timestamp when the notification was read';

-- Create trigger to log notification sends
CREATE OR REPLACE FUNCTION log_notification_send()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to activity_log when notification is created
  INSERT INTO activity_log (
    activity_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    admin_user_id,
    metadata,
    created_at
  ) VALUES (
    'parent_details_updated',  -- Using existing activity type
    'parent',
    NEW.id,
    NEW.title,
    'Bulk notification sent: ' || NEW.title,
    NEW.created_by,
    jsonb_build_object(
      'notification_type', NEW.type,
      'priority', NEW.priority,
      'target_type', NEW.target_type,
      'target_id', NEW.target_id
    ),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_notification_create ON notifications;
CREATE TRIGGER on_notification_create
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION log_notification_send();

COMMENT ON FUNCTION log_notification_send IS 'Automatically logs notification sends to activity_log';
COMMENT ON TRIGGER on_notification_create ON notifications IS 'Triggers activity logging when notifications are sent';

-- Verify the setup
SELECT 'Notifications system setup complete!' as message;

-- Show table structure
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('notifications', 'parent_notifications')
ORDER BY table_name, ordinal_position;

