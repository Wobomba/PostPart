# Quick Start: Check-Out Feature Migration

## For Existing Databases

**Run this ONE script:**
```
supabase/migrations/add_checkout_time.sql
```

That's it! The script is safe and idempotent (can be run multiple times).

## For New Databases

**No migration needed!** The `schema.sql` already includes the `check_out_time` column.

## How to Run

### Supabase Dashboard (Easiest)
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `supabase/migrations/add_checkout_time.sql`
3. Click Run

### Command Line
```bash
psql -h your-host -U postgres -d your-db -f supabase/migrations/add_checkout_time.sql
```

## Verify It Worked

```sql
-- Should return 1 row
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'checkins' AND column_name = 'check_out_time';
```

