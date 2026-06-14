import { test, expect } from '@playwright/test';
import { goToSetup, startTournamentFast } from './helpers';

test.describe('Navigation — Mode Switching', () => {
  test('Switch between setup and game mode', async ({ page }) => {
    // Start tournament to reach game mode
    await startTournamentFast(page);

    // Verify game mode — timer visible
    const timerDisplay = page.locator('.font-mono.font-bold.tabular-nums').first();
    await expect(timerDisplay).toBeVisible({ timeout: 15000 });

    // Header should be visible in game mode
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 5000 });

    // Level label should show "Level 1"
    const levelLabel = page.locator('[aria-live="polite"] p.uppercase').first();
    await expect(levelLabel).toBeVisible({ timeout: 5000 });
    await expect(levelLabel).toContainText('Level 1');
  });

  test('Language switching DE → EN', async ({ page }) => {
    await goToSetup(page);

    // Default language is German — the persistent start button says "Spiel starten"
    const startBtn = page.locator('button:has-text("Spiel starten")').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    // Find and click the EN language button to switch to English
    // The language switcher has DE/EN buttons
    const enButton = page.locator('button[aria-label="Switch to English"], button:has-text("EN")').first();
    await expect(enButton).toBeVisible({ timeout: 5000 });
    await enButton.click();
    await page.waitForTimeout(500);

    // Verify UI text changed to English — start button should now say "Start Game"
    const startBtnEn = page.locator('button:has-text("Start Game")').first();
    await expect(startBtnEn).toBeVisible({ timeout: 5000 });

    // Switch back to German
    const deButton = page.locator('button[aria-label="Zu Deutsch wechseln"], button:has-text("DE")').first();
    await expect(deButton).toBeVisible({ timeout: 5000 });
    await deButton.click();
    await page.waitForTimeout(500);

    // Verify back to German
    await expect(page.locator('button:has-text("Spiel starten")').first()).toBeVisible({ timeout: 5000 });
  });
});
