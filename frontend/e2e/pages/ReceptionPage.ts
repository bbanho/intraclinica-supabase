import { Page, Locator } from '@playwright/test';

export class ReceptionPage {
  readonly page: Page;

  readonly heading:         Locator;
  readonly appointmentRows: Locator;
  readonly newApptButton:   Locator;
  readonly modal:           Locator;
  readonly patientSelect:   Locator;
  readonly dateInput:       Locator;
  readonly saveButton:      Locator;

  constructor(page: Page) {
    this.page             = page;
    this.heading          = page.getByRole('heading', { name: /recepção|agendamentos/i });
    this.appointmentRows  = page.locator('table tbody tr, .appointment-row');
    this.newApptButton    = page.getByRole('button', { name: /novo agendamento|agendar/i });
    this.modal            = page.locator('.modal, dialog, [role="dialog"]');
    this.patientSelect    = page.getByLabel(/paciente/i);
    this.dateInput        = page.getByLabel(/data/i);
    this.saveButton       = page.getByRole('button', { name: /salvar|confirmar/i });
  }

  async goto() {
    await this.page.goto('/#/reception');
    await this.heading.waitFor({ timeout: 10_000 });
  }

  async openNewAppointmentModal() {
    await this.newApptButton.click();
    await this.modal.waitFor({ timeout: 5_000 });
  }
}
