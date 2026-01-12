import { test, expect } from '@playwright/test';

// Test credentials
const TEST_EMAIL = 'isaacwobomba111@gmail.com';
const TEST_PASSWORD = 'MbiiM@99';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/');
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display login screen', async ({ page }) => {
    // Check for login screen elements
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    
    // Check for email input
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.getByPlaceholder('Enter your password');
    await expect(passwordInput).toBeVisible();
    
    // Check for sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
    
    // Check for register link
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait a bit for validation
    await page.waitForTimeout(500);
    
    // Check for error messages (they might appear as text or in error divs)
    // Note: React Native Web renders these differently, so we check for text content
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Email is required');
    expect(pageContent).toContain('Password is required');
  });

  test('should show error for invalid email format', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    await emailInput.fill('invalid-email');
    await passwordInput.fill('password123');
    
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    await page.waitForTimeout(500);
    
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Please enter a valid email');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    const emailInput = page.getByPlaceholder('you@example.com');
    const passwordInput = page.getByPlaceholder('Enter your password');
    
    // Fill in credentials
    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    
    // Click sign in button
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();
    
    // Wait for navigation (either to home or organization selection)
    // The app might redirect to organization selection if user doesn't have an org
    await page.waitForTimeout(3000);
    
    // Check if we're on a different page (not login)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');
    
    // Check for either home screen elements or organization selection
    const pageContent = await page.textContent('body');
    const isHomeScreen = pageContent?.includes('Good Morning') || 
                        pageContent?.includes('Good Afternoon') || 
                        pageContent?.includes('Good Evening');
    const isOrgScreen = pageContent?.includes('organization') || 
                       pageContent?.includes('Organization');
    
    expect(isHomeScreen || isOrgScreen).toBeTruthy();
  });

  test('should navigate to register screen', async ({ page }) => {
    const registerLink = page.getByText('Create Account');
    await registerLink.click();
    
    // Wait for navigation
    await page.waitForTimeout(1000);
    
    // Check if we're on register page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register');
    
    // Check for register screen elements
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Create Account');
  });
});

