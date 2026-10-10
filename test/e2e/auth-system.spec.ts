import { test, expect } from '@playwright/test';
import { SignJWT } from 'jose';

const TEST_JWT_SECRET =
  process.env.JWT_SECRET ||
  '8e2889d17c7e65aef31ef64dd8c56808de2c558680d03efcd9dfe3d9ebd4d5a4';

async function createTestCustomerToken(): Promise<string> {
  const key = new TextEncoder().encode(TEST_JWT_SECRET);
  return new SignJWT({
    sub: 'user_e2e_123',
    email: 'test@shopsell.test',
    phone: '+919876543210',
    roles: ['customer'],
    app_metadata: { provider: 'firebase_phone', roles: ['customer'] },
    aud: 'authenticated',
    iss: 'shopsell-api',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(key);
}

test.describe('Shop:Sell Firebase Phone Authentication & Session Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss Next.js development portal overlay if present
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent =
        'nextjs-portal { display: none !important; pointer-events: none !important; }';
      document.head.appendChild(style);
    });

    // Mock API auth endpoints for reliable isolated E2E testing
    await page.route('**/api/auth/request-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verification code sent to your email',
          cooldownSeconds: 30,
          target: 't***t@shopsell.test',
        }),
      });
    });

    await page.route('**/api/auth/verify-otp', async (route) => {
      const req = route.request();
      const body = req.postDataJSON() || {};
      const otp = body.otp || '';

      if (otp !== '482193') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'The verification code is incorrect or has expired.' }),
        });
        return;
      }

      const validToken = await createTestCustomerToken();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': `shopsell_token=${validToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`,
        },
        body: JSON.stringify({
          success: true,
          user: {
            sub: 'user_e2e_123',
            email: 'test@shopsell.test',
            roles: ['customer'],
          },
        }),
      });
    });

    await page.route('**/api/auth/firebase', async (route) => {
      const validToken = await createTestCustomerToken();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': `shopsell_token=${validToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=900`,
        },
        body: JSON.stringify({ success: true, token: validToken, roles: ['customer'] }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: {
            sub: 'user_e2e_123',
            phone: '+919876543210',
            roles: ['customer'],
          },
        }),
      });
    });

    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_e2e_123',
          full_name: 'Verified Customer',
          phone: '+919876543210',
          roles: ['customer'],
          default_pincode: '560034',
          onboarding_status: 'completed',
        }),
      });
    });

    await page.route('**/api/profile/interests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', label: 'Fashion & Apparel' },
          { id: '2', label: 'Electronics' },
        ]),
      });
    });

    await page.route('**/api/recommendations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rails: [] }),
      });
    });

    await page.route('**/api/products/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      });
    });
  });

  // 1. Login page loads
  test('1. Login page loads with email authentication UI and Send OTP button', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1').first()).toContainText('Welcome back');
    await expect(page.locator('text=Sign in to Shop:Sell using your email address.').first()).toBeVisible();

    // Email Input
    const emailInput = page.locator('#email-input').first();
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email address');

    // Send OTP button
    await expect(page.locator('[data-testid="send-otp-btn"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="send-otp-btn"]').first()).toContainText('Send OTP');

    // Does NOT show phone inputs
    await expect(page.locator('#phone-input')).toHaveCount(0);
  });

  // 2 & 3. Email validation
  test('2 & 3. Email validation rejects empty and invalid addresses', async ({ page }) => {
    await page.goto('/login');

    // Empty submission
    await page.locator('[data-testid="send-otp-btn"]').first().click();
    await expect(page.locator('[data-testid="auth-error-alert"]').first()).toContainText('Please enter your email address');

    // Invalid email format
    await page.locator('#email-input').first().fill('invalid-email');
    await page.locator('[data-testid="send-otp-btn"]').first().click();
    await expect(page.locator('[data-testid="auth-error-alert"]').first()).toContainText('Please enter a valid email address');
  });

  // 4, 5, 6. Email OTP initiation & OTP screen
  test('4, 5, 6. Valid email address sends code and presents 6-digit OTP screen', async ({ page }) => {
    await page.goto('/login');

    // Enter valid email address
    await page.locator('#email-input').first().fill('test@shopsell.test');
    await page.locator('[data-testid="send-otp-btn"]').first().click();

    // Check Verify Screen transitions
    await expect(page.locator('h1').first()).toContainText('Check your inbox');
    await expect(page.locator('button:has-text("Change")').first()).toBeVisible();

    // 6-digit OTP input slots exist
    for (let i = 0; i < 6; i++) {
      await expect(page.locator(`[data-testid="otp-slot-${i}"]`).first()).toBeVisible();
    }

    // Verify OTP button exists
    await expect(page.locator('[data-testid="verify-otp-btn"]').first()).toBeVisible();
  });

  // 7. Invalid OTP rejection
  test('7. Invalid OTP is rejected with user-friendly error message', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email-input').first().fill('test@shopsell.test');
    await page.locator('[data-testid="send-otp-btn"]').first().click();
    await expect(page.locator('h1').first()).toContainText('Check your inbox');

    // Enter invalid OTP (000000)
    const badCode = '000000';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).first().fill(badCode[i]);
    }

    await page.locator('[data-testid="verify-otp-btn"]').first().click();
    await expect(page.locator('[data-testid="auth-error-alert"]').first()).toContainText('The verification code is incorrect');
  });

  // 8, 9, 10, 11, 12. Successful verification, session creation
  test('8-12. Successful OTP verification creates session and redirects', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email-input').first().fill('test@shopsell.test');
    await page.locator('[data-testid="send-otp-btn"]').first().click();
    await expect(page.locator('h1').first()).toContainText('Check your inbox');

    // Enter valid test OTP (482193)
    const validCode = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).first().fill(validCode[i]);
      await expect(page.locator(`[data-testid="otp-slot-${i}"]`).first()).toHaveValue(validCode[i]);
    }

    const verifyBtn = page.locator('[data-testid="verify-otp-btn"]').first();
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.dispatchEvent('click');

    // Redirects to target or root upon authentication
    await page.waitForURL((url) => url.pathname === '/' || url.pathname === '', { timeout: 15000 });

    // Verify shopsell_token cookie is set
    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'shopsell_token');
    expect(tokenCookie).toBeDefined();
  });

  // 13, 14, 15. Protected customer page and logout
  test('13-15. Protected customer page opens with authenticated session and redirects upon logout', async ({ page }) => {
    // Inject session cookies with genuine signed HS256 JWT
    const validToken = await createTestCustomerToken();
    await page.context().addCookies([
      { name: 'shopsell_token', value: validToken, url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: encodeURIComponent(JSON.stringify(['customer'])), url: 'http://localhost:3008' },
    ]);

    await page.goto('/account');

    // Session card visible
    const sessionCard = page.locator('[data-testid="profile-session-card"]').first();
    await expect(sessionCard).toBeVisible();
    await expect(sessionCard.locator('text=Profile Session & Security')).toBeVisible();

    // Click logout
    const logoutBtn = page.locator('[data-testid="profile-session-logout-btn"]').first();
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Redirects back to login
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
    await expect(page.locator('h1').first()).toContainText('Welcome back');
  });

  // 18 & 19. No sensitive tokens or OTP leaked to browser console
  test('18 & 19. No OTP or secret tokens appear in browser console logs', async ({ page }) => {
    const consoleLogs: string[] = [];
    page.on('console', (msg) => consoleLogs.push(msg.text()));

    await page.goto('/login');
    await page.locator('#email-input').first().fill('test@shopsell.test');
    await page.locator('[data-testid="send-otp-btn"]').first().click();

    const testOtp = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).first().fill(testOtp[i]);
      await expect(page.locator(`[data-testid="otp-slot-${i}"]`).first()).toHaveValue(testOtp[i]);
    }
    const verifyBtn = page.locator('[data-testid="verify-otp-btn"]').first();
    await expect(verifyBtn).toBeEnabled();
    await verifyBtn.dispatchEvent('click');

    // Verify console logs do not contain raw OTP or token secrets
    for (const log of consoleLogs) {
      expect(log).not.toContain('482193');
      expect(log).not.toContain('xsmtpsib');
      expect(log).not.toContain('brevo');
    }
  });

  // 20. Zero Brevo/SMTP calls during email OTP authentication
  test('20. No Brevo/SMTP network calls occur during login flow', async ({ page }) => {
    let brevoCallDetected = false;
    page.on('request', (req) => {
      const url = req.url().toLowerCase();
      if (url.includes('brevo') || url.includes('sendinblue') || url.includes('smtp')) {
        brevoCallDetected = true;
      }
    });

    await page.goto('/login');
    await page.locator('#email-input').first().fill('test@shopsell.test');
    await page.locator('[data-testid="send-otp-btn"]').first().click();

    expect(brevoCallDetected).toBe(false);
  });

  // Secondary Google OAuth button
  test('Google OAuth is present as secondary option below divider', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=/^or$/i').first()).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")').first()).toBeVisible();
  });

  // Mobile viewport test
  test('Mobile viewport has no horizontal overflow on login screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(isOverflowing).toBe(false);
  });
});
