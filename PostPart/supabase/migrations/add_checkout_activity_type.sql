-- Migration: Add checkout_completed and pickup_reminder_sent to activity_log
-- This migration adds support for check-out and reminder activity types

-- Drop existing constraint if it exists
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

-- Add updated constraint with new activity types
ALTER TABLE activity_log
ADD CONSTRAINT activity_log_activity_type_check 
CHECK (activity_type IN (
  'user_account_created',
  'user_login',
  'user_logout',
  'user_role_assigned',
  'user_role_changed',
  'admin_user_created',
  'user_deleted',
  'parent_created',
  'parent_organisation_assigned',
  'parent_organisation_updated',
  'parent_status_changed',
  'parent_details_updated',
  'parent_deleted',
  'organisation_created',
  'organisation_updated',
  'organisation_deleted',
  'organisation_status_changed',
  'center_created',
  'center_updated',
  'center_deleted',
  'center_verified',
  'checkin_completed',
  'checkout_completed',
  'pickup_reminder_sent',
  'allocation_created',
  'allocation_updated',
  'report_exported',
  'system_error',
  'system_warning'
));

-- Update entity_type constraint to include 'checkin' if not already there
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;

ALTER TABLE activity_log
ADD CONSTRAINT activity_log_entity_type_check 
CHECK (entity_type IN ('user', 'parent', 'organisation', 'center', 'checkin', 'allocation', 'system'));

