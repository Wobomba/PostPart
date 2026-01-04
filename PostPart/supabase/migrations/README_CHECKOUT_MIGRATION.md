# Check-Out Feature Migration Guide

## Overview
This guide explains how to add the check-out functionality to your existing PostPart database.

## Migration Script
**File**: `supabase/migrations/add_checkout_time.sql`

## When to Run This Migration

### Scenario 1: Fresh Database Setup
If you're setting up a **new database from scratch**, you don't need to run this migration because:
- The `schema.sql` file already includes the `check_out_time` column
- Just run `schema.sql` as usual

### Scenario 2: Existing Database
If you have an **existing database** that was created before the check-out feature was added, you **MUST** run this migration.

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/add_checkout_time.sql`
5. Click **Run** (or press Ctrl+Enter)

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
# Or manually:
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/add_checkout_time.sql
```

### Option 3: Direct Database Connection
```bash
# Using psql
psql -h your-db-host -U postgres -d your-database-name -f supabase/migrations/add_checkout_time.sql
```

## What the Migration Does

1. **Adds `check_out_time` column** (if it doesn't exist)
   - Type: `TIMESTAMP WITH TIME ZONE`
   - Nullable: Yes (existing check-ins won't have a check-out time)
   - Safe: Uses `IF NOT EXISTS` check, won't fail if column already exists

2. **Creates performance indexes**:
   - `idx_checkins_check_out_time`: Partial index for active check-ins (where `check_out_time IS NULL`)
   - `idx_checkins_times`: Composite index for queries filtering by both check-in and check-out times

## Verification

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'checkins' 
AND column_name = 'check_out_time';

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'checkins'
AND indexname IN ('idx_checkins_check_out_time', 'idx_checkins_times');
```

Expected results:
- Column should exist with `data_type = 'timestamp with time zone'` and `is_nullable = 'YES'`
- Both indexes should exist

## Rollback (If Needed)

If you need to remove the check-out feature:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_checkins_check_out_time;
DROP INDEX IF EXISTS idx_checkins_times;

-- Remove column (WARNING: This will delete check-out data!)
ALTER TABLE checkins DROP COLUMN IF EXISTS check_out_time;
```

## Order of Execution

**IMPORTANT**: This migration is **standalone** and can be run at any time. It doesn't depend on other migrations.

However, if you're setting up a new database, the recommended order is:

1. **First**: Run `schema.sql` (creates all tables including checkins with check_out_time)
2. **Then**: Run any other setup scripts (seed data, RLS policies, etc.)
3. **Skip**: The migration script (not needed for fresh installs)

For existing databases:
1. **Just run**: `supabase/migrations/add_checkout_time.sql`
2. That's it! The script is safe to run multiple times.

## Troubleshooting

### Error: "column already exists"
- This means the column was already added (maybe from schema.sql)
- The migration script handles this gracefully, but if you see this error, it's safe to ignore
- The script uses `IF NOT EXISTS` checks, so it should not fail

### Error: "permission denied"
- Make sure you're using a database user with ALTER TABLE permissions
- For Supabase, use the service role key or postgres user

### Index creation fails
- The indexes use `IF NOT EXISTS`, so they won't fail if already created
- If you see errors, check your database user permissions

## Next Steps

After running the migration:
1. ✅ Test check-out functionality in the mobile app
2. ✅ Verify check-out data appears in admin dashboard
3. ✅ Set up reminder notification cron job (see `docs/CHECKOUT_AND_REMINDERS.md`)

