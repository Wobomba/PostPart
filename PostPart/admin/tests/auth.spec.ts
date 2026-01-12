import { test, expect } from '@playwright/test';

// Admin test credentials - Update these with actual admin credentials
// Note: These should be admin user credentials, not regular parent credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin-password';

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login page
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
  });

  test('should display login page', async ({ page }) => {
    // Check for login page elements
    await expect(page.getByText('PostPart Admin')).toBeVisible();
    await expect(page.getByText('Sign in to access the admin dashboard')).toBeVisible();
    
    // Check for email input
    const emailInput = page.getByLabel('Email Address');
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByLabel('Password');
    await expect(passwordInput).toBeVisible();
    
    // Check for sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.getByLabel('Email Address');
    const passwordInput = page.getByLabel('Password');
    
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message
    const errorMessage = page.getByText(/invalid credentials|failed to sign in/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should successfully login with valid admin credentials', async ({ page }) => {
    const emailInput = page.getByLabel('Email Address');
    const passwordInput = page.getByLabel('Password');
    
    // Fill in admin credentials
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    
    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on the dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Check for dashboard elements (these may vary based on actual dashboard content)
    await page.waitForLoadState('networkidle');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');
    
    // Should redirect to login or welcome page
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(auth\/login|welcome)/);
  });
});

