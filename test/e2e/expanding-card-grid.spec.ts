import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = path.resolve(__dirname, './screenshots');

test.describe('App Store "Today" Style Expanding Card Grid Animation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/today');
    await expect(page.locator('h1').first()).toContainText('Today in Shop:Sell');
  });

  test('Renders responsive grid with 6 cards and dark theme', async ({ page }) => {
    const cards = page.locator('button[aria-haspopup="dialog"]');
    await expect(cards).toHaveCount(6);

    // Verify first card has category and title
    const firstCard = cards.first();
    await expect(firstCard).toContainText('Audio Engineering');
    await expect(firstCard).toContainText('AcousticPro Studio Buds');

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/expanding-01-grid.png` });
  });

  test('Opens card 1 and closes with the Close button', async ({ page }) => {
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    // Dialog should open in portal
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('h2')).toContainText('AcousticPro Studio Buds');
    await expect(dialog).toContainText('The Story Behind This Piece');
    await expect(dialog).toContainText('Add to Cart');

    // Body scroll must be locked
    const isScrollLocked = await page.evaluate(() => document.body.style.overflow === 'hidden');
    expect(isScrollLocked).toBe(true);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/expanding-02-card-open.png` });

    // Click close button
    const closeBtn = page.locator('button[aria-label="Close card dialog"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Body scroll should be unlocked
    const isUnlocked = await page.evaluate(() => document.body.style.overflow !== 'hidden');
    expect(isUnlocked).toBe(true);
  });

  test('Opens card 2 and closes with Escape key', async ({ page }) => {
    const secondCard = page.locator('button[aria-haspopup="dialog"]').nth(1);
    await secondCard.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('Handthrown Matte Pour-Over Set');

    // Press Escape
    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('Opens card 3 and closes by clicking the backdrop', async ({ page }) => {
    const thirdCard = page.locator('button[aria-haspopup="dialog"]').nth(2);
    await thirdCard.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('Wildflower Forest Honey');

    // Click backdrop outside dialog
    await page.mouse.click(20, 20);

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('Switches between cards with no jump or flicker', async ({ page }) => {
    // Open card 1
    const firstCard = page.locator('button[aria-haspopup="dialog"]').first();
    await firstCard.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('AcousticPro Studio Buds');

    // Switch to another card using the quick-switcher inside sheet
    const switchButton = page.locator('button:has-text("Switch to")').first();
    if (await switchButton.isVisible()) {
      await switchButton.click();
      await page.waitForTimeout(300);
      await expect(dialog).toBeVisible();
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/expanding-03-switch-card.png` });

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('Can open each of the 6 cards in succession', async ({ page }) => {
    const cards = page.locator('main button[aria-haspopup="dialog"]');
    await expect(cards).toHaveCount(6);
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      await cards.nth(i).click();
      const dialog = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Close using Esc
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });
});
