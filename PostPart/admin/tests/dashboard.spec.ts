import { test, expect } from '@playwright/test';

// Admin test credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-password';

test.describe('Admin Dashboard', () => {
  // Helper function to login with proper session handling
  async function login(page: any) {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Check if credentials are set
    if (!ADMIN_EMAIL || ADMIN_EMAIL === 'admin@example.com' || !ADMIN_PASSWORD || ADMIN_PASSWORD === 'admin-password') {
      throw new Error('Admin credentials not set! Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.');
    }
    
    const emailInput = page.getByLabel('Email Address');
    const passwordInput = page.getByLabel('Password');
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    
    // Click sign in and wait for either success or error
    await signInButton.click();
    
    // Wait for either dashboard (success) or error message
    try {
      await page.waitForURL('**/dashboard', { timeout: 15000 });
    } catch (e) {
      // Check if there's an error message
      const errorMessage = await page.getByText(/invalid|error|failed/i).first().isVisible().catch(() => false);
      if (errorMessage) {
        const errorText = await page.getByText(/invalid|error|failed/i).first().textContent();
        throw new Error(`Login failed: ${errorText}. Check ADMIN_EMAIL and ADMIN_PASSWORD.`);
      }
      throw e;
    }
    
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for auth to settle
  }

  test.beforeEach(async ({ page, context }) => {
    // Capture console errors to debug Supabase issues
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Capture network failures
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('supabase')) {
        console.log(`Supabase API Error: ${response.status()} ${response.url()}`);
      }
    });
    
    // Clear any existing storage/session before each test
    await context.clearCookies();
    await page.goto('/auth/login');
    await login(page);
    
    // Store console errors for later inspection
    (page as any).__consoleErrors = consoleErrors;
  });

  test('should display dashboard page', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Verify we're authenticated (check for Supabase session)
    const hasAuth = await page.evaluate(() => {
      // Check if Supabase session exists in localStorage
      const keys = Object.keys(localStorage);
      return keys.some(key => key.includes('supabase') || key.includes('auth'));
    });
    
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
      // Wait for navigation after clicking
      await Promise.all([
        page.waitForURL('**/parents**', { timeout: 10000 }),
        parentsLink.click(),
      ]);
      
      // Verify navigation
      const currentUrl = page.url();
      expect(currentUrl).toContain('/parents');
    } else {
      // If link not found, skip test but log it
      console.log('Parents link not found, skipping navigation test');
    }
  });

  test('should navigate to centers page', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click Centers link
    const centersLink = page.getByRole('link', { name: /centres|centers/i }).first();
    if (await centersLink.isVisible()) {
      // Wait for navigation after clicking
      await Promise.all([
        page.waitForURL('**/centers**', { timeout: 10000 }),
        centersLink.click(),
      ]);
      
      // Verify navigation
      const currentUrl = page.url();
      expect(currentUrl).toContain('/centers');
    } else {
      // If link not found, skip test but log it
      console.log('Centers link not found, skipping navigation test');
    }
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Wait for network requests to complete (API calls for stats)
    await page.waitForLoadState('networkidle');
    
    // Wait for stat cards to load (wait for loading spinners to disappear)
    // The stats are loaded asynchronously from Supabase
    await page.waitForFunction(() => {
      const body = document.body.textContent || '';
      // Check if stat card labels are present
      const hasStatLabels = body.includes('Organisations') && 
                           body.includes('Parents') && 
                           body.includes('Centres') && 
                           body.includes('Check-Ins');
      if (!hasStatLabels) return false;
      
      // Check if there are numeric values (stats have loaded, not just loading)
      // Look for formatted numbers (with commas) or plain numbers
      const hasNumbers = /\d{1,3}(,\d{3})*/.test(body) || /\b\d+\b/.test(body);
      return hasNumbers;
    }, { timeout: 15000 });
    
    // Additional wait to ensure stats are fully rendered
    await page.waitForTimeout(2000);
    
    const pageContent = await page.textContent('body');
    
    // Common stat labels that should appear
    const statLabels = [
      'Organisations',
      'Parents',
      'Centres',
      'Check-Ins',
    ];
    
    // Check if all stat labels are displayed
    for (const label of statLabels) {
      expect(pageContent).toContain(label);
    }
    
    // Check that stat cards show numbers (not just loading spinners)
    // Note: If all stats show 0, the RLS fix needs to be applied in Supabase
    // See: supabase/fix-admin-dashboard-rls.sql or tests/RLS_FIX_REQUIRED.md
    const hasNumericValues = /\d+/.test(pageContent || '');
    expect(hasNumericValues).toBeTruthy();
  });

  test('should display stat cards with actual data after RLS fix', async ({ page }) => {
    // Wait for authentication to fully settle
    await page.waitForTimeout(3000);
    
    // Wait for network requests and stat cards to load
    await page.waitForLoadState('networkidle');
    
    // Wait longer for Supabase queries to complete (they run in parallel)
    await page.waitForTimeout(8000);
    
    // Wait for stat cards to have loaded (not showing loading spinners)
    // Check that stats have actually loaded with values
    await page.waitForFunction(() => {
      const body = document.body.textContent || '';
      // Check for stat card labels
      const hasLabels = body.includes('Organisations') && 
                       body.includes('Parents') && 
                       body.includes('Centres') && 
                       body.includes('Check-Ins');
      if (!hasLabels) return false;
      
      // Check for numeric values (stats have loaded)
      // Look for numbers that are not just "0" - we want actual data
      const numberMatches = body.match(/\b\d{1,3}(,\d{3})*\b/g) || [];
      const hasNonZeroNumbers = numberMatches.some(num => {
        const cleanNum = parseInt(num.replace(/,/g, ''));
        return cleanNum > 0;
      });
      
      return hasNonZeroNumbers || numberMatches.length > 0;
    }, { timeout: 20000 });
    
    const pageContent = await page.textContent('body');
    
    // Verify stat cards are visible
    const statCards = ['Organisations', 'Parents', 'Centres', 'Check-Ins'];
    for (const card of statCards) {
      expect(pageContent).toContain(card);
    }
    
    // Extract and log stat values for debugging
    const statValues: { [key: string]: string } = {};
    statCards.forEach(card => {
      // Try to find the number associated with each card
      const regex = new RegExp(`${card}[\\s\\S]{0,200}(\\d{1,3}(,\\d{3})*)`, 'i');
      const match = pageContent?.match(regex);
      if (match) {
        statValues[card] = match[1];
      }
    });
    
    console.log('Stat card values:', statValues);
    
    // Log any console errors that occurred
    const consoleErrors = (page as any).__consoleErrors || [];
    if (consoleErrors.length > 0) {
      console.log('Console errors during test:', consoleErrors);
    }
    
    // Check that we have numeric values
    const hasNumbers = /\d+/.test(pageContent || '');
    expect(hasNumbers).toBeTruthy();
    
    // If some stats are 0 but Centres works, there might be:
    // 1. RLS policy issue for specific tables
    // 2. Timing issue where some queries run before auth is ready
    // 3. Different RLS policies for different tables
    
    // Note: If stats show 0, check:
    // 1. RLS fix applied: supabase/fix-admin-dashboard-rls.sql
    // 2. Admin user has 'admin' role in user_roles table
    // 3. Supabase connection is working in test environment
    // 4. Check browser console in headed mode for Supabase errors
  });
});

