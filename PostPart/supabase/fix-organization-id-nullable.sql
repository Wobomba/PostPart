-- Make organization_id nullable to allow user registration before organization selection
-- Users will select their organization on first login

-- Update the profiles table to make organization_id nullable
ALTER TABLE profiles 
ALTER COLUMN organization_id DROP NOT NULL;

-- Update the trigger function to handle null organization_id
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organization_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NULL, -- Organization will be set on first login
    'inactive' -- Start as inactive until organization is selected and admin approves
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add a comment to document this behavior
COMMENT ON COLUMN profiles.organization_id IS 'Organization ID - nullable until user selects organization on first login';

