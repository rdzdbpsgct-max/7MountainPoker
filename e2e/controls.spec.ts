import { test, expect } from '@playwright/test';
import { startTournamentFast } from './helpers';

test.describe('Game Controls', () => {
  test.beforeEach(async ({ page }) => {
    await startTournamentFast(page);
  });

  test('play/pause via space bar', async ({ page }) => {
    const playPauseButton = page.locator('button[aria-pressed]').first();
    await expect(playPauseButton).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });

    // Timer should start in stopped state — press space to start
    await page.keyboard.press('Space');

    // Running state is reflected via aria-pressed=true
    await expect(playPauseButton).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });

    // Pause
    await page.keyboard.press('Space');

    // Paused/stopped state returns to aria-pressed=false
    await expect(playPauseButton).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 });
  });

  test('next/previous level via keyboard', async ({ page }) => {
    // Use the level label in the timer display — scoped via aria-live container to avoid matching stats headers
    const levelLabel = page.locator('[aria-live="polite"] p.uppercase').first();
    await expect(levelLabel).toBeVisible({ timeout: 5000 });
    await expect(levelLabel).toContainText('Level 1');

    // Press N for next level
    await page.keyboard.press('n');
    await expect(levelLabel).toContainText('Level 2', { timeout: 5000 });

    // Press V for previous level
    await page.keyboard.press('v');
    await expect(levelLabel).toContainText('Level 1', { timeout: 5000 });
  });
});
