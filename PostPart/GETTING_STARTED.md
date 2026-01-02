# Getting Started with PostPart

Welcome to PostPart! This guide will help you set up and run both the mobile app and admin dashboard.

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Expo CLI (for mobile development)
- Supabase account

### 1. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

#### Set Up Database
1. Open SQL Editor in Supabase Dashboard
2. Copy and run the contents of `supabase/schema.sql`
3. Copy and run the contents of `supabase/seed.sql` for mock data

#### Create Admin User
1. Go to Authentication > Users in Supabase Dashboard
2. Click "Add User" > "Create new user"
3. Use email/password authentication
4. Example: `admin@postpart.com` / `SecurePassword123!`

### 2. Mobile App Setup

```bash
cd mobile
npm install
```

The Supabase credentials are already configured in `mobile/lib/supabase.ts`.

#### Run on iOS Simulator (Mac only)
```bash
npx expo start
# Press 'i' to open iOS simulator
```

#### Run on Android Emulator
```bash
npx expo start
# Press 'a' to open Android emulator
```

#### Run on Physical Device
```bash
npx expo start
# Scan QR code with Expo Go app
```

### 3. Admin Dashboard Setup

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Login with the admin credentials you created in Supabase.

## 📱 Testing the Mobile App

### Create a Test Parent Account

1. Open the mobile app
2. Click "Get Started" on welcome screen
3. Enter email address (e.g., `parent@test.com`)
4. Check email for magic link / OTP code
5. Verify and complete sign-up

### Add Parent Profile (via Supabase)

Since we don't have automatic profile creation yet, manually add the parent profile:

1. Go to Supabase Dashboard > Authentication > Users
2. Copy the UUID of your test parent user
3. Go to Table Editor > profiles
4. Insert new row:
   - id: [UUID from auth users]
   - email: parent@test.com
   - full_name: Test Parent
   - organization_id: `00000000-0000-0000-0000-000000000001` (TechCorp from seed data)

### Add Children

1. In mobile app, go to Profile tab
2. Click "+ Add" under Children section
3. Add child information:
   - First Name: Emma
   - Last Name: Test
   - Date of Birth: 2020-03-15

## 🖥️ Testing the Admin Dashboard

### 1. View Dashboard
- Navigate to `/dashboard` to see overview stats
- View recent check-ins

### 2. Manage Centers
- Go to Centers section
- See the 3 mock centers (Sunshine Learning, Little Stars, Rainbow Kids)
- Click on a center to see details

### 3. Generate QR Codes
1. Go to QR Codes section
2. Select a center from dropdown
3. Click "Generate QR Code"
4. Copy the QR code value (e.g., `POSTPART-10000000-0000-0000-0000-000000000001-1234567890`)

### 4. Test Check-In Flow
1. **Option A**: Use a QR code generator website to create a QR code from the value
2. **Option B**: Manually trigger check-in (for testing)

**Manual Test (via Supabase)**:
1. Go to Table Editor > center_qr_codes
2. Note the QR code value
3. In mobile app, scan a test QR code or use the value directly

### 5. Set Up Allocations
1. Go to Allocations section
2. Click "Create Allocation"
3. Select organization: TechCorp Inc
4. Set visit limit: 20
5. Period: Monthly
6. Submit

### 6. Send Notifications
1. Go to Notifications section
2. Fill in notification details:
   - Title: "Welcome to PostPart!"
   - Message: "Start using your childcare benefits today."
   - Type: Announcement
   - Priority: Normal
   - Send To: All Parents
3. Click "Send Notification"
4. Check mobile app Notifications tab

## 🔍 Complete Check-In Test

### End-to-End Flow

1. **Admin**: Generate QR code for "Sunshine Learning Center"
2. **Admin**: Print or display the QR code value
3. **Parent**: Open mobile app
4. **Parent**: Tap "Scan QR Code" on home screen
5. **Parent**: Grant camera permission (first time)
6. **Parent**: Scan the QR code (or enter value manually for testing)
7. **Parent**: Select child "Emma Test"
8. **Parent**: Confirm check-in
9. **Parent**: See success screen
10. **Admin**: View check-in in dashboard > recent activity
11. **Admin**: See allocation counter increment (if applicable)

## 📊 Key Features to Test

### Mobile App
- ✅ Authentication (OTP/Magic Link)
- ✅ Browse Centers
- ✅ View Center Details
- ✅ QR Code Scanning
- ✅ Check-In Flow
- ✅ View Access Logs (My Visits)
- ✅ Receive Notifications
- ✅ Manage Children Profiles
- ✅ View Profile Information

### Admin Dashboard
- ✅ Login
- ✅ Dashboard Overview
- ✅ View/Manage Centers
- ✅ Generate QR Codes
- ✅ Activate/Deactivate QR Codes
- ✅ Create Allocations
- ✅ Monitor Allocations
- ✅ Send Notifications
- ✅ View Check-In Logs

## 🔧 Troubleshooting

### Mobile App Issues

**"Error checking auth"**
- Check Supabase credentials in `mobile/lib/supabase.ts`
- Verify project URL and anon key are correct

**QR Scanner not working**
- Ensure camera permissions are granted
- Check Expo Camera package is installed
- Try restarting the Expo development server

**Check-in fails**
- Verify QR code is active in admin dashboard
- Check if parent has reached allocation limit
- Ensure child profile exists

### Admin Dashboard Issues

**Cannot login**
- Verify admin user exists in Supabase Authentication
- Check that you're using email/password (not OTP)
- Try password reset if needed

**Data not loading**
- Check browser console for errors
- Verify Supabase credentials in `admin/lib/supabase.ts`
- Ensure RLS policies are set up correctly

**QR codes not generating**
- Check admin user ID is valid
- Verify centers table has data
- Check center_qr_codes table permissions

## 📝 Next Steps

1. **Customize Theme**: Edit color values in `mobile/constants/theme.ts`
2. **Add More Centers**: Use admin dashboard or SQL editor
3. **Invite Parents**: Set up email invitation flow
4. **Deploy Edge Function**: Deploy the QR validation function to Supabase
5. **Set Up Push Notifications**: Configure FCM/APNs
6. **Add Analytics**: Integrate analytics platform
7. **Build Production Apps**: Use EAS Build for app store deployment

## 🆘 Support

If you encounter issues:
1. Check the main [README.md](./README.md)
2. Review Supabase logs in Dashboard
3. Check browser/app console for errors
4. Verify all dependencies are installed

## 🎉 Success!

You now have a fully functional B2B childcare access platform! Parents can check in at daycare centers using QR codes, and admins can manage everything from allocations to notifications.

Happy testing! 🏫

