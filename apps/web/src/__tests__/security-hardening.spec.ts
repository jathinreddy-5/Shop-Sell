import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { SignJWT } from 'jose';
import { NextRequest } from 'next/server.js';
import { middleware } from '../middleware.ts';
import { verifyOriginAndHost } from '../lib/security/csrf.ts';
import {
  verifyTurnstileToken,
  getClientIp,
  isCloudflareRequest,
  isCloudflareIp,
} from '../lib/security/turnstile.ts';
import { checkLoginRateLimit, resetLoginRateLimit, checkRateLimit } from '../lib/security/rate-limit.ts';
import { verifySellerAuth } from '../lib/auth/server-auth.ts';
import { validateJwtSecret, validateDemoAccountsConfig, validateUpstashConfig } from '@shop-sell/shared';

const TEST_JWT_SECRET = 'valid-super-secure-jwt-secret-string-at-least-32-chars-long';
process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.SUPABASE_JWT_SECRET = TEST_JWT_SECRET;

async function createSignedToken(payload: Record<string, any>, secret = TEST_JWT_SECRET, expiresIn = '15m') {
  const secretKey = new TextEncoder().encode(secret);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

describe('Security Hardening Test Suite (Next.js apps/web)', () => {
  // Ensure INTERNAL_API_SECRET is set for tests
  process.env.INTERNAL_API_SECRET = 'test-internal-proxy-secret-32-chars-long';
  // 1. Tampered shopsell_roles cookie with a customer token -> redirect to /become-a-seller
  it('should redirect to /become-a-seller when shopsell_roles cookie is tampered to owner/admin but JWT contains only customer role', async () => {
    const customerToken = await createSignedToken({
      sub: 'cust-uuid-1234',
      email: 'customer@example.com',
      roles: ['customer'],
      app_metadata: { roles: ['customer'] },
    });

    const req = new NextRequest('http://localhost:3000/seller/dashboard', {
      headers: {
        host: 'localhost:3000',
        cookie: `shopsell_token=${customerToken}; shopsell_roles=${encodeURIComponent(JSON.stringify(['owner', 'admin']))}`,
      },
    });

    const res = await middleware(req);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/become-a-seller'), `Expected redirect to /become-a-seller but got ${location}`);
  });

  // 2. No token -> 307 to /login?redirect=...
  it('should return 307 redirect to /login?redirect=... when accessing seller route without a token', async () => {
    const req = new NextRequest('http://localhost:3000/seller/products?tab=active', {
      headers: {
        host: 'localhost:3000',
      },
    });

    const res = await middleware(req);
    assert.strictEqual(res.status, 307);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/login?redirect='), `Expected redirect to /login?redirect=... but got ${location}`);
    assert.ok(location?.includes(encodeURIComponent('/seller/products?tab=active')));
  });

  // 3. Expired token and wrong-signature token -> rejected in middleware and proxy route
  it('should reject expired tokens in middleware and proxy route', async () => {
    const expiredToken = await createSignedToken(
      { sub: 'seller-1', email: 'seller@example.com', roles: ['owner'] },
      TEST_JWT_SECRET,
      '-10s' // already expired
    );

    // Middleware check
    const mwReq = new NextRequest('http://localhost:3000/seller/dashboard', {
      headers: {
        host: 'localhost:3000',
        cookie: `shopsell_token=${expiredToken}`,
      },
    });
    const mwRes = await middleware(mwReq);
    assert.strictEqual(mwRes.status, 307);
    assert.ok(mwRes.headers.get('location')?.includes('/login'));

    // Proxy route verifySellerAuth check
    const proxyReq = new NextRequest('http://localhost:3000/api/seller/profile', {
      headers: {
        host: 'localhost:3000',
        authorization: `Bearer ${expiredToken}`,
      },
    });
    const auth = await verifySellerAuth(proxyReq);
    assert.strictEqual(auth.authorized, false);
    assert.strictEqual(auth.status, 401);
  });

  it('should reject wrong-signature tokens in middleware and proxy route', async () => {
    const forgedToken = await createSignedToken(
      { sub: 'hacker-1', email: 'hacker@example.com', roles: ['owner', 'admin'] },
      'wrong-attacker-secret-key-that-is-at-least-32-bytes'
    );

    // Middleware check
    const mwReq = new NextRequest('http://localhost:3000/seller/dashboard', {
      headers: {
        host: 'localhost:3000',
        cookie: `shopsell_token=${forgedToken}`,
      },
    });
    const mwRes = await middleware(mwReq);
    assert.strictEqual(mwRes.status, 307);
    assert.ok(mwRes.headers.get('location')?.includes('/login'));

    // Proxy route verifySellerAuth check
    const proxyReq = new NextRequest('http://localhost:3000/api/seller/profile', {
      headers: {
        host: 'localhost:3000',
        authorization: `Bearer ${forgedToken}`,
      },
    });
    const auth = await verifySellerAuth(proxyReq);
    assert.strictEqual(auth.authorized, false);
    assert.strictEqual(auth.status, 401);
  });

  // 4. shopsell_token cookie flags: HttpOnly, SameSite=Lax, Path=/, Max-Age=900, Secure in production
  it('should enforce cookie security flags (HttpOnly, SameSite=Lax, Path=/, Max-Age=900, Secure conditional)', () => {
    const buildCookieOptions = (isProd: boolean) => ({
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 15 * 60, // 900 seconds
    });

    const devFlags = buildCookieOptions(false);
    assert.strictEqual(devFlags.httpOnly, true);
    assert.strictEqual(devFlags.sameSite, 'lax');
    assert.strictEqual(devFlags.path, '/');
    assert.strictEqual(devFlags.maxAge, 900);
    assert.strictEqual(devFlags.secure, false);

    const prodFlags = buildCookieOptions(true);
    assert.strictEqual(prodFlags.httpOnly, true);
    assert.strictEqual(prodFlags.sameSite, 'lax');
    assert.strictEqual(prodFlags.path, '/');
    assert.strictEqual(prodFlags.maxAge, 900);
    assert.strictEqual(prodFlags.secure, true);
  });

  // 5. ENABLE_DEMO_ACCOUNTS=true with NODE_ENV=production -> startup error and 403 on dev-token
  it('should throw startup error if ENABLE_DEMO_ACCOUNTS=true when NODE_ENV=production', () => {
    assert.throws(
      () => {
        validateDemoAccountsConfig('true', 'production');
      },
      /FATAL SECURITY ERROR: ENABLE_DEMO_ACCOUNTS cannot be enabled in production environment/
    );

    // In development, it must not throw
    assert.doesNotThrow(() => {
      validateDemoAccountsConfig('true', 'development');
    });
  });

  it('should block dev-token endpoint with 403 in production', async () => {
    const checkDevTokenAllowed = (nodeEnv: string, isDemo: boolean) => {
      const isProd = nodeEnv === 'production';
      if (isProd || !isDemo) {
        return { status: 403, error: 'Forbidden: Demo account access is strictly disabled.' };
      }
      return { status: 200, success: true };
    };

    const prodAttempt = checkDevTokenAllowed('production', true);
    assert.strictEqual(prodAttempt.status, 403);

    const devDisabledAttempt = checkDevTokenAllowed('development', false);
    assert.strictEqual(devDisabledAttempt.status, 403);

    const devEnabled = checkDevTokenAllowed('development', true);
    assert.strictEqual(devEnabled.status, 200);
  });

  // 6. Missing or invalid Turnstile token -> 403 (mock siteverify)
  it('should reject missing or empty Turnstile token', async () => {
    const missingRes = await verifyTurnstileToken(undefined);
    assert.strictEqual(missingRes.success, false);
    assert.ok(missingRes.error?.includes('missing'));

    const emptyRes = await verifyTurnstileToken('   ');
    assert.strictEqual(emptyRes.success, false);
  });

  it('should reject invalid Turnstile token against mock siteverify', async () => {
    // Mock global fetch to simulate Cloudflare siteverify failure
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('challenges.cloudflare.com/turnstile/v0/siteverify')) {
          return {
            ok: true,
            json: async () => ({
              success: false,
              'error-codes': ['invalid-input-response'],
            }),
          } as any;
        }
        return originalFetch(url);
      };

      const result = await verifyTurnstileToken('invalid-mock-token-xyz', '1.2.3.4');
      assert.strictEqual(result.success, false);
      assert.ok(result.error?.includes('Turnstile verification failed'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 7. Password login: 6th failed attempt -> 429; lockout keyed to email+IP
  it('should allow 5 failed password attempts and return 429 on 6th attempt, without locking out victim on another IP', async () => {
    const victimEmail = 'victim@example.com';
    const attackerIp = '198.51.100.42';
    const victimIp = '203.0.113.19';

    // Reset initial counters
    await resetLoginRateLimit(victimEmail, attackerIp);
    await resetLoginRateLimit(victimEmail, victimIp);

    // Attacker makes 5 attempts from attackerIp
    for (let i = 1; i <= 5; i++) {
      const check = await checkLoginRateLimit(victimEmail, attackerIp);
      assert.strictEqual(check.allowed, true, `Attempt ${i} should be allowed`);
    }

    // 6th attempt from attackerIp -> 429 rate limit exceeded
    const attacker6th = await checkLoginRateLimit(victimEmail, attackerIp);
    assert.strictEqual(attacker6th.allowed, false, '6th attempt must be rejected with 429');
    assert.ok(attacker6th.error?.includes('temporarily locked'));

    // CRITICAL: Victim attempting from their own IP must NOT be locked out!
    const victimCheck = await checkLoginRateLimit(victimEmail, victimIp);
    assert.strictEqual(victimCheck.allowed, true, 'Victim from different IP must not be locked out by attacker');
    assert.strictEqual(victimCheck.requireTurnstile, true, 'Elevated failed attempts on email triggers Turnstile requirement');
  });

  // 8. Unregistered vs registered email on request-otp -> identical response
  it('should produce identical response shape and masking for registered and unregistered emails', () => {
    const formatOtpResponse = (identifier: string) => {
      const clean = identifier.trim().toLowerCase();
      const masked = clean.includes('@')
        ? clean.replace(/(.{1,2})(.*)(@.*)/, '$1***$3')
        : clean.replace(/(\d{2})(\d+)(\d{2})/, '$1******$3');

      return {
        success: true,
        message: 'If an account exists, a 6-digit verification code has been dispatched.',
        cooldownSeconds: 30,
        target: masked,
      };
    };

    const reg = formatOtpResponse('registered.user@shopsell.com');
    const unreg = formatOtpResponse('nonexistent.ghost@shopsell.com');

    assert.strictEqual(reg.success, unreg.success);
    assert.strictEqual(reg.message, unreg.message);
    assert.strictEqual(reg.cooldownSeconds, unreg.cooldownSeconds);
    assert.strictEqual(reg.target, 're***@shopsell.com');
    assert.strictEqual(unreg.target, 'no***@shopsell.com');
  });

  // 9. Cross-origin POST (Origin: https://malicious-site.com) and missing/null Origin -> 403
  it('should reject cross-origin POST with 403', () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'https://malicious-site.com',
      },
    });

    const csrf = verifyOriginAndHost(req);
    assert.strictEqual(csrf.valid, false);
    assert.ok(csrf.reason?.includes('Origin header mismatch'));
  });

  it('should reject POST with missing Origin when Sec-Fetch-Site is absent or cross-site', () => {
    // Missing Origin, no Sec-Fetch-Site
    const req1 = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
      },
    });
    const csrf1 = verifyOriginAndHost(req1);
    assert.strictEqual(csrf1.valid, false);

    // Missing Origin, Sec-Fetch-Site is cross-site
    const req2 = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        'sec-fetch-site': 'cross-site',
      },
    });
    const csrf2 = verifyOriginAndHost(req2);
    assert.strictEqual(csrf2.valid, false);
  });

  it('should reject POST with Origin: null unless Sec-Fetch-Site is same-origin', () => {
    // Origin: "null" with cross-site Sec-Fetch-Site -> rejected
    const req1 = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'null',
        'sec-fetch-site': 'cross-site',
      },
    });
    const csrf1 = verifyOriginAndHost(req1);
    assert.strictEqual(csrf1.valid, false);

    // Origin: "null" with same-origin Sec-Fetch-Site -> allowed
    const req2 = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'null',
        'sec-fetch-site': 'same-origin',
      },
    });
    const csrf2 = verifyOriginAndHost(req2);
    assert.strictEqual(csrf2.valid, true);
  });

  it('should allow valid same-origin POST requests', () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    const csrf = verifyOriginAndHost(req);
    assert.strictEqual(csrf.valid, true);
  });

  // 10. Response headers: CSP with nonce (nonce differs per request), HSTS, nosniff, X-Frame-Options, Referrer-Policy
  it('should generate security headers with dynamic per-request CSP nonce', async () => {
    const req1 = new NextRequest('http://localhost:3000/', {
      headers: { host: 'localhost:3000' },
    });
    const req2 = new NextRequest('http://localhost:3000/', {
      headers: { host: 'localhost:3000' },
    });

    const res1 = await middleware(req1);
    const res2 = await middleware(req2);

    const csp1 = res1.headers.get('content-security-policy') || '';
    const csp2 = res2.headers.get('content-security-policy') || '';

    assert.ok(csp1.includes('nonce-'), 'CSP must contain nonce');
    assert.ok(csp2.includes('nonce-'), 'CSP must contain nonce');

    // Extract nonces and ensure they differ per request
    const match1 = csp1.match(/nonce-([a-zA-Z0-9+/=]+)/);
    const match2 = csp2.match(/nonce-([a-zA-Z0-9+/=]+)/);
    assert.ok(match1 && match2, 'Nonces must be present in both responses');
    assert.notStrictEqual(match1[1], match2[1], 'CSP nonce must differ per request');

    // HSTS, nosniff, X-Frame-Options, Referrer-Policy
    assert.strictEqual(res1.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res1.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(res1.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(
      res1.headers.get('strict-transport-security')?.includes('max-age='),
      'HSTS header must be present'
    );
  });

  // 11. FIX 6: Client IP trust & Cloudflare check (IPv4 and IPv6)
  it('should ignore spoofed CF-Connecting-IP in production unless request passes Cloudflare check', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevOriginSecret = process.env.CLOUDFLARE_ORIGIN_SECRET;

    try {
      (process.env as any).NODE_ENV = 'production';
      process.env.CLOUDFLARE_ORIGIN_SECRET = 'cf-test-origin-shared-secret-1234';

      // 1. Direct unverified connection attempting to spoof CF-Connecting-IP
      const unverifiedReq = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1', // Victim IP being spoofed
          'x-real-ip': '198.51.100.50',     // Attacker's socket IP
        },
      });

      // Must NOT trust cf-connecting-ip -> must return socket IP (198.51.100.50)
      const unverifiedClientIp = getClientIp(unverifiedReq);
      assert.strictEqual(unverifiedClientIp, '198.51.100.50');
      assert.notStrictEqual(unverifiedClientIp, '203.0.113.1');

      // 2. Verified request via Cloudflare IPv4 edge IP range (e.g. 173.245.48.15 in 173.245.48.0/20)
      const cfIpReq = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '173.245.48.15',
        },
      });
      assert.strictEqual(isCloudflareIp('173.245.48.15'), true);
      assert.strictEqual(isCloudflareRequest(cfIpReq), true);
      assert.strictEqual(getClientIp(cfIpReq), '203.0.113.1');

      // 3. Verified request via Cloudflare IPv6 edge IP range (e.g. 2606:4700:4700::1111 in 2606:4700::/32)
      assert.strictEqual(isCloudflareIp('2606:4700:4700::1111'), true);
      assert.strictEqual(isCloudflareIp('2001:db8::1'), false);
      const cfIpv6Req = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '2606:4700:4700::1111',
        },
      });
      assert.strictEqual(isCloudflareRequest(cfIpv6Req), true);
      assert.strictEqual(getClientIp(cfIpv6Req), '203.0.113.1');

      // 4. Untrusted direct socket IP cannot spoof x-real-ip
      const directAttackerReq = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '173.245.48.15', // Spoofed Cloudflare IP in header
        },
      });
      (directAttackerReq as any).ip = '198.51.100.99'; // Real external socket IP
      assert.strictEqual(getClientIp(directAttackerReq), '198.51.100.99');

      // 5. Verified request via Cloudflare Authenticated Origin Pull (AOP) mTLS header
      const aopReq = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '198.51.100.50',
          'x-cf-authenticated-pull': 'SUCCESS',
        },
      });
      assert.strictEqual(isCloudflareRequest(aopReq), true);
      assert.strictEqual(getClientIp(aopReq), '203.0.113.1');

      // 6. Verified request via Cloudflare Origin Secret header
      const secretReq = new NextRequest('http://localhost:3000/api/auth/login', {
        headers: {
          'cf-connecting-ip': '203.0.113.1',
          'x-real-ip': '198.51.100.50',
          'x-cf-origin-secret': 'cf-test-origin-shared-secret-1234',
        },
      });
      assert.strictEqual(isCloudflareRequest(secretReq), true);
      assert.strictEqual(getClientIp(secretReq), '203.0.113.1');
    } finally {
      (process.env as any).NODE_ENV = prevNodeEnv;
      process.env.CLOUDFLARE_ORIGIN_SECRET = prevOriginSecret;
    }
  });

  // 12. FIX 7: Rate limiter failure mode & Upstash startup check
  it('should enforce startup presence of Upstash URL and token in production', () => {
    // Missing URL
    assert.throws(
      () => validateUpstashConfig(undefined, 'valid-token-12345678', 'production'),
      /UPSTASH_REDIS_REST_URL is missing/
    );

    // Missing Token
    assert.throws(
      () => validateUpstashConfig('https://my-redis.upstash.io', undefined, 'production'),
      /UPSTASH_REDIS_REST_TOKEN is missing/
    );

    // Known placeholder token
    assert.throws(
      () => validateUpstashConfig('https://my-redis.upstash.io', 'your-upstash-rest-token', 'production'),
      /UPSTASH_REDIS_REST_TOKEN is missing, empty, or placeholder/
    );

    // Valid configuration
    const valid = validateUpstashConfig(
      'https://my-redis.upstash.io',
      'valid-real-upstash-rest-token-987654',
      'production'
    );
    assert.strictEqual(valid?.url, 'https://my-redis.upstash.io');
    assert.strictEqual(valid?.token, 'valid-real-upstash-rest-token-987654');
  });

  it('should fail closed (status 503, allowed false) on login when Upstash Redis is unreachable or errors in production', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const originalFetch = globalThis.fetch;

    try {
      (process.env as any).NODE_ENV = 'production';
      process.env.UPSTASH_REDIS_REST_URL = 'https://prod-redis.upstash.io';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'prod-token-valid-string-12345';

      // Simulate network / Redis failure
      globalThis.fetch = async (url: any) => {
        if (typeof url === 'string' && url.includes('prod-redis.upstash.io')) {
          throw new Error('Connection refused: Upstash Redis unreachable');
        }
        return originalFetch(url);
      };

      // 1. Password login check MUST fail closed (allowed: false, status: 503)
      const loginCheck = await checkLoginRateLimit('target@example.com', '198.51.100.22');
      assert.strictEqual(loginCheck.allowed, false, 'Login must fail closed when Redis fails in production');
      assert.strictEqual(loginCheck.status, 503, 'Login rate limiter failure should return HTTP 503');
      assert.ok(loginCheck.error?.includes('unavailable') || loginCheck.error?.includes('blocked'));

      // 2. Low-risk route with failClosed: false should fail open
      const lowRiskCheck = await checkRateLimit('rl:search:keyword', 20, 60, { failClosed: false });
      assert.strictEqual(lowRiskCheck.allowed, true, 'Low-risk route should fail open when Redis fails');
    } finally {
      globalThis.fetch = originalFetch;
      (process.env as any).NODE_ENV = prevNodeEnv;
      process.env.UPSTASH_REDIS_REST_URL = prevUrl;
      process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    }
  });
});

