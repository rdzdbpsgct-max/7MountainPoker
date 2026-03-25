import { test, expect } from '@playwright/test';
import { completeWizard, goToSetup } from './helpers';

test.describe('Setup to Game', () => {
  test('wizard appears on first visit', async ({ page }) => {
    await page.goto('/');
    // Wizard should be visible — Welcome step
    await expect(page.locator('text=Willkommen!').first()).toBeVisible({ timeout: 15000 });
    // "Weiter" button should be present
    await expect(page.locator('button:has-text("Weiter")').first()).toBeVisible();
  });

  test('setup page loads via wizard and can start tournament', async ({ page }) => {
    await completeWizard(page);

    // Start button should be enabled (6 players from wizard)
    const startBtn = page.locator('button:has-text("▶")').first();
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();

    // Timer should now be visible (game mode)
    await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 15000 });
  });

  test('wizard is skipped when already completed', async ({ page }) => {
    await goToSetup(page);
    // Should be on setup page directly — no wizard
    await expect(page.locator('text=Willkommen!')).toBeHidden({ timeout: 3000 });
    await expect(page.locator('button:has-text("▶")').first()).toBeVisible();
  });
});
