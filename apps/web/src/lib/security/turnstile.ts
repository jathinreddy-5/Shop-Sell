import type { NextRequest } from 'next/server';
import { logSecurityAlert } from '@shop-sell/shared';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Cloudflare published IPv4 ranges.
 */
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

/**
 * Cloudflare published IPv6 ranges.
 */
export const CLOUDFLARE_IPV6_CIDRS = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

/**
 * Convert IPv4 address to unsigned integer.
 */
function ipToUint(ip: string): number | null {
  const parts = ip.split('.');

  if (parts.length !== 4) {
    return null;
  }

  let num = 0;

  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10);

    if (
      Number.isNaN(octet) ||
      octet < 0 ||
      octet > 255
    ) {
      return null;
    }

    num = (num << 8) | octet;
  }

  return num >>> 0;
}

/**
 * Convert IPv6 address to BigInt.
 */
function ipv6ToBigInt(ip: string): bigint | null {
  const cleanIp = ip
    .replace(/^\[|\]$/g, '')
    .trim()
    .toLowerCase();

  if (!cleanIp.includes(':')) {
    return null;
  }

  // IPv4-mapped / embedded IPv4 support
  if (cleanIp.includes('.')) {
    const lastColon = cleanIp.lastIndexOf(':');
    const ipv4Part = cleanIp.substring(lastColon + 1);

    const v4Uint = ipToUint(ipv4Part);

    if (v4Uint === null) {
      return null;
    }

    const v4Hex =
      `${(v4Uint >>> 16).toString(16)}:` +
      `${(v4Uint & 0xffff).toString(16)}`;

    return ipv6ToBigInt(
      cleanIp.substring(0, lastColon + 1) +
      v4Hex
    );
  }

  const parts = cleanIp.split('::');

  if (parts.length > 2) {
    return null;
  }

  let groups: string[];

  if (parts.length === 2) {
    const left = parts[0]
      ? parts[0].split(':')
      : [];

    const right = parts[1]
      ? parts[1].split(':')
      : [];

    const missing =
      8 - (left.length + right.length);

    if (missing < 1) {
      return null;
    }

    const middle = new Array(missing).fill('0');

    groups = [
      ...left,
      ...middle,
      ...right,
    ];
  } else {
    groups = cleanIp.split(':');
  }

  if (groups.length !== 8) {
    return null;
  }

  let result = 0n;

  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) {
      return null;
    }

    result =
      (result << 16n) |
      BigInt(parseInt(group, 16));
  }

  return result;
}

/**
 * Check whether an IP belongs to a Cloudflare network.
 */
