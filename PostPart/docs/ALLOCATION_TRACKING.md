# 📊 Allocation Tracking System

## Overview

The allocation tracking system automatically monitors and updates visit usage for organizations as parents check into day care centers. This document explains how the system works and how to maintain it.

---

## 🔄 How It Works

### 1. **Allocation Creation**
When an admin creates an allocation:
```
- Organization: ABC Corp
- Visit Limit: 20 visits
- Period: Monthly (e.g., Jan 1 - Jan 31)
- Visits Used: 0 (starts at zero)
```

### 2. **Automatic Increment on Check-in**
When a parent checks in to a day care center:
1. Parent scans QR code at center
2. Check-in record created in `checkins` table
3. **Database trigger automatically**:
   - Looks up parent's organization
   - Finds active allocation for that organization (based on current date)
   - Increments `visits_used` by 1
   - Updates `updated_at` timestamp

### 3. **Real-time Dashboard Updates**
The admin dashboard receives instant updates:
- No page refresh needed
- Progress bar updates automatically
- Visit count updates in real-time

---

## 📋 Database Components

### Tables Involved

#### `allocations`
```sql
- id: UUID (primary key)
- organization_id: UUID (foreign key to organizations)
- visit_limit: INTEGER (total visits allocated)
- visits_used: INTEGER (current usage count)
- period: TEXT ('monthly' | 'quarterly' | 'annually')
- period_start_date: DATE
- period_end_date: DATE
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `checkins`
```sql
- id: UUID (primary key)
- parent_id: UUID (foreign key to profiles)
- center_id: UUID (foreign key to centers)
- child_id: UUID (foreign key to children)
- check_in_time: TIMESTAMP
```

#### `profiles`
```sql
- id: UUID (primary key)
- organization_id: UUID (foreign key to organizations)
- full_name: TEXT
- status: TEXT ('active' | 'inactive' | 'suspended')
```

### Trigger Function

**Function**: `increment_allocation_on_checkin()`
**Trigger**: `on_checkin_increment_allocation`
**Fires**: AFTER INSERT ON checkins

**Logic Flow**:
```
1. Get parent's organization_id from profiles
2. If no organization → Skip (parent not associated)
3. Find active allocation where:
   - allocation.organization_id = parent.organization_id
   - CURRENT_DATE >= period_start_date
   - CURRENT_DATE <= period_end_date
4. If no active allocation → Skip (no allocation for this period)
5. Increment visits_used by 1
6. Update updated_at timestamp
```

---

## 🎯 Key Features

### 1. **Automatic Allocation Selection**
- Uses current date to find the correct allocation
- Handles multiple allocations per organization
- Only updates allocations within their active period

### 2. **Graceful Handling**
- Parents without organizations: Check-in succeeds, no allocation update
- No active allocation: Check-in succeeds, logged for admin review
- Multiple allocations: Uses most recent active one

### 3. **Real-time Updates**
- Admin dashboard subscribes to both:
  - `allocations` table changes (direct updates)
  - `checkins` table inserts (trigger-based updates)
- 500ms delay ensures trigger completes before refresh

### 4. **Progress Visualization**
```
Visual Progress Bar:
━━━━━━━━━━━━━━━━━━━━━━
[██████████░░░░░░░░░░] 50%
15 / 30 visits used

