# Fix Duplicate Children Issue

## Problem
Children can be added multiple times with the same information, and the profile screen doesn't refresh after adding a child.

## Solutions Applied

### 1. Application-Level Duplicate Check ✅
- Added duplicate checking in both add child forms before inserting
- Shows a user-friendly error message if attempting to add a duplicate

### 2. Profile Screen Auto-Refresh ✅
- Added `useFocusEffect` hook to reload children list when returning to profile screen
- Profile now automatically updates after adding a child

### 3. Database-Level Constraint (Required)
To prevent duplicates at the database level, run this SQL in your Supabase dashboard:

#### Steps:
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to: **SQL Editor** (in the left sidebar)
3. Create a new query and paste the following SQL:

```sql
-- First, remove any existing duplicates (keeps oldest record)
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
```

4. Click **Run** (or press Ctrl+Enter)
5. You should see a success message

## Testing
1. Refresh your mobile app
2. Try adding a child
3. The child should appear immediately in the "My Children" section
4. Try adding the same child again - you should get an error message
5. Check the database - no duplicates should exist

## Files Modified
- `mobile/app/(tabs)/profile.tsx` - Added auto-refresh on focus
- `mobile/app/children/add.tsx` - Added duplicate check
- `mobile/app/profile/add-child.tsx` - Added duplicate check
- Database constraint SQL provided above

