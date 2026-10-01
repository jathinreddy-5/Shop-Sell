import { test, expect, Page, Locator } from '@playwright/test';

/**
 * Helper to verify that the LiquidNav notch and floating circle center matches
 * the bounding box center of the active item within 1px.
 */
async function assertNotchAlignment(
  page: Page,
  navLocator: Locator,
  itemId: string,
  isVertical = false
) {
  const item = navLocator.locator(`[data-testid="liquid-nav-item-${itemId}"]`);
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('data-active', 'true', { timeout: 5000 });

  // Allow the spring animation (~550ms) to settle completely
  await page.waitForTimeout(700);

  const itemBox = await item.boundingBox();
  const navBox = await navLocator.boundingBox();

  expect(itemBox).not.toBeNull();
  expect(navBox).not.toBeNull();

  const expectedCenter = isVertical
    ? itemBox!.y - navBox!.y + itemBox!.height / 2
    : itemBox!.x - navBox!.x + itemBox!.width / 2;

  const circle = navLocator.locator('[data-testid="liquid-nav-circle"]');
  await expect(circle).toBeVisible();

  const actualCenterStr = await circle.getAttribute('data-center');
  expect(actualCenterStr).not.toBeNull();

  const actualCenter = parseFloat(actualCenterStr!);
  const diff = Math.abs(actualCenter - expectedCenter);

  // Assert within 1px
  expect(
    diff,
    `Notch center (${actualCenter}px) should match active item '${itemId}' center (${expectedCenter}px) within 1px. Diff: ${diff}px`
  ).toBeLessThanOrEqual(1.0);
}

