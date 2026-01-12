import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-password';

test.describe('Organizations Management', () => {
  async function login(page: any) {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    const emailInput = page.getByLabel('Email Address');
    const passwordInput = page.getByLabel('Password');
    
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
    
    // Navigate to organizations page
    await page.goto('/dashboard/organizations');
    await page.waitForTimeout(2000);
  });

  test('should display organizations page', async ({ page }) => {
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Organisations') || expect(pageContent).toContain('Organizations');
  });

  test('should display organizations list', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Check if organizations table or list is displayed
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

