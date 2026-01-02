# Real-Time Updates System

## Overview

PostPart now features **instant, real-time updates** across the mobile app and admin dashboard using Supabase Realtime subscriptions. Users no longer need to refresh pages to see changes - everything updates automatically!

## Features Implemented

### 🔔 Mobile App - Instant Updates

#### 1. **Notifications (Home Screen)**
- **What**: Parents see new notifications instantly without refreshing
- **How**: Real-time subscription to `parent_notifications` table
- **Triggers**: When admin sends a bulk notification
- **User Experience**: Notification badge count updates immediately

#### 2. **Centres List (Centres Screen)**
- **What**: Centre list updates when centres are added, updated, or removed
- **How**: Real-time subscription to `centers` table (verified centres only)
- **Triggers**: 
  - Admin adds a new centre and marks it as verified
  - Admin updates centre details (name, location, capacity)
  - Admin changes centre verification status
  - Admin deletes a centre
- **User Experience**: Centre cards appear/disappear/update instantly

### 🖥️ Admin Dashboard - Instant Updates

#### 1. **Centres Page**
- **What**: Centre list and statistics update instantly
- **How**: Real-time subscription to `centers` table
- **Triggers**: 
  - New centre added
  - Centre details updated
  - Centre deleted
  - QR codes generated/revoked
- **User Experience**: No need to refresh page to see changes

#### 2. **Parents Page**
- **What**: Parent list updates when parent profiles change
- **How**: Real-time subscription to `profiles` table
- **Triggers**:
  - New parent signs up
  - Parent details updated (name, phone, organisation)
  - Parent status changed (active, inactive, suspended)
  - Parent assigned to organisation
- **User Experience**: Parent table refreshes automatically

#### 3. **Organisations Page**
- **What**: Organisation list updates instantly
- **How**: Real-time subscription to `organizations` table
- **Triggers**:
  - New organisation added
  - Organisation details updated
  - Organisation status changed
  - Organisation deleted
- **User Experience**: Organisation cards update without refresh

#### 4. **Bulk Notifications Page**
- **What**: Notification history updates when new notifications are sent
- **How**: Real-time subscription to `notifications` table
- **Triggers**: Admin sends a new bulk notification
- **User Experience**: History tab shows new notifications immediately

## Database Tables with Realtime Enabled

The following tables have real-time subscriptions enabled:

| Table | Mobile App | Admin Dashboard | Description |
|-------|-----------|----------------|-------------|
| `parent_notifications` | ✅ | ❌ | Notifications for parents |
| `notifications` | ❌ | ✅ | Bulk notification records |
| `centers` | ✅ | ✅ | Day care centres |
| `profiles` | ❌ | ✅ | Parent profiles |
| `organizations` | ❌ | ✅ | Business organisations |
| `checkins` | 🔄 | 🔄 | Check-in records (future) |
| `center_qr_codes` | 🔄 | 🔄 | QR codes (future) |
| `activity_log` | ❌ | 🔄 | Activity logs (future) |

✅ = Currently implemented  
❌ = Not needed  
🔄 = Planned for future

## How It Works

### Technical Implementation

