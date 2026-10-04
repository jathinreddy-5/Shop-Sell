import { NextRequest, NextResponse } from 'next/server';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import { verifyTurnstileToken, getClientIp } from '@/lib/security/turnstile';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/security/rate-limit';

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
    const { email, password, turnstileToken } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid email address' }, { status: 400 });
    }

    // 2. Cloudflare Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, error: turnstileResult.error || 'Turnstile verification failed' },
        { status: 403 }
      );
    }

    // 3. Per-email & Per-IP Rate Limiting & Lockout
    const rateCheck = await checkLoginRateLimit(email, clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
    }

    // 4. Forward to Backend Auth Service
    const backendUrl = process.env.BACKEND_URL || process.env.API_PROXY_URL || 'http://localhost:4000';
    let res: Response;
    try {
      res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': clientIp,
          'x-internal-proxy-secret':
            process.env.INTERNAL_API_SECRET || 'shopsell-internal-proxy-secret-shared-key',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (netErr) {
      return NextResponse.json(
        { success: false, error: 'Authentication service temporarily unreachable' },
        { status: 503 }
      );
    }

    const data = await res.json();
    if (!res.ok) {
      // Generic error response to prevent user enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // 5. Successful login: reset compound rate limit
    await resetLoginRateLimit(email, clientIp);

    // 6. Set HttpOnly, Secure, SameSite=Lax cookie
    const response = NextResponse.json({
      success: true,
      user: data.user,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const token = data.token;

    // 15-minute access token cookie
    response.cookies.set('shopsell_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    // Client-side UI hint only (never used for auth)
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
      { success: false, error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
