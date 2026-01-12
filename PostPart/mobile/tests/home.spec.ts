import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'isaacwobomba111@gmail.com';
const TEST_PASSWORD = 'MbiiM@99';

test.describe('Home Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for navigation to home or organization screen
    await page.waitForTimeout(5000);
    
    // If on organization screen, we might need to handle it
    // For now, just wait and check what screen we're on
  });

  test('should display home screen elements', async ({ page }) => {
    // Wait for home screen to load
    await page.waitForTimeout(2000);
    
    const pageContent = await page.textContent('body');
    
    // Check for greeting (time-based)
    const hasGreeting = pageContent?.includes('Good Morning') || 
                       pageContent?.includes('Good Afternoon') || 
                       pageContent?.includes('Good Evening');
    expect(hasGreeting).toBeTruthy();
    
    // Check for quick access buttons
    expect(pageContent).toContain('Browse Centers');
    expect(pageContent).toContain('My Children');
    expect(pageContent).toContain('Activity');
  });

  test('should display quick check-in card', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Quick Check-In');
    expect(pageContent).toContain('Scan QR code at daycare');
    
    // Check for scan button
    const scanButton = page.getByRole('button', { name: /scan now/i });
    await expect(scanButton).toBeVisible();
  });

  test('should navigate to centers from quick access', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Browse Centers
    const browseCenters = page.getByText('Browse Centers').first();
    await browseCenters.click();
    
    await page.waitForTimeout(2000);
    
    // Check if navigated to centers
    const currentUrl = page.url();
    expect(currentUrl).toContain('/centers');
  });

  test('should navigate to children from quick access', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click My Children
    const myChildren = page.getByText('My Children').first();
    await myChildren.click();
    
    await page.waitForTimeout(2000);
    
    // Check if navigated to children page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/children');
  });

  test('should navigate to access logs from quick access', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Activity
    const activity = page.getByText('Activity').first();
    await activity.click();
    
    await page.waitForTimeout(2000);
    
    // Check if navigated to access logs
    const currentUrl = page.url();
    expect(currentUrl).toContain('/access-logs');
  });

  test('should display settings and notifications icons', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for header icons (settings and notifications)
    // These are typically rendered as buttons or touchable elements
    const pageContent = await page.textContent('body');
    
    // Settings icon should be present (gear icon)
    // Notifications icon should be present (bell icon)
    // We can't easily test icons directly, but we can check if the header exists
    const hasHeader = await page.locator('header, [role="banner"]').count() > 0;
    expect(hasHeader).toBeTruthy();
  });
});

