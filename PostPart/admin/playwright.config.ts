import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing the PostPart Admin Dashboard
 * 
 * To run tests:
 * 1. Start the app: npm run dev
 * 2. In another terminal: npm run test
 * 
 * Or let Playwright start the server automatically (configured below)
 * 
 * Browser Options:
 * - chromium: Playwright's Chromium (recommended, same engine as Brave)
 * - brave: Your installed Brave browser (may have compatibility issues)
 * - firefox: Firefox browser
 * - webkit: Safari/WebKit browser
 * 
 * Note: Brave is Chromium-based, so using 'chromium' project gives the same results.
 * The 'brave' project uses your installed Brave, but may require additional setup.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid multiple tabs and auth conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker to prevent multiple browser instances
  reporter: 'html',
  
  use: {
    // Allow testing from different machines on the network
    // Set BASE_URL environment variable to test from another machine
    // Example: BASE_URL=http://192.168.1.100:3000 npm run test
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'brave',
      use: {
        ...devices['Desktop Chrome'],
        // Use Brave browser executable (Chromium-based)
        // Note: This may have compatibility issues. Consider using 'chromium' instead.
        // If Brave doesn't work, use: npm run test (uses Chromium, same engine)
        channel: undefined,
        executablePath: process.env.BRAVE_PATH || '/snap/brave/current/opt/brave.com/brave/brave',
      },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Only start web server if testing locally (not from remote machine)
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

