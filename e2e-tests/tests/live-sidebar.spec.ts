import { test, expect } from '@playwright/test';

test.describe('Live Production Verification', () => {
  test('should load the IntraClinica login page successfully', async ({ page }) => {
    // Navigate to the production URL
    const response = await page.goto('https://intraclinica.axio.eng.br/', { timeout: 15000 });
    
    // Assert successful HTTP status
    expect(response?.status()).toBe(200);
    
    // Assert the page title contains IntraClinica
    await expect(page).toHaveTitle(/IntraClinica/i);
    
    // Check if the login form is rendered (looking for standard auth elements)
    const emailInputVisible = await page.locator('input[type="email"]').isVisible();
    expect(emailInputVisible).toBeTruthy();
  });
});
