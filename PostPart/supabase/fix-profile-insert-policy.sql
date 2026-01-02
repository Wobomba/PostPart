-- Fix: Add INSERT policy for profiles table
-- This allows users to create their own profile after signing up

-- Add policy to allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- This policy allows a user to create a profile record 
-- as long as the profile ID matches their auth user ID

