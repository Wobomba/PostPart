# PostPart - B2B Childcare Access Platform

A comprehensive platform connecting employers, parents, and daycare centers. PostPart enables organizations to provide childcare access benefits to their employees through a seamless mobile check-in experience and powerful admin management tools.

## 🏗️ Project Structure

```
PostPart/
├── mobile/              # React Native mobile app (Expo)
├── admin/               # Next.js admin dashboard
├── shared/              # Shared TypeScript types and utilities
├── supabase/            # Database schema and migrations
│   ├── schema.sql       # Database structure
│   ├── seed.sql         # Mock data
│   └── functions/       # Edge functions (QR validation, etc.)
└── README.md
```

## 📱 Mobile App (Parent-Facing)

Built with React Native, Expo, and TypeScript. A calm, child-focused design with off-white backgrounds, teal/sea-green primary color, and soft peach accents.

### Features
- **Authentication**: Supabase OTP (email-based magic links)
- **Browse Centers**: View verified daycare centers in your network
- **QR Check-In**: Scan QR codes at centers to check in children
- **Access Logs**: View personal check-in history by center
- **Notifications**: Receive push notifications from admin
- **Profile Management**: Manage children profiles and personal info

### Key Screens
- Splash & Onboarding
- Authentication (Welcome, Login, Verify)
- Home (QR scan CTA, recent visits, notifications)
- Centers (List, Detail)
- QR Scanner & Check-In Flow
- Access Logs (Overview, Detail by Center)
- Notifications (Inbox, Detail)
- Profile (Parent info, Children management)

### Tech Stack
- React Native + Expo
- TypeScript
- Supabase (Auth, Database)
- Expo Router (Navigation)
- Expo Camera (QR Scanner)
- Expo Notifications

### Running the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## 🖥️ Admin Dashboard (Web)

Built with Next.js, TypeScript, and Tailwind CSS. A professional admin interface for managing the entire platform.

### Features
- **Dashboard**: Overview statistics and recent activity
- **Organizations**: Manage employer organizations and contracts
- **Parents**: Onboard and manage parent users
- **Centers**: Add, verify, and manage daycare centers
- **QR Codes**: Generate, activate, and revoke center QR codes
- **Check-Ins**: View and export check-in logs
- **Allocations**: Manage visit limits per org/parent
- **Notifications**: Send targeted notifications to parents
- **Reports**: Usage analytics and billing reports

### Tech Stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase Client
- Recharts (Analytics)

### Running the Admin Dashboard

```bash
cd admin
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🗄️ Database (Supabase)

PostgreSQL database with Row Level Security (RLS) enabled.

### Core Tables
- `profiles` - Parent user profiles
- `children` - Children linked to parents
- `centers` - Daycare centers
- `center_qr_codes` - QR codes mapped to centers
- `checkins` - Check-in records
- `notifications` - Admin notifications
- `parent_notifications` - Notification delivery tracking
- `organizations` - Employer organizations (Admin-only)
- `allocations` - Visit limits (Admin-only)
- `reports` - Generated reports (Admin-only)

### Security
- Parents can only access their own data
- Admin tables require elevated permissions
- RLS policies enforce data isolation
- QR validation happens server-side via Edge Functions

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)

2. Run the schema:
```sql
-- Copy contents of supabase/schema.sql and run in SQL Editor
```

3. Add mock data:
```sql
-- Copy contents of supabase/seed.sql and run in SQL Editor
```

4. Update environment variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🔐 Authentication

### Parents (Mobile App)
- Email-based OTP (magic links)
- No passwords required
- Session persisted with AsyncStorage

### Admins (Dashboard)
- Email + Password authentication
- Separate from parent auth flow
- Admin users don't have profiles table entries

## 🎨 Design System

### Mobile App Theme
- **Primary**: `#3EACA8` (Teal/Sea-green)
- **Accent**: `#FFB4A0` (Soft peach)
- **Background**: `#F8F7F5` (Off-white)
- **Typography**: System fonts, large readable sizes
- **Spacing**: Consistent 4/8/16/24/32/48px scale
- **Shadows**: Gentle, subtle shadows
- **Border Radius**: Rounded (8-24px)

### Admin Dashboard
- Tailwind CSS default theme
- Teal accent color matching mobile
- Clean, professional interface
- Responsive design

## 🔔 Notifications

Push notifications sent from admin dashboard to parents.

### Types
- Announcement
- Reminder
- Approval
- Center Update
- Alert

### Targeting
- All parents
- By organization
- By center
- Individual parent

### Implementation Notes
- Mobile uses Expo Notifications
- Backend creates `parent_notifications` records
- Read/unread tracking per parent
- TODO: Integrate FCM/APNs for actual push delivery

## 📊 Key Features

### Parent Boundaries (Mobile)
Parents **DO NOT** see:
- Visit limits or remaining allocations
- Billing information
- Employer plan details
- Organization information

Parents **ONLY** see:
- Their own check-in history
- Verified centers
- Their own notifications
- Their children's profiles

### Admin Capabilities (Dashboard)
Admins can:
- Manage all organizations, parents, centers
- Set and enforce visit allocations
- Generate and manage QR codes
- View all check-ins and usage
- Send targeted notifications
- Export reports and analytics
- Verify centers

## 🚀 Deployment

### Mobile App
1. Build with EAS:
```bash
cd mobile
eas build --platform all
```

2. Submit to app stores:
```bash
eas submit --platform ios
eas submit --platform android
```

### Admin Dashboard
1. Deploy to Vercel:
```bash
cd admin
vercel
```

Or use Netlify, Railway, or any Node.js host.

### Supabase Edge Functions
```bash
cd supabase/functions
supabase functions deploy qr-validation
```

## 🧪 Testing

### Create Test Admin
1. Go to Supabase Dashboard > Authentication
2. Add user with email/password
3. Use these credentials to sign into admin dashboard

### Create Test Parent
1. Use mobile app to sign up with email
2. Receive OTP and verify
3. Create profile and add children
4. Admin can assign to organization

### Test QR Flow
1. Admin: Generate QR code for a center
2. Admin: Print or display QR code value
3. Parent: Open mobile app > Scan QR
4. Parent: Select child and complete check-in
5. Admin: View check-in in dashboard

## 📝 TODO / Future Enhancements

- [ ] Implement Supabase Edge Function for QR validation
- [ ] Add FCM/APNs for real push notifications
- [ ] Build reports and analytics dashboard
- [ ] Add center onboarding flow
- [ ] Implement parent invitation system
- [ ] Add allocation enforcement logic
- [ ] Build organization admin portal
- [ ] Add parent feedback/rating system
- [ ] Implement waitlist management
- [ ] Add multi-language support
- [ ] Build mobile app for center staff

## 🔒 Security Best Practices

1. **Always use RLS**: Enforce at database level
2. **Server-side validation**: QR codes validated via Edge Functions
3. **Admin claims**: Separate admin permissions
4. **No secrets in client**: Keep service role keys server-side only
5. **HTTPS only**: Enforce secure connections
6. **Regular audits**: Monitor check-in logs and access patterns

## 📄 License

Proprietary - All rights reserved

## 👥 Team

Built for PostPart by [Your Team Name]

---

## Support

For questions or issues, contact: support@postpart.com

