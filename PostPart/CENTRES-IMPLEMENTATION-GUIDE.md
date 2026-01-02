# Centres Page - Complete Implementation Guide

## 🎯 Overview

The Centres page is now fully implemented with:
- ✅ **Capacity Management** - Set maximum children per centre
- ✅ **Verification Status** - Control centre visibility on mobile app
- ✅ **Location/Maps Integration** - Share locations with parents (FREE solution!)
- ✅ **Full CRUD Operations** - Create, Read, Update, Delete centres
- ✅ **Activity Logging** - Track all centre operations

---

## 🔑 Key Features

### 1. Centre Verification System

**How It Works**:
- **Verified Centres** ✅ → Visible to parents on mobile app
- **Unverified Centres** ⚠️ → Hidden from parents (admin only)

**In Admin Dashboard**:
- Toggle "Verified Centre" switch when adding/editing
- Clear visual indicators (green checkmark or orange warning)
- Alert messages explain what verification means

**In Mobile App**:
- Only shows centres where `is_verified = true`
- Parents cannot see unverified centres
- Perfect for testing new centres before going live!

### 2. Capacity Management

**Admin Side**:
- Set maximum capacity when creating/editing centre
- Field: "Capacity" (number of children)
- Example: 50, 100, 200

**Mobile App**:
- Displays capacity in centre details
- Format: "50 children"
- Parents can see how large the centre is

### 3. Location & Maps Integration

**FREE Solution** (No Google Maps API key needed!):

#### Option 1: Map Link (Recommended)
**How to add**:
1. Open Google Maps
2. Search for your centre
3. Click "Share" → "Copy link"
4. Paste in "Map Link" field

**What parents see**:
- "Directions" button in mobile app
- Opens their preferred maps app (Google Maps, Apple Maps, etc.)
- Works on iOS and Android!

**Alternative Maps**:
- Google Maps: `https://maps.google.com/?q=...`
- Apple Maps: `https://maps.apple.com/?q=...`
- OpenStreetMap: `https://www.openstreetmap.org/...`
- Waze: `https://waze.com/ul/...`

#### Option 2: Coordinates
**If you have GPS coordinates**:
- Enter Latitude (e.g., 40.7128)
- Enter Longitude (e.g., -74.0060)
- App will auto-generate map link

#### Option 3: Address (Fallback)
- If no map link or coordinates provided
- App uses address for directions
- Less accurate but still works!

---

## 📱 Admin Dashboard Features

### Adding a Centre

**Required Fields**:
- ✅ Name
- ✅ Address
- ✅ City
- ✅ State
- ✅ ZIP Code
- ✅ Phone

**Optional Fields**:
- Email
- Description
- Hours of Operation
- Capacity
- Age Range
- Amenities (tags)
- Map Link
- Lat/Long coordinates
- Verification Status

**Form Sections**:
1. **Basic Information** - Name, address, location
2. **Contact Information** - Phone, email
3. **Additional Details** - Description, hours, capacity, age range
4. **Location & Map** - Map link, coordinates
5. **Amenities** - Add/remove tags (Playground, WiFi, Parking, etc.)
6. **Centre Visibility** - Verified toggle with explanation

### Viewing Centres

**Card Display**:
- Centre name with verification badge
- Full address
- Phone number
- Metrics: Total check-ins, today's check-ins, active QR codes
- Quick action buttons

**View Dialog**:
- All centre details
- "Open in Maps" button (if map link provided)
- Coordinates display
- Statistics
- Link to manage QR codes

### Editing Centres

- Click edit icon on centre card
- Modify any fields
- Changes logged to Activity Logs
- Verification changes logged separately

### Deleting Centres

**Protection**:
- ❌ Blocks deletion if QR codes exist
- ⚠️ Warns if check-ins exist (but allows)
- Confirmation dialog
- Logs deletion with metadata

---

## 📱 Mobile App Integration

### Centre Discovery

**Parents See**:
- Only verified centres
- Search by name, address, city
- Search history
- Centre cards with key info

**Centre Card Shows**:
- Name
- City
- Verification badge
- Distance (if location available)

### Centre Details

**When Parent Taps Centre**:
- Full centre information
- Contact info with "Call" button
- **"Directions" button** - Opens maps!
- Description
- Hours of operation
- Age range
- Capacity
- Amenities
- Visit history (their own visits)

### Directions Feature

**Priority Order**:
1. Custom map link (if provided) → Opens directly
2. GPS coordinates (if provided) → Opens Google Maps
3. Address (fallback) → Searches Google Maps

**Supports**:
- Google Maps (default on Android)
- Apple Maps (default on iOS)
- Any maps app user has installed

---

## 🗺️ Location Setup Guide

### Method 1: Google Maps Link (Easiest)