1. **Database Setup**: Tables are added to Supabase realtime publication
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE parent_notifications;
   ALTER PUBLICATION supabase_realtime ADD TABLE centers;
   -- ... etc
   ```

2. **Client Subscriptions**: Components subscribe to table changes
   ```typescript
   const channel = supabase
     .channel('channel-name')
     .on('postgres_changes', {
       event: '*', // INSERT, UPDATE, DELETE
       schema: 'public',
       table: 'table_name',
     }, (payload) => {
       // Reload data when changes occur
       loadData();
     })
     .subscribe();
   ```

3. **Cleanup**: Subscriptions are cleaned up when components unmount
   ```typescript
   return () => {
     supabase.removeChannel(channel);
   };
   ```

## Setup Instructions

### Step 1: Enable Realtime on Database Tables

Run the following SQL script in your Supabase SQL Editor:

```bash
/supabase/enable-realtime-subscriptions.sql
```

This script will:
- ✅ Enable realtime on all relevant tables
- ✅ Verify which tables have realtime enabled
- ✅ Display a summary of enabled tables

### Step 2: Verify Realtime is Working

After running the script, the mobile app and admin dashboard will automatically:
- 📱 Start receiving real-time updates
- 🔄 Refresh data when changes occur
- 🚀 Provide instant user experience

No code changes or app restarts needed!

## Benefits

### For Parents (Mobile App)
- 🔔 Instant notification delivery
- 🏢 See new/updated centres immediately
- ⚡ Smoother, more responsive app experience
- 📱 No manual refreshing needed

### For Admins (Dashboard)
- 👥 See new parent sign-ups instantly
- 🏢 Centre updates appear immediately
- 📊 Real-time statistics
- 💼 Better collaboration (multiple admins can work simultaneously)
- 🚀 Improved workflow efficiency

## Performance Considerations

### Bandwidth Usage
- Realtime subscriptions use WebSocket connections (very efficient)
- Only changed data is sent, not entire tables
- Minimal impact on mobile data usage

### Battery Impact
- Realtime uses persistent WebSocket connections
- Optimized by Supabase for mobile devices
- Negligible battery impact in typical usage

### Scalability
- Supabase Realtime is built on PostgreSQL's LISTEN/NOTIFY
- Scales to thousands of concurrent connections
- No additional infrastructure needed

## Troubleshooting

### Realtime Updates Not Working?

1. **Check Database Setup**
   ```sql
   -- Verify tables have realtime enabled
   SELECT tablename FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

2. **Check Console Logs**
   - Mobile: Look for "change detected" logs
   - Admin: Check browser console for subscription logs

3. **Verify RLS Policies**
   - Ensure RLS policies allow SELECT on tables
   - Realtime requires proper read permissions

4. **Check Network Connection**
   - Realtime requires stable internet connection
   - WebSocket connection may fail on poor networks

### Common Issues

**Issue**: Updates delayed by several seconds
- **Cause**: Network latency or database load
- **Solution**: Normal behavior, updates typically arrive within 1-2 seconds

**Issue**: Realtime stops working after some time
- **Cause**: WebSocket connection dropped
- **Solution**: App automatically reconnects, refresh if persistent

**Issue**: High data usage
- **Cause**: Too many subscriptions or frequent updates
- **Solution**: Optimize subscriptions, filter by specific events

## Future Enhancements

### Planned Features
- 🔄 Real-time check-in notifications
- 📊 Live activity log updates
- 🎯 Selective field updates (reduce data transfer)
- 🔔 Push notifications integration
- 📱 Background sync for offline support

### Optimization Opportunities
- Add debouncing for rapid updates
- Implement selective field subscriptions
- Cache frequently accessed data
- Add reconnection strategies

## Security

### RLS (Row Level Security)
All realtime subscriptions respect RLS policies:
- ✅ Parents can only see their own notifications
- ✅ Parents can only see verified centres
- ✅ Admins can see all data (authenticated)

### Data Privacy
- Realtime only sends data users are authorized to see
- WebSocket connections are encrypted (WSS)
- No sensitive data exposed in realtime events

## Monitoring

### Admin Dashboard
- Check browser console for subscription status
- Look for "change detected" logs
- Monitor network tab for WebSocket connections

### Mobile App
- Use React Native Debugger
- Check console for realtime event logs
- Monitor network requests

## Related Documentation

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Bulk Notifications System](/docs/BULK_NOTIFICATIONS.md)
- [Activity Logging System](/docs/ACTIVITY_LOGGING.md)
- [Security Best Practices](/docs/SECURITY_PARENTS_MANAGEMENT.md)

---

**Last Updated**: January 2026  
**Version**: 1.0.0

