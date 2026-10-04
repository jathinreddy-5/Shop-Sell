/**
 * Cryptographic & Authentication Startup Validators
 */

import * as crypto from 'crypto';

const KNOWN_PLACEHOLDERS = [
  'super-secret-jwt-token-with-minimum-32-characters-long',
  'your-supabase-jwt-secret-here',
  'your-supabase-jwt-secret-here-min-32-chars',
  'your_jwt_secret_here',
  'changeme',
  'secret',
  'shopsell-internal-proxy-secret-shared-key',
  'your-internal-api-secret-here-min-32-chars',
  'shopsell-dev-only-internal-proxy-secret-never-use-in-production-min32b',
  'your-admin-jwt-secret-here-min-32-chars',
  'dev-admin-secret-shopsell-ultra-secure-key-2026',
  'dev-admin-secret-shopsell-ultra-secure-key-2026-min32b',
];

export const DEV_INTERNAL_API_SECRET =
  'shopsell-dev-only-internal-proxy-secret-never-use-in-production-min32b';

export const DEV_ADMIN_JWT_SECRET =
  'dev-admin-secret-shopsell-ultra-secure-key-2026-min32b';

/**
 * Validates that ADMIN_JWT_SECRET is present, at least 32 bytes (256 bits),
 * not set to a default placeholder in production, and strictly different
 * from JWT_SECRET in production (no fallback to JWT_SECRET in production).
 * In non-production, falls back to a clearly labeled dev admin secret.
 */
export function validateAdminJwtSecret(adminSecret?: string, jwtSecret?: string, nodeEnv?: string): string {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  if (!adminSecret || typeof adminSecret !== 'string' || adminSecret.trim() === '') {
    if (isProd) {
      throw new Error(
        'FATAL SECURITY ERROR: ADMIN_JWT_SECRET is missing. A dedicated administrative secret (min 32 bytes) is required in production and cannot fall back to JWT_SECRET.'
      );
    }
    return DEV_ADMIN_JWT_SECRET;
  }

  const trimmed = adminSecret.trim();
  const byteLength = Buffer.byteLength(trimmed, 'utf8');

  if (byteLength < 32) {
    if (isProd) {
      throw new Error(
        `FATAL SECURITY ERROR: ADMIN_JWT_SECRET is too short (${byteLength} bytes). It must be at least 32 bytes in production.`
      );
    }
    return trimmed;
  }

  if (isProd && KNOWN_PLACEHOLDERS.includes(trimmed)) {
    throw new Error(
      'FATAL SECURITY ERROR: ADMIN_JWT_SECRET cannot use an insecure example or placeholder secret in production.'
    );
  }

  if (isProd && jwtSecret && trimmed === jwtSecret.trim()) {
    throw new Error(
      'FATAL SECURITY ERROR: ADMIN_JWT_SECRET must be strictly different from JWT_SECRET in production to prevent privilege cross-acceptance.'
    );
  }

  return trimmed;
}

/**
 * Validates SUPABASE_JWT_SECRET if provided for signing or verifying.
 * Requires minimum 32 bytes and rejects known placeholders in production.
 */
export function validateSupabaseJwtSecret(secret?: string, nodeEnv?: string): string | undefined {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return undefined;
  }

  const trimmed = secret.trim();
  const byteLength = Buffer.byteLength(trimmed, 'utf8');

  if (byteLength < 32) {
    if (isProd) {
      throw new Error(
        `FATAL SECURITY ERROR: SUPABASE_JWT_SECRET is too short (${byteLength} bytes). It must be at least 32 bytes in production.`
      );
    }
    return trimmed;
  }

  if (isProd && KNOWN_PLACEHOLDERS.includes(trimmed)) {
    throw new Error(
      'FATAL SECURITY ERROR: SUPABASE_JWT_SECRET cannot use an insecure example or placeholder secret in production.'
    );
  }

  return trimmed;
}

/**
 * Validates that JWT_SECRET is present, at least 32 bytes (256 bits),
 * and not set to a default placeholder in production.
 */
