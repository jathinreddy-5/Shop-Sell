import { NextResponse, type NextRequest } from 'next/server.js';
import { jwtVerify } from 'jose';
import { validateJwtSecret, validateDemoAccountsConfig } from '@shop-sell/shared';
import { verifyOriginAndHost } from './lib/security/csrf.ts';

// Routes requiring authentication for customers
const PROTECTED_PREFIXES = ['/account', '/checkout'];

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  const validated = validateJwtSecret(secret, process.env.NODE_ENV);
  validateDemoAccountsConfig(
    process.env.ENABLE_DEMO_ACCOUNTS || process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS,
    process.env.NODE_ENV
  );
  return new TextEncoder().encode(validated);
}

/**
 * Extracts and cryptographically verifies the JWT token from the request.
 * Never trusts client-submitted shopsell_roles cookie for authorization.
 */
async function verifyToken(request: NextRequest) {
  const token =
    request.cookies.get('shopsell_token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) return null;

  try {
    const key = getJwtSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    const roles: string[] = [];
    if (Array.isArray(payload.roles)) {
      roles.push(...payload.roles as string[]);
    }
    const appRoles = (payload.app_metadata as any)?.roles;
    if (Array.isArray(appRoles)) {
      for (const r of appRoles) {
        if (!roles.includes(r)) roles.push(r);
      }
    }
    const userRoles = (payload.user_metadata as any)?.roles;
    if (Array.isArray(userRoles)) {
      for (const r of userRoles) {
        if (!roles.includes(r)) roles.push(r);
      }
    }
    if (typeof payload.role === 'string' && !roles.includes(payload.role)) {
      roles.push(payload.role);
    }

    return { payload, roles };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  // 1. Origin / Host / Sec-Fetch-Site check on state-changing requests (CSRF protection)
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return new NextResponse(
      JSON.stringify({ error: `Forbidden: ${csrf.reason || 'CSRF validation failed'}` }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Subdomain routing for Seller Dashboard (e.g. seller.shopsell.com)
  const isSellerSubdomain =
    hostname.startsWith('seller.') ||
    hostname.startsWith('sellers.') ||
    hostname.startsWith('vendor.');

  if (isSellerSubdomain && !pathname.startsWith('/seller')) {
    url.pathname = `/seller${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // 3. Cryptographically verify the JWT token
  const auth = await verifyToken(request);
  const verifiedRoles = auth?.roles || [];

  // 4. Seller Route Guard: Verified JWT with 'owner' or 'admin' role
  const isSellerRoute = pathname.startsWith('/seller');
  if (isSellerRoute) {
    if (!auth) {
      // Invalid or missing token -> redirect to /login
      const returnUrl = encodeURIComponent(pathname + url.search);
      const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    if (!verifiedRoles.includes('owner') && !verifiedRoles.includes('admin')) {
      // Valid token but no owner/admin role -> redirect to /become-a-seller
      return NextResponse.redirect(new URL('/become-a-seller', request.url));
    }
  }

  // 5. Admin Route Guard
  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute) {
    const adminToken = request.cookies.get('shopsell_admin_token')?.value;
    if (!adminToken && !verifiedRoles.includes('admin')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // 6. Customer Protected Routes (/account, /checkout)
  const isCustomerProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isCustomerProtectedRoute && !auth) {
    const returnUrl = encodeURIComponent(pathname + url.search);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 7. Nonce-based Content Security Policy & Security Headers
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'nonce-${nonce}' https://challenges.cloudflare.com`
    : `'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com`;

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://images.unsplash.com https://challenges.cloudflare.com;
    font-src 'self' data: https://fonts.gstatic.com;
    frame-src 'self' https://challenges.cloudflare.com;
    connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co wss://*.supabase.co;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', cspHeader);
  requestHeaders.set(
    'x-internal-proxy-secret',
    process.env.INTERNAL_API_SECRET || 'shopsell-internal-proxy-secret-shared-key'
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Apply Security Headers to Response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
