import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken, extractVerifiedRoles } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const verified = await verifyAuthToken(request);

  if (!verified) {
    return NextResponse.json(
      { authenticated: false, user: null, roles: ['customer'] },
      { status: 401 }
    );
  }

  const roles = extractVerifiedRoles(verified);

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: verified.sub,
      email: verified.email,
      roles,
      user_metadata: verified.user_metadata || {},
      app_metadata: verified.app_metadata || {},
    },
    roles,
  });
}
