# 👤 Profile Name Sync - Display Name Management

## Overview

The app now properly manages user display names with a robust fallback hierarchy and automatic sync between the profiles table and authentication metadata.

---

## 🎯 Display Name Hierarchy

The app fetches display names in this priority order:

### Priority 1: **Profiles Table** (Database)
```sql
SELECT full_name FROM profiles WHERE id = user_id
```
- **Source**: `profiles.full_name`
- **Most reliable**: This is the primary source of truth
- **Updated when**: User edits their profile

### Priority 2: **Auth Metadata** (Supabase Auth)
```typescript
user.user_metadata?.full_name || user.user_metadata?.name
```
- **Source**: `auth.users.raw_user_meta_data`
- **Fallback**: Used when profile table doesn't exist or full_name is null
- **Set during**: Registration

### Priority 3: **Default** (Last Resort)
```typescript
'Parent'
```
- **Used when**: No name found anywhere
- **Rare case**: New user without any data

---

## 🔄 Automatic Sync Flow

### During Registration:

```
1. User fills registration form with full name
   ↓
2. Supabase Auth creates user with metadata:
   {
     email: "user@example.com",
     user_metadata: {
       full_name: "Jane Doe"
     }
   }
   ↓
3. Database trigger automatically creates profile:
   INSERT INTO profiles (id, email, full_name)
   VALUES (
     user_id,
     "user@example.com",
     "Jane Doe"  ← from auth metadata
   )
   ↓
4. Profile table and auth are now in sync ✅
```

### During Profile Update:

```
1. User edits profile name
   ↓
2. App calls updateUserProfile() function
   ↓
3. Updates profiles table:
   UPDATE profiles 
   SET full_name = "New Name"
   WHERE id = user_id
   ↓
4. Updates auth metadata:
   auth.updateUser({
     data: {
       full_name: "New Name",
       name: "New Name"
     }
   })
   ↓
5. Both systems updated ✅
```

---

## 📁 File Structure

### New Utility File: `mobile/utils/profile.ts`

Contains three main functions:

#### 1. `updateUserProfile()`
Updates both profiles table AND auth metadata:

```typescript
const result = await updateUserProfile(userId, {
  full_name: "Jane Doe",
  phone: "+1234567890",
});

if (result.success) {
  console.log('Profile updated!');
} else {
  console.error('Error:', result.error);
}
```

**What it does:**
- ✅ Updates `profiles` table
- ✅ Updates auth `user_metadata`
- ✅ Keeps both systems in sync
- ✅ Handles errors gracefully

#### 2. `getUserDisplayName()`
Gets display name with proper fallback:

```typescript
const displayName = await getUserDisplayName(userId);
// Returns: "Jane Doe" or "Parent"
```

**Fallback order:**
1. `profiles.full_name`
2. `auth.user_metadata.full_name`
3. `auth.user_metadata.name`
4. `"Parent"`

#### 3. `syncAuthToProfile()`
Syncs auth metadata to profiles table:

```typescript
const result = await syncAuthToProfile(userId);
```

**Useful when:**
- Profile wasn't created by trigger
- Auth metadata was updated externally
- Need to ensure sync between systems

---

## 🔧 Implementation Details

### Home Screen (`mobile/app/(tabs)/home.tsx`)

**Before:**
```typescript
// ❌ Used email as fallback
const emailName = user.email?.split('@')[0] || 'Parent';
setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
```

**After:**
```typescript
// ✅ Uses proper fallback hierarchy
try {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();
  
  if (profile?.full_name) {
    setUserName(profile.full_name);
  } else {
    // Fallback to auth metadata
    const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
    setUserName(authDisplayName || 'Parent');
  }
} catch (err) {
  // Error handling with auth fallback
  const authDisplayName = user.user_metadata?.full_name || user.user_metadata?.name;
  setUserName(authDisplayName || 'Parent');
}
```

### Database Trigger (`supabase/schema.sql`)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**What it does:**
- ✅ Automatically creates profile when user registers
- ✅ Reads `full_name` from auth metadata
- ✅ Ensures profiles table is populated
- ✅ No manual profile creation needed

### Registration Flow (`mobile/app/(auth)/register.tsx`)

```typescript
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email: formData.email.toLowerCase().trim(),
  password: formData.password,
  options: {
    data: {
      full_name: formData.fullName.trim(), // ✅ Stored in auth metadata
    },
  },
});
```

**What happens:**
1. ✅ User's full name stored in auth metadata
2. ✅ Database trigger reads from auth metadata
3. ✅ Profile created with full name
4. ✅ Both systems in sync from start

---

## 🎨 User Experience

### Display Name Examples

**Registration:**
- User registers as "Jane Doe"
- Home screen shows: **"Good Morning, Jane Doe"**
- Profile screen shows: **"Jane Doe"**
- ✅ Consistent everywhere

**Profile Update:**
- User changes name to "Jane Smith"
- Both profiles table AND auth updated
- Home screen immediately shows: **"Good Morning, Jane Smith"**
- ✅ Changes reflected everywhere

