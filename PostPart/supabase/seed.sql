-- PostPart Mock Data
-- Sample data for development and testing

-- Create a test organization
INSERT INTO organizations (id, name, industry, size, contact_name, contact_email, contact_phone, plan_type, status)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'TechCorp Inc', 'Technology', '500-1000', 'John Smith', 'john@techcorp.com', '555-0100', 'premium', 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Healthcare Plus', 'Healthcare', '100-500', 'Sarah Johnson', 'sarah@healthcareplus.com', '555-0200', 'standard', 'active');

-- Create sample daycare centers
INSERT INTO centers (id, name, address, city, state, zip_code, phone, email, description, hours_of_operation, age_range, capacity, is_verified, verification_date)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Sunshine Learning Center', '123 Main Street', 'San Francisco', 'CA', '94102', '555-1000', 'info@sunshinelearning.com', 'A warm and nurturing environment for children to learn and grow.', 'Mon-Fri 7:00 AM - 6:00 PM', '6 months - 5 years', 50, true, NOW()),
  ('10000000-0000-0000-0000-000000000002', 'Little Stars Academy', '456 Oak Avenue', 'San Francisco', 'CA', '94103', '555-2000', 'contact@littlestars.com', 'Providing quality early childhood education since 2010.', 'Mon-Fri 6:30 AM - 6:30 PM', '1 year - 6 years', 75, true, NOW()),
  ('10000000-0000-0000-0000-000000000003', 'Rainbow Kids Center', '789 Elm Street', 'Oakland', 'CA', '94601', '555-3000', 'hello@rainbowkids.com', 'A diverse and inclusive childcare center.', 'Mon-Fri 7:30 AM - 6:00 PM', '6 months - 4 years', 40, true, NOW());

-- Note: Parent profiles will be created through authentication flow
-- But we can create sample data assuming auth users exist

-- Sample allocations (requires organization and parent IDs)
-- These would be created after parents are onboarded
INSERT INTO allocations (organization_id, visit_limit, period, period_start_date, period_end_date, visits_used)
VALUES
  ('00000000-0000-0000-0000-000000000001', 20, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month', 0),
  ('00000000-0000-0000-0000-000000000002', 15, 'monthly', DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month', 0);

-- Add amenities to centers
UPDATE centers 
SET amenities = ARRAY['Indoor Play Area', 'Outdoor Playground', 'Healthy Meals', 'Nap Rooms', 'Parent Portal']
WHERE id = '10000000-0000-0000-0000-000000000001';

UPDATE centers 
SET amenities = ARRAY['STEM Activities', 'Music Program', 'Art Studio', 'Library', 'Swimming Pool']
WHERE id = '10000000-0000-0000-0000-000000000002';

UPDATE centers 
SET amenities = ARRAY['Bilingual Staff', 'Organic Meals', 'Yoga Classes', 'Garden', 'Parent Workshops']
WHERE id = '10000000-0000-0000-0000-000000000003';

-- Instructions for creating test admin user:
-- Run this in Supabase SQL Editor after creating an admin user through authentication:
-- 
-- 1. Sign up an admin user through Supabase Auth
-- 2. The admin should use email/password auth (not OTP like parents)
-- 3. Admin users don't need a profile in the profiles table
-- 4. They authenticate with email/password and have elevated permissions

-- Instructions for creating test parent user:
-- 1. Use the mobile app or Supabase Auth to create a parent user
-- 2. After creating the auth user, insert into profiles:
-- 
-- INSERT INTO profiles (id, email, full_name, organization_id)
-- VALUES ('USER_UUID_FROM_AUTH', 'parent@example.com', 'Test Parent', '00000000-0000-0000-0000-000000000001');
-- 
-- 3. Add children for the parent:
-- 
-- INSERT INTO children (parent_id, first_name, last_name, date_of_birth)
-- VALUES 
--   ('USER_UUID_FROM_AUTH', 'Emma', 'Test', '2020-03-15'),
--   ('USER_UUID_FROM_AUTH', 'Noah', 'Test', '2022-07-20');

