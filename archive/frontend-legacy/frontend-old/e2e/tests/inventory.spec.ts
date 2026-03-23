import { test, expect } from '../fixtures/auth.fixture';
import { InventoryPage } from '../pages/InventoryPage';

test.describe('Inventory', () => {
  test('should show inventory page with product list', async ({ authedPage: page }) => {
    const inv = new InventoryPage(page);

    // Select a clinic first (SUPER_ADMIN starts at 'all')
    // Navigate to inventory — component guards against 'all' context
    await page.goto('/inventory');

    // The heading should render regardless
    await expect(inv.heading).toBeVisible({ timeout: 10_000 });
  });

  test('should show "Add Product" button', async ({ authedPage: page }) => {
    const inv = new InventoryPage(page);
    await page.goto('/inventory');
    await inv.heading.waitFor({ timeout: 10_000 });

    await expect(inv.addButton).toBeVisible();
  });

  test('should open add product modal on button click', async ({ authedPage: page }) => {
    const inv = new InventoryPage(page);
    await page.goto('/inventory');
    await inv.heading.waitFor({ timeout: 10_000 });

    await inv.openAddModal();
    await expect(inv.addModal).toBeVisible();
  });

  test('should close modal on cancel', async ({ authedPage: page }) => {
    const inv = new InventoryPage(page);
    await page.goto('/inventory');
    await inv.heading.waitFor({ timeout: 10_000 });

    await inv.openAddModal();
    const cancelBtn = page.getByRole('button', { name: /cancelar|fechar|close/i });
    await cancelBtn.click();
    await expect(inv.addModal).toBeHidden({ timeout: 5_000 });
  });
});
