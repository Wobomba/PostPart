-- Add unique constraint to prevent duplicate children
-- A parent cannot have two children with the same first name, last name, and date of birth

ALTER TABLE children 
ADD CONSTRAINT unique_child_per_parent 
UNIQUE (parent_id, first_name, last_name, date_of_birth);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_child_per_parent ON children IS 
'Prevents duplicate children with same name and DOB for a parent';

