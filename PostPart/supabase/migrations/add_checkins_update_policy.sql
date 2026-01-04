-- Migration: Add UPDATE policy for checkins table
-- This allows parents to update their own check-ins (e.g., check-out)

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Parents can update own check-ins" ON checkins;

-- Add UPDATE policy for parents to update their own check-ins
CREATE POLICY "Parents can update own check-ins"
  ON checkins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

-- Add comment
COMMENT ON POLICY "Parents can update own check-ins" ON checkins IS 
  'Allows parents to update their own check-ins, including setting check_out_time';

