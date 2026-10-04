import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { verifyOriginAndHost } from '@/lib/security/csrf';
import { UserRole } from '@shop-sell/shared';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Strict guard: MUST be disabled in production or if ENABLE_DEMO_ACCOUNTS is not true
  const isProd = process.env.NODE_ENV === 'production';
  const isDemoEnabled = process.env.ENABLE_DEMO_ACCOUNTS === 'true' || process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === 'true';

  if (isProd || !isDemoEnabled) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: Demo account access is strictly disabled.' },
      { status: 403 }
    );
  }

  // 2. CSRF Origin / Host check
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return NextResponse.json({ success: false, error: 'Forbidden: CSRF check failed' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { role = 'customer', email: customEmail } = body as { role: UserRole; email?: string };

    const email = customEmail || (role === 'admin' ? 'demo-admin@shopsell.test' : role === 'owner' ? 'demo-seller@shopsell.test' : 'demo-customer@shopsell.test');
    const roles: UserRole[] = role === 'admin' ? ['customer', 'admin'] : role === 'owner' ? ['customer', 'owner'] : ['customer'];

    const jwtSecret =
      process.env.JWT_SECRET ||
      process.env.SUPABASE_JWT_SECRET ||
      'super-secret-jwt-token-with-minimum-32-characters-long';

    const secretKey = new TextEncoder().encode(jwtSecret);

    // Sign 15-minute token with HS256
    const token = await new SignJWT({
      sub: `demo-${role}-${Date.now()}`,
      email,
      role: 'authenticated',
      app_metadata: { provider: 'demo', roles },
      user_metadata: { full_name: `Demo ${role.toUpperCase()}` },
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secretKey);

    const response = NextResponse.json({
      success: true,
      roles,
      email,
      message: `Signed in as demo ${role}`,
    });

    response.cookies.set('shopsell_token', token, {
      httpOnly: true,
      secure: false, // dev mode only
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    response.cookies.set('shopsell_roles', JSON.stringify(roles), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
}
