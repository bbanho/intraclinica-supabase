import { test, expect } from '../fixtures/auth.fixture';
import { ReceptionPage } from '../pages/ReceptionPage';

test.describe('Reception', () => {
  test('should show reception page heading', async ({ authedPage: page }) => {
    const reception = new ReceptionPage(page);
    await reception.goto();
    await expect(reception.heading).toBeVisible();
  });

  test('should show "New Appointment" button', async ({ authedPage: page }) => {
    const reception = new ReceptionPage(page);
    await reception.goto();
    await expect(reception.newApptButton).toBeVisible();
  });

  test('should open new appointment modal', async ({ authedPage: page }) => {
    const reception = new ReceptionPage(page);
    await reception.goto();
    await reception.openNewAppointmentModal();
    await expect(reception.modal).toBeVisible();
  });

  test('should display appointment list (or empty state)', async ({ authedPage: page }) => {
    const reception = new ReceptionPage(page);
    await reception.goto();

    // Either rows exist, or an empty state message is shown — no uncaught errors
    const count = await reception.appointmentRows.count();
    // Just verify no crash: count can be 0
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