export function validateJwtSecret(secret?: string, nodeEnv?: string): string {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error(
      'FATAL SECURITY ERROR: JWT_SECRET is missing. A cryptographically secure secret is required.'
    );
  }

  const trimmed = secret.trim();
  const byteLength = Buffer.byteLength(trimmed, 'utf8');

  if (byteLength < 32) {
    throw new Error(
      `FATAL SECURITY ERROR: JWT_SECRET is too short (${byteLength} bytes). It must be at least 32 bytes (256 bits) for HS256.`
    );
  }

  if (isProd && KNOWN_PLACEHOLDERS.includes(trimmed)) {
    throw new Error(
      'FATAL SECURITY ERROR: JWT_SECRET cannot use an insecure example or placeholder secret in production.'
    );
  }

  return trimmed;
}

/**
 * Validates that demo accounts are never enabled in a production environment.
 */
export function validateDemoAccountsConfig(enableDemo?: string | boolean, nodeEnv?: string): void {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';
  const isEnabled = enableDemo === true || enableDemo === 'true';

  if (isProd && isEnabled) {
    throw new Error(
      'FATAL SECURITY ERROR: ENABLE_DEMO_ACCOUNTS cannot be enabled in production environment.'
    );
  }
}

/**
 * Validates that INTERNAL_API_SECRET is present, at least 32 bytes (256 bits),
 * and not set to a default placeholder in production.
 * In non-production, falls back to a clearly labeled dev secret that is never accepted in production.
 */
export function validateInternalApiSecret(secret?: string, nodeEnv?: string): string {
  const env = nodeEnv || process.env.NODE_ENV || 'development';
  const isProd = env === 'production';

  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    if (isProd) {
      throw new Error(
        'FATAL SECURITY ERROR: INTERNAL_API_SECRET is missing. A cryptographically secure secret (min 32 bytes) is required in production.'
      );
    }
    return DEV_INTERNAL_API_SECRET;
  }

  const trimmed = secret.trim();
  const byteLength = Buffer.byteLength(trimmed, 'utf8');

  if (byteLength < 32) {
    if (isProd) {
      throw new Error(
        `FATAL SECURITY ERROR: INTERNAL_API_SECRET is too short (${byteLength} bytes). It must be at least 32 bytes in production.`
      );
    }
    return trimmed;
  }

  if (isProd && KNOWN_PLACEHOLDERS.includes(trimmed)) {
    throw new Error(
      'FATAL SECURITY ERROR: INTERNAL_API_SECRET cannot use an insecure example or placeholder secret in production.'
    );
  }

  return trimmed;
}

/**
 * Compares an incoming proxy secret header against the expected secret using timingSafeEqual.
 * Handles length mismatches safely without throwing or leaking timing info.
 */
export function verifyProxySecret(incomingHeader: unknown, expectedSecret: string): boolean {
  if (!incomingHeader || typeof incomingHeader !== 'string' || !expectedSecret) {
    return false;
  }
  const bufA = Buffer.from(incomingHeader, 'utf8');
  const bufB = Buffer.from(expectedSecret, 'utf8');
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Express middleware for apps/api to reject direct calls that lack the internal proxy secret.
 * Enforces timingSafeEqual comparison and server-side-only test bypass.
 */
export function createProxyMiddleware(proxySecret: string, isTestEnv = false) {
  return (req: any, res: any, next: any) => {
    const rawPath = req.originalUrl || req.path || '';
    if (rawPath === '/api/health' || rawPath === '/health' || rawPath.endsWith('/favicon.ico')) {
      return next();
    }

    // Server-side test bypass only: strictly impossible when NODE_ENV=production
    // Never inspects or trusts any client-provided request header or query parameter
    if (isTestEnv && process.env.NODE_ENV !== 'production') {
      return next();
    }

    const incomingSecret = req.headers ? req.headers['x-internal-proxy-secret'] : undefined;
    if (!verifyProxySecret(incomingSecret, proxySecret)) {
      return res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Access denied: direct access to API without web proxy credential is prohibited',
      });
    }

    next();
  };
}
