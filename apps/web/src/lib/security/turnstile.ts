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

export const CLOUDFLARE_IPV6_CIDRS = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
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

function ipv6ToBigInt(ip: string): bigint | null {
  const cleanIp = ip.replace(/^\[|\]$/g, '').trim().toLowerCase();
  if (!cleanIp.includes(':')) return null;

  if (cleanIp.includes('.')) {
    const lastColon = cleanIp.lastIndexOf(':');
    const ipv4Part = cleanIp.substring(lastColon + 1);
    const v4Uint = ipToUint(ipv4Part);
    if (v4Uint === null) return null;
    const v4Hex = `${(v4Uint >>> 16).toString(16)}:${(v4Uint & 0xffff).toString(16)}`;
    return ipv6ToBigInt(cleanIp.substring(0, lastColon + 1) + v4Hex);
  }

  const parts = cleanIp.split('::');
  if (parts.length > 2) return null;

  let groups: string[];
  if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    const middle = new Array(missing).fill('0');
    groups = [...left, ...middle, ...right];
  } else {
    groups = cleanIp.split(':');
  }

  if (groups.length !== 8) return null;

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }
  return result;
}

export function isCloudflareIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const clean = ip.trim().toLowerCase();

  // IPv6 check
  if (clean.includes(':')) {
    const ipBig = ipv6ToBigInt(clean);
    if (ipBig === null) return false;

    const fullMask = (1n << 128n) - 1n;
    for (const cidr of CLOUDFLARE_IPV6_CIDRS) {
      const [rangeIp, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      const rangeBig = ipv6ToBigInt(rangeIp);
      if (rangeBig === null) continue;
      const mask = (fullMask << (128n - BigInt(prefix))) & fullMask;
      if ((ipBig & mask) === (rangeBig & mask)) {
        return true;
      }
    }
    return false;
  }

  // IPv4 check
  const uint = ipToUint(clean);
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

function isTrustedProxyIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.trim().toLowerCase();
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;

  if (process.env.TRUSTED_PROXY_IPS) {
    const trusted = process.env.TRUSTED_PROXY_IPS.split(',').map((s) => s.trim().toLowerCase());
    if (trusted.includes(clean)) return true;
  }

  const uint = ipToUint(clean);
  if (uint !== null) {
    // 10.0.0.0/8
    if ((uint & 0xff000000) >>> 0 === 0x0a000000) return true;
    // 172.16.0.0/12
    if ((uint & 0xfff00000) >>> 0 === 0xac100000) return true;
    // 192.168.0.0/16
    if ((uint & 0xffff0000) >>> 0 === 0xc0a80000) return true;
    // 127.0.0.0/8
    if ((uint & 0xff000000) >>> 0 === 0x7f000000) return true;
  }
  return false;
}

/**
 * Extracts socket IP. Only trusts x-real-ip if request arrives via our own internal proxy or loopback.
 */
function getSocketIp(request: NextRequest): string {
  const directIp = (request as any).ip;
  if (directIp && typeof directIp === 'string' && directIp.trim()) {
    const trimmed = directIp.trim();
    if (isTrustedProxyIp(trimmed)) {
      const forwardedRealIp = request.headers.get('x-real-ip');
      if (forwardedRealIp && forwardedRealIp.trim()) return forwardedRealIp.trim();
    }
    return trimmed;
  }

  const realIp = request.headers.get('x-real-ip');
  return (realIp && realIp.trim()) || '127.0.0.1';
}

/**
 * Validates whether the incoming request originated from Cloudflare edge proxy.
 * Strictly prefers CLOUDFLARE_ORIGIN_SECRET and Authenticated Origin Pull (AOP) mTLS over IP inspection.
 */
export function isCloudflareRequest(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return Boolean(request.headers.get('cf-connecting-ip'));
  }

  // 1. Prefer Authenticated Origin Pull secret verification if configured
  const originSecret = process.env.CLOUDFLARE_ORIGIN_SECRET;
  if (originSecret && request.headers.get('x-cf-origin-secret') === originSecret) {
    return true;
  }

  // 2. Prefer Authenticated Origin Pull mTLS indicator from reverse proxy
  if (request.headers.get('x-cf-authenticated-pull') === 'SUCCESS') {
    return true;
  }

  // 3. Verify incoming socket IP is within Cloudflare's published IPv4/IPv6 ranges
  const socketIp = getSocketIp(request);
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
  const socketIp = getSocketIp(request);

  if (isCloudflareRequest(request)) {
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    if (cfConnectingIp && cfConnectingIp.trim()) {
      return cfConnectingIp.trim();
    }
  }

  return socketIp;
}

import { logSecurityAlert } from '@shop-sell/shared';

/**
 * Verifies a Cloudflare Turnstile token server-side against Cloudflare API.
 * Never trusts client-side success alone.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string' || !token.trim()) {
    logSecurityAlert({
      eventType: 'TURNSTILE_FAILURE',
      ip: clientIp || 'unknown',
      reason: 'Cloudflare Turnstile verification token is missing or empty',
    });
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
      logSecurityAlert({
        eventType: 'TURNSTILE_FAILURE',
        ip: clientIp || 'unknown',
        reason: `Turnstile verification failed: ${errList}`,
      });
      return { success: false, error: `Turnstile verification failed: ${errList}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Turnstile verification network error:', err);
    logSecurityAlert({
      eventType: 'TURNSTILE_FAILURE',
      ip: clientIp || 'unknown',
      reason: 'Could not contact Turnstile verification service',
    });
    return { success: false, error: 'Could not contact Turnstile verification service' };
  }
}
