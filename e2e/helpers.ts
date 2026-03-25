import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Skip the first-time wizard and onboarding tour by setting localStorage before page loads. */
export function skipWizard(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('poker-timer-wizard-completed', 'true');
    localStorage.setItem('poker-timer-tour-completed', 'true');
  });
}

/**
 * Complete the wizard via UI clicks to reach the setup page with 6 default players.
 * This is the most reliable way to get a valid tournament config.
 */
export async function completeWizard(page: Page) {
  // Suppress the onboarding tour that appears after wizard completion
  await page.addInitScript(() => {
    localStorage.setItem('poker-timer-tour-completed', 'true');
  });
  await page.goto('/');

  // Step 1: Welcome — click "Weiter" (Next)
  await expect(page.locator('text=Willkommen!').first()).toBeVisible({ timeout: 15000 });
  await page.locator('button:has-text("Weiter")').first().click();

  // Step 2: Players — leave default (6 players), click next
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Weiter")').first().click();

  // Step 3: Buy-In — leave default, click next
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Weiter")').first().click();

  // Step 4: Blind Speed — leave default, click next
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Weiter")').first().click();

  // Step 5: Tips — click next
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Weiter")').first().click();

  // Step 6: Review — click "Turnier starten!" (wizard.start) — exact match
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Turnier starten!")').first().click();

  // Now we should be on the setup page — wait for the start button with the ▶ prefix
  // Use a more specific selector to avoid matching the wizard's "Turnier starten!" button
  await expect(page.locator('button:has-text("▶")').first()).toBeVisible({ timeout: 15000 });
}

/**
 * Skip the wizard via localStorage and go directly to the setup page.
 * Faster and more reliable than completeWizard for tests that don't test the wizard itself.
 */
export async function goToSetup(page: Page) {
  await skipWizard(page);
  await page.goto('/');
  // Wait for setup page to be ready — the start button with ▶ prefix
  await expect(page.locator('button:has-text("▶")').first()).toBeVisible({ timeout: 15000 });
}

/**
 * Navigate through wizard, then start the tournament to reach game mode.
 */
export async function startTournament(page: Page) {
  await completeWizard(page);

  // Click start tournament — button has "▶ Turnier starten" text
  const startBtn = page.locator('button:has-text("▶")').first();
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();

  // Wait for game mode — timer display (large font-mono font-bold tabular-nums element)
  // Increase timeout for CI where lazy-loaded chunks may be slower
  await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 15000 });
}

/**
 * Skip wizard and start tournament directly — fastest path to game mode.
 */
export async function startTournamentFast(page: Page) {
  await goToSetup(page);

  const startBtn = page.locator('button:has-text("▶")').first();
  await expect(startBtn).toBeEnabled({ timeout: 5000 });
  await startBtn.click();

  await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 15000 });
}
