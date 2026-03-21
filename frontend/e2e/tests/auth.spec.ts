import { test, expect } from '../fixtures/auth.fixture';
import { LoginPage } from '../pages/LoginPage';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, BASE_URL } from '../fixtures/auth.fixture';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('invalid@example.com', 'wrongpass');

    // Should remain on login page or show error
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toContain('/login');
  });

  test('should login successfully as SUPER_ADMIN', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await loginPage.waitForRedirect();

    // Should not be on login page after success
    expect(page.url()).not.toContain('/login');
  });

  test('should logout and return to login', async ({ authedPage: page }) => {
    // Already logged in via fixture
    // Click logout — button text is "Encerrar Sessão"
    const logoutBtn = page.getByRole('button', { name: /encerrar sessão|sair|logout/i });
    await logoutBtn.click();

    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });

  test('should persist session on page reload', async ({ authedPage: page }) => {
    const urlBefore = page.url();
    await page.reload();
    // Should NOT be redirected to /login after reload
    await page.waitForTimeout(2000);
    expect(page.url()).not.toContain('/login');
  });
});
