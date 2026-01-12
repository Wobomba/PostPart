# Playwright Tests for PostPart Admin Dashboard

This directory contains end-to-end tests for the PostPart Admin Dashboard using Playwright.

## Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```
   
   Or install all browsers:
   ```bash
   npx playwright install
   ```

2. **Set up admin credentials** (optional):
   Create a `.env.test` file or set environment variables:
   ```bash
   ADMIN_EMAIL=your-admin@example.com
   ADMIN_PASSWORD=your-admin-password
   ```
   
   Or export them:
   ```bash
   export ADMIN_EMAIL=your-admin@example.com
   export ADMIN_PASSWORD=your-admin-password
   ```

3. **Start the admin dashboard** (optional - Playwright can start it automatically):
   ```bash
   npm run dev
   ```
   
   The dashboard will start on `http://localhost:3000`

## Running Tests

### Run all tests
```bash
npm run test
```

The Playwright config will automatically start the Next.js dev server if it's not already running.

### Run specific test suites
```bash
npm run test:auth          # Authentication tests
npm run test:dashboard    # Dashboard tests
npm run test:organizations # Organizations management tests
npm run test:parents      # Parents management tests
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Debug tests
```bash
npm run test:debug
```

### View test report
```bash
npm run test:report
```

## Test Structure

- **auth.spec.ts** - Tests for admin login, authentication, and authorization
- **dashboard.spec.ts** - Tests for the main dashboard page and navigation
- **organizations.spec.ts** - Tests for organizations management
- **parents.spec.ts** - Tests for parents management

## Admin Credentials

The tests require admin user credentials. You can provide them via:

1. **Environment variables** (recommended):
   ```bash
   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password npm run test
   ```

2. **Update test files directly** - Edit the `ADMIN_EMAIL` and `ADMIN_PASSWORD` constants in each test file

3. **Create a `.env.test` file** in the admin directory (you'll need to load it in your test setup)

**Note**: These should be actual admin user credentials with the `admin` role in the `user_roles` table, not regular parent credentials.

## Configuration

The Playwright configuration is in `playwright.config.ts` at the root of the admin directory. It:
- Automatically starts the Next.js dev server before tests
- Tests on multiple browsers (Chromium, Firefox, WebKit)
- Generates HTML reports and screenshots on failure
- Records videos of failed tests

## Test Coverage

The tests cover:
- ✅ Admin authentication and login
- ✅ Dashboard page display and navigation
- ✅ Navigation menu functionality
- ✅ Organizations page access
- ✅ Parents page access
- ✅ Basic page rendering and content display

## Troubleshooting

1. **Tests fail to connect**: Make sure the admin dashboard is running on `http://localhost:3000` or let Playwright start it automatically

2. **Authentication fails**: 
   - Verify admin credentials are correct
   - Ensure the user has the `admin` role in the `user_roles` table
   - Check that Supabase connection is working

3. **Tests timeout**: 
   - Increase timeout in `playwright.config.ts`
   - Check if the Next.js server is starting correctly
   - Verify database connection

4. **Browser not installed**: Run `npx playwright install chromium`

5. **Element not found**: 
   - The admin dashboard uses Material-UI components which may have different selectors
   - Use Playwright's codegen to find correct selectors: `npx playwright codegen http://localhost:3000`

## Notes

- Tests wait for pages to load before interacting
- Some tests include delays to account for async operations (API calls, navigation)
- The admin dashboard requires users to have the `admin` role in the `user_roles` table
- Material-UI components may require specific selectors - use Playwright's inspector to find the right ones

