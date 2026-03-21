import { test, expect } from '../fixtures/auth.fixture';
import { AdminPage } from '../pages/AdminPage';

test.describe('Admin Panel (SUPER_ADMIN)', () => {
  test('should render admin panel heading', async ({ authedPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(admin.heading).toBeVisible();
  });

  test('should show SaaS Global tab', async ({ authedPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(admin.saasGlobalTab).toBeVisible();
  });

  test('should show Clinics tab', async ({ authedPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await expect(admin.clinicsTab).toBeVisible();
  });

  test('should switch to SaaS Global tab content', async ({ authedPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.clickTab(admin.saasGlobalTab);

    // Some global stats/cards should appear
    const content = page.locator('.tab-content, [role="tabpanel"], .admin-content');
    await expect(content).toBeVisible({ timeout: 5_000 });
  });

  test('should switch to Clinics tab and list clinics', async ({ authedPage: page }) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await admin.clickTab(admin.clinicsTab);

    // At minimum the demo clinic should appear
    const rows = page.locator('table tbody tr, .clinic-row, .card');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should not be accessible without auth', async ({ page }) => {
    // Not using authedPage — plain page = unauthenticated
    await page.goto('/admin');
    await page.waitForURL('**/login', { timeout: 10_000 });
    expect(page.url()).toContain('/login');
  });
});