Color Coding:
- Pink: 0-79% (healthy usage)
- Red: 80-100% (approaching/at limit)
```

---

## 🛠️ Setup Instructions

### Step 1: Run Database Scripts

**In Supabase SQL Editor**, run these scripts in order:

1. **Fix RLS Policies** (if not already done)
```sql
-- /supabase/fix-allocations-rls.sql
-- Allows admins to create/manage allocations
```

2. **Create Trigger**
```sql
-- /supabase/trigger-update-allocation-on-checkin.sql
-- Auto-increments visits_used on check-in
```

3. **Enable Realtime**
```sql
-- /supabase/enable-allocations-realtime.sql
-- Enables instant updates in admin dashboard
```

### Step 2: Verify Setup

**Test the trigger**:
```sql
-- Check parent-organization associations
SELECT 
    p.id as parent_id,
    p.full_name as parent_name,
    p.organization_id,
    o.name as organization_name,
    a.id as allocation_id,
    a.visit_limit,
    a.visits_used,
    a.period_start_date,
    a.period_end_date
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN allocations a ON a.organization_id = p.organization_id
    AND CURRENT_DATE >= a.period_start_date::date
    AND CURRENT_DATE <= a.period_end_date::date
WHERE p.organization_id IS NOT NULL
ORDER BY p.full_name;
```

**Expected output**: Shows which parents are linked to organizations and their active allocations.

---

## 🔍 Troubleshooting

### Issue: Visits not incrementing

**Diagnosis**:
1. Check if trigger exists:
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_checkin_increment_allocation';
```

2. Check trigger logs:
```sql
-- Enable logging
SET client_min_messages TO NOTICE;

-- Then perform a check-in and watch for NOTICE messages
```

**Common causes**:
- Parent has no `organization_id` (not associated with organization)
- No active allocation exists for the current date
- Allocation period dates don't cover current date

### Issue: Dashboard not updating in real-time

**Diagnosis**:
1. Check browser console for realtime subscription logs
2. Verify allocations table is in realtime publication:
```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'allocations';
```

**Fix**: Run `/supabase/enable-allocations-realtime.sql`

### Issue: Permission denied when creating allocation

**Diagnosis**: RLS policy issue

**Fix**: Run `/supabase/fix-allocations-rls.sql`

---

## 📊 Usage Analytics

### Get allocation statistics
```sql
SELECT 
    o.name as organization,
    a.period,
    a.period_start_date,
    a.period_end_date,
    a.visit_limit,
    a.visits_used,
    ROUND((a.visits_used::numeric / a.visit_limit::numeric * 100), 2) as usage_percentage,
    CASE 
        WHEN a.visits_used >= a.visit_limit THEN 'At Limit'
        WHEN a.visits_used >= a.visit_limit * 0.8 THEN 'Near Limit'
        ELSE 'Healthy'
    END as status
FROM allocations a
JOIN organizations o ON a.organization_id = o.id
WHERE CURRENT_DATE BETWEEN a.period_start_date AND a.period_end_date
ORDER BY usage_percentage DESC;
```

### Find organizations exceeding limits
```sql
SELECT 
    o.name as organization,
    a.visit_limit,
    a.visits_used,
    (a.visits_used - a.visit_limit) as visits_over_limit
FROM allocations a
JOIN organizations o ON a.organization_id = o.id
WHERE a.visits_used > a.visit_limit
    AND CURRENT_DATE BETWEEN a.period_start_date AND a.period_end_date
ORDER BY visits_over_limit DESC;
```

### Audit trail for allocation changes
```sql
SELECT 
    al.created_at,
    al.activity_type,
    al.entity_name as organization,
    al.description,
    al.metadata
FROM activity_log al
WHERE al.entity_type = 'allocation'
ORDER BY al.created_at DESC
LIMIT 50;
```

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Email alerts when allocation reaches 80%
- [ ] Automatic allocation renewal at period end
- [ ] Detailed usage reports per organization
- [ ] Parent-level usage tracking within allocations
- [ ] Overage billing calculations
- [ ] Multi-tier allocation plans

### Potential Improvements
- [ ] Allocation history/archiving
- [ ] Predictive usage analytics
- [ ] Allocation transfer between organizations
- [ ] Custom allocation rules (e.g., weekday-only)

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review database logs in Supabase Dashboard
3. Check browser console for JavaScript errors
4. Verify all SQL scripts have been run successfully

---

**Last Updated**: January 2, 2026
**Version**: 1.0

