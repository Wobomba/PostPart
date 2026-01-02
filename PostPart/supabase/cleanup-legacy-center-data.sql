-- Clean up legacy center data (optional - run this after adding missing columns)
-- This script removes or updates old US-based location data

-- Option 1: Clear legacy US-based district values (recommended)
-- UPDATE centers 
-- SET district = NULL 
-- WHERE district NOT IN ('Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Mbale',
--   'Gulu', 'Lira', 'Mbarara', 'Fort Portal', 'Masaka', 'Kabale',
--   'Soroti', 'Arua', 'Hoima', 'Kasese', 'Iganga', 'Tororo',
--   'Bushenyi', 'Mityana', 'Masindi', 'Mubende', 'Kabarole');

-- Option 2: Show centers with legacy data that need manual review
SELECT 
    id,
    name,
    city,
    district,
    region,
    'Legacy district value - please update manually' as note
FROM 
    centers
WHERE 
    district IS NOT NULL 
    AND district NOT IN ('Kampala', 'Wakiso', 'Mukono', 'Entebbe', 'Jinja', 'Mbale',
      'Gulu', 'Lira', 'Mbarara', 'Fort Portal', 'Masaka', 'Kabale',
      'Soroti', 'Arua', 'Hoima', 'Kasese', 'Iganga', 'Tororo',
      'Bushenyi', 'Mityana', 'Masindi', 'Mubende', 'Kabarole');

-- Show all centers for review
SELECT 
    id,
    name,
    city,
    district,
    region,
    services_offered,
    operating_schedule,
    is_verified,
    created_at
FROM 
    centers
ORDER BY 
    created_at DESC;

