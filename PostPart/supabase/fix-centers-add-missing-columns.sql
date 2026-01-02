-- Add all missing columns to centers table
-- This fixes the map_link and other column errors

-- Add map_link column if it doesn't exist (for Google Maps links)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS map_link TEXT;

-- Add image_url column if it doesn't exist (for center images)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure latitude and longitude columns exist
ALTER TABLE centers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE centers ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Ensure age_range exists
ALTER TABLE centers ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Ensure description exists
ALTER TABLE centers ADD COLUMN IF NOT EXISTS description TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_centers_latitude_longitude ON centers(latitude, longitude);

-- Add comments
COMMENT ON COLUMN centers.map_link IS 'Link to Google Maps or other mapping service for center location';
COMMENT ON COLUMN centers.image_url IS 'URL to center image or photo';
COMMENT ON COLUMN centers.latitude IS 'GPS latitude coordinate';
COMMENT ON COLUMN centers.longitude IS 'GPS longitude coordinate';

-- Force PostgREST to reload the schema cache
-- This is important to make the new columns immediately available
NOTIFY pgrst, 'reload schema';

-- Display all columns in centers table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'centers'
ORDER BY 
    ordinal_position;

