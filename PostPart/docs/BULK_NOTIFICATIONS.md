# Bulk Notifications System Documentation

## Overview
The Bulk Notifications System allows administrators to send targeted messages to parents through the mobile application, with comprehensive tracking and logging capabilities.

## Features

### 1. Bulk Notification Sending
- **Route**: `/dashboard/bulk-notifications`
- **Purpose**: Send notifications to multiple parents simultaneously

#### Notification Types:
- **Announcement**: General updates and news
- **Reminder**: Time-sensitive reminders
- **Alert**: Urgent information requiring immediate attention
- **Centre Update**: Information about specific day care centres
- **Approval Required**: Actions that need parent approval

#### Priority Levels:
- **High**: Critical information (red badge)
- **Normal**: Standard messages (blue badge)
- **Low**: Non-urgent information (grey badge)

#### Targeting Options:
- **All Active Parents**: Send to every active parent in the system
- **Specific Organisation**: Target parents from a particular organisation
- **Individual Parent**: Send to a single parent (future feature)

### 2. Notification Bell (Pending Actions)
- **Location**: Top-right corner of dashboard (all pages)
- **Purpose**: Alert admins about items requiring action

#### Tracked Items:
1. **Parents Without Organisation** (High Priority)
   - Shows count of active parents not assigned to any organisation
   - Links to: `/dashboard/parents?filter=no_organisation`

2. **Inactive Organisations** (Medium Priority)
   - Shows count of organisations with inactive status
   - Links to: `/dashboard/organizations?status=inactive`

3. **Unverified Centres** (Medium Priority)
   - Shows count of centres pending verification
   - Links to: `/dashboard/centers?status=unverified`

4. **Suspended Parents** (Low Priority)
   - Shows count of suspended parents needing review
   - Links to: `/dashboard/parents?status=suspended`

#### Features:
- Real-time badge count showing total pending actions
- Auto-refresh every 5 minutes
- Color-coded by priority
- One-click navigation to relevant pages

### 3. Notification History
- **Tab**: "History" in Bulk Notifications page
- **Shows**: All sent notifications with metrics

#### Displayed Information:
- Date and time sent
- Title and message
- Type and priority (color-coded chips)
- Target audience
- Recipient count
- View details button

## Database Schema

### Tables

#### `notifications`
```sql
- id: UUID (Primary Key)
- title: TEXT (Notification title)
- message: TEXT (Notification content)
- type: TEXT (announcement|reminder|approval|center_update|alert)
- priority: TEXT (low|normal|high)
- target_type: TEXT (all|organization|center|individual)
- target_id: UUID (Optional - ID of target entity)
- created_by: UUID (Admin user ID)
- created_at: TIMESTAMPTZ
- expires_at: TIMESTAMPTZ (Optional)
```

#### `parent_notifications`
```sql
- id: UUID (Primary Key)
- notification_id: UUID (Foreign Key -> notifications)
- parent_id: UUID (Foreign Key -> profiles)
- is_read: BOOLEAN (Default: false)
- read_at: TIMESTAMPTZ (When parent read it)
- created_at: TIMESTAMPTZ
```

### Views

#### `notification_stats`
Provides aggregated statistics for each notification:
- Total recipients
- Read count
- Unread count
- Read percentage

### Triggers

#### `on_notification_create`
- **Function**: `log_notification_send()`
- **Purpose**: Automatically logs notification sends to `activity_log`
- **Triggered**: After INSERT on notifications table

## Security

### Row Level Security (RLS)

#### Notifications Table:
- **Admins**: Can read and create all notifications
- **Parents**: Cannot access directly (use parent_notifications)

#### Parent Notifications Table:
- **Admins**: Can read all and create entries
- **Parents**: Can read and update (mark as read) their own notifications only

### Audit Logging
Every notification send is automatically logged to `activity_log` with:
- Notification type
- Priority level
- Target type
- Admin user ID
- Recipient count (via metadata)

## Usage Guide

### Sending a Bulk Notification

1. Navigate to **Bulk Notifications** from sidebar
2. Fill in notification details:
   - **Title**: Short, descriptive title
   - **Message**: Full notification content
   - **Type**: Select appropriate type
   - **Priority**: Set based on urgency
   - **Send To**: Choose target audience

3. Select target (if not "All Active Parents"):
   - **Organisation**: Choose from dropdown

4. Review estimated recipient count
5. Click "Send to X Parents" button
6. Notification is:
   - Created in database
   - Linked to target parents
   - Logged in activity log
   - Visible in mobile app

### Viewing Notification History

