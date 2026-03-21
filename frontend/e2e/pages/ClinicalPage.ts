import { Page, Locator } from '@playwright/test';

export class ClinicalPage {
  readonly page: Page;

  readonly heading:        Locator;
  readonly procedureSelect: Locator;
  readonly patientSelect:  Locator;
  readonly notesTextarea:  Locator;
  readonly performButton:  Locator;
  readonly successMessage: Locator;
  readonly errorMessage:   Locator;
  readonly auditRows:      Locator;

  constructor(page: Page) {
    this.page             = page;
    this.heading          = page.getByRole('heading', { name: /clínica|procedimento/i });
    this.procedureSelect  = page.getByLabel(/procedimento/i);
    this.patientSelect    = page.getByLabel(/paciente/i);
    this.notesTextarea    = page.getByLabel(/observações|notas/i);
    this.performButton    = page.getByRole('button', { name: /executar|realizar/i });
    this.successMessage   = page.locator('.success, .alert-success, [role="status"]');
    this.errorMessage     = page.locator('.error, .alert-error, [role="alert"]');
    this.auditRows        = page.locator('table tbody tr, .audit-row');
  }

  async goto() {
    await this.page.goto('/clinical');
    await this.heading.waitFor({ timeout: 10_000 });
  }
}
