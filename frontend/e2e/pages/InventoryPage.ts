import { Page, Locator } from '@playwright/test';

export class InventoryPage {
  readonly page: Page;

  readonly heading:       Locator;
  readonly productRows:   Locator;
  readonly addButton:     Locator;
  readonly addModal:      Locator;
  readonly productNameInput: Locator;
  readonly saveButton:    Locator;

  constructor(page: Page) {
    this.page             = page;
    this.heading          = page.getByRole('heading', { name: /inventário|estoque/i });
    this.productRows      = page.locator('table tbody tr, .product-row, [data-testid="product-row"]');
    this.addButton        = page.getByRole('button', { name: /adicionar|novo produto/i });
    this.addModal         = page.locator('.modal, dialog, [role="dialog"]');
    this.productNameInput = page.getByLabel(/nome|product name/i);
    this.saveButton       = page.getByRole('button', { name: /salvar|confirmar/i });
  }

  async goto() {
    await this.page.goto('/inventory');
    await this.heading.waitFor({ timeout: 10_000 });
  }

  async openAddModal() {
    await this.addButton.click();
    await this.addModal.waitFor({ timeout: 5_000 });
  }

  async addProduct(name: string) {
    await this.openAddModal();
    await this.productNameInput.fill(name);
    await this.saveButton.click();
    await this.addModal.waitFor({ state: 'hidden', timeout: 5_000 });
  }
}
