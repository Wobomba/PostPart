-- Quick check to see current parents data and identify issues
-- Run this in Supabase SQL Editor to debug

-- 1. Check if profiles table has status column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check existing parents and their data
SELECT 
  id,
  email,
  full_name,
  organization_id,
  status,
  created_at
FROM profiles
LIMIT 10;

-- 3. Check if parents have organizations linked
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.organization_id,
  p.status,
  o.name as organization_name,
  o.status as org_status
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
LIMIT 10;

-- 4. Count parents by status
SELECT 
  COALESCE(status, 'NULL') as status,
  COUNT(*) as count
FROM profiles
GROUP BY status;

