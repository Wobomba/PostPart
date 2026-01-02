-- Function to automatically log check-ins to activity_log
CREATE OR REPLACE FUNCTION log_checkin_activity()
RETURNS TRIGGER AS $$
DECLARE
  parent_name TEXT;
  center_name TEXT;
BEGIN
  -- Get parent name
  SELECT full_name INTO parent_name
  FROM profiles
  WHERE id = NEW.parent_id;

  -- Get center name
  SELECT name INTO center_name
  FROM centers
  WHERE id = NEW.center_id;

  -- Insert into activity_log
  INSERT INTO activity_log (
    activity_type,
    entity_type,
    entity_id,
    entity_name,
    related_entity_type,
    related_entity_id,
    related_entity_name,
    description
  ) VALUES (
    'checkin_completed',
    'checkin',
    NEW.id,
    COALESCE(center_name, 'Unknown Center'),
    'parent',
    NEW.parent_id,
    COALESCE(parent_name, 'Unknown Parent'),
    COALESCE(parent_name, 'Unknown') || ' checked in at ' || COALESCE(center_name, 'Unknown Center')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for check-ins
DROP TRIGGER IF EXISTS trigger_log_checkin ON checkins;
CREATE TRIGGER trigger_log_checkin
AFTER INSERT ON checkins
FOR EACH ROW
EXECUTE FUNCTION log_checkin_activity();

COMMENT ON FUNCTION log_checkin_activity() IS 'Automatically logs check-in events to activity_log table';

