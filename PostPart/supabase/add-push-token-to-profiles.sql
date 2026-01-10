-- Add push_token column to profiles table for push notifications
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add a comment to document this column
COMMENT ON COLUMN profiles.push_token IS 'Expo push notification token for sending push notifications to mobile devices';

