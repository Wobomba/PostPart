-- =====================================================
-- Enhanced Security: Audit Log for Sensitive Data Access
-- =====================================================
-- This migration enhances the existing activity_log table
-- to better track admin access to sensitive parent data

-- Add new activity types for sensitive data access
-- Note: We're updating the CHECK constraint on activity_type

-- First, drop the existing CHECK constraint
ALTER TABLE activity_log
DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

-- Add the new CHECK constraint with additional activity types
ALTER TABLE activity_log
ADD CONSTRAINT activity_log_activity_type_check
CHECK (activity_type IN (
  'parent_created',
  'parent_organisation_assigned',
  'parent_organisation_updated',
  'parent_status_changed',
  'parent_details_updated',
  'parent_data_viewed',
  'parent_report_exported',
  'organisation_created',
  'organisation_updated',
  'organisation_deleted',
  'organisation_status_changed',
  'center_created',
  'center_updated',
  'center_deleted',
  'center_verified',
  'center_unverified',
  'checkin_completed',
  'user_account_created',
  'parent_profile_created'
));

-- Create index for faster sensitive data access queries
CREATE INDEX IF NOT EXISTS idx_activity_log_sensitive_access 
ON activity_log(activity_type, created_at DESC)
WHERE activity_type IN ('parent_data_viewed', 'parent_report_exported');

-- Add a view for easy querying of sensitive data access
CREATE OR REPLACE VIEW sensitive_data_access_log AS
SELECT 
  al.id,
  al.activity_type,
  al.entity_id as parent_id,
  al.entity_name as parent_name,
  al.admin_user_id,
  al.description,
  al.metadata,
  al.created_at as accessed_at,
  p.email as parent_email,
  p.phone as parent_phone,
  o.name as organisation_name
FROM activity_log al
LEFT JOIN profiles p ON p.id = al.entity_id AND al.entity_type = 'parent'
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE al.activity_type IN ('parent_data_viewed', 'parent_report_exported', 'parent_details_updated')
  AND al.entity_type = 'parent'
ORDER BY al.created_at DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON sensitive_data_access_log TO authenticated;

-- Add helpful comments
COMMENT ON INDEX idx_activity_log_sensitive_access IS 'Optimizes queries for sensitive data access auditing';
COMMENT ON VIEW sensitive_data_access_log IS 'Provides easy access to audit trail of sensitive parent data access by admins';

-- Create a function to automatically log parent data views
CREATE OR REPLACE FUNCTION log_parent_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- This trigger can be attached to sensitive operations
  -- For now, it's a placeholder for future enhancements
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_parent_data_access IS 'Trigger function for automatic logging of parent data access';

-- Verify the updates
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'activity_log_activity_type_check';

-- Show recent sensitive data access (for verification)
SELECT 
  activity_type,
  entity_name,
  description,
  created_at
FROM activity_log
WHERE activity_type IN ('parent_data_viewed', 'parent_report_exported', 'parent_details_updated')
ORDER BY created_at DESC
LIMIT 10;

