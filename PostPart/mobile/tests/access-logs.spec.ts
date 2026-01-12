import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'isaacwobomba111@gmail.com';
const TEST_PASSWORD = 'MbiiM@99';

test.describe('Access Logs Screen', () => {
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
    
    // Wait for login
    await page.waitForTimeout(5000);
    
    // Navigate to access logs
    await page.goto('/access-logs');
    await page.waitForTimeout(2000);
  });

  test('should display access logs screen', async ({ page }) => {
    const pageContent = await page.textContent('body');
    
    // Check for access logs or activity related content
    expect(pageContent).toContain('Activity') || 
           expect(pageContent).toContain('Access Logs') ||
           expect(pageContent).toContain('Check-In');
  });

  test('should display check-in history', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check if check-in items are displayed
    const pageContent = await page.textContent('body');
    
    // Should show either check-ins or empty state
    const hasContent = pageContent?.includes('No recent activity') || 
                      pageContent?.includes('Check') ||
                      pageContent?.includes('Center');
    
    expect(hasContent).toBeTruthy();
  });
});

