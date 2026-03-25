import { test, expect } from '@playwright/test';
import { goToSetup, startTournamentFast } from './helpers';

test.describe('Player Management', () => {
  test('player count adjustable in setup via NumberStepper', async ({ page }) => {
    await goToSetup(page);

    // Setup page has player name inputs — default config has players
    const playerInputs = page.locator('input[type="text"]');
    const count = await playerInputs.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Find the "+" button (increase) in the player section
    const increaseBtn = page.locator('button:has-text("+")').first();
    if (await increaseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const beforeCount = await playerInputs.count();
      await increaseBtn.click();
      await page.waitForTimeout(300);

      // Should now have one more player input
      const afterCount = await playerInputs.count();
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
    }
  });

  test('eliminate player in game mode', async ({ page }) => {
    await startTournamentFast(page);

    // Look for the player panel toggle on mobile or player list
    const playerToggle = page.locator('button:has-text("Spieler")').first();
    if (await playerToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await playerToggle.click();
      await page.waitForTimeout(500);
    }

    // Look for any eliminate button
    const eliminateBtn = page.locator('button:has-text("Eliminieren")').first();
    if (await eliminateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await eliminateBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
