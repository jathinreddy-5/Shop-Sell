import { test, expect } from '@playwright/test';

test.describe('Fix Verification: Card View Full Page & LiquidNav Transitions', () => {
  test('1. LiquidNav on homepage has clean pill, no false active icon, and smooth transitions on click', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const headerNav = page.locator('header [data-testid="liquid-nav"][data-variant="top"]').first();
    await expect(headerNav).toBeVisible();

    // On home page, no item is falsely marked active
    await expect(headerNav).toHaveAttribute('data-active-id', '');

    // Circle should not be rendered on home page
    const circle = headerNav.locator('[data-testid="liquid-nav-circle"]');
    await expect(circle).toHaveCount(0);

    // Clicking Wishlist activates it with smooth transition and navigates
    const wishlistLink = headerNav.locator('[data-testid="liquid-nav-item-wishlist"]');
    await wishlistLink.click();
    await page.waitForURL('**/account/wishlist');
    await expect(page).toHaveURL(/\/account\/wishlist/);

    // On /account/wishlist, wishlist is active in header nav
    const activeHeaderNav = page.locator('header [data-testid="liquid-nav"][data-variant="top"]').first();
    await expect(activeHeaderNav).toHaveAttribute('data-active-id', 'wishlist');
    await expect(activeHeaderNav.locator('[data-testid="liquid-nav-circle"]')).toBeVisible();

    // Clicking Cart navigates to /cart
    const cartLink = activeHeaderNav.locator('[data-testid="liquid-nav-item-cart"]');
    await cartLink.click();
    await page.waitForURL('**/cart');
    await expect(page).toHaveURL(/\/cart/);

    // Clicking Seller navigates to /become-a-seller
    const headerNavCart = page.locator('header [data-testid="liquid-nav"][data-variant="top"]').first();
    const sellerLink = headerNavCart.locator('[data-testid="liquid-nav-item-become-a-seller"]');
    await sellerLink.click();
    await page.waitForURL('**/become-a-seller');
    await expect(page).toHaveURL(/\/become-a-seller/);
  });

  test('2. "View full page" from homepage recommended card opens correct product detail page and closes dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    // Click the first recommended card ("Organic Wildflower Forest Honey 500g")
    const honeyCard = page.locator('button[aria-haspopup="dialog"]:has-text("Wildflower Forest Honey")').first();
    await expect(honeyCard).toBeVisible();
    await honeyCard.click();

    // Dialog opens
    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('Wildflower Forest Honey');

    // Body scroll locked
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    // Click "View full page"
    const viewBtn = dialog.locator('a:has-text("View full page")');
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    // Should navigate to /product/organic-wildflower-forest-honey
    await page.waitForURL('**/product/organic-wildflower-forest-honey');
    await expect(page).toHaveURL(/\/product\/organic-wildflower-forest-honey/);

    // Dialog must be dismissed and body scroll unlocked
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    // Product detail page must display the Honey product details (NOT earbuds!)
    await expect(page.locator('h1')).toContainText('Organic Wildflower Forest Honey 500g');
    await expect(page.locator('text=Himalayan Organics').first()).toBeVisible();
    await expect(page.locator('text=₹649').first()).toBeVisible();
  });

  test('3. "View full page" from demo today page opens correct product detail page and closes dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/demo/today');

    // Click the ceramic dripper card
    const dripperCard = page.locator('button[aria-haspopup="dialog"]:has-text("Handthrown Matte Pour-Over Set")').first();
    await expect(dripperCard).toBeVisible();
    await dripperCard.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText('Handthrown Matte Pour-Over Set');

    const viewBtn = dialog.locator('a:has-text("View full page")');
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    await page.waitForURL('**/product/handcrafted-ceramic-dripper-set');
    await expect(page).toHaveURL(/\/product\/handcrafted-ceramic-dripper-set/);

    // Dialog must be closed and body scroll unlocked
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');

    // Product detail page must show Handcrafted Ceramic Dripper Set (NOT earbuds!)
    await expect(page.locator('h1')).toContainText('Handcrafted Ceramic Dripper Set');
    await expect(page.locator('text=Clay & Kiln Studio').first()).toBeVisible();
    await expect(page.locator('text=₹1,899').first()).toBeVisible();
  });

  test('4. "View full page" from search page opens correct product and closes dialog', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/search?q=keyboard');

    const card = page.locator('button[aria-haspopup="dialog"]').first();
    await expect(card).toBeVisible();
    await card.click();

    const dialog = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(dialog).toBeVisible();

    const viewBtn = dialog.locator('a:has-text("View full page")');
    await expect(viewBtn).toBeVisible();
    await viewBtn.click();

    await page.waitForURL('**/product/**');
    await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await expect(page.locator('h1')).toBeVisible();
  });
});
