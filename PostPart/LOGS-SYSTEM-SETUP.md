# Activity Logs System - Complete Setup Guide

## 🎯 Overview

A comprehensive **Activity Logs** page has been created to track ALL system activities including:
- User account creation
- Parent profile creation  
- Organisation assignments and changes
- Status changes
- Profile updates
- Check-ins
- And much more!

This keeps your Dashboard clean while providing a powerful troubleshooting and audit tool.

---

## 🗄️ Database Setup (Run in Order)

### Step 1: Create Activity Log Table
**File**: `/supabase/create-activity-log.sql`

Run this first to create the base activity_log table.

### Step 2: Update Activity Log with Account Creation
**File**: `/supabase/update-activity-log-with-account-creation.sql`

This adds:
- ✅ Expanded activity types (user accounts, errors, warnings, etc.)
- ✅ Automatic logging of user account creation
- ✅ Automatic logging of parent profile creation
- ✅ Database triggers for auth.users and profiles tables

### Step 3: Create Check-In Activity Trigger
**File**: `/supabase/trigger-log-checkin.sql`

Automatically logs check-ins to activity_log.

### Step 4: Fix Profiles Update RLS (If not already done)
**File**: `/supabase/fix-profiles-update-rls.sql`

Allows admins to update parent profiles.

---

## 📊 What's Been Created

### 1. Dedicated Logs Page (`/dashboard/logs`)

**Location**: `/admin/src/app/dashboard/logs/page.tsx`

**Features**:
- 📋 **Complete Activity Table**
  - Time (relative + absolute)
  - Activity Type with icons
  - Entity (what was affected)
  - Description (what happened)
  - Related entity (context)

- 🔍 **Powerful Filters**
  - Search by name, description, activity type
  - Filter by activity type (15+ types)
  - Filter by entity type (user, parent, organisation, center, etc.)

- 📑 **Pagination**
  - 10, 25, 50, or 100 rows per page
  - Navigate through thousands of logs
  - Shows total count

- 📊 **Statistics Dashboard**
  - Total activities
  - Filtered results
  - Active filters
  - Current page

- 💾 **Export Functionality**
  - Download filtered logs as JSON
  - Perfect for audits or external analysis

- 🔄 **Real-time Refresh**
  - One-click refresh button
  - Always see the latest activities

### 2. Updated Dashboard (`/dashboard`)

**Changes**:
- Shows only **10 most recent activities** (instead of 30)
- Added "**View All Logs →**" button to navigate to full logs page
- Dashboard stays clean and fast
- Full audit trail available when needed

### 3. Updated Navigation

**New Menu Item**:
- 📄 **Activity Logs** menu item added between "Allocations" and "Notifications"
- Uses document icon
- Easy access from anywhere in the admin panel

### 4. Enhanced Activity Tracking

**Now Tracks**:
- ✅ **User Account Created** - The moment someone signs up
- ✅ **Parent Profile Created** - When profile is completed
- ✅ **Organisation Assigned** - First time assignment
- ✅ **Organisation Changed** - Moving between organisations
- ✅ **Status Changed** - Active/Inactive/Suspended
- ✅ **Details Updated** - Name, phone, etc.
- ✅ **Check-ins** - Every check-in via mobile app
- ✅ **System Events** - Errors, warnings, etc.

**Metadata Included**:
- Old and new values for changes
- Email confirmation status
- Auth provider used
- Whether organisation was already assigned
- And more!

---

## 🎨 UI/UX Features

### Visual Indicators

**Activity Type Colors**:
- 🟢 Green: Created actions
- 🔵 Blue: Updated actions
- 🔴 Red: Deleted actions, errors
- 🟠 Orange: Status changes, warnings
- 🟣 Purple: Check-ins

**Entity Icons**:
- 👤 Person: User/Parent activities
- 🏢 Business: Organisation activities
- 📍 Location: Center activities
- ✅ Check: Check-ins
- ⚠️ Warning: Errors/Warnings
- ℹ️ Info: General activities

### Time Display
- **Relative**: "Just now", "5m ago", "2h ago", "3d ago"
- **Absolute**: Full date and time on hover

---

## 🧪 Testing the Logs System

### Test 1: Account Creation Logging
1. Create a new user account via the mobile app
2. Go to **Dashboard** > **Activity Logs**
3. You should see:
   - "User account created: [email]"
   - "New parent profile created: [name]"

### Test 2: Organisation Assignment
1. Go to **Parents** page
2. Edit a parent without an organisation
3. Assign them to an organisation
4. Check **Activity Logs**
5. Should see: "Parent assigned to Organisation"

