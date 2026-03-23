import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Login/i })).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill('invalid@example.com');
    await page.getByLabel(/Password/i).fill('wrongpass');
    await page.getByRole('button', { name: /Login/i }).click();

    // Should remain on login page or show error
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByText(/Invalid login credentials/i)).toBeVisible();
  });

  test('should login successfully, populate clinic context and redirect', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill('admin@intraclinica.test');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: /Login/i }).click();

    await expect(page).not.toHaveURL(/.*\/login/);
    
    // Verify multi-tenant clinic context population via UI (e.g. a clinic selector)
    await expect(page.getByTestId('clinic-selector')).toBeVisible();
  });

  test('should logout and return to login', async ({ page }) => {
    // Assuming we start logged in for this test or we login first
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill('admin@intraclinica.test');
    await page.getByLabel(/Password/i).fill('password123');
    await page.getByRole('button', { name: /Login/i }).click();
    await expect(page).not.toHaveURL(/.*\/login/);

    const logoutBtn = page.getByRole('button', { name: /Encerrar Sessão|Logout/i });
    await logoutBtn.click();

    await expect(page).toHaveURL(/.*\/login/);
  });
});
