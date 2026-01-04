-- Clean up any test/failed user registrations
-- This removes users created during failed registration attempts

-- Delete test users with the email you've been trying
DELETE FROM auth.users 
WHERE email = 'iwobomba999@gmail.com';

-- Also clean up any orphaned profiles
DELETE FROM public.profiles 
WHERE email = 'iwobomba999@gmail.com';

-- Show remaining users (to verify cleanup)
SELECT id, email, created_at, email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC
LIMIT 5;

