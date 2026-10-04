import { jwtVerify, type JWTPayload } from 'jose';
import type { NextRequest } from 'next/server';
import { validateJwtSecret } from '@shop-sell/shared';

export interface VerifiedUserPayload extends JWTPayload {
  sub: string;
  email?: string;
  roles?: string[];
  role?: string;
  app_metadata?: {
    roles?: string[];
    provider?: string;
    [key: string]: any;
  };
  user_metadata?: {
    full_name?: string;
    [key: string]: any;
  };
}

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  const validated = validateJwtSecret(secret, process.env.NODE_ENV);
  return new TextEncoder().encode(validated);
}

/**
 * Extracts and cryptographically verifies the JWT token from a NextRequest.
 * Supports HttpOnly cookie 'shopsell_token' (preferred) and 'Authorization: Bearer <token>' header.
 * Uses 'jose' (jwtVerify) with HS256 algorithm.
 */
export async function verifyAuthToken(request: NextRequest): Promise<VerifiedUserPayload | null> {
  const token =
    request.cookies.get('shopsell_token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return null;
  }

  try {
    const key = getJwtSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    // 1. Audience verification: reject admin tokens on customer/seller routes
    if (payload.aud) {
      const audList = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (audList.includes('shopsell-admin') || audList.includes('admin')) {
        return null;
      }
      const allowedAudiences = [
        'authenticated',
        'shopsell',
        'shopsell-app',
        'shopsell-customer',
        'shopsell-impersonation',
      ];
      const isAudValid = audList.some((a) => allowedAudiences.includes(a as string));
      if (!isAudValid) return null;
    }

    // 2. Issuer verification if issuer claim is present
    if (payload.iss) {
      const allowedIssuers = ['shopsell', 'shopsell-api', 'supabase'];
      if (!allowedIssuers.includes(payload.iss as string)) {
        return null;
      }
    }

    return payload as VerifiedUserPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts all verified roles from the JWT payload.
 * Client-submitted cookies or unverified headers are NEVER consulted.
 */
export function extractVerifiedRoles(payload: VerifiedUserPayload): string[] {
  const roles: string[] = [];

  if (Array.isArray(payload.roles)) {
    roles.push(...payload.roles);
  }

  if (payload.app_metadata?.roles && Array.isArray(payload.app_metadata.roles)) {
    for (const r of payload.app_metadata.roles) {
      if (!roles.includes(r)) roles.push(r);
    }
  }

  if (payload.user_metadata?.roles && Array.isArray(payload.user_metadata.roles)) {
    for (const r of payload.user_metadata.roles) {
      if (!roles.includes(r)) roles.push(r);
    }
  }

  if (payload.role && !roles.includes(payload.role)) {
    roles.push(payload.role);
  }

  return roles;
}

/**
 * Verifies that the request belongs to an authenticated seller (possesses 'owner' or 'admin' role).
 */
export async function verifySellerAuth(
  request: NextRequest
): Promise<{ authorized: boolean; user?: VerifiedUserPayload; error?: string; status?: number }> {
  const user = await verifyAuthToken(request);

  if (!user) {
    return { authorized: false, error: 'Unauthorized: Missing or invalid authentication token', status: 401 };
  }

  const roles = extractVerifiedRoles(user);
  if (!roles.includes('owner') && !roles.includes('admin')) {
    return {
      authorized: false,
      user,
      error: 'Forbidden: Seller or Admin authorization required',
      status: 403,
    };
  }

  return { authorized: true, user };
}
