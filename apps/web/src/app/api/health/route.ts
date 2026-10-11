import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/auth/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const backendUrl = getBackendUrl();
  let backendStatus = 'unknown';

  try {
    const res = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    backendStatus = res.ok ? 'connected' : 'degraded';
  } catch {
    backendStatus = 'waking_or_unreachable';
  }

  return NextResponse.json({
    status: 'ok',
    service: 'shop-sell-web',
    timestamp: new Date().toISOString(),
    backend: backendStatus,
  });
}
