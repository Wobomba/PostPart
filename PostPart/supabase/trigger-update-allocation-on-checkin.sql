-- ================================================================
-- AUTO-INCREMENT ALLOCATION VISITS ON CHECK-IN
-- ================================================================
-- This script creates a database trigger that automatically 
-- increments the visits_used counter in the allocations table
-- whenever a parent checks into a day care center.
-- ================================================================

-- Function to increment allocation visits_used on check-in
CREATE OR REPLACE FUNCTION increment_allocation_on_checkin()
RETURNS TRIGGER AS $$
DECLARE
    _parent_org_id UUID;
    _active_allocation_id UUID;
    _current_date DATE;
BEGIN
    -- Get current date
    _current_date := CURRENT_DATE;

    -- Get the parent's organization_id from profiles table
    SELECT organization_id INTO _parent_org_id
    FROM profiles
    WHERE id = NEW.parent_id;

    -- If parent has no organization, skip allocation increment
    IF _parent_org_id IS NULL THEN
        RAISE NOTICE 'Parent % has no organization assigned. Skipping allocation increment.', NEW.parent_id;
        RETURN NEW;
    END IF;

    -- Find the active allocation for this organization
    -- (where the current date falls within the period_start_date and period_end_date)
    SELECT id INTO _active_allocation_id
    FROM allocations
    WHERE organization_id = _parent_org_id
      AND _current_date >= period_start_date::date
      AND _current_date <= period_end_date::date
    ORDER BY period_start_date DESC
    LIMIT 1;

    -- If no active allocation found, log a notice
    IF _active_allocation_id IS NULL THEN
        RAISE NOTICE 'No active allocation found for organization % on date %. Skipping increment.', _parent_org_id, _current_date;
        RETURN NEW;
    END IF;

    -- Increment the visits_used counter
    UPDATE allocations
    SET 
        visits_used = visits_used + 1,
        updated_at = NOW()
    WHERE id = _active_allocation_id;

    -- Log the increment for debugging
    RAISE NOTICE 'Incremented visits_used for allocation % (org: %)', _active_allocation_id, _parent_org_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_checkin_increment_allocation ON checkins;

-- Create trigger that fires after each check-in insert
CREATE TRIGGER on_checkin_increment_allocation
AFTER INSERT ON checkins
FOR EACH ROW
EXECUTE FUNCTION increment_allocation_on_checkin();

-- Add comment for documentation
COMMENT ON FUNCTION increment_allocation_on_checkin() IS 'Automatically increments the visits_used counter in allocations table when a parent checks in to a day care center.';
COMMENT ON TRIGGER on_checkin_increment_allocation ON checkins IS 'Triggers allocation increment after each check-in.';

-- Display confirmation
SELECT 'Allocation auto-increment trigger created successfully. Check-ins will now automatically update allocation progress.' AS status;

-- Optional: Test the trigger logic (uncomment to test)
-- SELECT 
--     p.id as parent_id,
--     p.full_name as parent_name,
--     p.organization_id,
--     o.name as organization_name,
--     a.id as allocation_id,
--     a.visit_limit,
--     a.visits_used,
--     a.period_start_date,
--     a.period_end_date
-- FROM profiles p
-- LEFT JOIN organizations o ON p.organization_id = o.id
-- LEFT JOIN allocations a ON a.organization_id = p.organization_id
--     AND CURRENT_DATE >= a.period_start_date::date
--     AND CURRENT_DATE <= a.period_end_date::date
-- WHERE p.organization_id IS NOT NULL
-- ORDER BY p.full_name;

