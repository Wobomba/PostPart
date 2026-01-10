-- Create the missing activity_log table
-- This table is required for tracking admin and system activities

-- Drop table if it exists (clean slate)
DROP TABLE IF EXISTS activity_log CASCADE;

-- Create activity_log table
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Activity details
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  description TEXT NOT NULL,
  
  -- User who performed the action (nullable for system actions)
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_user_email TEXT,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT activity_log_activity_type_check 
    CHECK (activity_type IN (
      'user_created', 'user_updated', 'user_deleted', 'user_role_changed',
      'organisation_created', 'organisation_updated', 'organisation_deleted',
      'center_created', 'center_updated', 'center_deleted',
      'allocation_created', 'allocation_updated', 'allocation_deleted',
      'notification_sent', 'bulk_notification_sent',
      'login', 'logout', 'password_reset',
      'system_action'
    )),
  
  CONSTRAINT activity_log_entity_type_check
    CHECK (entity_type IN (
      'user', 'organisation', 'center', 'allocation', 'notification',
      'system', 'auth'
    ))
);

-- Create indexes for common queries
CREATE INDEX idx_activity_log_admin_user_id 
  ON activity_log(admin_user_id) 
  WHERE admin_user_id IS NOT NULL;

CREATE INDEX idx_activity_log_entity 
  ON activity_log(entity_type, entity_id) 
  WHERE entity_id IS NOT NULL;

CREATE INDEX idx_activity_log_created_at 
  ON activity_log(created_at DESC);

CREATE INDEX idx_activity_log_activity_type 
  ON activity_log(activity_type);

CREATE INDEX idx_activity_log_admin_email 
  ON activity_log(admin_user_email) 
  WHERE admin_user_email IS NOT NULL;

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins and system admins can view logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'system_admin')
    )
  );

-- Allow system to insert logs (for triggers and internal functions)
CREATE POLICY "System can insert activity logs"
  ON activity_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT SELECT, INSERT ON activity_log TO anon;
GRANT ALL ON activity_log TO postgres;

-- Add helpful comments
COMMENT ON TABLE activity_log IS 
  'Tracks all admin and system activities for audit purposes';

COMMENT ON COLUMN activity_log.admin_user_id IS 
  'ID of the admin user who performed the action (null for system actions)';

COMMENT ON COLUMN activity_log.metadata IS 
  'Additional context about the activity in JSON format';

-- Verify creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'activity_log' 
      AND table_schema = 'public'
  ) THEN
    RAISE NOTICE '✓✓✓ SUCCESS! activity_log table created!';
    RAISE NOTICE 'Registration should now work!';
  ELSE
    RAISE WARNING 'Table creation may have failed';
  END IF;
END $$;












