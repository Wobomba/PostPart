# Center Images Migration Guide

## Overview
This migration adds support for multiple images per center (slideshow feature).

## Migration Script
**File**: `supabase/migrations/add_center_images.sql`

## What It Does

1. **Adds `images` column** to `centers` table
   - Type: `TEXT[]` (array of text)
   - Default: Empty array
   - Purpose: Stores up to 3 image URLs for center slideshow

2. **Migrates existing data**
   - If a center has `image_url`, it's automatically migrated to the `images` array
   - Existing `image_url` values are preserved

3. **Safe to run multiple times**
   - Uses `IF NOT EXISTS` checks
   - Won't duplicate data if run multiple times

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Copy and paste contents of `supabase/migrations/add_center_images.sql`
4. Click **Run**

### Option 2: Command Line
```bash
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/add_center_images.sql
```

## Verification

After running, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'centers' 
AND column_name = 'images';

-- Check migrated data
SELECT id, name, image_url, images 
FROM centers 
WHERE image_url IS NOT NULL 
LIMIT 5;
```

## Storage Setup

**IMPORTANT**: You need to create a Supabase Storage bucket for center images:

1. Go to Supabase Dashboard → Storage
2. Click **New Bucket**
3. Name: `center-images`
4. Public: **Yes** (so images can be accessed by mobile app)
5. File size limit: 5MB (recommended)
6. Allowed MIME types: `image/jpeg, image/png, image/webp`

### Storage Policies

Create RLS policies for the bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'center-images');

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'center-images');
```

## Next Steps

After migration:
1. ✅ Create storage bucket (see above)
2. ✅ Test image upload in admin dashboard
3. ✅ Verify slideshow works in mobile app
4. ✅ Test with existing centers (edit and add images)

