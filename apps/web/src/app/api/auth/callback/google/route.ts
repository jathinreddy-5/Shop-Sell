import { NextRequest, NextResponse } from 'next/server';
import { validateInternalApiSecret } from '@shop-sell/shared';
import { getBackendUrl, getInternalApiSecret } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');
  const storedState = request.cookies.get('google_oauth_state')?.value;

  const origin = request.nextUrl.origin;

  if (error || !code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error || 'Google login was cancelled')}`
    );
  }

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/login?error=State%20validation%20failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/callback/google`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        'Google OAuth credentials missing in server .env'
      )}`
    );
  }

  try {
    // 1. Exchange authorization code for tokens directly with Google
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Failed to exchange Google OAuth code:', tokenData);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          tokenData?.error_description || 'Failed to exchange Google token'
        )}`
      );
    }

    // 2. Fetch verified user profile directly from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    if (!userRes.ok || !userData.email) {
      return NextResponse.redirect(`${origin}/login?error=Failed%20to%20fetch%20Google%20profile`);
    }

    // 3. Forward verified identity to NestJS backend to create/link user and generate Shop:Sell JWT
    const backendUrl = getBackendUrl();
    const internalSecret = getInternalApiSecret();

    const backendRes = await fetch(`${backendUrl}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-proxy-secret': internalSecret,
      },
      body: JSON.stringify({
        email: userData.email,
        name: userData.name || userData.given_name,
        googleId: userData.sub,
      }),
    });

    const backendData = await backendRes.json();
    if (!backendRes.ok || !backendData.token) {
      return NextResponse.redirect(`${origin}/login?error=Backend%20login%20failed`);
    }

    // 4. Issue standard Shop:Sell session cookies & redirect to application root
    const response = NextResponse.redirect(`${origin}/`);
    const isProd = process.env.NODE_ENV === 'production';
    const token = backendData.token;

    response.cookies.set('shopsell_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });

    response.cookies.set('shopsell_roles', JSON.stringify(backendData.roles || ['customer']), {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 900,
    });

    response.cookies.delete('google_oauth_state');
    return response;
  } catch (err: any) {
    console.error('Google OAuth callback error:', err?.message || err);
    return NextResponse.redirect(`${origin}/login?error=Unexpected%20OAuth%20error`);
  }
}
