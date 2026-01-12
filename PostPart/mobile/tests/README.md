# Playwright Tests for PostPart Mobile App

This directory contains end-to-end tests for the PostPart mobile app using Playwright. The tests run against the web version of the app (Expo web).

## Prerequisites

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install chromium
   ```
   
   Or install all browsers:
   ```bash
   npx playwright install
   ```

2. **Start the app in web mode**:
   ```bash
   npm run web
   ```
   
   The app will start on `http://localhost:8081`

## Running Tests

### Run all tests
```bash
npm run test
```

### Run specific test suites
```bash
npm run test:auth      # Authentication tests
npm run test:home      # Home screen tests
npm run test:centers   # Centers screen tests
npm run test:access-logs # Access logs tests
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

- **auth.spec.ts** - Tests for login, registration, and authentication flows
- **home.spec.ts** - Tests for the home screen and navigation
- **centers.spec.ts** - Tests for the centers browsing screen
- **access-logs.spec.ts** - Tests for access logs/activity screen

## Test Credentials

The tests use the following credentials (configured in each test file):
- Email: `isaacwobomba111@gmail.com`
- Password: `MbiiM@99`

## Configuration

The Playwright configuration is in `playwright.config.ts` at the root of the mobile directory. It:
- Automatically starts the web server before tests
- Tests on multiple browsers (Chromium, Firefox, WebKit)
- Includes mobile viewport testing (Pixel 5, iPhone 12)
- Generates HTML reports and screenshots on failure

## Notes

- Tests wait for the app to load before interacting
- Some tests include delays to account for async operations (API calls, navigation)
- The app may redirect to organization selection after login if the user doesn't have an organization
- React Native Web renders components differently than native, so some selectors may need adjustment

## Troubleshooting

1. **Tests fail to connect**: Make sure the app is running on `http://localhost:8081`
2. **Tests timeout**: Increase timeout in `playwright.config.ts` or add more wait time
3. **Elements not found**: React Native Web may render elements differently - check the actual DOM structure
4. **Browser not installed**: Run `npx playwright install chromium`

