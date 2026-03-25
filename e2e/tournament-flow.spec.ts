import { test, expect } from '@playwright/test';
import { goToSetup, startTournamentFast } from './helpers';

test.describe('Tournament Flow — Core Lifecycle', () => {
  test('Setup → Start → Play → Finish', async ({ page }) => {
    // Skip wizard, go to setup
    await goToSetup(page);

    // Verify setup page renders — start button visible
    const startBtn = page.locator('button:has-text("▶")').first();
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await expect(startBtn).toBeEnabled();

    // Click start to enter game mode
    await startBtn.click();

    // Verify game mode shows timer (font-mono.font-bold.tabular-nums)
    const timerDisplay = page.locator('.font-mono.font-bold.tabular-nums').first();
    await expect(timerDisplay).toBeVisible({ timeout: 15000 });

    // Verify controls work — play/pause button exists with aria-pressed
    const playPauseBtn = page.locator('button[aria-pressed]').first();
    await expect(playPauseBtn).toBeVisible({ timeout: 5000 });

    // Timer starts paused
    await expect(playPauseBtn).toHaveAttribute('aria-pressed', 'false');

    // Press space to play
    await page.keyboard.press('Space');
    await expect(playPauseBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });

    // Press space to pause
    await page.keyboard.press('Space');
    await expect(playPauseBtn).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });
  });

  test('Timer runs and displays correctly', async ({ page }) => {
    await startTournamentFast(page);

    const timerDisplay = page.locator('.font-mono.font-bold.tabular-nums').first();
    await expect(timerDisplay).toBeVisible({ timeout: 15000 });

    // Read initial timer value
    const initialText = await timerDisplay.textContent();
    expect(initialText).toBeTruthy();
    // Timer should show MM:SS format (e.g. "15:00" or "20:00")
    expect(initialText).toMatch(/\d{1,2}:\d{2}/);

    // Start the timer
    await page.keyboard.press('Space');

    // Wait 2.5 seconds for the timer to count down
    await page.waitForTimeout(2500);

    // Pause the timer
    await page.keyboard.press('Space');

    // Timer should have changed (counted down)
    const afterText = await timerDisplay.textContent();
    expect(afterText).toBeTruthy();
    expect(afterText).toMatch(/\d{1,2}:\d{2}/);

    // The timer value should have decreased (or at minimum, ticked)
    // Parse seconds from MM:SS
    const parseSeconds = (t: string) => {
      const match = t.match(/(\d{1,2}):(\d{2})/);
      if (!match) return 0;
      return parseInt(match[1]) * 60 + parseInt(match[2]);
    };

    const initialSeconds = parseSeconds(initialText!);
    const afterSeconds = parseSeconds(afterText!);
    expect(afterSeconds).toBeLessThan(initialSeconds);
  });
});
