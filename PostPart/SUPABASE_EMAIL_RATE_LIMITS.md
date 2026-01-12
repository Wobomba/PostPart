# 📧 Supabase Email Rate Limits Guide

## ⚠️ Rate Limits on Free Tier

Supabase enforces **strict rate limits** on email sending, including OTP codes:

### Default Limits (PER HOUR, NOT PER DAY):
- **Email endpoints** (signup, recover, etc.): **2 emails per hour** (combined)
- **OTP endpoint** (`/auth/v1/otp`): **30 OTPs per hour**
- **Per-user limit**: **1 OTP request per user every 60 seconds**

### Important Notes:
- ⚠️ **These are HOURLY limits, NOT daily limits**
- Limits reset every hour (rolling window)
- These limits apply to **both free and paid plans**
- Limits are **per project**, not per user
- If you hit the limit, you'll get a **429 (Too Many Requests)** error
- **Maximum per day**: ~48 emails (2/hour × 24 hours) and ~720 OTPs (30/hour × 24 hours)

---

## 🔍 How to Check if You've Hit the Limit

### 1. Check Supabase Auth Logs
1. Go to **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Look for errors with status `429` or messages like:
   - "rate limit exceeded"
   - "too many requests"
   - "email rate limit"

### 2. Check Error Messages in App
The app will now show a helpful message if you hit rate limits:
```
"Rate Limit Reached - You've requested too many codes. 
Please wait 60 seconds before requesting another code..."
```

---

## ✅ Solutions

### Solution 1: Wait and Retry (Quick Fix)
- **Per-user limit**: Wait **60 seconds** between OTP requests
- **Hourly limit**: Wait **1 hour** if you've exceeded 30 OTPs/hour

### Solution 2: Disable Email Confirmation (For Development/Testing)
**Best for:** Development, testing, demos

1. Go to **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. **Uncheck** "Confirm email"
3. Click **Save**

**Result:** Users can register and login immediately without email verification.

**Note:** Re-enable this before production for security!

---

### Solution 3: Set Up Custom SMTP (Recommended for Production)
**Best for:** Production apps, higher email volumes

#### Why Custom SMTP?
- ✅ **No rate limits** (or much higher limits)
- ✅ **Better deliverability** (less likely to go to spam)
- ✅ **Custom branding** in emails
- ✅ **More control** over email sending

#### How to Set Up:

1. **Choose an SMTP Provider:**
   - **SendGrid** (Free: 100 emails/day)
   - **Mailgun** (Free: 5,000 emails/month)
   - **AWS SES** (Very cheap, pay-as-you-go)
   - **Resend** (Free: 3,000 emails/month)
   - **Postmark** (Free: 100 emails/month)

2. **Get SMTP Credentials:**
   - Sign up for your chosen provider
   - Get SMTP host, port, username, password
   - Usually found in "SMTP Settings" or "API Keys"

3. **Configure in Supabase:**
   - Go to **Project Settings** → **Auth** → **SMTP Settings**
   - Enable **"Enable Custom SMTP"**
   - Enter your SMTP credentials:
     ```
     SMTP Host: smtp.sendgrid.net (example)
     SMTP Port: 587
     SMTP User: apikey
     SMTP Password: [your-api-key]
     Sender Email: noreply@yourapp.com
     Sender Name: PostPart
     ```
   - Click **Save**

4. **Test:**
   - Try registering a new user
   - Check if email arrives
   - Check spam folder if needed

---

### Solution 4: Use Email Testing Service (For Development)
**Best for:** Development without real emails

1. **Use a service like:**
   - **Mailtrap** (Free: 500 emails/month)
   - **MailHog** (Local development)
   - **Ethereal Email** (Free testing)

2. **Configure in Supabase** (same as Solution 3, but use testing SMTP)

---

## 🛠️ Code Improvements Made

The app now:
- ✅ Detects rate limit errors (429 status)
- ✅ Shows helpful error messages
- ✅ Prevents spam clicking on "Resend Code"
- ✅ Handles both per-user and hourly limits

---

## 📊 Rate Limit Details

### Email Endpoints (Combined Limit: 2/hour)
- `/auth/v1/signup` (registration emails)
- `/auth/v1/recover` (password reset emails)
- `/auth/v1/user` (email change confirmations)

### OTP Endpoint (30/hour)
- `/auth/v1/otp` (OTP verification codes)

### Per-User Limit
- **1 OTP per user every 60 seconds**
- Prevents spam/abuse from a single user

---

## 🚀 Recommended Setup

### For Development:
1. ✅ **Disable email confirmation** in Supabase
2. ✅ Users can register and login immediately
3. ✅ No rate limit issues

### For Production:
1. ✅ **Set up custom SMTP** (SendGrid, Mailgun, etc.)
2. ✅ **Keep email confirmation enabled**
3. ✅ **Monitor email delivery** in provider dashboard
4. ✅ **Set up email templates** for better UX

---

## 🔧 Troubleshooting

### "I'm not receiving OTP codes"
1. ✅ Check spam/junk folder
2. ✅ Wait 60 seconds if you just requested one
3. ✅ Check if you've hit the hourly limit (30 OTPs)
4. ✅ Check Supabase Auth Logs for errors
5. ✅ Verify email address is correct

### "Rate limit error (429)"
1. ✅ Wait 60 seconds (per-user limit)
2. ✅ Wait 1 hour (hourly limit)
3. ✅ Set up custom SMTP to avoid limits
4. ✅ Disable email confirmation for testing

### "Emails going to spam"
1. ✅ Set up custom SMTP with proper domain
2. ✅ Configure SPF/DKIM records
3. ✅ Use a professional sender email
4. ✅ Avoid spam trigger words in templates

---

## 📚 Resources

- [Supabase Rate Limits Docs](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase SMTP Setup](https://supabase.com/docs/guides/auth/auth-smtp)
- [SendGrid Free Tier](https://sendgrid.com/pricing/)
- [Mailgun Free Tier](https://www.mailgun.com/pricing/)

---

## ✅ Quick Checklist

- [ ] Check if you've hit rate limits (check Auth Logs)
- [ ] Wait 60 seconds between OTP requests
- [ ] For development: Disable email confirmation
- [ ] For production: Set up custom SMTP
- [ ] Test email delivery after SMTP setup
- [ ] Monitor email delivery rates

---

**Need Help?** Check Supabase Dashboard → Logs → Auth Logs for detailed error messages.

