import { NextRequest, NextResponse } from 'next/server';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/turnstile';
import { checkOtpVerifyAttempts } from '@/lib/security/rate-limit';
import { validateInternalApiSecret } from '@shop-sell/shared';
import { getBackendUrl, getInternalApiSecret } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. CSRF Origin/Host check
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return NextResponse.json({ success: false, error: 'Forbidden: CSRF check failed' }, { status: 403 });
  }

  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { identifier, phone, otp, firebaseVerified } = body;
    const target = (identifier || phone || '').trim().toLowerCase();

    if (!target || !otp || otp.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Valid identifier and 6-digit verification code are required' },
        { status: 400 }
      );
    }

    // 2. Verification attempt check (fails closed if Redis offline in production)
    const rateCheck = await checkOtpVerifyAttempts(target);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: rateCheck.status || 429 }
      );
    }

    // 2. Forward to Backend Auth Service (Single source of truth for OTP attempt limit & invalidation)
    const backendUrl = getBackendUrl();
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': clientIp,
          'x-internal-proxy-secret': getInternalApiSecret(),
        },
        body: JSON.stringify({ identifier: target, phone: target, otp, firebaseVerified }),
      });
    } catch (netErr) {
      return NextResponse.json(
        { success: false, error: 'Verification service temporarily unreachable' },
        { status: 503 }
      );
    }

    const data = await res.json();
    if (!res.ok || !data.token) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || 'Invalid or expired verification code',
        },
        { status: res.status || 401 }
      );
    }

    // 5. Issue 15-minute HttpOnly access token cookie
    const response = NextResponse.json({
      success: true,
      user: data.user,
    });

    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('shopsell_token', data.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15-minute short-lived access token
    });

    if (data.roles) {
      response.cookies.set('shopsell_roles', JSON.stringify(data.roles), {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}
