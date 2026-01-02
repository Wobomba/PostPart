-- Update activity_log table to support more activity types including account creation
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_activity_type_check;

ALTER TABLE activity_log
ADD CONSTRAINT activity_log_activity_type_check 
CHECK (activity_type IN (
  'user_account_created',
  'user_login',
  'user_logout',
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
  'allocation_created',
  'allocation_updated',
  'system_error',
  'system_warning'
));

-- Update entity_type constraint
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_entity_type_check;

ALTER TABLE activity_log
ADD CONSTRAINT activity_log_entity_type_check 
CHECK (entity_type IN ('user', 'parent', 'organisation', 'center', 'checkin', 'allocation', 'system'));

-- Add function to log user account creation
CREATE OR REPLACE FUNCTION log_user_account_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into activity_log
  INSERT INTO activity_log (
    activity_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    metadata
  ) VALUES (
    'user_account_created',
    'user',
    NEW.id,
    COALESCE(NEW.email, 'Unknown User'),
    'New user account created: ' || COALESCE(NEW.email, 'Unknown'),
    jsonb_build_object(
      'email', NEW.email,
      'email_confirmed', NEW.email_confirmed_at IS NOT NULL,
      'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user account creation
DROP TRIGGER IF EXISTS trigger_log_user_creation ON auth.users;
CREATE TRIGGER trigger_log_user_creation
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION log_user_account_creation();

-- Add function to log profile creation (when user completes registration)
CREATE OR REPLACE FUNCTION log_profile_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into activity_log
  INSERT INTO activity_log (
    activity_type,
    entity_type,
    entity_id,
    entity_name,
    description,
    metadata
  ) VALUES (
    'parent_created',
    'parent',
    NEW.id,
    COALESCE(NEW.full_name, NEW.email, 'Unknown Parent'),
    'New parent profile created: ' || COALESCE(NEW.full_name, NEW.email, 'Unknown'),
    jsonb_build_object(
      'email', NEW.email,
      'phone', NEW.phone,
      'status', COALESCE(NEW.status, 'active'),
      'has_organisation', NEW.organization_id IS NOT NULL
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile creation
DROP TRIGGER IF EXISTS trigger_log_profile_creation ON profiles;
CREATE TRIGGER trigger_log_profile_creation
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION log_profile_creation();

COMMENT ON FUNCTION log_user_account_creation() IS 'Automatically logs new user account creation to activity_log table';
COMMENT ON FUNCTION log_profile_creation() IS 'Automatically logs new parent profile creation to activity_log table';

