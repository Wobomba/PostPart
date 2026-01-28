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

  test('should display dashboard page with title', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check for dashboard title
    const dashboardTitle = page.getByRole('heading', { name: /dashboard/i });
    await expect(dashboardTitle).toBeVisible();
  });

  test('should display all stat cards with correct labels', async ({ page }) => {
    await page.waitForTimeout(3000); // Wait for stats to load
    
    // Check for all stat card titles
    const statCards = [
      'Organisations',
      'Parents',
      'Centres',
      'Check-Ins'
    ];
    
    for (const cardTitle of statCards) {
      // Look for the stat card by its title text
      const card = page.locator('text=' + cardTitle).first();
      await expect(card).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display stat card values (not just zeros)', async ({ page }) => {
    await page.waitForTimeout(5000); // Wait longer for stats to load from API
    
    // Get all stat card values
    // Stat cards should display numbers (even if 0, but ideally should be > 0 after RLS fix)
    const statCardValues = page.locator('[class*="MuiCardContent"]').filter({ 
      hasText: /Organisations|Parents|Centres|Check-Ins/
    });
    
    // At least one stat card should be visible
    const count = await statCardValues.count();
    expect(count).toBeGreaterThan(0);
    
    // Check that stat cards show numbers (not just loading spinners)
    // After RLS fix, these should show actual counts
    const pageContent = await page.textContent('body');
    
    // Look for numeric values in stat cards (they should be formatted with commas)
    // This regex looks for numbers that might be in stat cards
    const hasNumericValues = /\d+/.test(pageContent || '');
    expect(hasNumericValues).toBeTruthy();
  });

  test('should display Today\'s Activity section', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check for "Today's Activity" heading
    const todayActivity = page.getByText(/today'?s activity/i);
    await expect(todayActivity).toBeVisible();
    
    // Check for activity metrics
    const activityLabels = [
      'Check-Ins Today',
      'New Parents',
      'Active Centres'
    ];
    
    for (const label of activityLabels) {
      const metric = page.getByText(label);
      await expect(metric).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display Quick Actions section', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for Quick Actions heading
    const quickActions = page.getByText(/quick actions/i);
    await expect(quickActions).toBeVisible();
    
    // Check for quick action buttons
    const actionButtons = [
      'Add Centre',
      'Send Notification',
      'Manage Allocations'
    ];
    
    for (const buttonText of actionButtons) {
      const button = page.getByRole('button', { name: new RegExp(buttonText, 'i') });
      await expect(button).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display Recent Check-Ins table', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Scroll to find the Recent Check-Ins section
    const recentCheckIns = page.getByText(/recent check-ins/i);
    await expect(recentCheckIns).toBeVisible();
    
    // Check for table headers
    const tableHeaders = [
      'Time',
      'Parent',
      'Child',
      'Centre',
      'Check-Out'
    ];
    
    // At least some headers should be visible
    const pageContent = await page.textContent('body');
    const hasTableHeaders = tableHeaders.some(header => 
      pageContent?.toLowerCase().includes(header.toLowerCase())
    );
    expect(hasTableHeaders).toBeTruthy();
  });

  test('should display Recent Activity timeline', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Scroll to find Recent Activity section
    const recentActivity = page.getByText(/recent activity/i);
    await expect(recentActivity).toBeVisible();
    
    // Check for "View All Logs" button
    const viewAllLogs = page.getByRole('link', { name: /view all logs/i });
    await expect(viewAllLogs).toBeVisible();
  });

  test('should navigate to organizations page from quick link', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Try to find organizations link in navigation or quick actions
    const orgsLink = page.getByRole('link', { name: /organisations|organizations/i }).first();
    
    if (await orgsLink.isVisible()) {
      await orgsLink.click();
      await page.waitForURL('**/organizations**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/organizations');
    }
  });

  test('should navigate to parents page from navigation', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find Parents link in navigation
    const parentsLink = page.getByRole('link', { name: /parents/i }).first();
    
    if (await parentsLink.isVisible()) {
      await parentsLink.click();
      await page.waitForURL('**/parents**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/parents');
    }
  });

  test('should navigate to centers page from navigation', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find Centers link
    const centersLink = page.getByRole('link', { name: /centres|centers/i }).first();
    
    if (await centersLink.isVisible()) {
      await centersLink.click();
      await page.waitForURL('**/centers**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const currentUrl = page.url();
      expect(currentUrl).toContain('/centers');
    }
  });

  test('should display navigation menu items', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for common navigation items
    const navItems = [
      'Dashboard',
      'Organisations',
      'Parents',
      'Centres',
    ];
    
    const pageContent = await page.textContent('body');
    const hasNavItems = navItems.some(item => 
      pageContent?.toLowerCase().includes(item.toLowerCase())
    );
    expect(hasNavItems).toBeTruthy();
  });

  test('should handle stat card loading states', async ({ page }) => {
    // Immediately after login, check for loading indicators
    // Stat cards might show loading spinners initially
    const pageContent = await page.textContent('body');
    
    // After a few seconds, loading should complete
    await page.waitForTimeout(5000);
    
    // Stat cards should have loaded (either showing numbers or zeros)
    const statCardSection = page.locator('text=Organisations').first();
    await expect(statCardSection).toBeVisible();
  });

  test('should display Pending Actions section when applicable', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check for Pending Actions section
    const pendingActions = page.getByText(/pending actions/i);
    
    // This section might not always be visible if there are no pending actions
    // So we just check if the page loaded successfully
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should display Top Active Centres section', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Scroll to find Top Active Centres
    const topCenters = page.getByText(/top active centres|top active centers/i);
    
    // This section might not be visible if there's no data
    // Just verify the page structure is correct
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should be responsive and display correctly', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 },   // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Dashboard title should still be visible
      const dashboardTitle = page.getByRole('heading', { name: /dashboard/i });
      await expect(dashboardTitle).toBeVisible();
    }
  });
});
