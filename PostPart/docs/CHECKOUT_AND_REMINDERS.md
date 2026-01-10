# Check-Out and Reminder Notification System

## Overview

This document describes the check-out functionality and pickup reminder notification system implemented in the PostPart application.

## Features

### 1. Check-Out Functionality

#### Mobile App
- **Check-Out Screen**: Parents can check out their children after picking them up from daycare centers
- **Active Check-In Display**: Home screen shows an "Active Check-In" card when a child is checked in but not checked out
- **Check-Out Success Screen**: Confirmation screen after successful check-out

#### Admin Dashboard
- **Check-Out Data Display**: All check-in tables now show check-out times
- **Active Status Indicators**: Active check-ins (without check-out) are marked with a "Active" chip
- **Activity Timeline**: Check-out events appear in the activity timeline with a distinct icon

### 2. Pickup Reminder Notifications

#### How It Works
- **Automatic Reminders**: System automatically sends reminder notifications to parents 30 minutes before their daycare center's closing time
- **Operating Hours Parsing**: Supports multiple formats:
  - "6am-6pm" or "6am - 6pm"
  - "9:00 AM - 5:00 PM"
  - Custom hours from `custom_hours` field
- **Smart Filtering**: Only sends reminders to:
  - Parents with active check-ins (checked in but not checked out)
  - Active parents (status = 'active')
  - Centers with valid operating hours

#### Reminder Timing
- Reminders are sent 30 minutes before the center's closing time
- Example: If a center closes at 6pm, reminders are sent between 5:30pm and 6pm
- Only one reminder per center per day (prevents duplicate notifications)

### 3. Activity Logging

All check-out and reminder activities are logged in the activity log:
- `checkout_completed`: When a parent checks out their child
- `pickup_reminder_sent`: When a reminder notification is sent

## Database Changes

### Schema Updates
- Added `check_out_time` column to `checkins` table
- Created indexes for faster queries on active check-ins

### Migration
Run the migration script to add the check-out column:
```sql
-- See: supabase/migrations/add_checkout_time.sql
```

## API Endpoints

### Reminder Notifications
- **POST/GET** `/api/reminders`: Triggers reminder check manually
  - Can be called by cron jobs or scheduled tasks
  - Returns success/error status

## Setting Up Reminder Notifications

### Option 1: Cron Job (Recommended)
Set up a cron job to call the reminder API every 15 minutes:

```bash
# Add to crontab (crontab -e)
*/15 * * * * curl -X POST http://your-domain.com/api/reminders
```

### Option 2: Next.js API Route with Vercel Cron
If using Vercel, add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

### Option 3: Manual Testing
You can manually trigger reminders by calling:
```bash
curl http://localhost:3000/api/reminders
```

## Mobile App Usage

### Checking Out
1. Parent opens the mobile app
2. If there's an active check-in, an "Active Check-In" card appears on the home screen
3. Parent taps "Check Out" button
4. Check-out screen shows:
   - Child name
   - Center name
   - Check-in time
   - Duration of stay
5. Parent confirms check-out
6. Success screen confirms completion

## Admin Dashboard Features

### Check-In Tables
All check-in displays now include:
- **Check-In Time**: When the child was checked in
- **Check-Out Time**: When the child was checked out (if completed)
- **Status**: "Active" chip for ongoing check-ins, timestamp for completed ones

### Activity Timeline
- Check-in events: Green checkmark icon
- Check-out events: Blue exit icon
- Reminder events: Orange notification icon

### Filtering
- Filter by active check-ins (no check-out time)
- Filter by completed check-ins (has check-out time)
- Date range filtering works for both check-in and check-out times

## Reminder Notification Details

### Notification Content
- **Title**: "Time to Pick Up Your Child"
- **Message**: Includes center name and closing time
- **Type**: Reminder
- **Priority**: High

### Activity Log Metadata
Each reminder activity log includes:
- Center closing hour
- Reminder sent timestamp
- Parent and child information

## Technical Implementation

### Files Created/Modified

#### Mobile App
- `mobile/app/check-out.tsx`: Check-out screen
- `mobile/app/check-out-success.tsx`: Success confirmation screen
- `mobile/app/(tabs)/home.tsx`: Added active check-in display

#### Admin Dashboard
- `admin/src/utils/reminderNotifications.ts`: Reminder notification logic
- `admin/src/app/api/reminders/route.ts`: API endpoint for reminders
- Updated all dashboard pages to show check-out data

#### Database
- `supabase/schema.sql`: Added `check_out_time` column
- `supabase/migrations/add_checkout_time.sql`: Migration script

#### Shared Types
- `shared/types/index.ts`: Updated `CheckIn` interface

## Future Enhancements

Potential improvements:
1. Customizable reminder timing (not just 30 minutes)
2. Multiple reminders (e.g., 1 hour before, 30 min before)
3. SMS/Email reminders in addition to in-app notifications
4. Check-out QR code scanning
5. Automatic check-out if child is not picked up by closing time

