# Testing Admin Dashboard from Different Machines

## Overview

You can test the admin dashboard from any machine on your private network. This guide explains how to set this up.

## Prerequisites

1. **Admin dashboard must be running** on the host machine
2. **Both machines must be on the same network** (same WiFi/LAN)
3. **Firewall must allow connections** on port 3000

## Step 1: Find Your Host Machine's IP Address

On the machine running the admin dashboard:

### Linux/Mac:
```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
# or
hostname -I
```

### Windows:
```bash
ipconfig
# Look for IPv4 Address (usually 192.168.x.x or 10.x.x.x)
```

**Example IP:** `192.168.1.100`

## Step 2: Start Admin Dashboard on Host Machine

On the host machine, start the dashboard with network access:

```bash
cd PostPart/admin
npm run dev -- -H 0.0.0.0
```

Or modify `package.json` to always bind to all interfaces:
```json
"dev": "next dev -p 3000 -H 0.0.0.0"
```

The dashboard will be accessible at:
- **Local:** `http://localhost:3000`
- **Network:** `http://192.168.1.100:3000` (replace with your IP)

## Step 3: Configure Firewall (if needed)

### Linux (UFW):
```bash
sudo ufw allow 3000/tcp
```

### Mac:
System Preferences → Security & Privacy → Firewall → Firewall Options → Allow incoming connections for Node

### Windows:
Windows Defender Firewall → Allow an app → Node.js

## Step 4: Test from Another Machine

### Option A: Run Playwright Tests from Remote Machine

1. **Install dependencies** on the remote machine:
```bash
cd PostPart/admin
npm install
npx playwright install chromium
```

2. **Set environment variables** and run tests:
```bash
# Set the base URL to the host machine's IP
export BASE_URL=http://192.168.1.100:3000
export ADMIN_EMAIL=your-admin@example.com
export ADMIN_PASSWORD=your-password

# Run tests
npm run test
```

### Option B: Test Manually from Browser

1. Open browser on remote machine
2. Navigate to: `http://192.168.1.100:3000/auth/login`
3. Login with admin credentials
4. Test the dashboard functionality

## Step 5: Run Playwright Tests

### From Host Machine (Local):
```bash
cd PostPart/admin
npm run test
```

### From Remote Machine:
```bash
cd PostPart/admin
BASE_URL=http://192.168.1.100:3000 ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password npm run test
```

### Run Specific Test Suite:
```bash
# Dashboard tests only
npm run test:dashboard

# With remote URL
BASE_URL=http://192.168.1.100:3000 npm run test:dashboard
```

## Environment Variables

You can set these environment variables:

- `BASE_URL` - The URL of the admin dashboard (default: `http://localhost:3000`)
- `ADMIN_EMAIL` - Admin user email for testing
- `ADMIN_PASSWORD` - Admin user password for testing

## Troubleshooting

### Can't Connect from Remote Machine

1. **Check firewall:** Ensure port 3000 is open
2. **Check IP address:** Verify you're using the correct IP
3. **Check network:** Ensure both machines are on the same network
4. **Check Next.js binding:** Ensure Next.js is bound to `0.0.0.0`, not just `localhost`

### Tests Timeout

1. **Increase timeout** in `playwright.config.ts`:
```typescript
use: {
  actionTimeout: 30000, // 30 seconds
  navigationTimeout: 30000,
}
```

2. **Check network latency:** Remote testing may be slower

### Authentication Fails

1. **Verify credentials:** Ensure admin email/password are correct
2. **Check Supabase connection:** Remote machine must be able to reach Supabase
3. **Check RLS policies:** Ensure admin user has proper permissions

## Security Notes

⚠️ **Important:** Only use this for testing on private networks!

- Never expose the admin dashboard to the public internet without proper authentication
- Use HTTPS in production
- Consider VPN for remote access instead of exposing ports directly

## Example: Complete Remote Testing Setup

```bash
# On host machine (192.168.1.100)
cd PostPart/admin
npm run dev -- -H 0.0.0.0

# On remote machine
cd PostPart/admin
export BASE_URL=http://192.168.1.100:3000
export ADMIN_EMAIL=admin@postpart.com
export ADMIN_PASSWORD=secure-password
npm run test:dashboard
```

