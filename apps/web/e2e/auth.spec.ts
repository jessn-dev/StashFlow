import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');
    // Check for a link to login or dashboard
    // Assuming there's a login button or link
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Login');
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Sign up' }).click();
    await page.waitForURL('**/signup');
    await expect(page.locator('h1')).toContainText('Sign Up');
  });

  test('should show error on empty login', async ({ page }) => {
    await page.goto('/login');
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeDisabled();
  });
});
