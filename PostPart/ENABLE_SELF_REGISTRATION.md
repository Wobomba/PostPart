# FIX: Enable Self-Registration for Mobile App

## The Issue
When setting up admin user management, Supabase Auth was configured to:
- ❌ Disable public signups (only admins can create users)
- ❌ Require email invitations
- ❌ Block anonymous/public registration

This is why mobile app users can't self-register!

## SOLUTION: Enable Public Signups

### Step 1: Enable Email Provider for Public Signup

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication → Providers**
3. Click on **Email**
4. **Check these settings:**
   - ✅ **Enable Email provider** - Should be ON
   - ✅ **Enable Signup** - This MUST be enabled!
   - ⚠️ **Confirm email** - Can be enabled or disabled (try disabled first for testing)
   - ✅ **Autoconfirm users** - Enable this to skip email verification during testing

5. Click **Save**

### Step 2: Check Auth Settings

1. Go to **Authentication → Settings**
2. Under **"Auth Settings"** section:
   - ✅ **Allow new users to sign up** - MUST be enabled
   - ⚠️ **Email confirmations** - Can disable for testing

3. Click **Save**

### Step 3: Check Site URL Configuration

1. Go to **Authentication → URL Configuration**
2. Make sure these are set:
   - **Site URL**: Your app's URL (for mobile, can be the Expo URL)
   - **Redirect URLs**: Add your mobile app URLs

## Why This Happens

When you create a "production-ready" admin setup:
- Public signups are often disabled for security
- Only invited users or admin-created users are allowed
- This is perfect for admin management BUT blocks mobile app self-registration

## The Fix

We need **TWO types of user creation to coexist:**

1. **Public Signup (Mobile App)**: 
   - Users can self-register
   - Account created with `inactive` status
   - Admin must approve by changing status to `active`

2. **Admin Creation (Dashboard)**:
   - Admins can create users directly
   - Can assign roles immediately
   - Can set status directly

## Configuration Required

### In Supabase Dashboard:

```
Authentication → Providers → Email
├── ✅ Enable Email provider: ON
├── ✅ Enable Signup: ON (THIS IS KEY!)
├── ⚠️ Confirm email: OFF (for testing, enable later)
└── ✅ Secure email change: ON

Authentication → Settings
├── ✅ Allow new users to sign up: ON (CRITICAL!)
├── ⚠️ Email confirmations: Disabled (for testing)
└── ✅ Enable email provider: ON
```

## After Enabling Public Signup

The flow will be:
```
Mobile User Registers (self-signup)
   ↓
Supabase Auth creates user in auth.users ✓
   ↓
Trigger creates profile with status='inactive' ✓
   ↓
User can login but is inactive
   ↓
On first login: Organization selection modal
   ↓
Admin sees user in dashboard and approves (changes status to 'active')
   ↓
User can now fully use the app ✓
```

## Testing

After enabling:
1. Try creating an account in mobile app
2. Should succeed without "Database error"
3. User should be created with `inactive` status
4. Admin can then approve the user

## Security Note

This setup is still secure because:
- New users start as `inactive`
- They can't access full features until admin approves
- Organization selection helps admins categorize users
- Admins maintain full control over active users












