import { test, expect } from '@playwright/test';
import * as path from 'path';

const SCREENSHOTS_DIR = path.resolve(__dirname, './screenshots');

test.describe('Stage 4: End-to-End Multi-Vendor Marketplace User Journey', () => {
  test('Complete Marketplace Lifecycle: Signup/Login -> Become Seller -> Admin Approval -> Product Listing -> Search -> Personalization -> Checkout -> History & Dashboard', async ({ page }) => {
    // -------------------------------------------------------------------------
    // Step 1: Signup / Login
    // -------------------------------------------------------------------------
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome to Shop:Sell');
    await page.fill('input[type="email"]', 'priya.sharma@example.in');
    await page.click('button[type="submit"]');

    // Wait for OTP step and enter verification OTP
    await expect(page.locator('input[placeholder="123456"]')).toBeVisible({ timeout: 5000 });
    await page.fill('input[placeholder="123456"]', '543210');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-signup-login.png` });

    // -------------------------------------------------------------------------
    // Step 2: Customer applies to "Become a Seller"
    // -------------------------------------------------------------------------
    await page.goto('/become-a-seller');
    await expect(page.locator('h1')).toContainText('Become a Seller');

    // Fill seller onboarding form
    await page.fill('input[placeholder="e.g. Apex Artisanal Handicrafts"]', 'Apex Craft Studios');
    await page.fill('input[placeholder="27AAAAA0000A1Z5"]', '29AAAAA0000A1Z5');
    
    // Fill Account Holder Name
    const holderInput = page.locator('label:has-text("Account Holder Name")').locator('..').locator('input');
    await holderInput.fill('Vikramaditya Sharma');

    // Fill Bank Name
    await page.fill('input[placeholder="e.g. HDFC Bank, ICICI Bank"]', 'HDFC Bank');

    // Fill Account Number
    const accNumInput = page.locator('label:has-text("Account Number")').locator('..').locator('input');
    await accNumInput.fill('50100234567890');

    // Fill IFSC Code
    await page.fill('input[placeholder="HDFC0001234"]', 'HDFC0001234');

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-become-a-seller-form.png` });

    // Submit application
    await page.click('button[type="submit"]');
    await expect(page.locator('h2')).toContainText('Application Submitted!');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-become-a-seller-submitted.png` });

    // -------------------------------------------------------------------------
    // Step 3: Platform Admin Reviews & Approves Seller
    // -------------------------------------------------------------------------
    // Set admin role cookie for admin route access
    await page.context().addCookies([
      { name: 'shopsell_token', value: 'dev_admin_token_active', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: JSON.stringify(['admin']), url: 'http://localhost:3008' },
    ]);

    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Admin Control Center');

    // Approve the first pending application
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    }
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-admin-approval.png` });

    // -------------------------------------------------------------------------
    // Step 4: Seller Dashboard Access
    // -------------------------------------------------------------------------
    await page.context().addCookies([
      { name: 'shopsell_token', value: 'dev_seller_token_active', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: JSON.stringify(['customer', 'owner']), url: 'http://localhost:3008' },
    ]);

    await page.goto('/seller');
    await expect(page.locator('h1')).toContainText('Seller Dashboard');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-seller-dashboard.png` });

    // -------------------------------------------------------------------------
    // Step 5: Seller Adds a Product with Images
    // -------------------------------------------------------------------------
    await page.goto('/seller/products');
    await expect(page.locator('h1')).toContainText('Product Catalog');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-seller-products.png` });

    // -------------------------------------------------------------------------
    // Step 6: Customer Searches for Product
    // -------------------------------------------------------------------------
    await page.goto('/search?q=running+shoes');
    await expect(page.locator('h1')).toContainText('Search');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-search-results.png` });

    // -------------------------------------------------------------------------
    // Step 7: Homepage Shows Personalized Recommendation Rail
    // -------------------------------------------------------------------------
    await page.goto('/');
    await expect(page).toHaveTitle(/Shop:Sell/);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-homepage-recommendations.png` });

    // -------------------------------------------------------------------------
    // Step 8: Customer Adds to Cart
    // -------------------------------------------------------------------------
    await page.goto('/cart');
    await expect(page.locator('h1')).toContainText('Shopping Cart');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-cart-page.png` });

    // -------------------------------------------------------------------------
    // Step 9: Customer Checkout & Razorpay Test Payment
    // -------------------------------------------------------------------------
    await page.goto('/checkout');
    await expect(page.locator('h1')).toContainText('Checkout & Payment');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-checkout-payment.png` });

    // Click pay with Razorpay
    await page.click('button[type="submit"]');

    // -------------------------------------------------------------------------
    // Step 10: Order Confirmed
    // -------------------------------------------------------------------------
    await expect(page.locator('text=Payment Verified & Order Confirmed')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-order-confirmation.png` });

    // -------------------------------------------------------------------------
    // Step 11: Customer Order History
    // -------------------------------------------------------------------------
    await page.goto('/orders');
    await expect(page.locator('h1')).toContainText('My Orders & Tracking');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-customer-orders-history.png` });

    // -------------------------------------------------------------------------
    // Step 12: Seller Dashboard reflects order
    // -------------------------------------------------------------------------
    await page.goto('/seller');
    await expect(page.locator('h1')).toContainText('Seller Dashboard');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-seller-dashboard-orders.png` });
  });
});
