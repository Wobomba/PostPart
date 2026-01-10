# FIX OTP VERIFICATION - 403 Forbidden Error

## 🎉 GOOD NEWS
Registration is working! User accounts are being created successfully!

## ❌ CURRENT ISSUE
OTP verification returning 403 Forbidden - "Token has expired or is invalid"

---

## 🔧 SOLUTION 1: Disable Email Confirmation (Recommended for Testing)

### Go to Supabase Dashboard:

1. **Navigate to:**
   ```
   Authentication → Providers → Email
   ```

2. **Find these settings:**
   - ✅ **Enable Email provider** = ON
   - ✅ **Enable Signup** = ON
   - ⚠️ **Confirm email** = **TURN THIS OFF** (for testing)
   
3. **Click SAVE**

4. **Clean up test users and try again:**
   - Go to: Authentication → Users
   - Delete the test user you just created
   - Try registration again
   - User should be auto-confirmed and able to login immediately!

---

## 🔧 SOLUTION 2: Check Email Template & OTP Settings

If you want to keep email confirmation enabled:

### 1. Check Email Templates:
```
Authentication → Email Templates → Confirm signup
```

**Verify:**
- Template is enabled
- OTP code is being sent correctly
- No errors in template

### 2. Check OTP Expiry Time:
```
Authentication → Settings
```

**Look for:**
- OTP expiry time (default is usually 60 minutes)
- Make sure it's not too short

### 3. Check if double-confirmation is enabled:
```
Authentication → Settings
```

**Disable:**
- "Secure email change" (if enabled, it might require double confirmation)

---

## 🔧 SOLUTION 3: Check Auth Logs

After attempting OTP verification:

1. Go to: **Logs → Auth Logs**
2. Look for the verification attempt
3. Check the error message in the logs
4. Share it if the above solutions don't work

---

## 📱 CODE FIX APPLIED

I've updated the mobile app to:
- Try both 'signup' and 'email' OTP types
- Provide better error messages
- Handle token expiry gracefully

**Test it now!**

---

## ✅ QUICK TEST STEPS

1. **Disable "Confirm email" in Supabase Dashboard** (fastest solution)
2. **Delete the test user** from Authentication → Users
3. **Restart Expo:** `npx expo start --clear`
4. **Try registration again**
5. **User should be auto-logged in** (no OTP needed)

Once everything works, you can re-enable email confirmation later!

---

## 🎯 RECOMMENDATION

For your mobile app, consider:
- **Disable email confirmation** initially (users register and login immediately)
- Keep users as 'inactive' status until they select organization
- Admin approves them by changing status to 'active'

This provides better UX while maintaining security through admin approval!

