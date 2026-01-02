-- First, let's find any duplicate children
SELECT 
  parent_id, 
  first_name, 
  last_name, 
  date_of_birth, 
  COUNT(*) as duplicate_count
FROM children
GROUP BY parent_id, first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;

-- If duplicates exist, keep only the oldest record (by created_at) and delete the rest
-- This will run in a transaction to ensure safety
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

