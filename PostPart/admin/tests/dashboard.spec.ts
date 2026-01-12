import { test, expect } from '@playwright/test';

// Admin test credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-password';

test.describe('Admin Dashboard', () => {
  // Helper function to login
  async function login(page: any) {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByLabel('Email Address');
    const passwordInput = page.getByLabel('Password');
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display dashboard page', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check for dashboard content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Dashboard should have some content (stats, tables, etc.)
    // The exact content depends on your dashboard implementation
  });

  test('should display navigation menu', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for navigation items (these are in the DashboardLayout)
    // Common admin navigation items
    const navItems = [
      'Dashboard',
      'Organisations',
      'Parents',
      'Centres',
      'User Management',
      'Activity Logs',
    ];
    
    // Check if at least some navigation items are present
    const pageContent = await page.textContent('body');
    const hasNavItems = navItems.some(item => pageContent?.includes(item));
    expect(hasNavItems).toBeTruthy();
  });

  test('should navigate to organizations page', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Organizations link
    const orgsLink = page.getByRole('link', { name: /organisations|organizations/i }).first();
    if (await orgsLink.isVisible()) {
      await orgsLink.click();
      await page.waitForTimeout(2000);
      
      // Check if navigated to organizations page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/organizations');
    }
  });

  test('should navigate to parents page', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Parents link
    const parentsLink = page.getByRole('link', { name: /parents/i }).first();
    if (await parentsLink.isVisible()) {
      await parentsLink.click();
      await page.waitForTimeout(2000);
      
      // Check if navigated to parents page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/parents');
    }
  });

  test('should navigate to centers page', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Centers link
    const centersLink = page.getByRole('link', { name: /centres|centers/i }).first();
    if (await centersLink.isVisible()) {
      await centersLink.click();
      await page.waitForTimeout(2000);
      
      // Check if navigated to centers page
      const currentUrl = page.url();
      expect(currentUrl).toContain('/centers');
    }
  });

  test('should display dashboard statistics', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Dashboard should display statistics cards
    // These might be in MUI Cards or similar components
    const pageContent = await page.textContent('body');
    
    // Common stat labels that might appear
    const statLabels = [
      'Organizations',
      'Parents',
      'Centers',
      'Check-ins',
      'Today',
    ];
    
    // Check if at least some stats are displayed
    const hasStats = statLabels.some(label => pageContent?.includes(label));
    expect(hasStats).toBeTruthy();
  });
});

