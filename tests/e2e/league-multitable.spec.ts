import { test, expect } from '@playwright/test';
import { completeWizard } from './helpers';

test.describe('League and Multi-Table happy paths', () => {
  test('league quick start reaches game mode', async ({ page }) => {
    // Use completeWizard to get 6 players (needed for league quick start)
    await completeWizard(page);

    // Switch to league mode via the leagues button
    const leaguesButton = page.locator('[data-tour="leagues"]').first();
    await expect(leaguesButton).toBeVisible({ timeout: 5000 });
    await leaguesButton.click();

    // Wait for league mode to load
    await page.waitForTimeout(1000);

    // Create a new league
    const createLeagueButton = page.locator('button:has-text("Neue Liga"), button:has-text("New League")').first();
    await expect(createLeagueButton).toBeVisible({ timeout: 8000 });
    await createLeagueButton.click();

    // LeagueCreationModal opens with autoFocus input (placeholder: "z.B. Freitagsrunde" / "e.g. Friday Night")
    const leagueNameInput = page.locator('input[placeholder*="Freitagsrunde"], input[placeholder*="Friday Night"]').first();
    await expect(leagueNameInput).toBeVisible({ timeout: 5000 });
    await leagueNameInput.fill(`E2E League ${Date.now()}`);
    // Click the create button in the modal
    const createButton = page.locator('button:has-text("Erstellen"), button:has-text("Create")').first();
    await createButton.click();

    // Wait for React state update after league creation — league must be selected
    await page.waitForTimeout(1500);

    const quickStartButton = page.locator('button:has-text("Schnellstart"), button:has-text("Quick Start")').first();
    await expect(quickStartButton).toBeVisible({ timeout: 10000 });
    await quickStartButton.click();

    // Wait for game mode timer
    await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 15000 });
  });

  test('multi-table can be enabled and tournament started', async ({ page }) => {
    // Use completeWizard to get 6 players (needed for multi-table section to appear)
    await completeWizard(page);

    // Open the Multi-Table collapsible section
    const multiTableSectionToggle = page.locator('button:has-text("Multi-Table")').first();
    await expect(multiTableSectionToggle).toBeVisible({ timeout: 8000 });
    await multiTableSectionToggle.click();
    await page.waitForTimeout(500);

    // Enable multi-table — find the enable/activate button inside the expanded section
    const multiTableEnableToggle = page.locator('button:has-text("Multi-Table")').nth(1);
    await expect(multiTableEnableToggle).toBeVisible({ timeout: 5000 });
    await multiTableEnableToggle.click();
    await page.waitForTimeout(500);

    // After enabling, the button should show a checkmark
    await expect(page.locator('button:has-text("Multi-Table ✓")').first()).toBeVisible({ timeout: 5000 });

    // Start tournament — click the ▶ button
    const startTournamentButton = page.locator('button:has-text("▶")').first();
    await expect(startTournamentButton).toBeEnabled({ timeout: 5000 });
    await startTournamentButton.click({ force: true });

    // Should reach game mode (timer visible) — seating overlay may or may not appear
    await expect(page.locator('.font-mono.font-bold.tabular-nums').first()).toBeVisible({ timeout: 15000 });
  });
});
