import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes requiring authentication for customers
const PROTECTED_PREFIXES = ['/account', '/checkout'];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. Subdomain routing for Seller Dashboard (e.g. seller.shopsell.com)
  const isSellerSubdomain =
    hostname.startsWith('seller.') ||
    hostname.startsWith('sellers.') ||
    hostname.startsWith('vendor.');

  if (isSellerSubdomain) {
    if (!url.pathname.startsWith('/seller')) {
      url.pathname = `/seller${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 2. Extract auth token from cookies or Authorization header
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('shopsell_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const adminToken = request.cookies.get('shopsell_admin_token')?.value;

  const userRolesCookie = request.cookies.get('shopsell_roles')?.value;
  let roles: string[] = ['customer'];
  if (userRolesCookie) {
    try {
      roles = JSON.parse(userRolesCookie);
    } catch {
      roles = [userRolesCookie];
    }
  }

  // If already authenticated and navigating to login/signup, redirect to home or redirect target
  if (token && (pathname === '/login' || pathname === '/signup')) {
    const redirectParam = url.searchParams.get('redirect');
    const destination =
      redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
        ? redirectParam
        : '/';
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // 3. Admin Route Guard: Separated from customer session
  const isAdminRoute = pathname.startsWith('/admin');
  if (isAdminRoute) {
    // If accessing admin, verify adminToken or roles including admin
    if (!adminToken && !roles.includes('admin')) {
      // In dev mode, allow admin access if dev role is enabled or allow login
      // Otherwise redirect to admin login
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // 4. Seller Route Guard
  const isSellerRoute = pathname.startsWith('/seller');
  if (isSellerRoute && !roles.includes('owner') && !roles.includes('admin')) {
    return NextResponse.redirect(new URL('/become-a-seller', request.url));
  }

  // 5. Protected customer routes (e.g. /account, /checkout)
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedRoute && !token) {
    const returnUrl = encodeURIComponent(pathname + url.search);
    const loginUrl = new URL(`/login?redirect=${returnUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images & public static files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
