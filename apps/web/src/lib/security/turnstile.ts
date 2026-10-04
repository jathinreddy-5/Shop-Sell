import type { NextRequest } from 'next/server';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Extracts the real client IP from Cloudflare CF-Connecting-IP, falling back to x-forwarded-for.
 */
export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return '127.0.0.1';
}

/**
 * Verifies a Cloudflare Turnstile token server-side against Cloudflare API.
 * Never trusts client-side success alone.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    return { success: false, error: 'Cloudflare Turnstile verification token is missing' };
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Development / Test bypass token only when not in production and using mock token
  if (
    process.env.NODE_ENV !== 'production' &&
    (!secretKey || secretKey.startsWith('1x0000000000000000000000000000000AA')) &&
    token === 'mock-turnstile-dev-token'
  ) {
    return { success: true };
  }

  const secretToUse = secretKey || '1x0000000000000000000000000000000AA'; // Cloudflare test secret key that always passes

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretToUse);
    formData.append('response', token.trim());
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = (await res.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      const errList = data['error-codes']?.join(', ') || 'Verification failed';
      return { success: false, error: `Turnstile verification failed: ${errList}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Turnstile verification network error:', err);
    return { success: false, error: 'Could not contact Turnstile verification service' };
  }
}
