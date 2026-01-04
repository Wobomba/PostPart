-- ============================================================
-- UPDATE ACTIVITY LOG FOR USER MANAGEMENT
-- ============================================================
-- This script updates the activity_log table to include
-- all activity types needed for user management features
-- ============================================================
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the existing CHECK constraint
ALTER TABLE activity_log
DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

-- Add the updated CHECK constraint with all activity types
ALTER TABLE activity_log
ADD CONSTRAINT activity_log_activity_type_check
CHECK (activity_type IN (
  -- User management
  'user_account_created',
  'user_login',
  'user_logout',
  'user_role_assigned',
  'user_role_changed',
  'user_role_updated',
  'admin_user_created',
  'user_deleted',
  -- Parent management
  'parent_created',
  'parent_organisation_assigned',
  'parent_organisation_updated',
  'parent_status_changed',
  'parent_details_updated',
  'parent_deleted',
  -- Organisation management
  'organisation_created',
  'organisation_updated',
  'organisation_deleted',
  'organisation_status_changed',
  -- Center management
  'center_created',
  'center_updated',
  'center_deleted',
  'center_verified',
  'center_unverified',
  -- Check-ins
  'checkin_completed',
  -- Allocations
  'allocation_created',
  'allocation_updated',
  -- Reports
  'report_exported',
  -- System
  'system_error',
  'system_warning',
  -- Sensitive data access (from enhanced-security-audit-log.sql)
  'parent_data_viewed',
  'parent_report_exported',
  'parent_profile_created'
));

-- Verify the constraint was updated
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'activity_log_activity_type_check';

-- Display success message
SELECT '✅ Activity log constraint updated successfully!' AS status;
SELECT '📋 All user management activity types are now supported' AS info;

