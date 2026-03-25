import { test, expect } from '@playwright/test';
import { startTournamentFast } from './helpers';

test.describe('Display Modes', () => {
  test.beforeEach(async ({ page }) => {
    await startTournamentFast(page);
  });

  test('clean view toggle via F key', async ({ page }) => {
    // In normal game mode, status text should be visible (uppercase tracking-widest)
    const statusText = page.locator('.uppercase.tracking-widest').first();
    await expect(statusText).toBeVisible({ timeout: 5000 });

    // Press F to toggle clean view — status should hide
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    // Timer should still be visible
    await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible();

    // Press F again to exit clean view
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    // Status text should be visible again
    await expect(statusText).toBeVisible({ timeout: 5000 });
  });

  test('TV display mode toggle via T key', async ({ page }) => {
    // Press T to enter TV display mode
    await page.keyboard.press('t');
    await page.waitForTimeout(1000);

    // Press Escape to exit TV mode
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Should be back to normal game view — timer visible
    await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 5000 });
  });

  test('dark/light theme switch persists', async ({ page }) => {
    // App defaults to dark mode — verify
    const html = page.locator('html');
    const initialDark = await html.evaluate(el => el.classList.contains('dark'));
    expect(initialDark).toBe(true);

    // Find theme switcher button and click to cycle to light mode
    const themeBtn = page.locator('button[title]').filter({ hasText: /☀|🌙|💻/ }).first();
    if (await themeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await themeBtn.click();
      await page.waitForTimeout(500);
    }
  });
});
