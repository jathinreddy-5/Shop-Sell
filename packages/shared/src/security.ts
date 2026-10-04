/**
 * Cryptographic & Authentication Startup Validators
 */

const KNOWN_PLACEHOLDERS = [
  'super-secret-jwt-token-with-minimum-32-characters-long',
  'your-supabase-jwt-secret-here',
  'your_jwt_secret_here',
  'changeme',
  'secret',
];

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
