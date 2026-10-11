import { NextRequest, NextResponse } from 'next/server';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import { getClientIp } from '@/lib/security/turnstile';
import { validateInternalApiSecret, logSecurityAlert } from '@shop-sell/shared';
import { getBackendUrl, getInternalApiSecret } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // 1. Origin / Host check (CSRF protection)
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: CSRF check failed' },
      { status: 403 }
    );
  }

  const clientIp = getClientIp(request);

  try {
    const body = await request.json();
    const { idToken } = body || {};

    if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
      return NextResponse.json(
        { success: false, error: 'Firebase authentication token is required' },
        { status: 400 }
      );
    }

    // 2. Resolve backend URL
    const backendUrl = getBackendUrl();

    const internalSecret = getInternalApiSecret();

    // 3. Forward Firebase ID token to NestJS backend
    let backendResponse: Response;
    try {
      backendResponse = await fetch(`${backendUrl}/api/auth/firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
          'x-internal-proxy-secret': internalSecret,
        },
        body: JSON.stringify({ idToken: idToken.trim() }),
        signal: AbortSignal.timeout(45000), // 45s timeout to accommodate cold starts
      });
    } catch (backendError: any) {
      console.error('Backend Firebase auth service unreachable:', backendError?.message || backendError);
      const isTimeout =
        backendError?.name === 'TimeoutError' ||
        backendError?.name === 'AbortError' ||
        String(backendError?.message).toLowerCase().includes('timeout') ||
        String(backendError?.message).toLowerCase().includes('aborted');

      return NextResponse.json(
        {
          success: false,
          error: isTimeout
            ? 'Backend authentication timed out while waking up. Please try again.'
            : 'Authentication service temporarily unreachable. Please try again.',
        },
        { status: 504 }
      );
    }

    let backendData: any = {};
    try {
      backendData = await backendResponse.json();
    } catch {
      backendData = {};
    }

    if (!backendResponse.ok || !backendData.token) {
      logSecurityAlert({
        eventType: 'FAILED_LOGIN',
        ip: clientIp,
        path: '/api/auth/firebase',
        reason: backendData.message || 'Firebase token rejected by backend',
      });

      return NextResponse.json(
        {
          success: false,
          error: backendData.message || 'Authentication failed. Please try again.',
        },
        { status: backendResponse.status >= 400 && backendResponse.status < 600 ? backendResponse.status : 401 }
      );
    }

    // 4. Issue standard Shop:Sell session cookies
    const response = NextResponse.json({
      success: true,
      user: backendData.user,
    });

    const isProd = process.env.NODE_ENV === 'production';
    const token = backendData.token;

    // 15-minute access token cookie
    response.cookies.set('shopsell_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    // Client-side UI role hint only
    if (backendData.roles) {
      response.cookies.set('shopsell_roles', JSON.stringify(backendData.roles), {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }

    return response;
  } catch (err: any) {
    console.error('Unexpected error in /api/auth/firebase:', err?.message || err);
    return NextResponse.json(
      { success: false, error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
