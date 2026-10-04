import { NextRequest, NextResponse } from 'next/server';
import { verifyOriginAndHost } from '@/lib/security/csrf';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // CSRF verification on state-changing logout
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return NextResponse.json({ success: false, error: 'Forbidden: CSRF check failed' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Clear all session cookies
  response.cookies.set('shopsell_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('shopsell_roles', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set('shopsell_admin_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
