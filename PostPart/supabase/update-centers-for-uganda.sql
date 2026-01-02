-- Update centers table to remove US state field and adjust for Uganda location
-- This script removes the state column and updates location fields appropriately

-- Remove the state column from centers table
ALTER TABLE centers DROP COLUMN IF EXISTS state;

-- Add district column (Uganda uses districts instead of states)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS district TEXT;

-- Add region column (Uganda has regions like Central, Eastern, Northern, Western)
ALTER TABLE centers ADD COLUMN IF NOT EXISTS region TEXT CHECK (region IN ('Central', 'Eastern', 'Northern', 'Western', NULL));

-- Update existing records to have default values if needed
UPDATE centers SET district = city WHERE district IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_centers_district ON centers(district);
CREATE INDEX IF NOT EXISTS idx_centers_region ON centers(region);

-- Add comments for documentation
COMMENT ON COLUMN centers.city IS 'City or town name in Uganda (e.g., Kampala, Entebbe, Jinja)';
COMMENT ON COLUMN centers.district IS 'District name in Uganda (e.g., Kampala, Wakiso, Mukono)';
COMMENT ON COLUMN centers.region IS 'Region in Uganda: Central, Eastern, Northern, or Western';

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
    AND column_name IN ('city', 'district', 'region', 'address')
ORDER BY 
    ordinal_position;