test.describe('Global Liquid Notch Navigation System Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal { display: none !important; pointer-events: none !important; }';
      document.head.appendChild(style);
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Customer Header Actions (Top Variant on Desktop)
  // ---------------------------------------------------------------------------
  test('Customer Header: Forward, Backward, and Skip-order navigation alignment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const headerNav = page.locator('header [data-testid="liquid-nav"][data-variant="top"]');
    await expect(headerNav).toBeVisible();

    // 1a. Forward sequence: wishlist -> cart -> account
    await headerNav.locator('[data-testid="liquid-nav-item-wishlist"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'wishlist');

    await headerNav.locator('[data-testid="liquid-nav-item-cart"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'cart');

    await headerNav.locator('[data-testid="liquid-nav-item-account"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'account');

    // 1b. Backward sequence: cart -> wishlist
    await headerNav.locator('[data-testid="liquid-nav-item-cart"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'cart');

    await headerNav.locator('[data-testid="liquid-nav-item-wishlist"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'wishlist');

    // 1c. Non-adjacent Skip jump: wishlist -> account (skipping cart)
    await headerNav.locator('[data-testid="liquid-nav-item-account"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'account');

    // Skip jump back: account -> wishlist
    await headerNav.locator('[data-testid="liquid-nav-item-wishlist"]').click({ force: true });
    await assertNotchAlignment(page, headerNav, 'wishlist');
  });

  // ---------------------------------------------------------------------------
  // 2. Customer Mobile Bottom Bar (Bottom Variant on Mobile)
  // ---------------------------------------------------------------------------
  test('Customer Mobile Bottom Bar: Forward, Backward, and Skip-order navigation alignment', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const bottomNav = page.locator('div.fixed.bottom-0 [data-testid="liquid-nav"][data-variant="bottom"]');
    await expect(bottomNav).toBeVisible();

    // 2a. Forward sequence: home -> search -> cart -> orders -> account
    await bottomNav.locator('[data-testid="liquid-nav-item-search"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'search');

    await bottomNav.locator('[data-testid="liquid-nav-item-cart"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'cart');

    await bottomNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'orders');

    await bottomNav.locator('[data-testid="liquid-nav-item-account"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'account');

    // 2b. Backward sequence: orders -> cart -> home
    await bottomNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'orders');

    await bottomNav.locator('[data-testid="liquid-nav-item-home"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'home');

    // 2c. Non-adjacent Skip jump: home -> orders (skip search & cart)
    await bottomNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'orders');

    // Skip jump: orders -> search
    await bottomNav.locator('[data-testid="liquid-nav-item-search"]').click({ force: true });
    await assertNotchAlignment(page, bottomNav, 'search');
  });

  // ---------------------------------------------------------------------------
  // 3. Seller Workspace (Side Variant on Desktop)
  // ---------------------------------------------------------------------------
  test('Seller Workspace: Side Rail Forward, Backward, and Skip-order navigation alignment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.context().addCookies([
      { name: 'shopsell_token', value: 'dev_seller_token_active', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: JSON.stringify(['customer', 'owner']), url: 'http://localhost:3008' },
    ]);
    await page.goto('/seller');

    const sellerNav = page.locator('aside [data-testid="liquid-nav"][data-variant="side"]');
    await expect(sellerNav).toBeVisible();

    // 3a. Forward sequence: dashboard -> products -> orders -> payouts -> settings
    await assertNotchAlignment(page, sellerNav, 'dashboard', true);

    await sellerNav.locator('[data-testid="liquid-nav-item-products"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'products', true);

    await sellerNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'orders', true);

    await sellerNav.locator('[data-testid="liquid-nav-item-payouts"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'payouts', true);

    await sellerNav.locator('[data-testid="liquid-nav-item-settings"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'settings', true);

    // 3b. Backward sequence: payouts -> orders -> dashboard
    await sellerNav.locator('[data-testid="liquid-nav-item-payouts"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'payouts', true);

    await sellerNav.locator('[data-testid="liquid-nav-item-dashboard"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'dashboard', true);

    // 3c. Skip jump: dashboard -> settings (non-adjacent jump across 4 items)
    await sellerNav.locator('[data-testid="liquid-nav-item-settings"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'settings', true);

    // Skip jump: settings -> products
    await sellerNav.locator('[data-testid="liquid-nav-item-products"]').click({ force: true });
    await assertNotchAlignment(page, sellerNav, 'products', true);
  });

  // ---------------------------------------------------------------------------
  // 4. Admin Control Center (Side Variant on Desktop)
  // ---------------------------------------------------------------------------
  test('Admin Control Center: Side Rail Forward, Backward, and Skip-order navigation alignment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.context().addCookies([
      { name: 'shopsell_token', value: 'dev_admin_token_active', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: JSON.stringify(['admin']), url: 'http://localhost:3008' },
    ]);
    await page.goto('/admin');

    const adminNav = page.locator('aside [data-testid="liquid-nav"][data-variant="side"]');
    await expect(adminNav).toBeVisible();

    // 4a. Forward sequence: overview -> products -> categories -> disputes -> analytics
    await assertNotchAlignment(page, adminNav, 'overview', true);

    await adminNav.locator('[data-testid="liquid-nav-item-products"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'products', true);

    await adminNav.locator('[data-testid="liquid-nav-item-categories"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'categories', true);

    await adminNav.locator('[data-testid="liquid-nav-item-disputes"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'disputes', true);

    await adminNav.locator('[data-testid="liquid-nav-item-analytics"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'analytics', true);

    // 4b. Backward sequence: disputes -> products -> overview
    await adminNav.locator('[data-testid="liquid-nav-item-disputes"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'disputes', true);

    await adminNav.locator('[data-testid="liquid-nav-item-overview"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'overview', true);

    // 4c. Skip jump: overview -> analytics (skipping 3 items)
    await adminNav.locator('[data-testid="liquid-nav-item-analytics"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'analytics', true);

    // Skip jump: analytics -> categories
    await adminNav.locator('[data-testid="liquid-nav-item-categories"]').click({ force: true });
    await assertNotchAlignment(page, adminNav, 'categories', true);
  });

  // ---------------------------------------------------------------------------
  // 5. Account Area Tab Strip (Top Variant)
  // ---------------------------------------------------------------------------
  test('Account Area: Top Tab Strip Forward, Backward, and Skip-order navigation alignment', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/account');

    const accountNav = page.locator('main [data-testid="liquid-nav"][data-variant="top"]');
    await expect(accountNav).toBeVisible();

    // 5a. Forward sequence: profile -> orders -> addresses -> wishlist
    await assertNotchAlignment(page, accountNav, 'profile');

    await accountNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'orders');

    await accountNav.locator('[data-testid="liquid-nav-item-addresses"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'addresses');

    await accountNav.locator('[data-testid="liquid-nav-item-wishlist"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'wishlist');

    // 5b. Backward sequence: addresses -> profile
    await accountNav.locator('[data-testid="liquid-nav-item-addresses"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'addresses');

    await accountNav.locator('[data-testid="liquid-nav-item-profile"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'profile');

    // 5c. Skip jump: profile -> wishlist (skip orders & addresses)
    await accountNav.locator('[data-testid="liquid-nav-item-wishlist"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'wishlist');

    // Skip jump: wishlist -> orders
    await accountNav.locator('[data-testid="liquid-nav-item-orders"]').click({ force: true });
    await assertNotchAlignment(page, accountNav, 'orders');
  });
});
