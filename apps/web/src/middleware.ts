import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 1. Subdomain routing for Seller Dashboard (e.g. seller.shopsell.com)
  const isSellerSubdomain =
    hostname.startsWith('seller.') ||
    hostname.startsWith('sellers.') ||
    hostname.startsWith('vendor.');

  if (isSellerSubdomain) {
    // If on seller subdomain and path doesn't already start with /seller
    if (!url.pathname.startsWith('/seller')) {
      url.pathname = `/seller${url.pathname === '/' ? '' : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 2. Role claims & auth tokens from cookies or Authorization header
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('shopsell_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const userRolesCookie = request.cookies.get('shopsell_roles')?.value;
  let roles: string[] = ['customer'];
  if (userRolesCookie) {
    try {
      roles = JSON.parse(userRolesCookie);
    } catch {
      roles = [userRolesCookie];
    }
  }

  // 3. Protected route enforcement
  const isSellerRoute = url.pathname.startsWith('/seller');
  const isAdminRoute = url.pathname.startsWith('/admin');

  if (isAdminRoute) {
    // Admin access requires authentication with admin role
    if (!token && process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/login?redirect=/admin', request.url));
    }
  }

  if (isSellerRoute) {
    // Seller access requires authentication with owner role
    if (!token && process.env.NODE_ENV === 'production') {
      return NextResponse.redirect(new URL('/become-a-seller', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
