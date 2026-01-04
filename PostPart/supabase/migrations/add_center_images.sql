-- Migration: Add images array to centers table for slideshow support
-- This migration adds support for multiple images per center (max 3)

-- Add images column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'centers' 
        AND column_name = 'images'
    ) THEN
        ALTER TABLE centers 
        ADD COLUMN images TEXT[] DEFAULT ARRAY[]::TEXT[];
        
        -- Add comment
        COMMENT ON COLUMN centers.images IS 'Array of image URLs for center slideshow (max 3 images)';
        
        -- Migrate existing image_url to images array if it exists
        UPDATE centers 
        SET images = ARRAY[image_url] 
        WHERE image_url IS NOT NULL 
        AND image_url != '' 
        AND (images IS NULL OR array_length(images, 1) IS NULL);
    END IF;
END $$;