**No Profile Data:**
- New user, tables not created yet
- Auth metadata has "Jane Doe"
- Home screen shows: **"Good Morning, Jane Doe"**
- ✅ Graceful fallback to auth

**No Data Anywhere:**
- Extremely rare case
- Home screen shows: **"Good Morning, Parent"**
- ✅ Friendly default

---

## 🔄 Sync Scenarios

### Scenario 1: Normal Registration
```
Registration → Auth metadata set → Trigger creates profile
Result: ✅ Both in sync
```

### Scenario 2: Profile Update
```
User edits profile → updateUserProfile() → Updates both systems
Result: ✅ Both in sync
```

### Scenario 3: Auth Update (External)
```
Admin updates auth → Call syncAuthToProfile() → Syncs to profiles
Result: ✅ Both in sync
```

### Scenario 4: Missing Profile
```
Auth exists but no profile → App uses auth metadata → Works fine
Result: ✅ Graceful degradation
```

---

## 📝 How to Use

### For Developers:

#### Update User Profile:
```typescript
import { updateUserProfile } from '../utils/profile';

const handleUpdateProfile = async () => {
  const result = await updateUserProfile(userId, {
    full_name: newName,
    phone: newPhone,
  });
  
  if (result.success) {
    Alert.alert('Success', 'Profile updated!');
  } else {
    Alert.alert('Error', result.error);
  }
};
```

#### Get Display Name:
```typescript
import { getUserDisplayName } from '../utils/profile';

const displayName = await getUserDisplayName(userId);
console.log(`Hello, ${displayName}!`);
```

#### Sync Auth to Profile:
```typescript
import { syncAuthToProfile } from '../utils/profile';

const handleSync = async () => {
  const result = await syncAuthToProfile(userId);
  if (result.success) {
    console.log('Synced successfully');
  }
};
```

---

## ✅ Benefits

### 1. **Consistency**
- ✅ Name is the same everywhere
- ✅ One source of truth (profiles table)
- ✅ Auth metadata as reliable backup

### 2. **Reliability**
- ✅ Works even if profiles table doesn't exist
- ✅ Graceful fallback hierarchy
- ✅ Never shows email as name

### 3. **Maintainability**
- ✅ Automatic sync on registration
- ✅ Manual sync when needed
- ✅ Centralized update logic

### 4. **User Experience**
- ✅ Always shows proper name
- ✅ Changes reflected immediately
- ✅ Friendly defaults

---

## 🚀 Future Enhancements

### Potential Additions:

1. **Real-time Sync**
   - Listen to profile changes
   - Auto-update auth metadata
   - Bidirectional sync

2. **Profile Picture**
   - Store URL in profiles table
   - Also store in auth metadata
   - Same sync mechanism

3. **Additional Fields**
   - Preferences
   - Settings
   - Custom data

---

## 🔍 Testing

### Test Cases:

#### Test 1: New Registration
```
1. Register with name "Jane Doe"
2. Check home screen → Should show "Jane Doe"
3. Check profiles table → Should have "Jane Doe"
4. Check auth metadata → Should have "Jane Doe"
Result: ✅ All in sync
```

#### Test 2: Profile Update
```
1. Update profile name to "Jane Smith"
2. Check home screen → Should show "Jane Smith"
3. Check profiles table → Should have "Jane Smith"
4. Check auth metadata → Should have "Jane Smith"
Result: ✅ All updated
```

#### Test 3: Missing Profile Table
```
1. Don't create profiles table
2. Register as "Jane Doe"
3. Check home screen → Should show "Jane Doe" (from auth)
4. Create profiles table
5. Trigger creates profile
6. Check home screen → Should show "Jane Doe" (from profile)
Result: ✅ Graceful fallback
```

#### Test 4: No Name Data
```
1. Create user with no name
2. Check home screen → Should show "Parent"
Result: ✅ Friendly default
```

---

## 📊 Summary

| System | Priority | Source | Updateable |
|--------|----------|--------|------------|
| **Profiles Table** | 1st | `profiles.full_name` | Yes (via app) |
| **Auth Metadata** | 2nd | `user_metadata.full_name` | Yes (via app) |
| **Default** | 3rd | Hardcoded `"Parent"` | No |

**Key Points:**
- ✅ Profiles table is primary source
- ✅ Auth metadata is reliable fallback
- ✅ Both updated together when profile changes
- ✅ Automatic sync on registration
- ✅ Never shows email as display name
- ✅ Friendly default when no data exists

---

## 🎉 Result

The app now:
- ✅ **Always shows proper name** (not email)
- ✅ **Syncs profiles table and auth** automatically
- ✅ **Handles missing data** gracefully
- ✅ **Updates both systems** when profile changes
- ✅ **Provides friendly fallback** ("Parent")
- ✅ **Works without database** (uses auth metadata)

**User experience is consistent and professional!** 🚀

