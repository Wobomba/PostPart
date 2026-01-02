-- ============================================
-- Recreate Profiles Table (Simplified)
-- ============================================
-- This script drops and recreates the profiles table
-- with only the essential fields for email/password registration

-- Step 1: Drop existing table (this will cascade delete related data)
-- WARNING: This will delete all existing profile data!
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Create simplified profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS Policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile (needed if trigger fails)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Step 5: Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- What Changed:
-- ============================================
-- ❌ Removed: phone field (not collected in registration)
-- ✅ Kept: id, email, full_name (essential)
-- ✅ Kept: organization_id (for B2B - admins assign later)
-- ✅ Kept: timestamps (standard practice)
-- ✅ Added: Auto-create trigger
-- ✅ Added: RLS policies

-- ============================================
-- Fields Explanation:
-- ============================================
-- id: Links to auth.users (Supabase auth)
-- email: User's email address
-- full_name: User's full name (from registration form)
-- organization_id: Links to employer (assigned by admin later)
-- created_at: When profile was created
-- updated_at: When profile was last modified

