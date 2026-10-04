import { NextRequest, NextResponse } from 'next/server';
import { verifySellerAuth } from '@/lib/auth/server-auth';
import { verifyOriginAndHost } from '@/lib/security/csrf';

export const runtime = 'nodejs';

async function handleSellerProxy(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  // 1. Verify Origin and Host on state-changing requests
  const csrf = verifyOriginAndHost(request);
  if (!csrf.valid) {
    return NextResponse.json(
      { success: false, error: `Forbidden: ${csrf.reason || 'CSRF validation failed'}` },
      { status: 403 }
    );
  }

  // 2. Independently verify the JWT and ensure 'owner' or 'admin' role server-side
  const auth = await verifySellerAuth(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, error: auth.error || 'Unauthorized' },
      { status: auth.status || 401 }
    );
  }

  const { slug } = await params;
  const path = slug.join('/');
  const backendUrl = process.env.BACKEND_URL || process.env.API_PROXY_URL || 'http://localhost:4000';
  const targetUrl = `${backendUrl}/api/sellers/${path}${request.nextUrl.search}`;

  // Forward request to backend with original Bearer token
  const token =
    request.cookies.get('shopsell_token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  const headers = new Headers();
  headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    headers.set('cf-connecting-ip', cfIp);
  }

  headers.set(
    'x-internal-proxy-secret',
    process.env.INTERNAL_API_SECRET || 'shopsell-internal-proxy-secret-shared-key'
  );

  try {
    let body: any = undefined;
    if (['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
      body = await request.text();
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const data = await response.text();
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Seller service temporarily unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return handleSellerProxy(request, ctx);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return handleSellerProxy(request, ctx);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return handleSellerProxy(request, ctx);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return handleSellerProxy(request, ctx);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ slug: string[] }> }) {
  return handleSellerProxy(request, ctx);
}
