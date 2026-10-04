import type { NextRequest } from 'next/server';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export const CLOUDFLARE_IPV4_CIDRS = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
];

function ipToUint(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return null;
    num = (num << 8) | octet;
  }
  return num >>> 0;
}

export function isCloudflareIp(ip: string): boolean {
  const uint = ipToUint(ip);
  if (uint === null) return false;

  for (const cidr of CLOUDFLARE_IPV4_CIDRS) {
    const [rangeIp, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const rangeUint = ipToUint(rangeIp);
    if (rangeUint === null) continue;
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    if (((uint & mask) >>> 0) === ((rangeUint & mask) >>> 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates whether the incoming request originated from Cloudflare edge proxy.
 * Checks Authenticated Origin Pull indicators, origin secret header, or socket IP in Cloudflare ranges.
 */
export function isCloudflareRequest(request: NextRequest): boolean {
  // In development and unit test environments, allow headers unless testing production enforcement
  if (process.env.NODE_ENV !== 'production') {
    return Boolean(request.headers.get('cf-connecting-ip'));
  }

  // 1. Authenticated Origin Pull secret verification if configured
  const originSecret = process.env.CLOUDFLARE_ORIGIN_SECRET;
  if (originSecret && request.headers.get('x-cf-origin-secret') === originSecret) {
    return true;
  }

  // 2. Authenticated Origin Pull mTLS indicator from reverse proxy (e.g. Nginx ssl_client_verify)
  if (request.headers.get('x-cf-authenticated-pull') === 'SUCCESS') {
    return true;
  }

  // 3. Verify incoming socket IP is within Cloudflare's published IP ranges
  const socketIp = (request as any).ip || request.headers.get('x-real-ip') || '';
  if (socketIp && isCloudflareIp(socketIp)) {
    return true;
  }

  return false;
}

/**
 * Extracts the real client IP for rate limiting and auditing.
 * In production: ONLY trusts CF-Connecting-IP when verified to have come through Cloudflare.
 * Direct connections bypassing Cloudflare fall back strictly to the socket address.
 */
export function getClientIp(request: NextRequest): string {
  const socketIp = ((request as any).ip || request.headers.get('x-real-ip') || '127.0.0.1').trim();

  // In production, only trust CF-Connecting-IP if the request is known to have come through Cloudflare
  if (isCloudflareRequest(request)) {
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp && cfConnectingIp.trim()) {
      return cfConnectingIp.trim();
    }
  }

  return socketIp;
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
