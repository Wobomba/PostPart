# Quick Start: Testing Admin Dashboard

## Local Testing (Same Machine)

1. **Start the admin dashboard:**
```bash
cd PostPart/admin
npm run dev
```

2. **Run tests:**
```bash
# Set admin credentials (if not in environment)
export ADMIN_EMAIL=your-admin@example.com
export ADMIN_PASSWORD=your-password

# Run all tests
npm run test

# Run dashboard tests only
npm run test:dashboard

# Run with UI (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed
```

## Testing from Different Machine on Network

### On Host Machine (where dashboard runs):

1. **Find your IP address:**
```bash
hostname -I
# Example output: 192.168.1.100
```

2. **Start dashboard (already configured to allow network access):**
```bash
cd PostPart/admin
npm run dev
# Dashboard accessible at http://192.168.1.100:3000
```

3. **Allow firewall access (if needed):**
```bash
sudo ufw allow 3000/tcp
```

### On Remote Machine:

1. **Install dependencies:**
```bash
cd PostPart/admin
npm install
npx playwright install chromium
```

2. **Run tests pointing to host machine:**
```bash
export BASE_URL=http://192.168.1.100:3000
export ADMIN_EMAIL=your-admin@example.com
export ADMIN_PASSWORD=your-password

npm run test:dashboard
```

## What the Tests Cover

✅ **Dashboard Display:**
- Dashboard title and page structure
- All stat cards (Organisations, Parents, Centres, Check-Ins)
- Stat card values (verifies they load correctly)
- Today's Activity section
- Quick Actions section
- Recent Check-Ins table
- Recent Activity timeline

✅ **Navigation:**
- Navigation menu items
- Links to Organizations page
- Links to Parents page
- Links to Centers page

✅ **Functionality:**
- Loading states
- Responsive design (different viewport sizes)
- Pending Actions section
- Top Active Centres section

## Test Results

After running tests, view the HTML report:
```bash
npm run test:report
```

This opens an interactive report showing:
- Passed/failed tests
- Screenshots of failures
- Videos of test runs
- Execution times

## Troubleshooting

**Tests fail to connect:**
- Ensure dashboard is running: `npm run dev`
- Check URL is correct (localhost:3000 or your network IP)

**Authentication fails:**
- Verify `ADMIN_EMAIL` and `ADMIN_PASSWORD` are correct
- Ensure user has `admin` role in `user_roles` table

**Stat cards show 0:**
- Apply RLS fix: Run `supabase/fix-admin-dashboard-rls.sql` in Supabase SQL Editor
- See main README for details

**Remote testing doesn't work:**
- Check firewall allows port 3000
- Verify both machines on same network
- Use `BASE_URL` environment variable correctly

