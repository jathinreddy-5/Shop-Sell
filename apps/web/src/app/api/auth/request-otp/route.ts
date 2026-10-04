import { NextRequest, NextResponse } from 'next/server';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import { verifyTurnstileToken, getClientIp } from '@/lib/security/turnstile';
import { checkOtpRequestRateLimit } from '@/lib/security/rate-limit';
import { validateInternalApiSecret } from '@shop-sell/shared';

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
    const { identifier, phone, turnstileToken } = body;
    const target = (identifier || phone || '').trim().toLowerCase();

    if (!target) {
      return NextResponse.json({ success: false, error: 'Valid email address or phone is required' }, { status: 400 });
    }

    // 2. Cloudflare Turnstile Verification
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { success: false, error: turnstileResult.error || 'Turnstile verification failed' },
        { status: 403 }
      );
    }

    // 3. Rate Limiting: 5 per hour per email & per IP
    const rateCheck = await checkOtpRequestRateLimit(target, clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error },
        { status: rateCheck.status || 429 }
      );
    }

    // 4. Forward to Backend Auth Service
    const backendUrl = process.env.BACKEND_URL || process.env.API_PROXY_URL || 'http://localhost:4000';
    try {
      await fetch(`${backendUrl}/api/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': clientIp,
          'x-internal-proxy-secret': validateInternalApiSecret(
            process.env.INTERNAL_API_SECRET,
            process.env.NODE_ENV
          ),
        },
        body: JSON.stringify({ identifier: target, phone: target }),
      });
    } catch (netErr) {
      console.warn('Backend OTP service error (continuing with generic response):', netErr);
    }

    // 5. Anti-enumeration: Always return identical generic success response
    const masked = target.includes('@')
      ? target.replace(/(.{1,2})(.*)(@.*)/, '$1***$3')
      : target.replace(/(\d{2})(\d+)(\d{2})/, '$1******$3');

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a 6-digit verification code has been dispatched.',
      cooldownSeconds: 30,
      target: masked,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to process verification request' },
      { status: 500 }
    );
  }
}
