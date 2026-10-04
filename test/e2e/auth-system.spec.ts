import { test, expect } from '@playwright/test';

test.describe('Shop:Sell Email Authentication & Profile Session Logout Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss Next.js development portal overlay if present
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent =
        'nextjs-portal { display: none !important; pointer-events: none !important; }';
      document.head.appendChild(style);
    });

    // Mock API auth endpoints for reliable isolated testing
    await page.route('**/api/auth/request-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Verification code dispatched to your email',
          phone: 'cu***@shopsell.dev',
          cooldownSeconds: 30,
        }),
      });
    });

    await page.route('**/api/auth/verify-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock_e2e_verified_token',
          user: {
            sub: 'user_e2e_123',
            email: 'customer.test@shopsell.dev',
            roles: ['customer'],
          },
        }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      const req = route.request();
      const body = req.postDataJSON() || {};
      if (body.password === 'WrongPassword') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Invalid email or password' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'mock_e2e_token',
            user: {
              sub: 'user_e2e_123',
              email: body.email || 'customer@shopsell.test',
              roles: ['customer'],
            },
          }),
        });
      }
    });

    await page.route('**/api/profile/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'user_e2e_123',
          full_name: 'Verified Customer',
          email: 'customer@shopsell.test',
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
  });

  // 1. /login does not show identity switchers
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

  // 2. /login shows prominent Email authentication
  test('/login shows email authentication with email & password inputs', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('text=Sign in to Shop:Sell using your email address.')).toBeVisible();

    // Email Input
    const emailInput = page.locator('#email-input');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('placeholder', 'name@example.com');
    await expect(page.locator('label:has-text("Email address")')).toBeVisible();

    // Password Input
    const passwordInput = page.locator('#password-input');
    await expect(passwordInput).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
    await expect(page.locator('text=Forgot password?')).toBeVisible();

    // Submit button
    await expect(page.locator('[data-testid="login-submit-btn"]')).toBeVisible();
    await expect(page.locator('text=Terms of Service')).toBeVisible();
    await expect(page.locator('text=Privacy Policy')).toBeVisible();
  });

  // 3. /login has removed mobile phone login option
  test('/login removes mobile login option completely', async ({ page }) => {
    await page.goto('/login');

    // No mobile SMS switcher or phone inputs
    await expect(page.locator('button:has-text("Mobile SMS")')).toHaveCount(0);
    await expect(page.locator('#phone-input')).toHaveCount(0);
    await expect(page.locator('text=Sign in to Shop:Sell using your mobile number.')).toHaveCount(0);
    await expect(page.locator('text=🇮🇳')).toHaveCount(0);
    await expect(page.locator('text=+91')).toHaveCount(0);
  });

  // 4. Email validation on login
  test('Email validation catches empty or invalid email address', async ({ page }) => {
    await page.goto('/login');

    // Empty submission
    await page.locator('[data-testid="login-submit-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter your email address');

    // Invalid email format
    await page.locator('#email-input').fill('invalid-email-address');
    await page.locator('[data-testid="login-submit-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter a valid email address');
  });

  // 5. Password validation on login
  test('Password validation requires password when email is provided', async ({ page }) => {
    await page.goto('/login');

    await page.locator('#email-input').fill('customer@shopsell.test');
    await page.locator('[data-testid="login-submit-btn"]').click();
    await expect(page.locator('[data-testid="auth-error-alert"]')).toContainText('Please enter your password');
  });

  // 6. Email OTP mode switcher and verification
  test('Switching to Email Code (OTP) allows sending 6-digit email code', async ({ page }) => {
    await page.goto('/login');

    // Switch to Email Code tab
    await page.locator('button:has-text("Email Code")').click();
    await expect(page.locator('text=We\'ll send a 6-digit one-time verification code directly to this email.')).toBeVisible();

    const emailInput = page.locator('#email-input');
    await emailInput.fill('customer.test@shopsell.dev');

    // Send code
    await page.locator('[data-testid="send-otp-btn"]').click();

    // Check Verify Screen
    await expect(page.locator('h1')).toContainText('Check your inbox');
    await expect(page.locator('text=cu***@shopsell.dev')).toBeVisible();
    await expect(page.locator('button:has-text("Change")')).toBeVisible();
    await expect(page.locator('[data-testid="verify-otp-btn"]')).toBeVisible();
  });

  // 7. Successful Email OTP login authenticates and sets session
  test('Successful Email OTP verification authenticates and creates session', async ({ page }) => {
    await page.goto('/login');

    await page.locator('button:has-text("Email Code")').click();
    await page.locator('#email-input').fill('session.test@shopsell.dev');
    await page.locator('[data-testid="send-otp-btn"]').click();

    await expect(page.locator('h1')).toContainText('Check your inbox');

    // Fill valid OTP 482193
    const testCode = '482193';
    for (let i = 0; i < 6; i++) {
      await page.locator(`[data-testid="otp-slot-${i}"]`).fill(testCode[i]);
    }

    await page.locator('[data-testid="verify-otp-btn"]').click();
    await page.waitForURL('http://localhost:3008/');

    const cookies = await page.context().cookies();
    const tokenCookie = cookies.find((c) => c.name === 'shopsell_token');
    expect(tokenCookie).toBeDefined();
  });

  // 8. Profile session logout option directly redirects back to authentication
  test('Profile session includes logout option that redirects directly back to authentication', async ({ page }) => {
    // Authenticate user session
    await page.addInitScript(() => {
      window.localStorage.setItem('shopsell_token', 'mock_e2e_token');
      window.localStorage.setItem(
        'shopsell_user',
        JSON.stringify({
          id: 'user_e2e_123',
          email: 'customer@shopsell.test',
          roles: ['customer'],
        })
      );
    });

    await page.context().addCookies([
      { name: 'shopsell_token', value: 'mock_e2e_token', url: 'http://localhost:3008' },
      { name: 'shopsell_roles', value: encodeURIComponent(JSON.stringify(['customer'])), url: 'http://localhost:3008' },
    ]);

    // Go to account profile page
    await page.goto('/account');

    // Verify Profile Session & Security card is visible
    const sessionCard = page.locator('[data-testid="profile-session-card"]');
    await expect(sessionCard).toBeVisible();
    await expect(sessionCard.locator('text=Profile Session & Security')).toBeVisible();
    await expect(sessionCard.locator('text=Active & Verified')).toBeVisible();

    // Click Log Out button in the profile session card
    const logoutBtn = page.locator('[data-testid="profile-session-logout-btn"]');
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify it directly redirects back to /login (authentication)
    await page.waitForURL('**/login');
    expect(page.url()).toContain('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('#email-input')).toBeVisible();
  });

  // 9. Mobile layout has no horizontal overflow on login screen
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

  // 10. Google OAuth optional secondary button is present
  test('Google OAuth is present as secondary option below divider', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Or', { exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
  });
});
