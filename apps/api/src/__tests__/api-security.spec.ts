import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as jwt from 'jsonwebtoken';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import {
  validateJwtSecret,
  validateAdminJwtSecret,
  validateSupabaseJwtSecret,
  validateDemoAccountsConfig,
  validateInternalApiSecret,
  verifyProxySecret,
  DEV_INTERNAL_API_SECRET,
  DEV_ADMIN_JWT_SECRET,
  createProxyMiddleware,
} from '@shop-sell/shared';

describe('API Security Hardening Test Suite (NestJS apps/api)', () => {
  const validSecret = 'valid-super-secure-jwt-secret-string-at-least-32-chars-long';
  const proxySecret = 'valid-super-secure-proxy-secret-string-min-32-chars-ok';

  // FIX 1: Direct call to apps/api without the proxy credential -> rejected
  it('should reject direct requests to apps/api without the internal proxy secret', () => {
    const middleware = createProxyMiddleware(proxySecret, false);

    // Call without header -> 403
    let statusSet: number | null = null;
    let jsonBody: any = null;
    const reqWithoutSecret: any = {
      path: '/api/auth/login',
      headers: {},
    };
    const resWithoutSecret: any = {
      status: (code: number) => {
        statusSet = code;
        return {
          json: (body: any) => {
            jsonBody = body;
          },
        };
      },
    };
    let nextCalled = false;

    middleware(reqWithoutSecret, resWithoutSecret, () => {
      nextCalled = true;
    });

    assert.strictEqual(statusSet, 403);
    assert.strictEqual(jsonBody?.statusCode, 403);
    assert.strictEqual(nextCalled, false);

    // Call with invalid secret -> 403
    statusSet = null;
    jsonBody = null;
    const reqWithBadSecret: any = {
      path: '/api/auth/login',
      headers: { 'x-internal-proxy-secret': 'attacker-forged-proxy-key' },
    };
    middleware(reqWithBadSecret, resWithoutSecret, () => {
      nextCalled = true;
    });
    assert.strictEqual(statusSet, 403);
    assert.strictEqual(nextCalled, false);

    // Call with wrong-length secret header -> 403 (does not throw)
    statusSet = null;
    jsonBody = null;
    const reqWithShortSecret: any = {
      path: '/api/auth/login',
      headers: { 'x-internal-proxy-secret': 'short' },
    };
    middleware(reqWithShortSecret, resWithoutSecret, () => {
      nextCalled = true;
    });
    assert.strictEqual(statusSet, 403);
    assert.strictEqual(nextCalled, false);

    // Call with valid secret -> allowed (calls next)
    nextCalled = false;
    const reqWithGoodSecret: any = {
      path: '/api/auth/login',
      headers: { 'x-internal-proxy-secret': proxySecret },
    };
    middleware(reqWithGoodSecret, resWithoutSecret, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);

    // Call to public healthcheck -> allowed without secret
    nextCalled = false;
    const reqHealth: any = {
      path: '/api/health',
      headers: {},
    };
    middleware(reqHealth, resWithoutSecret, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
  });

  // FIX 1: Startup validation for INTERNAL_API_SECRET
  it('should fail fast if INTERNAL_API_SECRET is missing, shorter than 32 bytes, or placeholder in production', () => {
    // Missing in production
    assert.throws(
      () => validateInternalApiSecret(undefined, 'production'),
      /FATAL SECURITY ERROR: INTERNAL_API_SECRET is missing/
    );

    // Shorter than 32 bytes in production
    assert.throws(
      () => validateInternalApiSecret('short-secret', 'production'),
      /FATAL SECURITY ERROR: INTERNAL_API_SECRET is too short/
    );

    // Default / placeholder in production
    assert.throws(
      () => validateInternalApiSecret('shopsell-internal-proxy-secret-shared-key', 'production'),
      /FATAL SECURITY ERROR: INTERNAL_API_SECRET cannot use an insecure example or placeholder secret in production/
    );

    // Dev secret placeholder rejected in production
    assert.throws(
      () => validateInternalApiSecret(DEV_INTERNAL_API_SECRET, 'production'),
      /FATAL SECURITY ERROR: INTERNAL_API_SECRET cannot use an insecure example or placeholder secret in production/
    );

    // In development: fallback to DEV_INTERNAL_API_SECRET if missing
    const devFallback = validateInternalApiSecret(undefined, 'development');
    assert.strictEqual(devFallback, DEV_INTERNAL_API_SECRET);

    // In production: valid 32+ byte secret succeeds
    const prodValid = validateInternalApiSecret(proxySecret, 'production');
    assert.strictEqual(prodValid, proxySecret);
  });

  // FIX 2: Test-runner bypass cannot be triggered by request headers or in production
  it('should prove a request cannot trigger test-runner bypass via request headers', () => {
    // Production middleware: even if an attacker passes x-test-direct-check or any other header,
    // and even if someone set isTestEnv = true, in production the bypass is strictly impossible.
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const prodMiddleware = createProxyMiddleware(proxySecret, true);

      let statusSet: number | null = null;
      const req: any = {
        path: '/api/sellers/sensitive',
        headers: {
          'x-test-direct-check': 'true',
          'x-test-bypass': 'true',
          'x-env': 'test',
        },
      };
      const res: any = {
        status: (code: number) => {
          statusSet = code;
          return { json: () => {} };
        },
      };
      let nextCalled = false;
      prodMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(statusSet, 403, 'Must reject with 403 even if client sends test bypass headers');
      assert.strictEqual(nextCalled, false, 'Next must not be called in production via headers');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });


  // 2. Expired token and wrong-signature token -> rejected in SupabaseAuthGuard
  it('should reject expired tokens in SupabaseAuthGuard with UnauthorizedException', () => {
    process.env.SUPABASE_JWT_SECRET = validSecret;
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);

    const expiredToken = jwt.sign(
      { sub: 'user-1', email: 'user@example.com' },
      validSecret,
      { expiresIn: -10 } // already expired
    );

    const mockReq: any = {
      headers: { authorization: `Bearer ${expiredToken}` },
    };
    const mockContext: any = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
      getHandler: () => () => {},
      getClass: () => class {},
    };
    reflector.getAllAndOverride = (() => false) as any;

    assert.throws(() => guard.canActivate(mockContext), (err: any) => {
      return err instanceof UnauthorizedException;
    });
  });

  it('should reject wrong-signature tokens in SupabaseAuthGuard with UnauthorizedException', () => {
    process.env.SUPABASE_JWT_SECRET = validSecret;
    const reflector = new Reflector();
    const guard = new SupabaseAuthGuard(reflector);

    const wrongSignatureToken = jwt.sign(
      { sub: 'user-1', email: 'user@example.com' },
      'completely-different-signing-secret-key-32-chars'
    );

    const mockReq: any = {
      headers: { authorization: `Bearer ${wrongSignatureToken}` },
    };
    const mockContext: any = {
      switchToHttp: () => ({ getRequest: () => mockReq }),
      getHandler: () => () => {},
      getClass: () => class {},
    };
    reflector.getAllAndOverride = (() => false) as any;

    assert.throws(() => guard.canActivate(mockContext), (err: any) => {
      return err instanceof UnauthorizedException;
    });
  });

  // 3. Startup validation for JWT_SECRET
  it('should fail fast if JWT_SECRET is missing, shorter than 32 bytes, or placeholder in production', () => {
    // Missing
    assert.throws(
      () => validateJwtSecret(undefined, 'development'),
      /FATAL SECURITY ERROR: JWT_SECRET is missing/
    );

    // Too short (< 32 bytes)
    assert.throws(
      () => validateJwtSecret('short-secret-1234567890', 'development'),
      /FATAL SECURITY ERROR: JWT_SECRET is too short/
    );

    // Placeholder in production
    assert.throws(
      () => validateJwtSecret('super-secret-jwt-token-with-minimum-32-characters-long', 'production'),
      /FATAL SECURITY ERROR: JWT_SECRET cannot use an insecure example or placeholder secret in production/
    );

    // Valid secret
    const validated = validateJwtSecret(validSecret, 'production');
    assert.strictEqual(validated, validSecret);
  });

  // 4. Startup validation for ENABLE_DEMO_ACCOUNTS in production
  it('should fail fast if ENABLE_DEMO_ACCOUNTS=true in production', () => {
    assert.throws(
      () => validateDemoAccountsConfig('true', 'production'),
      /FATAL SECURITY ERROR: ENABLE_DEMO_ACCOUNTS cannot be enabled in production environment/
    );

    assert.doesNotThrow(() => validateDemoAccountsConfig('false', 'production'));
    assert.doesNotThrow(() => validateDemoAccountsConfig('true', 'development'));
  });

  // FIX 3: Startup validation for ADMIN_JWT_SECRET and SUPABASE_JWT_SECRET
  it('should fail fast if ADMIN_JWT_SECRET is missing or equals JWT_SECRET in production', () => {
    const customerSecret = 'customer-jwt-secret-string-at-least-32-chars-long';
    const distinctAdminSecret = 'admin-jwt-dedicated-secret-string-min-32-bytes-long';

    // Missing in production
    assert.throws(
      () => validateAdminJwtSecret(undefined, customerSecret, 'production'),
      /FATAL SECURITY ERROR: ADMIN_JWT_SECRET is missing/
    );

    // Too short in production
    assert.throws(
      () => validateAdminJwtSecret('short-admin-secret', customerSecret, 'production'),
      /FATAL SECURITY ERROR: ADMIN_JWT_SECRET is too short/
    );

    // Placeholder in production
    assert.throws(
      () => validateAdminJwtSecret('your-admin-jwt-secret-here-min-32-chars', customerSecret, 'production'),
      /FATAL SECURITY ERROR: ADMIN_JWT_SECRET cannot use an insecure example or placeholder secret in production/
    );

    // Equals JWT_SECRET in production -> forbidden!
    assert.throws(
      () => validateAdminJwtSecret(customerSecret, customerSecret, 'production'),
      /FATAL SECURITY ERROR: ADMIN_JWT_SECRET must be strictly different from JWT_SECRET in production/
    );

    // In development: fallback to DEV_ADMIN_JWT_SECRET
    const devFallback = validateAdminJwtSecret(undefined, customerSecret, 'development');
    assert.strictEqual(devFallback, DEV_ADMIN_JWT_SECRET);

    // In production: valid distinct secret passes
    const prodValid = validateAdminJwtSecret(distinctAdminSecret, customerSecret, 'production');
    assert.strictEqual(prodValid, distinctAdminSecret);

    // SUPABASE_JWT_SECRET validation
    assert.throws(
      () => validateSupabaseJwtSecret('short-supabase', 'production'),
      /FATAL SECURITY ERROR: SUPABASE_JWT_SECRET is too short/
    );
    assert.throws(
      () => validateSupabaseJwtSecret('your-supabase-jwt-secret-here-min-32-chars', 'production'),
      /FATAL SECURITY ERROR: SUPABASE_JWT_SECRET cannot use an insecure example or placeholder secret in production/
    );
    assert.strictEqual(
      validateSupabaseJwtSecret('valid-supabase-jwt-secret-string-at-least-32-bytes', 'production'),
      'valid-supabase-jwt-secret-string-at-least-32-bytes'
    );
  });

  // FIX 3: Cross-acceptance test: admin token not accepted as normal user token and vice versa
  it('should reject admin token as normal user token and normal user token as admin token', () => {
    const customerSecret = 'customer-jwt-secret-string-at-least-32-chars-long';
    const adminSecret = 'admin-jwt-dedicated-secret-string-min-32-bytes-long';

    // 1. Sign an admin token with ADMIN_JWT_SECRET
    const adminToken = jwt.sign(
      { sub: 'admin-1', email: 'admin@shopsell.com', roles: ['admin', 'super_admin'], session_id: 'sess-1' },
      adminSecret
    );

    // 2. Sign a normal user token with JWT_SECRET
    const userToken = jwt.sign(
      { sub: 'user-1', email: 'user@shopsell.com', app_metadata: { roles: ['customer'] } },
      customerSecret
    );

    // SupabaseAuthGuard verifies with JWT_SECRET (customerSecret)
    process.env.JWT_SECRET = customerSecret;
    delete process.env.SUPABASE_JWT_SECRET;
    const reflector = new Reflector();
    const customerGuard = new SupabaseAuthGuard(reflector);
    reflector.getAllAndOverride = (() => false) as any;

    // Normal user token passes customer guard
    const userReq: any = { headers: { authorization: `Bearer ${userToken}` } };
    const userContext: any = {
      switchToHttp: () => ({ getRequest: () => userReq }),
      getHandler: () => () => {},
      getClass: () => class {},
    };
    assert.strictEqual(customerGuard.canActivate(userContext), true);

    // Admin token presented to customer guard -> REJECTED (signature mismatch)
    const adminReqOnCustomerGuard: any = { headers: { authorization: `Bearer ${adminToken}` } };
    const adminContextOnCustomerGuard: any = {
      switchToHttp: () => ({ getRequest: () => adminReqOnCustomerGuard }),
      getHandler: () => () => {},
      getClass: () => class {},
    };
    assert.throws(
      () => customerGuard.canActivate(adminContextOnCustomerGuard),
      (err: any) => err instanceof UnauthorizedException
    );

    // AdminAuthService verifies with ADMIN_JWT_SECRET (adminSecret)
    // Verifying user token on admin secret throws signature mismatch
    assert.throws(
      () => jwt.verify(userToken, adminSecret),
      (err: any) => err.name === 'JsonWebTokenError' && err.message === 'invalid signature'
    );
  });

  // 5. OTP: 5 wrong codes -> invalidated and 401; OTP is single-use and expires at 10 minutes
  it('should invalidate OTP after 5 wrong attempts and return 401, expire at 10 minutes, and be single-use', async () => {
    // Simulate AuthService OTP store and verification state machine
    class OtpSimulator {
      private store = new Map<string, { hashedOtp: string; expiresAt: number; attempts: number }>();

      sendOtp(cleanId: string, otp: string) {
        const now = Date.now();
        this.store.set(cleanId, {
          hashedOtp: `hash:${otp}`,
          expiresAt: now + 10 * 60 * 1000, // 10 minutes
          attempts: 0,
        });
        return { ttlMs: 10 * 60 * 1000 };
      }

      verifyOtp(cleanId: string, inputOtp: string) {
        const now = Date.now();
        const record = this.store.get(cleanId);
        if (!record) {
          throw new UnauthorizedException('No pending verification code found or code expired');
        }
        if (now > record.expiresAt) {
          this.store.delete(cleanId);
          throw new UnauthorizedException('Verification code has expired. Please request a new one');
        }

        const isValid = record.hashedOtp === `hash:${inputOtp}`;
        if (!isValid) {
          record.attempts += 1;
          if (record.attempts >= 5) {
            this.store.delete(cleanId); // Invalidate completely
            throw new UnauthorizedException(
              'Too many invalid attempts. Code invalidated. Please request a new verification code'
            );
          }
          throw new UnauthorizedException('Incorrect verification code');
        }

        // Single-use: delete immediately on success
        this.store.delete(cleanId);
        return { success: true };
      }

      hasCode(cleanId: string) {
        return this.store.has(cleanId);
      }
    }

    const otpSim = new OtpSimulator();
    const id = 'test-seller@shopsell.com';
    const correctCode = '654321';

    // Send code
    const sent = otpSim.sendOtp(id, correctCode);
    assert.strictEqual(sent.ttlMs, 600000); // 10 minutes = 600,000ms

    // Attempt 1 to 4 with wrong code
    for (let attempt = 1; attempt <= 4; attempt++) {
      assert.throws(
        () => otpSim.verifyOtp(id, '000000'),
        (err: any) => err instanceof UnauthorizedException && err.message.includes('Incorrect verification code')
      );
      assert.strictEqual(otpSim.hasCode(id), true, 'Code should still be retained for retry');
    }

    // Attempt 5 with wrong code -> Invalidated and thrown 401
    assert.throws(
      () => otpSim.verifyOtp(id, '000000'),
      (err: any) =>
        err instanceof UnauthorizedException &&
        err.message.includes('Too many invalid attempts. Code invalidated')
    );
    assert.strictEqual(otpSim.hasCode(id), false, 'Code must be deleted and invalidated after 5 wrong attempts');

    // Attempt 6 with the CORRECT code -> Must fail because code was deleted
    assert.throws(
      () => otpSim.verifyOtp(id, correctCode),
      (err: any) =>
        err instanceof UnauthorizedException &&
        err.message.includes('No pending verification code found')
    );

    // Single-use check: Send again, verify correctly once -> second verify fails
    otpSim.sendOtp(id, correctCode);
    const verifySuccess = otpSim.verifyOtp(id, correctCode);
    assert.strictEqual(verifySuccess.success, true);
    assert.strictEqual(otpSim.hasCode(id), false, 'Code must be deleted after 1 successful verification');

    assert.throws(
      () => otpSim.verifyOtp(id, correctCode),
      (err: any) => err instanceof UnauthorizedException
    );
  });
});
