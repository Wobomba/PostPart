# 🚨 Database Setup Required - Fix 400 Errors

## Issue

You're seeing **400 (Bad Request)** errors in the browser console because the database tables haven't been created in Supabase yet.

**Error Example:**
```
GET https://etagjqqnejfolsmslbsom.supabase.co/rest/v1/checkins?select=...
400 (Bad Request)
```

This happens when the app tries to query tables that don't exist.

---

## ✅ Solution: Create Database Tables

### Step 1: Go to Supabase SQL Editor

1. Open your browser and go to: **https://supabase.com/dashboard**
2. Select your project: **PostPart** (etajqqnejfolsmslbsom)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

---

### Step 2: Create All Tables

Copy and paste the **ENTIRE** contents of the file:

```
/home/newton/Documents/Projects/PostPart/supabase/schema.sql
```

**How to do it:**

1. Open the file `supabase/schema.sql` in your editor
2. **Copy ALL the contents** (Ctrl+A, Ctrl+C)
3. **Paste into Supabase SQL Editor**
4. Click **Run** (or press F5)

This will create:
- ✅ `organizations` table
- ✅ `profiles` table (with RLS policies)
- ✅ `children` table
- ✅ `centers` table
- ✅ `center_qr_codes` table
- ✅ `checkins` table ← **This fixes the 400 errors!**
- ✅ `notifications` table
- ✅ `parent_notifications` table
- ✅ `allocations` table
- ✅ `reports` table
- ✅ Database trigger for auto-creating profiles
- ✅ All RLS (Row Level Security) policies
- ✅ Indexes for performance

---

### Step 3: Verify Tables Were Created

After running the schema:

1. Go to **Table Editor** in the left sidebar
2. You should see all the tables listed:
   - organizations
   - profiles
   - children
   - centers
   - center_qr_codes
   - **checkins** ← Most important for fixing errors
   - notifications
   - parent_notifications
   - allocations
   - reports

---

### Step 4: (Optional) Add Sample Data

If you want to test with sample data:

1. Go back to **SQL Editor**
2. Click **New Query**
3. Copy and paste contents from:
   ```
   /home/newton/Documents/Projects/PostPart/supabase/seed.sql
   ```
4. Click **Run**

This will add:
- Sample organizations
- Sample daycare centers
- Sample allocations

**Note:** You already have a real user account (Jane Doe), so you don't need sample users.

---

## 🔧 What This Fixes

### Before (Current State):
- ❌ App tries to load check-ins → **400 error** (table doesn't exist)
- ❌ App tries to load children → **400 error** (table doesn't exist)
- ❌ App tries to load centers → **400 error** (table doesn't exist)
- ❌ Profile stats show 0 for everything

### After (With Tables Created):
- ✅ App can load check-ins (will be empty initially)
- ✅ App can load children (will be empty until you add some)
- ✅ App can load centers (will be empty until you add some)
- ✅ No more 400 errors
- ✅ Profile stats work correctly
- ✅ Home screen loads properly

---

## 📋 Quick Checklist

- [ ] 1. Go to Supabase Dashboard
- [ ] 2. Open SQL Editor
- [ ] 3. Create new query
- [ ] 4. Copy **ALL** of `supabase/schema.sql`
- [ ] 5. Paste into SQL Editor
- [ ] 6. Click **Run**
- [ ] 7. Wait for "Success" message
- [ ] 8. Check Table Editor to verify tables exist
- [ ] 9. Refresh your mobile app
- [ ] 10. Verify 400 errors are gone

---

## 🎯 Expected Result

After creating the tables:

1. **Console Errors**: All 400 errors should disappear
2. **Home Screen**: Will load without errors (but show empty states since no data yet)
3. **Profile Screen**: Will load your profile correctly
4. **Stats**: Will show 0 for check-ins (because you haven't checked in yet)
5. **Children**: Empty (you can add children via "Add Child" button)
6. **Centers**: Empty (admin needs to add centers, or you can add via seed.sql)

---

## 🚀 Next Steps After Database Setup

1. **Add Sample Centers** (via seed.sql or admin dashboard)
2. **Add Your Children** (via "Add Child" in profile)
3. **Test Check-In Flow** (scan QR code at a center)
4. **Test Notifications** (admin can send notifications)

---

## ⚠️ Common Issues

### Issue: "relation 'public.profiles' already exists"
**Solution:** The table already exists. You can:
- Skip the schema.sql (tables already created)
- OR Drop all tables first and re-run

### Issue: "permission denied for schema public"
**Solution:** You need to be the project owner or have admin access

### Issue: Still getting 400 errors after running schema
**Solution:**
1. Clear browser cache (Ctrl+Shift+R)
2. Restart Expo server: `npx expo start --clear`
3. Check Table Editor to confirm tables exist
4. Check RLS policies are enabled

---

## 🔍 How to Check If Tables Exist

**Method 1: Table Editor**
- Go to Supabase Dashboard
- Click "Table Editor"
- See list of tables on the left

**Method 2: SQL Query**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Should return:
- allocations
- center_qr_codes
- centers
- checkins
- children
- notifications
- organizations
- parent_notifications
- profiles
- reports

---

## ✅ Summary

**The 400 errors are happening because:**
- The app expects database tables to exist
- Those tables haven't been created yet in Supabase

**To fix:**
1. Run `supabase/schema.sql` in Supabase SQL Editor
2. This creates all necessary tables
3. 400 errors will disappear
4. App will work correctly

**Time to fix:** ~2 minutes

---

## 📞 Still Having Issues?

If you still see 400 errors after creating tables:

1. **Check browser console** for the exact error message
2. **Check Supabase logs** (Dashboard → Logs → API)
3. **Verify RLS policies** are enabled
4. **Check user authentication** is working
5. Share the specific error message for more help

---

## 🎉 Once Fixed

Your app will be fully functional:
- ✅ No more console errors
- ✅ Profile loads correctly
- ✅ Home screen displays properly
- ✅ All features work as expected
- ✅ Ready to add children and check in!

**Let me know once you've run the schema, and we can test everything!** 🚀

