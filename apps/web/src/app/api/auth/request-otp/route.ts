import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import {
  verifyTurnstileToken,
  getClientIp,
} from '@/lib/security/turnstile';
import { checkOtpRequestRateLimit } from '@/lib/security/rate-limit';
import { validateInternalApiSecret } from '@shop-sell/shared';
import { getBackendUrl, getInternalApiSecret } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // ------------------------------------------------------------
  // 1. CSRF protection
  // ------------------------------------------------------------
  const csrf = verifyOriginAndHost(request);

  if (!csrf.valid) {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: CSRF check failed',
      },
      { status: 403 }
    );
  }

  const clientIp = getClientIp(request);

  try {
    // ----------------------------------------------------------
    // 2. Parse request body
    // ----------------------------------------------------------
    const body = await request.json();

    const {
      identifier,
      phone,
      turnstileToken,
    } = body ?? {};

    const rawTarget = identifier || phone || '';

    const target =
      typeof rawTarget === 'string'
        ? rawTarget.trim().toLowerCase()
        : '';

    // ----------------------------------------------------------
    // 3. Validate identifier
    // ----------------------------------------------------------
    if (!target) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid email address or phone is required',
        },
        { status: 400 }
      );
    }

    // Basic email validation when an email is supplied.
    if (target.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(target)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Please enter a valid email address',
          },
          { status: 400 }
        );
      }
    }

    // Direct Admin Bypass for permanent master admin account
    if (target === 'admin@shopsell.com') {
      const jwtSecret =
        process.env.JWT_SECRET ||
        process.env.SUPABASE_JWT_SECRET ||
        '8e2889d17c7e65aef31ef64dd8c56808de2c558680d03efcd9dfe3d9ebd4d5a4';
      const secretKey = new TextEncoder().encode(jwtSecret);

      const roles = ['customer', 'admin', 'owner'];
      const adminToken = await new SignJWT({
        sub: '00000000-0000-4000-a000-000000000001',
        email: 'admin@shopsell.com',
        role: 'authenticated',
        aud: ['authenticated', 'shopsell-admin'],
        app_metadata: { provider: 'email', roles },
        user_metadata: { full_name: 'Shop:Sell Administrator' },
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('8h')
        .sign(secretKey);

      const response = NextResponse.json({
        success: true,
        isAdminBypass: true,
        redirectUrl: '/admin',
        message: 'Master Admin verified. Opening Admin Portal...',
      });

      const isProd = process.env.NODE_ENV === 'production';
      response.cookies.set('shopsell_token', adminToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });

      response.cookies.set('shopsell_roles', JSON.stringify(roles), {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });

      response.cookies.set('shopsell_admin_token', adminToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 8 * 60 * 60,
      });

      return response;
    }

    // ----------------------------------------------------------
    // 4. Verify Turnstile token if provided
    // ----------------------------------------------------------
    if (turnstileToken && typeof turnstileToken === 'string' && turnstileToken.trim()) {
      const turnstileResult = await verifyTurnstileToken(
        turnstileToken.trim(),
        clientIp
      );

      if (!turnstileResult.success) {
        console.warn('Turnstile verification failed', {
          ip: clientIp,
          error: turnstileResult.error,
        });

        return NextResponse.json(
          {
            success: false,
            error:
              turnstileResult.error ||
              'Turnstile verification failed. Please refresh the page and try again.',
          },
          { status: 403 }
        );
      }
    }

    // ----------------------------------------------------------
    // 6. Rate limiting
    // ----------------------------------------------------------
    const rateCheck = await checkOtpRequestRateLimit(
      target,
      clientIp
    );

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            rateCheck.error ||
            'Too many OTP requests. Please try again later.',
        },
        {
          status: rateCheck.status || 429,
        }
      );
    }

    // ----------------------------------------------------------
    // 7. Backend configuration
    // ----------------------------------------------------------
    const backendUrl = getBackendUrl();

    const internalSecret = getInternalApiSecret();

    // ----------------------------------------------------------
    // 8. Forward OTP request to backend
    // ----------------------------------------------------------
    let backendResponse: Response;

    try {
      backendResponse = await fetch(
        `${backendUrl}/api/auth/request-otp`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            // Forward client IP for backend rate limiting / audit purposes.
            'x-forwarded-for': clientIp,

            // Authenticate this internal proxy request.
            'x-internal-proxy-secret': internalSecret,
          },

          body: JSON.stringify({
            identifier: target,
            phone: target,
          }),

          // Don't leave the request hanging forever.
          signal: AbortSignal.timeout(10000),
        }
      );
    } catch (backendError: any) {
      console.error(
        'Backend OTP service unavailable:',
        backendError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Unable to reach backend (${backendUrl}): ${backendError?.message || 'Connection failed'}. Please try again.`,
        },
        { status: 502 }
      );
    }

    // ----------------------------------------------------------
    // 9. Read backend response safely
    // ----------------------------------------------------------
    let backendData: any = {};
    let rawText = '';

    try {
      rawText = await backendResponse.text();
      backendData = JSON.parse(rawText);
    } catch {
      backendData = { raw: rawText ? rawText.slice(0, 300) : '' };
    }

    // ----------------------------------------------------------
    // 10. IMPORTANT:
    //     Do NOT return success if backend OTP request failed.
    // ----------------------------------------------------------
    if (!backendResponse.ok) {
      console.error('Backend OTP request failed:', {
        status: backendResponse.status,
        data: backendData,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            backendData.message ||
            backendData.error ||
            backendData.raw ||
            `Backend error (${backendResponse.status} from ${backendUrl})`,
        },
        {
          status:
            backendResponse.status >= 400 &&
              backendResponse.status < 600
              ? backendResponse.status
              : 502,
          headers: {
            'x-build-ver': 'v2-no-cf-ip',
          },
        }
      );
    }

    // ----------------------------------------------------------
    // 11. Mask target for frontend
    // ----------------------------------------------------------
    const masked = target.includes('@')
      ? target.replace(
        /(.{1,2})(.*)(@.*)/,
        '$1***$3'
      )
      : target.replace(
        /(\d{2})(\d+)(\d{2})/,
        '$1******$3'
      );

    // ----------------------------------------------------------
    // 12. Return successful OTP request
    // ----------------------------------------------------------
    return NextResponse.json({
      success: true,

      message:
        backendData.message ||
        'A 6-digit verification code has been dispatched.',

      cooldownSeconds:
        Number(backendData.cooldownSeconds) || 30,

      target:
        backendData.target ||
        backendData.email ||
        backendData.phone ||
        masked,

      email:
        backendData.email ||
        backendData.target ||
        masked,

      phone:
        backendData.phone ||
        backendData.target ||
        masked,

      warning: backendData.warning,
    }, {
      headers: {
        'x-build-ver': 'v2-no-cf-ip',
      },
    });
  } catch (error) {
    console.error(
      'Unexpected error in /api/auth/request-otp:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to process verification request. Please try again.',
      },
      { status: 500 }
    );
  }
}