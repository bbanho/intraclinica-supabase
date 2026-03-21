import { test as base, Page } from '@playwright/test';

// ── Credentials ───────────────────────────────────────────────────────────────
export const SUPER_ADMIN_EMAIL    = 'bmbanho@gmail.com';
export const SUPER_ADMIN_PASSWORD = 'IntraTest2026!';

export const BASE_URL = 'http://localhost:3000';

// ── Auth fixture ──────────────────────────────────────────────────────────────
type AuthFixtures = {
  /** Page already logged in as SUPER_ADMIN */
  authedPage: Page;
};

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/e-mail|email/i).fill(email);
  await page.getByLabel(/senha|password/i).fill(password);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  // Wait for the main layout sidebar to appear (indicates successful login)
  await page.waitForSelector('app-main-layout, [data-testid="sidebar"], nav', {
    timeout: 15_000,
  });
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await loginAs(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await use(page);
  },
});

export { expect } from '@playwright/test';
