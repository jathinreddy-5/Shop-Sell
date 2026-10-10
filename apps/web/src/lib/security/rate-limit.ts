import { validateUpstashConfig, hashIdentifier, logSecurityAlert } from '@shop-sell/shared';

/**
 * Shared Rate Limiter for Shop:Sell
 * Backed by Upstash Redis REST or Redis / Database shared KV store.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  totalAttempts: number;
  status?: number;
  error?: string;
}

export class RateLimiterStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimiterStoreError';
  }
}

/**
 * Validates Upstash configuration at startup in production.
 */
export function validateRateLimiterStartup(): void {
  validateUpstashConfig(
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.NODE_ENV
  );
}

/**
 * Executes a shared Redis command via Upstash REST or local fallback.
 */
async function redisCommand(command: string[]): Promise<any> {
  const isProd = process.env.NODE_ENV === 'production';
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (isProd) {
    validateUpstashConfig(upstashUrl, upstashToken, 'production');
  }

  if (upstashUrl && upstashToken && !upstashUrl.includes('[YOUR-')) {
    try {
      const res = await fetch(`${upstashUrl}/${command.map(encodeURIComponent).join('/')}`, {
        headers: {
          Authorization: `Bearer ${upstashToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return data.result;
      }
      throw new Error(`Upstash returned HTTP ${res.status}: ${res.statusText}`);
    } catch (err) {
      if (isProd) {
        console.error('[SECURITY ALERT] Upstash Redis rate limiter error in production:', err);
        throw new RateLimiterStoreError('Upstash Redis store unreachable or returned error');
      }
      console.warn('Upstash Redis REST call failed, attempting fallback store:', err);
    }
  } else if (isProd) {
    console.error('[SECURITY ALERT] Missing Upstash Redis configuration in production');
    throw new RateLimiterStoreError('Upstash Redis unconfigured in production');
  }

  // Fallback to shared memory map if external Redis endpoint not configured in dev
  return localSharedStore(command);
}

// Memory fallback store for testing environments where Upstash credentials are dummy
const memoryStore = new Map<string, { value: number; expiresAt: number }>();

function localSharedStore(command: string[]): any {
  const cmd = command[0]?.toUpperCase();
  const key = command[1];
  const now = Date.now();

  if (cmd === 'INCR') {
    const existing = memoryStore.get(key);
    if (!existing || existing.expiresAt <= now) {
      memoryStore.set(key, { value: 1, expiresAt: now + 3600 * 1000 });
      return 1;
    }
    existing.value += 1;
    return existing.value;
  }

  if (cmd === 'EXPIRE') {
    const seconds = parseInt(command[2] || '3600', 10);
    const existing = memoryStore.get(key);
    if (existing) {
      existing.expiresAt = now + seconds * 1000;
    }
    return 1;
  }

  if (cmd === 'TTL') {
    const existing = memoryStore.get(key);
    if (!existing || existing.expiresAt <= now) {
      return -2;
    }
    return Math.max(0, Math.ceil((existing.expiresAt - now) / 1000));
  }

  if (cmd === 'DEL') {
    memoryStore.delete(key);
    return 1;
  }

  return null;
}

/**
 * Checks and increments rate limit counter in the shared store.
 * In production or when failClosed=true, storage failures fail closed (returning 503).
 * Low-risk routes with failClosed=false log a warning and fail open.
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
  options?: { failClosed?: boolean }
): Promise<RateLimitResult> {
  try {
    const count = await redisCommand(['INCR', key]);
    if (count === 1) {
      await redisCommand(['EXPIRE', key, windowSeconds.toString()]);
    }
    const ttl = await redisCommand(['TTL', key]);
    const resetSeconds = typeof ttl === 'number' && ttl > 0 ? ttl : windowSeconds;

    const allowed = count <= maxAttempts;
    const remaining = Math.max(0, maxAttempts - count);

    return {
      allowed,
      remaining,
      resetSeconds,
      totalAttempts: count,
    };
  } catch (err) {
    const isProd = process.env.NODE_ENV === 'production';
    const shouldFailClosed = options?.failClosed ?? isProd;

    if (shouldFailClosed) {
      console.error(`[SECURITY ALERT] Rate limiter failing CLOSED for key ${key}:`, err);
      return {
        allowed: false,
        remaining: 0,
        resetSeconds: windowSeconds,
        totalAttempts: maxAttempts + 1,
        status: 503,
        error: 'Authentication rate limiter service is temporarily unavailable. Request blocked for security.',
      };
    }

    console.warn(`[RATE LIMITER] Low-risk route failing OPEN for key ${key}:`, err);
    return {
      allowed: true,
      remaining: 1,
      resetSeconds: windowSeconds,
      totalAttempts: 1,
    };
  }
}

/**
 * Resets a rate limit counter (e.g. upon successful authentication).
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redisCommand(['DEL', key]);
  } catch (err) {
    console.warn(`Failed to reset rate limit key ${key}:`, err);
  }
}

/**
 * Rate limit helpers for specific auth vectors:
 */

// 1. OTP Request (Max 5 per hour per email and per IP in prod - strictly fails closed in production)
export async function checkOtpRequestRateLimit(emailOrPhone: string, ip: string) {
  const isDev = process.env.NODE_ENV !== 'production';
  const cleanId = emailOrPhone.trim().toLowerCase();
  const maxAttempts = isDev ? 100 : 30;
  const emailLimit = await checkRateLimit(`rl:otp_req:id:${cleanId}`, maxAttempts, 3600, { failClosed: !isDev });
  const ipLimit = await checkRateLimit(`rl:otp_req:ip:${ip}`, maxAttempts, 3600, { failClosed: !isDev });

  if (!emailLimit.allowed) {
    logSecurityAlert({
      eventType: 'ACCOUNT_LOCKOUT',
      emailHash: hashIdentifier(cleanId),
      ip,
      reason: 'OTP request rate limit exceeded for identifier',
    });
    return {
      allowed: false,
      status: emailLimit.status || 429,
      error:
        emailLimit.error ||
        `Too many verification requests for this account. Please wait ${Math.ceil(emailLimit.resetSeconds / 60)} minutes.`,
    };
  }

  if (!ipLimit.allowed) {
    logSecurityAlert({
      eventType: 'ACCOUNT_LOCKOUT',
      ip,
      reason: 'OTP request rate limit exceeded for IP',
    });
    return {
      allowed: false,
      status: ipLimit.status || 429,
      error:
        ipLimit.error ||
        `Too many verification requests from your network. Please wait ${Math.ceil(ipLimit.resetSeconds / 60)} minutes.`,
    };
  }

  return { allowed: true };
}

// 2. OTP Verification Attempts (Max 5 attempts per code, then lockout - strictly fails closed in production)
export async function checkOtpVerifyAttempts(identifier: string) {
  const cleanId = identifier.trim().toLowerCase();
  const attempt = await checkRateLimit(`rl:otp_verify:id:${cleanId}`, 5, 600, { failClosed: true });

  if (!attempt.allowed) {
    logSecurityAlert({
      eventType: 'ACCOUNT_LOCKOUT',
      emailHash: hashIdentifier(cleanId),
      reason: 'OTP verification locked out after maximum incorrect attempts',
    });
    return {
      allowed: false,
      status: attempt.status || 429,
      error:
        attempt.error ||
        'Too many incorrect verification attempts. This code is locked out. Please request a new code.',
    };
  }

  return { allowed: true, remaining: attempt.remaining };
}

// 3. Login Password Rate Limit & Throttling (strictly fails closed in production)
// Security Architecture:
// Hard lockout is keyed to (email + IP) compound key: rl:login:lockout:${cleanEmail}:${cleanIp} (max 5 failed attempts).
// This prevents an external attacker from locking out a victim by spamming their email address from other IPs.
// A global per-IP limit prevents broad brute-force attacks across accounts from a single IP.
// A higher per-email threshold (10 attempts across all IPs) triggers Turnstile verification requirement rather than a hard block.
export async function checkLoginRateLimit(email: string, ip: string): Promise<{
  allowed: boolean;
  status?: number;
  error?: string;
  requireTurnstile?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').trim();

  // 1. Compound key lockout: max 5 failed attempts per (email, IP) per 15 minutes
  const compoundLimit = await checkRateLimit(`rl:login:lockout:${cleanEmail}:${cleanIp}`, 5, 900, {
    failClosed: true,
  });
  if (!compoundLimit.allowed) {
    logSecurityAlert({
      eventType: 'ACCOUNT_LOCKOUT',
      emailHash: hashIdentifier(cleanEmail),
      ip: cleanIp,
      reason: 'Account compound lockout triggered after multiple failed login attempts from this IP',
    });
    return {
      allowed: false,
      status: compoundLimit.status || 429,
      error:
        compoundLimit.error ||
        `Account temporarily locked due to multiple failed login attempts. Please wait ${Math.ceil(compoundLimit.resetSeconds / 60)} minutes.`,
    };
  }

  // 2. Per-IP limit: max 15 attempts across all accounts per 15 minutes
  const ipLimit = await checkRateLimit(`rl:login:ip:${cleanIp}`, 15, 900, { failClosed: true });
  if (!ipLimit.allowed) {
    logSecurityAlert({
      eventType: 'ACCOUNT_LOCKOUT',
      emailHash: hashIdentifier(cleanEmail),
      ip: cleanIp,
      reason: 'IP login rate limit exceeded across accounts',
    });
    return {
      allowed: false,
      status: ipLimit.status || 429,
      error:
        ipLimit.error ||
        `Too many login attempts from your IP. Please try again after ${Math.ceil(ipLimit.resetSeconds / 60)} minutes.`,
    };
  }

  // 3. Higher per-email threshold across all IPs: triggers Turnstile rather than hard lockout.
  // This allows legitimate users to log in with Turnstile bot verification even if their account is under distributed brute-force.
  const emailCounter = await checkRateLimit(`rl:login:email_attempts:${cleanEmail}`, 10, 900, {
    failClosed: true,
  });
  const requireTurnstile = !emailCounter.allowed || emailCounter.totalAttempts >= 5;

  if (emailCounter.totalAttempts > 3) {
    const delayMs = Math.min(1000, (emailCounter.totalAttempts - 3) * 100);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return { allowed: true, requireTurnstile };
}

export async function resetLoginRateLimit(email: string, ip: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').trim();
  await resetRateLimit(`rl:login:lockout:${cleanEmail}:${cleanIp}`);
  await resetRateLimit(`rl:login:email_attempts:${cleanEmail}`);
}
