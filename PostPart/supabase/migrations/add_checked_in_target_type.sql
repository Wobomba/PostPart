-- Migration: Add 'checked_in' to target_type CHECK constraint
-- This allows notifications to be sent to parents who have checked in

-- Drop the existing CHECK constraint
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_target_type_check;

-- Add the new CHECK constraint with 'checked_in' included
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_target_type_check 
  CHECK (target_type IN ('all', 'organization', 'center', 'individual', 'checked_in'));

-- Update the trigger function to handle 'checked_in' (it should do nothing, as we handle it manually)
CREATE OR REPLACE FUNCTION create_parent_notifications()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_type = 'all' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    SELECT NEW.id, p.id FROM profiles p;
  ELSIF NEW.target_type = 'organization' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    SELECT NEW.id, p.id FROM profiles p WHERE p.organization_id = NEW.target_id;
  ELSIF NEW.target_type = 'individual' THEN
    INSERT INTO parent_notifications (notification_id, parent_id)
    VALUES (NEW.id, NEW.target_id);
  -- For 'checked_in' and 'center', we handle manually in the application
  -- So we do nothing here
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON CONSTRAINT notifications_target_type_check ON notifications IS 
  'Allows target_type to be: all, organization, center, individual, or checked_in';

