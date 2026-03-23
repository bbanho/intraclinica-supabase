import { test, expect } from '../fixtures/auth.fixture';
import { ClinicalPage } from '../pages/ClinicalPage';

test.describe('Clinical Execution', () => {
  test('should render clinical page heading', async ({ authedPage: page }) => {
    const clinical = new ClinicalPage(page);
    await clinical.goto();
    await expect(clinical.heading).toBeVisible();
  });

  test('should show procedure and patient selects', async ({ authedPage: page }) => {
    const clinical = new ClinicalPage(page);
    await clinical.goto();

    // Selects may be disabled or empty when no clinic context
    // Just verify they are rendered
    await expect(clinical.procedureSelect).toBeVisible();
    await expect(clinical.patientSelect).toBeVisible();
  });

  test('should show perform button', async ({ authedPage: page }) => {
    const clinical = new ClinicalPage(page);
    await clinical.goto();
    await expect(clinical.performButton).toBeVisible();
  });

  test('should show validation error when performing without selection', async ({ authedPage: page }) => {
    const clinical = new ClinicalPage(page);
    await clinical.goto();

    await clinical.performButton.click();
    // Should show a validation message (not crash)
    await expect(clinical.errorMessage).toBeVisible({ timeout: 3_000 });
  });
});
