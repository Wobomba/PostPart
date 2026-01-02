-- ============================================
-- Auto-create Profile Trigger
-- ============================================
-- This trigger automatically creates a profile when a new user signs up
-- It runs with SECURITY DEFINER, so it bypasses RLS policies
-- This solves the "new row violates row-level security policy" error

-- Step 1: Create the function
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

-- Step 2: Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- What This Does:
-- ============================================
-- 1. When a new user is created in auth.users
-- 2. The trigger automatically runs
-- 3. It creates a matching profile in public.profiles
-- 4. The full_name comes from the user metadata (set during signUp)
-- 5. This happens at the database level, so it bypasses RLS

-- ============================================
-- Benefits:
-- ============================================
-- ✅ Automatic - no manual profile creation needed
-- ✅ Reliable - always runs when user signs up
-- ✅ Secure - runs with elevated privileges
-- ✅ Clean - no app code needed for profile creation

