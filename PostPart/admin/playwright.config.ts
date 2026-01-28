import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing the PostPart Admin Dashboard
 * 
 * To run tests:
 * 1. Start the app: npm run dev
 * 2. In another terminal: npm run test
 * 
 * Or let Playwright start the server automatically (configured below)
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
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

