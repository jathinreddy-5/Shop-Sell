import type { NextRequest } from 'next/server';

/**
 * Validates Origin, Host, and Sec-Fetch-Site headers on state-changing requests to prevent CSRF attacks.
 *
 * Security Rule:
 * For state-changing HTTP methods (POST, PUT, PATCH, DELETE):
 * 1. If an 'Origin' header is present and not 'null':
 *    - It must parse as a valid URL whose host matches the request 'Host' or 'x-forwarded-host'.
 * 2. If 'Origin' is missing or equal to literal 'null' (e.g. privacy modes, top-level navigations, sandboxed contexts):
 *    - It is only allowed if the browser-attested 'Sec-Fetch-Site' header indicates a same-origin request
 *      ('same-origin' or 'none').
 *    - Any missing/null Origin with 'cross-site' Sec-Fetch-Site, or where Sec-Fetch-Site is absent, MUST be rejected (HTTP 403).
 */
export function verifyOriginAndHost(request: NextRequest): { valid: boolean; reason?: string } {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true };
  }

  const host = (request.headers.get('host') || request.headers.get('x-forwarded-host') || '').toLowerCase();
  const origin = request.headers.get('origin');
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();

  // 1. If Origin header is provided and not literal "null"
  if (origin && origin !== 'null') {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost !== host) {
        return { valid: false, reason: `Origin header mismatch (${originHost} vs ${host})` };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Malformed Origin header' };
    }
  }

  // 2. Origin is missing or literal "null":
  // Allow only if browser-attested Sec-Fetch-Site confirms same-origin or user direct navigation ('none')
  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return { valid: true };
  }

  // Explicit opt-in for unit tests that mock requests without headers
  if (process.env.NODE_ENV === 'test' && request.headers.get('x-test-bypass-csrf') === 'true') {
    return { valid: true };
  }

  return {
    valid: false,
    reason: origin === 'null'
      ? 'State-changing request with null Origin is rejected unless same-origin Sec-Fetch-Site'
      : 'State-changing request missing Origin header without verified same-origin Sec-Fetch-Site',
  };
}
