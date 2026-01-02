-- Create activity_log table to track all admin actions
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'parent_created',
    'parent_organisation_assigned',
    'parent_organisation_updated',
    'parent_status_changed',
    'parent_details_updated',
    'organisation_created',
    'organisation_updated',
    'organisation_deleted',
    'organisation_status_changed',
    'center_created',
    'center_updated',
    'center_deleted',
    'checkin_completed'
  )),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('parent', 'organisation', 'center', 'checkin')),
  entity_id UUID NOT NULL,
  entity_name TEXT,
  related_entity_type TEXT CHECK (related_entity_type IN ('parent', 'organisation', 'center', 'checkin')),
  related_entity_id UUID,
  related_entity_name TEXT,
  admin_user_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_admin_user ON activity_log(admin_user_id);

-- Add RLS policies
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to read all activity logs
CREATE POLICY "Authenticated users can read activity logs"
ON activity_log
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
ON activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add comment
COMMENT ON TABLE activity_log IS 'Tracks all administrative actions and system events for audit trail and activity feed';

