# 🔐 OTP Email Verification Setup

## ✨ What We're Using Now

**OTP (One-Time Password) Codes** instead of email confirmation links!

### Why This is Better:
✅ **Simpler** - No deep linking or redirects needed  
✅ **More Intuitive** - Users just enter a code  
✅ **Mobile-Friendly** - Perfect for mobile apps  
✅ **Better UX** - No leaving the app  
✅ **Works Everywhere** - No URL scheme configuration  

---

## 🎯 How It Works

### 1. **User Registration Flow**
```
User fills registration form
    ↓
Account created in Supabase
    ↓
Supabase sends 6-digit OTP code to email 📧
    ↓
User redirected to OTP verification screen
    ↓
User enters the 6-digit code
    ↓
Email verified ✅
    ↓
User can now sign in
```

### 2. **User Login Flow (Unverified)**
```
User tries to log in
    ↓
Supabase checks: "Email not confirmed"
    ↓
App shows: "Please verify your email"
    ↓
User clicks "Verify Now"
    ↓
Goes to OTP verification screen
    ↓
Enters code → Email verified ✅
    ↓
Can now sign in
```

---

## 🛠️ Supabase Configuration

### Step 1: Enable Email Confirmation with OTP

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **"Email Auth"** section
3. ✅ **Check** "Enable email confirmations"
4. Click **"Save"**

**That's it!** Supabase automatically sends OTP codes when this is enabled.

---

### Step 2: Customize OTP Email Template (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"**
3. Customize the template:

```html
<h2>Welcome to PostPart! 🏫</h2>

<p>Hi there,</p>

<p>Thanks for signing up for PostPart! To complete your registration, please use the verification code below:</p>

<div style="background-color: #f8f7f5; border: 2px solid #FF6B35; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
  <h1 style="color: #FF6B35; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: monospace;">
    {{ .Token }}
  </h1>
</div>

<p style="font-size: 14px; color: #666;">Or click this link to verify automatically:</p>
<p><a href="{{ .ConfirmationURL }}" style="color: #FF6B35;">Verify Email Address</a></p>

<p style="color: #666; font-size: 14px; margin-top: 30px;">This code expires in 60 minutes.</p>

<p style="color: #666; font-size: 14px;">If you didn't create an account with PostPart, you can safely ignore this email.</p>

<hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

<p style="color: #999; font-size: 12px;">Best regards,<br>The PostPart Team</p>
```

**Note:** `{{ .Token }}` is the 6-digit OTP code that Supabase automatically generates.

---

## 📱 App Screens Created

### ✅ New Screen: `verify-otp.tsx`

**Features:**
- 6-digit OTP input field
- Large, centered text for easy reading
- "Verify Email" button
- "Resend Code" button (in case user didn't get it)
- "Back to Login" option
- Shows the email address for confirmation
- Expiration reminder (60 minutes)

**Location:** `mobile/app/(auth)/verify-otp.tsx`

---

### ✅ Updated: Registration Screen

**Changes:**
- After successful signup:
  - Shows: "Check Your Email! 📧"
  - Message: "We sent a 6-digit verification code..."
  - Button: "Verify Now"
  - Redirects to OTP verification screen

---

### ✅ Updated: Login Screen

**Changes:**
- Detects "Email not confirmed" error
- Shows: "Email Not Verified"
- Message: "Please verify your email address..."
- Button: "Verify Now"
- Redirects to OTP verification screen

---

## 🧪 Testing the OTP Flow

### Test 1: New User Registration

1. **Open your app** (refresh browser)
2. Click **"Create Account"**
3. Fill in:
   - Full Name: Test User
   - Email: (use a real email you can access)
   - Password: test123
   - Confirm: test123
4. Click **"Create Account"**
5. See alert: **"Check Your Email! 📧"**
6. Click **"Verify Now"**
7. **Check your email inbox** (or spam folder)
8. Find the **6-digit code** (e.g., 123456)
9. **Enter the code** in the app
10. Click **"Verify Email"**
11. See: **"Email Verified! ✅"**
12. Click **"Sign In"**
13. Enter credentials and **sign in** ✅

---

### Test 2: Unverified User Login Attempt

1. Create account (don't verify)
2. Try to **sign in immediately**
3. See: **"Email Not Verified"**
4. Click **"Verify Now"**
5. Enter OTP code
6. Verify successfully
7. Go back and **sign in** ✅

---

### Test 3: Resend Code

1. On OTP verification screen
2. Wait (or pretend you didn't get the email)
3. Click **"Resend Code"**
4. Check email for **new code**
5. Enter new code
6. Verify successfully ✅

---

## 🔄 User Flow Diagram

```
┌─────────────────────┐
│  Welcome Screen     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Register Screen    │
│  (Fill form)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Alert:             │
│  "Check Email! 📧"  │
│  [Verify Now]       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Verify OTP Screen  │
│  Enter 6-digit code │
│  [Verify Email]     │
│  [Resend Code]      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Alert:             │
│  "Email Verified!"  │
│  [Sign In]          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Login Screen       │
│  Enter credentials  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Home Screen 🏠     │
└─────────────────────┘
```

---

## 📧 Email Format

Users will receive an email like:

```
Subject: Confirm Your PostPart Account

Welcome to PostPart! 🏫

Thanks for signing up! To complete your registration, 
please use the verification code below:

┌─────────────────────┐
│                     │
│      123456         │
│                     │
└─────────────────────┘

Or click this link to verify automatically:
[Verify Email Address]

This code expires in 60 minutes.

If you didn't create an account with PostPart, 
you can safely ignore this email.

Best regards,
The PostPart Team
```

---

## 🔧 Troubleshooting

### Code Not Received
- Check spam/junk folder
- Use "Resend Code" button
- Wait a minute and try again
- Check email address is correct

### Invalid Code Error
- Make sure you entered all 6 digits
- Code might have expired (60 min limit)
- Request a new code with "Resend Code"

### Can't Login After Verification
- Make sure verification was successful
- Check `auth.users` table: `email_confirmed_at` should not be NULL
- Try password reset if needed

### Manual Verification (if needed)
Run this SQL in Supabase:
```sql
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

---

## 🎯 Advantages of OTP vs Confirmation Links

| Feature | OTP Codes | Confirmation Links |
|---------|-----------|-------------------|
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Mobile Experience** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Setup Complexity** | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **No Redirects** | ✅ | ❌ |
| **Works Offline** | ✅ | ❌ |
| **User Stays in App** | ✅ | ❌ |
| **No URL Config** | ✅ | ❌ |

---

## ✅ What's Ready

- ✅ OTP verification screen created
- ✅ Registration flow updated
- ✅ Login flow updated  
- ✅ Resend code functionality
- ✅ Error handling
- ✅ User-friendly messages
- ✅ Beautiful UI matching PostPart theme

---

## 🚀 Next Steps

1. **Enable email confirmations** in Supabase (if not already)
2. **Test the flow** with a real email
3. **Customize email template** (optional)
4. **Test on mobile device** (Expo Go)

---

## 📊 Summary

**OTP verification is now live!** 🎉

Users will:
1. Register → Receive 6-digit code
2. Enter code in app
3. Email verified ✅
4. Can sign in

Much simpler than confirmation links!

