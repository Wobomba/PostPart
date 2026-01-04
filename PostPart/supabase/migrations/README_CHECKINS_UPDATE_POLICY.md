# Check-ins UPDATE Policy Migration

## Problem
Parents cannot update their own check-ins (e.g., set `check_out_time`) because there's no UPDATE RLS policy on the `checkins` table.

## Solution
This migration adds an UPDATE policy that allows parents to update their own check-ins.

## Migration Script
**File**: `supabase/migrations/add_checkins_update_policy.sql`

## What It Does

Adds an UPDATE policy to the `checkins` table:
- **Policy Name**: "Parents can update own check-ins"
- **Access**: Authenticated users only
- **Condition**: Users can only update check-ins where `parent_id` matches their `auth.uid()`
- **Purpose**: Allows parents to set `check_out_time` when checking out their children

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Click **New Query**
3. Copy and paste contents of `supabase/migrations/add_checkins_update_policy.sql`
4. Click **Run**

### Option 2: Command Line
```bash
psql -h your-db-host -U postgres -d your-database -f supabase/migrations/add_checkins_update_policy.sql
```

## Verification

After running, verify it worked:

```sql
-- Check if policy exists
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'checkins'
AND policyname = 'Parents can update own check-ins';
```

Expected: Should return 1 row with `cmd = 'UPDATE'`

## Why This Is Needed

Without this policy:
- Parents cannot update their check-ins
- Check-out functionality will fail with permission errors
- The `check_out_time` field cannot be set by parents

With this policy:
- Parents can update their own check-ins
- Check-out functionality works correctly
- Parents can set `check_out_time` when checking out

## Security

The policy is secure because:
- Only authenticated users can use it
- Users can only update check-ins where they are the parent (`auth.uid() = parent_id`)
- Users cannot update other parents' check-ins

