-- Remove existing duplicates and add unique constraint
-- This keeps the oldest record for each duplicate set

BEGIN;

-- Create a temporary table with records to keep (oldest by created_at)
CREATE TEMP TABLE children_to_keep AS
SELECT DISTINCT ON (parent_id, first_name, last_name, date_of_birth) id
FROM children
ORDER BY parent_id, first_name, last_name, date_of_birth, created_at ASC;

-- Delete all children except those in the keep list
DELETE FROM children
WHERE id NOT IN (SELECT id FROM children_to_keep);

-- Drop temp table
DROP TABLE children_to_keep;

-- Now add the unique constraint
ALTER TABLE children 
ADD CONSTRAINT unique_child_per_parent 
UNIQUE (parent_id, first_name, last_name, date_of_birth);

COMMIT;

