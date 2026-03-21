import { Page, Locator } from '@playwright/test';

export class AdminPage {
  readonly page: Page;

  readonly heading:       Locator;
  readonly tabs:          Locator;
  readonly saasGlobalTab: Locator;
  readonly clinicsTab:    Locator;
  readonly teamTab:       Locator;
  readonly iamTab:        Locator;
  readonly rawSqlTab:     Locator;

  constructor(page: Page) {
    this.page         = page;
    this.heading      = page.getByRole('heading', { name: /admin|painel administrativo/i });
    this.tabs         = page.locator('[role="tab"], .tab-btn, button.tab');
    this.saasGlobalTab = page.getByRole('tab', { name: /saas global/i });
    this.clinicsTab   = page.getByRole('tab', { name: /clínicas/i });
    this.teamTab      = page.getByRole('tab', { name: /equipe/i });
    this.iamTab       = page.getByRole('tab', { name: /segurança|iam/i });
    this.rawSqlTab    = page.getByRole('tab', { name: /raw sql/i });
  }

  async goto() {
    await this.page.goto('/admin');
    await this.heading.waitFor({ timeout: 10_000 });
  }

  async clickTab(tab: Locator) {
    await tab.click();
    // Small wait for content to load
    await this.page.waitForTimeout(500);
  }
}