### Test 3: Status Changes
1. Enable/disable a parent
2. Check **Activity Logs**
3. Should see: "Status changed from active to inactive"

### Test 4: Filtering
1. Go to **Activity Logs**
2. Use search box to find specific parent
3. Filter by "Activity Type" → "Account Created"
4. Filter by "Entity Type" → "Parent"
5. All filters work together

### Test 5: Export
1. Apply some filters
2. Click "Export Logs" button
3. JSON file downloads with filtered data

### Test 6: Pagination
1. Navigate through pages using bottom controls
2. Change rows per page (10, 25, 50, 100)
3. Check page numbers update correctly

---

## 🔧 How It Works

### Automatic Logging (Database Triggers)

**Account Creation**:
```sql
-- Triggers on auth.users INSERT
-- Logs: user_account_created
```

**Profile Creation**:
```sql
-- Triggers on profiles INSERT  
-- Logs: parent_created
```

**Check-ins**:
```sql
-- Triggers on checkins INSERT
-- Logs: checkin_completed
```

### Manual Logging (Application Code)

**ParentForm.tsx** logs:
- Organisation assignments
- Organisation changes
- Status changes
- Details updates

**Future**: Easy to add logging to:
- Organisation CRUD
- Center CRUD
- Allocation management
- Any admin action

### Logging Function

```typescript
import { logActivity } from '../utils/activityLogger';

await logActivity({
  activityType: 'parent_status_changed',
  entityType: 'parent',
  entityId: parent.id,
  entityName: 'John Doe',
  description: 'Status changed from active to inactive',
  metadata: {
    old_status: 'active',
    new_status: 'inactive',
  },
});
```

---

## 📈 Benefits

### For Admins:
1. **Complete Audit Trail** - Know exactly what happened and when
2. **Easy Troubleshooting** - Search and filter to find specific events
3. **User Onboarding Tracking** - See when accounts are created
4. **Activity Monitoring** - Track system usage patterns
5. **Export for Compliance** - Download logs for audits

### For Developers:
1. **Debugging** - See the sequence of events
2. **Error Tracking** - Log and review system errors
3. **Performance Monitoring** - Track activity patterns
4. **Extensible** - Easy to add new activity types

### For Business:
1. **Accountability** - Know who did what
2. **Security** - Audit trail for sensitive actions
3. **Reporting** - Data for analytics
4. **Compliance** - Meet regulatory requirements

---

## 🚀 Quick Start

1. **Run SQL Files** (in order):
   ```
   1. create-activity-log.sql
   2. update-activity-log-with-account-creation.sql
   3. trigger-log-checkin.sql
   4. fix-profiles-update-rls.sql (if needed)
   ```

2. **Restart Admin Dashboard**:
   ```bash
   cd admin && npm run dev
   ```

3. **Access Logs**:
   - Click "**Activity Logs**" in sidebar
   - Or go to: `http://localhost:3000/dashboard/logs`

4. **Test It**:
   - Create a test user on mobile
   - Edit a parent in admin
   - Watch activities appear in logs!

---

## 🎯 Activity Types Reference

| Activity Type | Description | Logged By |
|--------------|-------------|-----------|
| `user_account_created` | New user signed up | Auto (trigger) |
| `parent_created` | Parent profile completed | Auto (trigger) |
| `parent_organisation_assigned` | First org assignment | Manual (form) |
| `parent_organisation_updated` | Org changed | Manual (form) |
| `parent_status_changed` | Status change | Manual (form) |
| `parent_details_updated` | Name/phone updated | Manual (form) |
| `checkin_completed` | Check-in via mobile | Auto (trigger) |
| `organisation_created` | New org created | (Future) |
| `organisation_updated` | Org details changed | (Future) |
| `center_created` | New center added | (Future) |
| `system_error` | System error occurred | (Future) |
| `system_warning` | System warning | (Future) |

---

## 📝 Next Steps

### Easy Additions:
1. Add logging to Organisation CRUD operations
2. Add logging to Center CRUD operations
3. Log admin logins/logouts
4. Log allocation changes
5. Log QR code generations
6. Add email notifications for critical events
7. Add log retention policies
8. Add more export formats (CSV, PDF)

---

## ✅ Summary

You now have:
- ✅ Comprehensive activity logging system
- ✅ Dedicated Logs page with powerful filters
- ✅ Automatic logging of account creation
- ✅ Automatic logging of check-ins
- ✅ Manual logging of admin actions
- ✅ Export functionality
- ✅ Clean dashboard (only 10 recent activities)
- ✅ Complete audit trail for troubleshooting

**Your admin panel is now production-ready with enterprise-grade activity tracking!** 🎉

