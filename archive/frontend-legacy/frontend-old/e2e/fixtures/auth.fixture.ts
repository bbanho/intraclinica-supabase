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
  await page.goto('/#/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /acessar/i }).click();
  
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15_000 });
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await loginAs(page, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    await use(page);
  },
});

export { expect } from '@playwright/test';