export function isCloudflareIp(
  ip: string
): boolean {
  if (
    !ip ||
    typeof ip !== 'string'
  ) {
    return false;
  }

  const clean = ip
    .trim()
    .toLowerCase();

  // IPv6
  if (clean.includes(':')) {
    const ipBig = ipv6ToBigInt(clean);

    if (ipBig === null) {
      return false;
    }

    const fullMask =
      (1n << 128n) - 1n;

    for (
      const cidr of CLOUDFLARE_IPV6_CIDRS
    ) {
      const [
        rangeIp,
        prefixStr,
      ] = cidr.split('/');

      const prefix =
        parseInt(prefixStr, 10);

      const rangeBig =
        ipv6ToBigInt(rangeIp);

      if (rangeBig === null) {
        continue;
      }

      const mask =
        (fullMask <<
          (128n - BigInt(prefix))) &
        fullMask;

      if (
        (ipBig & mask) ===
        (rangeBig & mask)
      ) {
        return true;
      }
    }

    return false;
  }

  // IPv4
  const uint = ipToUint(clean);

  if (uint === null) {
    return false;
  }

  for (
    const cidr of CLOUDFLARE_IPV4_CIDRS
  ) {
    const [
      rangeIp,
      prefixStr,
    ] = cidr.split('/');

    const prefix =
      parseInt(prefixStr, 10);

    const rangeUint =
      ipToUint(rangeIp);

    if (rangeUint === null) {
      continue;
    }

    const mask =
      prefix === 0
        ? 0
        : (~0 << (32 - prefix)) >>> 0;

    if (
      ((uint & mask) >>> 0) ===
      ((rangeUint & mask) >>> 0)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check whether an IP is a trusted internal proxy.
 */
function isTrustedProxyIp(
  ip: string
): boolean {
  if (!ip) {
    return false;
  }

  const clean = ip
    .trim()
    .toLowerCase();

  // Localhost
  if (
    clean === '127.0.0.1' ||
    clean === '::1' ||
    clean === 'localhost'
  ) {
    return true;
  }

  // Explicitly configured trusted proxies
  if (process.env.TRUSTED_PROXY_IPS) {
    const trusted =
      process.env.TRUSTED_PROXY_IPS
        .split(',')
        .map((s) =>
          s.trim().toLowerCase()
        );

    if (trusted.includes(clean)) {
      return true;
    }
  }

  const uint = ipToUint(clean);

  if (uint !== null) {
    // 10.0.0.0/8
    if (
      ((uint & 0xff000000) >>> 0) ===
      0x0a000000
    ) {
      return true;
    }

    // 172.16.0.0/12
    if (
      ((uint & 0xfff00000) >>> 0) ===
      0xac100000
    ) {
      return true;
    }

    // 192.168.0.0/16
    if (
      ((uint & 0xffff0000) >>> 0) ===
      0xc0a80000
    ) {
      return true;
    }

    // 127.0.0.0/8
    if (
      ((uint & 0xff000000) >>> 0) ===
      0x7f000000
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Extract the socket IP.
 *
 * x-real-ip is only trusted when the request
 * comes from our own trusted proxy or loopback.
 */
function getSocketIp(
  request: NextRequest
): string {
  const directIp = (request as any).ip;

  if (
    directIp &&
    typeof directIp === 'string' &&
    directIp.trim()
  ) {
    const trimmed =
      directIp.trim();

    if (isTrustedProxyIp(trimmed)) {
      const forwardedRealIp =
        request.headers.get(
          'x-real-ip'
        );

      if (
        forwardedRealIp &&
        forwardedRealIp.trim()
      ) {
        return forwardedRealIp.trim();
      }
    }

    return trimmed;
  }

  const realIp =
    request.headers.get('x-real-ip');

  return (
    realIp?.trim() ||
    '127.0.0.1'
  );
}

/**
 * Determine whether request originated
 * through Cloudflare.
 */
export function isCloudflareRequest(
  request: NextRequest
): boolean {
  // Development:
  // accept the local proxy marker when present.
  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    return Boolean(
      request.headers.get(
        'cf-connecting-ip'
      )
    );
  }

  // 1. Authenticated origin secret
  const originSecret =
    process.env.CLOUDFLARE_ORIGIN_SECRET;

  if (
    originSecret &&
    request.headers.get(
      'x-cf-origin-secret'
    ) === originSecret
  ) {
    return true;
  }

  // 2. Authenticated Origin Pull
  if (
    request.headers.get(
      'x-cf-authenticated-pull'
    ) === 'SUCCESS'
  ) {
    return true;
  }

  // 3. Cloudflare socket IP
  const socketIp =
    getSocketIp(request);

  if (
    socketIp &&
    isCloudflareIp(socketIp)
  ) {
    return true;
  }

  return false;
}

/**
 * Extract the real client IP.
 *
 * In production, CF-Connecting-IP is only
 * trusted when the request is verified to have
 * arrived through Cloudflare.
 */
export function getClientIp(
  request: NextRequest
): string {
  const socketIp =
    getSocketIp(request);

  if (
    isCloudflareRequest(request)
  ) {
    const cfConnectingIp =
      request.headers.get(
        'cf-connecting-ip'
      );

    if (
      cfConnectingIp &&
      cfConnectingIp.trim()
    ) {
      return cfConnectingIp.trim();
    }
  }

  return socketIp;
}

/**
 * Verify Cloudflare Turnstile token
 * server-side using Cloudflare Siteverify.
 *
 * IMPORTANT:
 * The browser's Turnstile success callback
 * is NOT trusted by itself.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  clientIp?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // ------------------------------------------------------------
  // 1. Token must exist
  // ------------------------------------------------------------

  if (
    !token ||
    typeof token !== 'string' ||
    !token.trim()
  ) {
    logSecurityAlert({
      eventType:
        'TURNSTILE_FAILURE',

      ip:
        clientIp ||
        'unknown',

      reason:
        'Cloudflare Turnstile verification token is missing or empty',
    });

    return {
      success: false,

      error:
        'Cloudflare Turnstile verification token is missing',
    };
  }

  // ------------------------------------------------------------
  // 2. Get server-side secret
  // ------------------------------------------------------------

  const secretKey =
    process.env.TURNSTILE_SECRET_KEY?.trim();

  /*
   * NEVER silently use a test secret in production.
   */
  if (
    process.env.NODE_ENV ===
    'production' &&
    !secretKey
  ) {
    console.error(
      'TURNSTILE_SECRET_KEY is missing in production'
    );

    logSecurityAlert({
      eventType:
        'TURNSTILE_FAILURE',

      ip:
        clientIp ||
        'unknown',

      reason:
        'TURNSTILE_SECRET_KEY is not configured in production',
    });

    return {
      success: false,

      error:
        'Turnstile security configuration is missing',
    };
  }

  // ------------------------------------------------------------
  // 3. Development mock token
  // ------------------------------------------------------------

  if (
    process.env.NODE_ENV !==
    'production' &&
    token ===
    'mock-turnstile-dev-token'
  ) {
    return {
      success: true,
    };
  }

  /*
   * Development can use Cloudflare's official test secret
   * when no real secret has been configured.
   *
   * Production cannot reach this fallback because of the
   * check above.
   */
  const secretToUse =
    secretKey ||
    '1x0000000000000000000000000000000AA';

  // ------------------------------------------------------------
  // 4. Contact Cloudflare
  // ------------------------------------------------------------

  try {
    const formData =
      new URLSearchParams();

    formData.append(
      'secret',
      secretToUse
    );

    formData.append(
      'response',
      token.trim()
    );

    if (
      clientIp &&
      clientIp.trim()
    ) {
      formData.append(
        'remoteip',
        clientIp.trim()
      );
    }

    const response =
      await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },

          body: formData,

          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    // ----------------------------------------------------------
    // 5. HTTP failure
    // ----------------------------------------------------------

    if (!response.ok) {
      console.error(
        'Cloudflare Turnstile HTTP error:',
        response.status,
        response.statusText
      );

      logSecurityAlert({
        eventType:
          'TURNSTILE_FAILURE',

        ip:
          clientIp ||
          'unknown',

        reason:
          `Turnstile API returned HTTP ${response.status}`,
      });

      return {
        success: false,

        error:
          'Unable to verify security challenge',
      };
    }

    // ----------------------------------------------------------
    // 6. Parse Cloudflare response
    // ----------------------------------------------------------

    const data =
      (await response.json()) as
      TurnstileVerifyResponse;

    // ----------------------------------------------------------
    // 7. Cloudflare rejected token
    // ----------------------------------------------------------

    if (!data.success) {
      const errorCodes =
        data['error-codes'] || [];

      const errorList =
        errorCodes.length > 0
          ? errorCodes.join(', ')
          : 'Verification failed';

      console.warn(
        'Cloudflare Turnstile verification failed:',
        errorList
      );

      logSecurityAlert({
        eventType:
          'TURNSTILE_FAILURE',

        ip:
          clientIp ||
          'unknown',

        reason:
          `Turnstile verification failed: ${errorList}`,
      });

      // Detailed errors during development
      if (
        process.env.NODE_ENV !==
        'production'
      ) {
        return {
          success: false,

          error:
            `Turnstile verification failed: ${errorList}`,
        };
      }

      // Do not expose internal Cloudflare
      // details to production users.
      return {
        success: false,

        error:
          'Security verification failed. Please refresh the page and try again.',
      };
    }

    // ----------------------------------------------------------
    // 8. Successful verification
    // ----------------------------------------------------------

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      'Turnstile verification network error:',
      error
    );

    logSecurityAlert({
      eventType:
        'TURNSTILE_FAILURE',

      ip:
        clientIp ||
        'unknown',

      reason:
        'Could not contact Turnstile verification service',
    });

    return {
      success: false,

      error:
        'Could not contact Turnstile verification service',
    };
  }
}