1. Go to Bulk Notifications page
2. Click "History" tab
3. View list of all sent notifications
4. Click eye icon to view full details
5. Check recipient counts and statistics

### Managing Pending Actions

1. Look for notification bell icon (top-right)
2. Badge shows total pending action count
3. Click bell to view dropdown
4. Review pending items (color-coded by priority)
5. Click any item to navigate to relevant page
6. Address the pending action
7. Bell count updates automatically

## API Integration

### Creating Notification (Admin)
```typescript
const { data, error } = await supabase
  .from('notifications')
  .insert({
    title: 'New Feature',
    message: 'Check out our latest update!',
    type: 'announcement',
    priority: 'normal',
    target_type: 'all',
    created_by: adminUserId,
  })
  .select()
  .single();
```

### Linking to Parents
```typescript
// Get target parents
const { data: parents } = await supabase
  .from('profiles')
  .select('id')
  .eq('status', 'active')
  .eq('organization_id', targetOrgId); // If targeting organization

// Create parent_notifications entries
const notifications = parents.map(parent => ({
  notification_id: notificationId,
  parent_id: parent.id,
}));

await supabase
  .from('parent_notifications')
  .insert(notifications);
```

### Checking Pending Actions
```typescript
// Unassociated parents
const { count } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .is('organization_id', null)
  .eq('status', 'active');
```

## Mobile App Integration

Parents receive notifications in the mobile app through the `parent_notifications` table. The mobile app should:

1. Query for unread notifications on app launch
2. Display notification badge count
3. Show list of notifications
4. Allow marking as read
5. Auto-refresh periodically

### Example Mobile Query:
```typescript
const { data: notifications } = await supabase
  .from('parent_notifications')
  .select(`
    *,
    notification:notifications(*)
  `)
  .eq('parent_id', parentId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

## Statistics and Reporting

### Notification Delivery Rate
```sql
SELECT * FROM notification_stats
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Most Effective Notification Type
```sql
SELECT 
  type,
  COUNT(*) as sent_count,
  AVG(read_percentage) as avg_read_rate
FROM notification_stats
GROUP BY type
ORDER BY avg_read_rate DESC;
```

### Recent Bulk Sends
```sql
SELECT 
  title,
  target_type,
  total_recipients,
  read_percentage,
  created_at
FROM notification_stats
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Best Practices

### For Admins:
1. **Use Appropriate Priority**: Reserve "high" for truly urgent matters
2. **Target Wisely**: Don't spam all parents unnecessarily
3. **Clear Titles**: Make the subject immediately clear
4. **Actionable Messages**: Tell parents what they need to do
5. **Review History**: Check engagement rates to improve messaging

### For Development:
1. **Test Targeting**: Always verify recipient count before sending
2. **Monitor Logs**: Check activity_log for successful sends
3. **Handle Errors**: Implement proper error handling
4. **Rate Limiting**: Consider adding rate limits for bulk sends
5. **Analytics**: Track read rates to improve effectiveness

## Troubleshooting

### Notifications Not Appearing for Parents
1. Check RLS policies on parent_notifications
2. Verify parent_id matches profile.id
3. Ensure parent status is 'active'
4. Check mobile app is querying correctly

### High Unread Rates
1. Review notification timing (send during active hours)
2. Check message clarity
3. Verify notification type matches content
4. Consider priority level adjustment

### Pending Actions Not Showing
1. Refresh browser/page
2. Check database for actual pending items
3. Verify RLS policies allow admin read access
4. Check console for JavaScript errors

## Future Enhancements

### Potential Features:
1. **Scheduled Notifications**: Send at specific future times
2. **Recurring Notifications**: Automatic periodic messages
3. **Rich Media**: Include images or links
4. **Push Notifications**: Integration with mobile push services
5. **A/B Testing**: Test different message versions
6. **Templates**: Pre-written notification templates
7. **Analytics Dashboard**: Detailed engagement metrics
8. **Response Tracking**: Track parent actions after notification

## Files Reference

### Admin Dashboard:
- `/admin/src/app/dashboard/bulk-notifications/page.tsx` - Main notification interface
- `/admin/src/components/NotificationBell.tsx` - Pending actions bell
- `/admin/src/components/DashboardLayout.tsx` - Layout with bell integration

### Database:
- `/supabase/bulk-notifications-system.sql` - Complete setup migration

### Documentation:
- `/docs/BULK_NOTIFICATIONS.md` - This file

## Support

For issues or questions:
1. Check activity_log for error details
2. Review notification_stats for metrics
3. Verify RLS policies are correctly set
4. Contact system administrator

**Last Updated:** January 2, 2026
**Version:** 1.0

