-- Update centers table to add services offered and operating hours
-- Remove contact information fields that are not needed

-- Drop contact information columns
ALTER TABLE centers DROP COLUMN IF EXISTS phone;
ALTER TABLE centers DROP COLUMN IF EXISTS email;

-- Add services_offered column (array of text)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS services_offered TEXT[];

-- Add operating_schedule column with specific categories
ALTER TABLE centers ADD COLUMN IF NOT EXISTS operating_schedule TEXT 
  CHECK (operating_schedule IN ('6am-6pm', '24/7', 'weekdays', 'weekends', 'custom'));

-- Add custom_hours column for custom schedules
ALTER TABLE centers ADD COLUMN IF NOT EXISTS custom_hours TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_centers_operating_schedule ON centers(operating_schedule);
CREATE INDEX IF NOT EXISTS idx_centers_services_offered ON centers USING GIN(services_offered);

-- Add comments for documentation
COMMENT ON COLUMN centers.services_offered IS 'Array of services offered by the day care centre (e.g., infant care, toddler programs, meals, etc.)';
COMMENT ON COLUMN centers.operating_schedule IS 'Operating hours category: 6am-6pm (standard day care), 24/7 (round the clock), weekdays (Mon-Fri), weekends (Sat-Sun), custom (see custom_hours)';
COMMENT ON COLUMN centers.custom_hours IS 'Custom operating hours description when operating_schedule is set to custom';

-- Common services offered by day care centres in Uganda
COMMENT ON COLUMN centers.services_offered IS 'Services like: Infant Care (0-12 months), Toddler Programs (1-3 years), Preschool (3-5 years), After School Care, Full Day Care, Half Day Care, Meals & Snacks, Educational Activities, Play & Recreation, Health Monitoring, Transportation, Weekend Care, Holiday Programs';

-- Display updated schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'centers' 
    AND column_name IN ('services_offered', 'operating_schedule', 'custom_hours', 'hours_of_operation')
ORDER BY 
    ordinal_position;

-- Show example of how to query centers by services
COMMENT ON TABLE centers IS 'Day care centres in Uganda. Query by services: WHERE ''Infant Care'' = ANY(services_offered)';

