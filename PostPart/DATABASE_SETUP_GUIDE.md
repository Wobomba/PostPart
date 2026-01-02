# Database Setup Guide - Fix 400 Errors

## 🚨 Why You're Seeing 400 Errors

The app is trying to fetch data from these tables that **don't exist yet**:

| Table | Purpose | Required For |
|-------|---------|--------------|
| `profiles` | User profile data (name, phone) | ✅ Edit Profile, Home screen |
| `children` | Child information | Profile stats, Add Child |
| `checkins` | Check-in history | Home screen stats |
| `centers` | Daycare centers | Browse Centers |
| `parent_notifications` | User notifications | Notification bell |

---

## ✅ QUICK SETUP (5 Minutes)

### Step 1: Open Supabase Dashboard
1. Go to: **https://supabase.com/dashboard**
2. Sign in to your account
3. Select your **PostPart** project

### Step 2: Open SQL Editor
1. Click **SQL Editor** in the left sidebar
2. Click **New Query** button

### Step 3: Copy & Paste This SQL

Copy the **ENTIRE** contents below and paste into the SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User Information)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. CHILDREN TABLE
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  date_of_birth DATE NOT NULL,
  allergies TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on children
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- Children policies
CREATE POLICY "Parents can view own children"
  ON children FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Parents can update own children"
  ON children FOR UPDATE
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can delete own children"
  ON children FOR DELETE
  USING (auth.uid() = parent_id);

-- 3. CENTERS TABLE
CREATE TABLE centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  description TEXT,
  capacity INTEGER,
  hours_of_operation TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on centers
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;

-- Centers policies (anyone can view active centers)
CREATE POLICY "Anyone can view active centers"
  ON centers FOR SELECT
  USING (status = 'active');

-- 4. CHECKINS TABLE
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES centers(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on checkins
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- Checkins policies
CREATE POLICY "Parents can view own checkins"
  ON checkins FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can create own checkins"
  ON checkins FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- 5. NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('announcement', 'reminder', 'approval', 'center_update', 'alert')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. PARENT_NOTIFICATIONS TABLE (Junction table)
CREATE TABLE parent_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_id, notification_id)
);

-- Enable RLS on parent_notifications
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

-- Parent notifications policies
CREATE POLICY "Parents can view own notifications"
  ON parent_notifications FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can update own notifications"
  ON parent_notifications FOR UPDATE
  USING (auth.uid() = parent_id);

-- 7. AUTO-CREATE PROFILE TRIGGER
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete! All tables created successfully.';
END $$;
```

### Step 4: Run the Query
1. Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait 2-3 seconds
3. You should see: ✅ "Success. No rows returned"

### Step 5: Verify Tables Were Created
1. Click **Table Editor** in the left sidebar
2. You should now see these tables:
   - ✅ profiles
   - ✅ children
   - ✅ centers
   - ✅ checkins
   - ✅ notifications
   - ✅ parent_notifications

### Step 6: Create Your Profile
Since you already have a user account, let's create your profile manually:

1. Go back to **SQL Editor**
2. Click **New Query**
3. Run this (replace with your actual user ID and name):

```sql
-- Get your user ID first
SELECT id, email FROM auth.users;

-- Then insert your profile (replace YOUR_USER_ID and YOUR_NAME)
INSERT INTO profiles (id, email, full_name)
VALUES (
  'YOUR_USER_ID',  -- Copy your ID from the query above
  'your-email@example.com',
  'Your Full Name'
);
```

### Step 7: Restart Your App
```bash
# In your browser: Press Ctrl+Shift+R (or Cmd+Shift+R on Mac)
# Or in terminal: Stop and restart Expo
npx expo start --clear
```

---

## 🎉 What Will Work After Setup

✅ **Edit Profile** - Update your name and phone number  
✅ **Home Screen** - Display your real name (not "Parent")  
✅ **Profile Stats** - Show actual check-in counts  
✅ **Add Children** - Store child information  
✅ **Notifications** - View and manage notifications  
✅ **Browse Centers** - See daycare centers  
✅ **No More 400 Errors!** - Clean console  

---

## 🔍 Troubleshooting

### Error: "relation already exists"
**Solution:** Tables are already created. Click Table Editor to verify.

### Error: "permission denied"
**Solution:** Make sure you're logged in to your Supabase project.

### Error: "syntax error"
**Solution:** Make sure you copied the ENTIRE SQL block including the first line.

### Still seeing 400 errors?
1. Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
2. Check that all 6 tables exist in Table Editor
3. Verify RLS policies are enabled (green toggle)

---

## 📊 Quick Test

After setup, run this query to test:

```sql
-- Test that tables exist and are accessible
SELECT 
  COUNT(*) as profile_count 
FROM profiles;

SELECT 
  COUNT(*) as children_count 
FROM children;
```

If you get results (even if count is 0), you're good to go! ✅

---

## 🚀 Next Steps

1. **Edit your profile** - Update your name and phone
2. **Add a child** - Test the Add Child form
3. **Browse centers** - (Admin will need to add centers)
4. **Check notifications** - Tap the bell icon

---

## 💡 Need Help?

If you run into issues:
1. Check the Supabase logs: **Dashboard → Database → Logs**
2. Verify RLS is enabled: **Authentication → Policies**
3. Check your user exists: **Authentication → Users**

---

**That's it! Follow these steps and your app will be fully functional!** 🎉

