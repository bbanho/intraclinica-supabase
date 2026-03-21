import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page      = page;
    this.emailInput   = page.getByLabel(/e-mail|email/i);
    this.passwordInput = page.getByLabel(/senha|password/i);
    this.submitButton  = page.getByRole('button', { name: /entrar|login/i });
    this.errorMessage  = page.locator('.error, [role="alert"], .alert-error');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForRedirect() {
    await this.page.waitForURL(url => !url.pathname.includes('/login'), {
      timeout: 15_000,
    });
  }
}