**Step by Step**:
1. Open [Google Maps](https://maps.google.com)
2. Search for your centre
3. Click "Share" button
4. Click "Copy link"
5. Link looks like: `https://maps.app.goo.gl/ABC123...`
6. Paste into "Map Link" field in admin
7. Done! ✅

### Method 2: Apple Maps Link

**For iOS Users**:
1. Open Apple Maps
2. Search for location
3. Tap "Share"
4. Copy link
5. Paste into admin

### Method 3: Coordinates

**How to Find**:
1. Google Maps → Right click location → Copy coordinates
2. Or use GPS device
3. Format: `40.7128, -74.0060`
4. Enter in Latitude/Longitude fields

### Method 4: Just Address

- Enter address in centre form
- App will search Google Maps
- Works but less accurate

---

## 🔄 Centre Verification Workflow

### Typical Flow:

**Step 1: Add New Centre (Unverified)**
```
Admin adds centre with all details
Verification = OFF (unverified)
↓
Centre appears in admin dashboard only
Parents cannot see it yet
```

**Step 2: Test & Verify**
```
Admin tests QR codes
Admin verifies information is correct
Admin reviews location link
↓
Admin toggles "Verified Centre" = ON
```

**Step 3: Go Live**
```
Centre is now verified
↓
Parents can now see it in mobile app
Parents can check in
↓
Activity logged: "Centre verified"
```

**Step 4: Temporary Disable**
```
If needed, admin can toggle verification OFF
↓
Centre hidden from parents immediately
Existing QR codes still work
Admin can still see it
```

---

## 📊 Statistics & Metrics

### Admin Dashboard Shows:
- **Total Centres** - All centres in system
- **Verified** - Visible to parents (green)
- **Unverified** - Hidden from parents (orange)
- **Total Check-ins** - All-time
- **Today's Check-ins** - Current day
- **Total Capacity** - Sum of all centres

### Per Centre:
- Total check-ins
- Today's check-ins
- Active QR codes count

---

## 🎨 UI/UX Features

### Visual Indicators

**Verified Centre**:
- ✅ Green checkmark chip
- "Verified Centre" badge
- Success alert in form
- Parents can see it

**Unverified Centre**:
- ⚠️ Orange warning chip
- "Unverified" badge
- Warning alert in form
- Hidden from parents

### Form Guidance

**Helpful Alerts**:
- How to get map links
- What verification means
- Field requirements
- Validation messages

---

## 🧪 Testing Checklist

### Admin Side:
- [ ] Add centre with all fields filled
- [ ] Add centre without verification
- [ ] Toggle verification ON
- [ ] Toggle verification OFF
- [ ] Add map link (Google Maps)
- [ ] Add coordinates
- [ ] Edit centre details
- [ ] View centre in dialog
- [ ] Click "Open in Maps" in admin
- [ ] Delete centre (with/without QR codes)
- [ ] Check Activity Logs for all actions

### Mobile Side:
- [ ] Verify only verified centres appear
- [ ] Unverified centres are hidden
- [ ] Tap centre to view details
- [ ] Tap "Directions" button
- [ ] Verify map opens correctly
- [ ] Test with centre that has map link
- [ ] Test with centre that has coordinates
- [ ] Test with centre that has neither

---

## 📝 Activity Logging

**What Gets Logged**:
- `center_created` - New centre added
- `center_updated` - Details modified
- `center_verified` - Marked as verified
- `center_deleted` - Centre removed

**Logged Information**:
- Centre name
- Location (city, state)
- Verification status
- Capacity
- Fields changed
- Check-in count (on delete)

---

## 🚀 Real-World Example

**Scenario**: Adding "Sunshine Daycare"

1. **Admin adds centre**:
   - Name: Sunshine Daycare
   - Address: 123 Main St
   - City: New York
   - State: NY
   - ZIP: 10001
   - Phone: +1 (555) 123-4567
   - Capacity: 50
   - Verification: OFF ❌

2. **Centre appears in admin only**
   - Orange "Unverified" badge
   - Admin can see it
   - Parents cannot see it

3. **Admin gets map link**:
   - Opens Google Maps
   - Searches "123 Main St, New York, NY"
   - Clicks Share → Copy link
   - Pastes: `https://maps.app.goo.gl/xyz123`

4. **Admin verifies centre**:
   - Clicks Edit
   - Toggles "Verified Centre" ON
   - Saves

5. **Centre goes live** ✅:
   - Green "Verified" badge in admin
   - Appears in parents' mobile app
   - Parents can tap "Directions"
   - Opens Google Maps to location
   - Parents can check in!

---

## 🎉 Summary

Your Centres page now has:
- ✅ Full capacity management
- ✅ Verification system for controlling visibility
- ✅ FREE location/maps integration (no API key needed!)
- ✅ Multiple map options (Google, Apple, coordinates, address)
- ✅ Complete CRUD operations
- ✅ Activity logging
- ✅ Beautiful admin UI
- ✅ Seamless mobile integration

**Parents can easily find and navigate to your daycare centres, and you have full control over which centres are visible!** 🎊

