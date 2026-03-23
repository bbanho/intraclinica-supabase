import { test, expect } from '@playwright/test';

test.describe('Live Production Verification', () => {
  test('should load the FrontendV2 login page successfully', async ({ page }) => {
    // Navigate to production
    await page.goto('https://intraclinica.axio.eng.br/');
    
    // Auto-waiting assertion for the title
    await expect(page).toHaveTitle(/FrontendV2/i);
    
    // Auto-waiting assertion for the email/login input
    // We use a CSS selector that catches standard auth fields and waits up to 15 seconds
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible({ timeout: 15000 });
  });
});
