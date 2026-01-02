-- ================================================================
-- MAKE LEGACY US FIELDS NULLABLE IN CENTERS TABLE
-- ================================================================
-- This fixes the issue where zip_code and state fields are required
-- but we're now using Uganda-specific fields (district, region)
-- ================================================================

-- Disable RLS temporarily to make schema changes
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;

-- Make state column nullable if it exists (no longer required)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='centers' AND column_name='state'
    ) THEN
        ALTER TABLE centers ALTER COLUMN state DROP NOT NULL;
        RAISE NOTICE 'Made state column nullable';
    ELSE
        RAISE NOTICE 'state column does not exist (already migrated)';
    END IF;
END $$;

-- Make zip_code column nullable if it exists (no longer required)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='centers' AND column_name='zip_code'
    ) THEN
        ALTER TABLE centers ALTER COLUMN zip_code DROP NOT NULL;
        RAISE NOTICE 'Made zip_code column nullable';
    ELSE
        RAISE NOTICE 'zip_code column does not exist (already migrated)';
    END IF;
END $$;

-- Make phone column nullable if it exists (we removed contact info)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='centers' AND column_name='phone'
    ) THEN
        ALTER TABLE centers ALTER COLUMN phone DROP NOT NULL;
        RAISE NOTICE 'Made phone column nullable';
    ELSE
        RAISE NOTICE 'phone column does not exist (already migrated)';
    END IF;
END $$;

-- Make email column nullable if it exists (we removed contact info)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='centers' AND column_name='email'
    ) THEN
        ALTER TABLE centers ALTER COLUMN email DROP NOT NULL;
        RAISE NOTICE 'Made email column nullable';
    ELSE
        RAISE NOTICE 'email column does not exist (already migrated)';
    END IF;
END $$;

-- Re-enable RLS
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'centers'
    AND column_name IN ('state', 'zip_code', 'phone', 'email', 'district', 'region')
ORDER BY 
    column_name;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Display confirmation
SELECT 'Legacy US fields (state, zip_code) are now nullable. You can create centers using Uganda fields (district, region) only.' AS status;

