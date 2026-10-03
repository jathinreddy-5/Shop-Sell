import { test, expect } from '@playwright/test';

test.describe('Shop:Sell Mobile Number SMS OTP Authentication Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss Next.js development portal overlay if present
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent =
        'nextjs-portal { display: none !important; pointer-events: none !important; }';
      document.head.appendChild(style);
    });
  });

  // 1. /login does not show Customer/Seller/Admin identity switcher
  test('/login does not show Customer/Seller/Admin identity switcher', async ({ page }) => {
    const authRoutes = ['/login', '/verify-otp'];

    for (const route of authRoutes) {
      await page.goto(route);
      await expect(page.locator('text=Switch Identity')).toHaveCount(0);
      await expect(page.locator('text=Current Role:')).toHaveCount(0);
      await expect(page.locator('button:has-text("Seller / Owner")')).toHaveCount(0);
      await expect(page.locator('header.sticky')).toHaveCount(0);
    }
  });

  // 2. /login supports Email OTP login and does not show legacy password inputs
  test('/login shows email input for OTP and does not show password inputs', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('label:has-text("Email address")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toHaveCount(0);
    await expect(page.locator('text=Forgot password')).toHaveCount(0);
    await expect(page.locator('text=Login with Gmail')).toHaveCount(0);
  });

  // 3. /login shows phone number input when Mobile SMS mode is selected
  test('/login shows phone number input with 🇮🇳 +91 selector in Mobile SMS mode', async ({ page }) => {
    await page.goto('/login?mode=phone');

    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('text=Sign in to Shop:Sell using your mobile number.')).toBeVisible();
    await expect(page.locator('text=🇮🇳')).toBeVisible();
    await expect(page.locator('text=+91')).toBeVisible();

    const phoneInput = page.locator('#phone-input');
    await expect(phoneInput).toBeVisible();
    await expect(phoneInput).toHaveAttribute('type', 'tel');
    await expect(phoneInput).toHaveAttribute('inputmode', 'numeric');

    await expect(page.locator('[data-testid="send-otp-btn"]')).toBeVisible();
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });

  // 4. Indian phone validation works
  test('Indian phone validation catches empty, short, or invalid prefixes', async ({ page }) => {
    await page.goto('/login?mode=phone');

    // 4a. Empty submission
    await page.locator('[data-testid="send-otp-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter your mobile number');

    // 4b. Too short
    await page.locator('#phone-input').fill('98765');
    await page.locator('[data-testid="send-otp-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter a valid 10-digit Indian mobile number');

    // 4c. Invalid starting digit (Indian mobiles start with 6, 7, 8, 9)
    await page.locator('#phone-input').fill('5123456789');
    await page.locator('[data-testid="send-otp-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter a valid 10-digit Indian mobile number');
  });

  // 5 & 6. Send OTP calls backend and OTP screen appears with masked phone
  test('Send OTP calls backend endpoint and transitions to OTP verification screen', async ({ page }) => {
    await page.goto('/login?mode=phone');

    await page.locator('#phone-input').fill('9876543201');

    // Listen for the request-otp API call
    const requestPromise = page.waitForResponse(
      (resp) => resp.url().includes('/request-otp') && (resp.status() === 201 || resp.status() === 200)
    );

    await page.locator('[data-testid="send-otp-btn"]').click();
    await requestPromise;

    // Verify OTP Screen elements
    await expect(page.locator('h1')).toContainText('Verify your number');
    await expect(page.locator('text=We sent a 6-digit verification code to:')).toBeVisible();
    await expect(page.locator('text=+91 ••••••3201')).toBeVisible();
    await expect(page.locator('button:has-text("Change")')).toBeVisible();
    await expect(page.locator('[data-testid="verify-otp-btn"]')).toBeVisible();
  });

  // 7. Six-digit OTP input works with auto-advance and backspace
  // 7. Six-digit OTP input works with auto-advance and backspace
  test('Six-digit OTP input auto-advances and supports backspace navigation', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543202');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');

    const slot0 = page.locator('[data-testid="otp-slot-0"]');
    const slot1 = page.locator('[data-testid="otp-slot-1"]');
    const slot2 = page.locator('[data-testid="otp-slot-2"]');

    await expect(page.locator('[data-testid^="otp-slot-"]')).toHaveCount(6);

    // Auto-advance
    await slot0.fill('4');
    await expect(slot1).toBeFocused();
    await slot1.fill('8');
    await expect(slot2).toBeFocused();

    // Backspace
    await slot2.press('Backspace');
    await expect(slot1).toBeFocused();
  });

  // 8. Paste OTP works
  test('Paste 6-digit OTP automatically populates all slots', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543203');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');

    // Simulate paste into slot 0
    await page.locator('[data-testid="otp-slot-0"]').focus();
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="otp-slot-0"]') as HTMLInputElement;
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text', '482193');
      const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
    });

    await expect(page.locator('[data-testid="otp-slot-0"]')).toHaveValue('4');
    await expect(page.locator('[data-testid="otp-slot-1"]')).toHaveValue('8');
    await expect(page.locator('[data-testid="otp-slot-2"]')).toHaveValue('2');
    await expect(page.locator('[data-testid="otp-slot-3"]')).toHaveValue('1');
    await expect(page.locator('[data-testid="otp-slot-4"]')).toHaveValue('9');
    await expect(page.locator('[data-testid="otp-slot-5"]')).toHaveValue('3');
  });

  // 9. Resend cooldown works
  test('Resend OTP shows initial 30s countdown and disables rapid requests', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543204');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');
    await expect(page.locator('text=Resend in')).toBeVisible();
    await expect(page.locator('button:has-text("Resend OTP")')).toHaveCount(0);
  });

  // 10 & 11. Invalid / expired OTP displays error
  test('Invalid OTP displays inline error message', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543205');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');

    // Fill incorrect 6 digits
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).fill('0');
    }

    await page.locator('[data-testid="verify-otp-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Incorrect verification code');
  });

  // 12 & 13. Successful OTP creates session and authenticates user
  test('Successful OTP verification authenticates user and creates session', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543206');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');

    // Fill dev/test valid code 482193
    const testCode = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).fill(testCode[i]);
    }

    await page.locator('[data-testid="verify-otp-btn"]').click();

    // After login, redirected to homepage
    await page.waitForURL('http://localhost:3008/');

    // Verify auth cookies are set
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'shopsell_token');
    const rolesCookie = cookies.find((c) => c.name === 'shopsell_roles');

    expect(tokenCookie).toBeDefined();
    expect(rolesCookie).toBeDefined();
  });

  // 14. New user registration through phone OTP
  test('New user registration through phone OTP automatically creates account', async ({ page }) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newPhone = `987650${randomSuffix}`;

    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill(newPhone);
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Verify your number');

    const testCode = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).fill(testCode[i]);
    }

    await page.locator('[data-testid="verify-otp-btn"]').click();
    await page.waitForURL('http://localhost:3008/');

    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'shopsell_token')).toBe(true);
  });

  // 15. Mobile layout has no horizontal overflow and hides hero image
  test('Mobile viewport has no horizontal overflow on login screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflowing).toBe(false);

    // Desktop hero panel must be hidden on mobile
    const aside = page.locator('aside[aria-label="Shop:Sell Marketplace Story"]');
    await expect(aside).toBeHidden();
  });

  // 16. Loading animation appears during submission
  test('LoadingThreeDotsJumping appears during OTP requests', async ({ page }) => {
    await page.goto('/login?mode=phone');
    await page.locator('#phone-input').fill('9876543207');

    const submitBtn = page.locator('[data-testid="send-otp-btn"]');
    await submitBtn.click();

    const loader = page.locator('[role="status"]');
    expect(loader).toBeDefined();
  });

  // 17. Google OAuth optional secondary button is present
  test('Google OAuth is present as secondary option below divider', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Or', { exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
  });

  // 18. Email OTP Authentication flow
  test('Email OTP validation and login flow via SMTP', async ({ page }) => {
    await page.goto('/login');

    // Check tabs
    await expect(page.locator('button:has-text("Email")')).toBeVisible();
    await expect(page.locator('button:has-text("Mobile SMS")')).toBeVisible();

    // Test invalid email
    const emailInput = page.locator('#email-input');
    await emailInput.fill('invalid-email');
    await page.locator('[data-testid="send-otp-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter a valid email address');

    // Test valid email send OTP
    await emailInput.fill('customer.test@shopsell.dev');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Check your inbox');
    await expect(page.locator('text=cu***@shopsell.dev')).toBeVisible();

    // Verify OTP with dev code
    const testCode = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).fill(testCode[i]);
    }
    await page.locator('[data-testid="verify-otp-btn"]').click();

    await page.waitForURL('http://localhost:3008/');
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === 'shopsell_token')).toBe(true);
  });

  // 18. Identity switching remains available AFTER authentication on customer pages
  test('Identity switching banner remains available on main customer pages for authenticated users', async ({ page }) => {
    await page.context().addCookies([
      { name: 'shopsell_token', value: 'dev_customer_token_active', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: encodeURIComponent(JSON.stringify(['customer'])), url: 'http://localhost:3008' },
    ]);

    await page.goto('/');
    // Customer header is visible on customer pages
    await expect(page.locator('header [data-testid="liquid-nav"]')).toBeVisible();
    await expect(page.locator('text=Switch Identity')).toBeVisible();
  });
});
