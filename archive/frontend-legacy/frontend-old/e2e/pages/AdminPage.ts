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
    this.heading      = page.locator('h1', { hasText: /Painel Administrativo|Configurações da Unidade/i });
    this.tabs         = page.locator('button');
    this.saasGlobalTab = page.getByRole('button', { name: /saas global/i });
    this.clinicsTab   = page.getByRole('button', { name: /clínicas|clientes/i });
    this.teamTab      = page.getByRole('button', { name: /equipe/i });
    this.iamTab       = page.getByRole('button', { name: /segurança|iam/i });
    this.rawSqlTab    = page.getByRole('button', { name: /raw sql|query/i });
  }

  async goto() {
    await this.page.goto('/#/admin');
    await this.heading.waitFor({ timeout: 10_000 });
  }

  async clickTab(tab: Locator) {
    await tab.click();
    // Small wait for content to load
    await this.page.waitForTimeout(500);
  }
}
