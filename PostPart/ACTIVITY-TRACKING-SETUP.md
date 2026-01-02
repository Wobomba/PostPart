# Activity Tracking System - Setup Instructions

## Overview
The activity tracking system logs all admin actions and displays them in the Dashboard's "Recent Activity" section. It also shows unassociated parents in "Pending Actions".

## 🗄️ Database Setup

Run the following SQL files **in order** in your Supabase SQL Editor:

### 1. Create Activity Log Table
**File**: `/supabase/create-activity-log.sql`

This creates:
- `activity_log` table to store all administrative actions
- Indexes for efficient queries
- RLS policies for authenticated users

### 2. Fix Profiles Update RLS (if not already done)
**File**: `/supabase/fix-profiles-update-rls.sql`

This allows admins to update parent profiles including the `organization_id` field.

### 3. Create Check-In Activity Trigger
**File**: `/supabase/trigger-log-checkin.sql`

This automatically logs check-ins to the activity_log table whenever a parent checks in.

## 📊 What Gets Tracked

### Automatic Tracking:
- ✅ **Check-ins**: Logged automatically via database trigger
- ✅ **Parent Organisation Assigned**: When a parent is first assigned to an organisation
- ✅ **Parent Organisation Updated**: When a parent is moved from one organisation to another
- ✅ **Parent Status Changed**: When a parent's status changes (active/inactive/suspended)
- ✅ **Parent Details Updated**: When other parent fields (name, phone) are changed

### Future: Can be added easily:
- Organisation created/updated/deleted
- Center created/updated/deleted
- Any other admin actions

## 🎯 Dashboard Features

### Pending Actions Section
Now shows:
1. **Parents Without Organisation** (NEW!)
   - Displays count of parents who registered but haven't been assigned to an organisation
   - Links to Parents page to assign them
   - Helps admins catch new registrations

2. **Unverified Centres**
   - Existing feature

3. **Recent Notifications**
   - Existing feature

### Recent Activity Table
Now shows:
- **Type**: Visual icon + activity type name
- **Organisation**: The organisation involved (if applicable)
- **Parent**: The parent involved
- **Activity**: Description of what happened
- **Time**: How long ago ("Just now", "5m ago", "2h ago", etc.)

Displays up to 30 most recent activities including:
- Check-ins
- Parent updates
- Organisation assignments
- Status changes
- And more!

## 🧪 Testing the System

### Test 1: Organisation Assignment
1. Go to **Dashboard** > **Pending Actions**
2. You should see unassociated parents (if any exist)
3. Click "Assign Now" to go to Parents page
4. Edit a parent and assign them to an organisation
5. Go back to Dashboard
6. Check **Recent Activity** - you should see "Parent assigned to Organisation"

### Test 2: Status Change
1. Go to **Parents** page
2. Click enable/disable on a parent
3. Go to Dashboard
4. Check **Recent Activity** - you should see "Status changed from X to Y"

### Test 3: Details Update
1. Go to **Parents** page
2. Edit a parent's name or phone
3. Go to Dashboard
4. Check **Recent Activity** - you should see "Details updated"

### Test 4: Check-In
1. Use the mobile app to check in
2. Go to Dashboard
3. Check **Recent Activity** - you should see the check-in appear

## 🔧 How It Works

### Activity Logging Function
Location: `/admin/src/utils/activityLogger.ts`

```typescript
import { logActivity, ActivityDescriptions } from '../utils/activityLogger';

// Example usage:
await logActivity({
  activityType: 'parent_status_changed',
  entityType: 'parent',
  entityId: parent.id,
  entityName: 'John Doe',
  description: 'John Doe status changed from active to inactive',
  metadata: {
    old_status: 'active',
    new_status: 'inactive',
  },
});
```

### Where Activities Are Logged

1. **ParentForm.tsx**: Logs when parent details, organisation, or status are updated
2. **Database Trigger**: Automatically logs check-ins
3. **Future**: Can be added to any admin action

## 🎨 Activity Type Icons

- 🟢 Check-ins: Green checkmark
- 🔵 Parent created/added: Blue people icon
- 🔴 Organisation assigned/updated: Pink business icon
- 🟣 Status/details changed: Purple info icon
- 🟠 Warnings: Orange warning icon

## 📈 Benefits

1. **Audit Trail**: Track all administrative actions
2. **Transparency**: See what's happening in real-time
3. **Accountability**: Know who did what and when
4. **Proactive Management**: Catch unassociated parents immediately
5. **Better UX**: Comprehensive activity feed for admins

## 🚀 Next Steps

After running the SQL files:
1. Refresh your admin dashboard
2. Check "Pending Actions" for unassociated parents
3. Make some changes (edit parent, change status, etc.)
4. Watch them appear in "Recent Activity"!

The system is fully operational and will track all future actions automatically! 🎉

