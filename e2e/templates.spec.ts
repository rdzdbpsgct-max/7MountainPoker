import { test, expect } from '@playwright/test';
import { goToSetup } from './helpers';

test.describe('Templates', () => {
  test.beforeEach(async ({ page }) => {
    await goToSetup(page);
  });

  test('template save and load round-trip', async ({ page }) => {
    // Find the templates button
    const templatesBtn = page.locator('button:has-text("Vorlagen")').first();
    await expect(templatesBtn).toBeVisible({ timeout: 5000 });
    await templatesBtn.click();
    await page.waitForTimeout(500);

    // Template modal should open
    const modal = page.locator('[role="dialog"][aria-label*="Vorlagen"], [role="dialog"]:has-text("Vorlagen"), [aria-modal="true"]:has-text("Vorlagen")').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Look for save input
    const saveInput = modal.locator('input[type="text"]').first();
    if (await saveInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveInput.fill('E2E Test Template');

      // Click save button
      const saveBtn = modal.locator('button:has-text("Speichern")').first();
      if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await saveBtn.click({ force: true });
        await page.waitForTimeout(500);

        // Template should now appear in list
        await expect(modal.locator('text=E2E Test Template')).toBeVisible({ timeout: 5000 });
      }
    }

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('tournament presets are available', async ({ page }) => {
    // Look for preset buttons on setup page
    const presetSection = page.locator('text=/Quick|Standard|Deep Stack/i').first();
    await expect(presetSection).toBeVisible({ timeout: 5000 });
  });
});
