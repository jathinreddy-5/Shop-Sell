/**
 * Shared Rate Limiter for Shop:Sell
 * Backed by Upstash Redis REST or Redis / Database shared KV store.
 */

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
  totalAttempts: number;
}

/**
 * Executes a shared Redis command via Upstash REST or local fallback.
 */
async function redisCommand(command: string[]): Promise<any> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

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
    } catch (err) {
      console.warn('Upstash Redis REST call failed, attempting fallback store:', err);
    }
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
 */
export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<RateLimitResult> {
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
}

/**
 * Resets a rate limit counter (e.g. upon successful authentication).
 */
export async function resetRateLimit(key: string): Promise<void> {
  await redisCommand(['DEL', key]);
}

/**
 * Rate limit helpers for specific auth vectors:
 */

// 1. OTP Request (Max 5 per hour per email and per IP)
export async function checkOtpRequestRateLimit(emailOrPhone: string, ip: string) {
  const cleanId = emailOrPhone.trim().toLowerCase();
  const emailLimit = await checkRateLimit(`rl:otp_req:id:${cleanId}`, 5, 3600);
  const ipLimit = await checkRateLimit(`rl:otp_req:ip:${ip}`, 5, 3600);

  if (!emailLimit.allowed) {
    return {
      allowed: false,
      error: `Too many verification requests for this account. Please wait ${Math.ceil(emailLimit.resetSeconds / 60)} minutes.`,
    };
  }

  if (!ipLimit.allowed) {
    return {
      allowed: false,
      error: `Too many verification requests from your network. Please wait ${Math.ceil(ipLimit.resetSeconds / 60)} minutes.`,
    };
  }

  return { allowed: true };
}

// 2. OTP Verification Attempts (Max 5 attempts per code, then lockout)
export async function checkOtpVerifyAttempts(identifier: string) {
  const cleanId = identifier.trim().toLowerCase();
  const attempt = await checkRateLimit(`rl:otp_verify:id:${cleanId}`, 5, 600); // 10 minutes window

  if (!attempt.allowed) {
    return {
      allowed: false,
      error: 'Too many incorrect verification attempts. This code is locked out. Please request a new code.',
    };
  }

  return { allowed: true, remaining: attempt.remaining };
}

// 3. Login Password Rate Limit & Throttling
// Security Architecture:
// Hard lockout is keyed to (email + IP) compound key: rl:login:lockout:${cleanEmail}:${cleanIp}
// This prevents an external attacker from locking out a victim by spamming their email address.
// An attacker can only lock out their OWN IP from trying that email.
// A global per-IP limit prevents broad brute-force attacks across accounts from a single IP.
// A global per-email counter applies progressive delay (throttling) rather than hard lockout.
export async function checkLoginRateLimit(email: string, ip: string) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').trim();

  // 1. Compound key lockout: max 5 failed attempts per (email, IP) per 15 minutes
  const compoundLimit = await checkRateLimit(`rl:login:lockout:${cleanEmail}:${cleanIp}`, 5, 900);

  // 2. Per-IP limit: max 10 attempts across all accounts per 15 minutes
  const ipLimit = await checkRateLimit(`rl:login:ip:${cleanIp}`, 10, 900);

  // 3. Global email counter: progressive artificial delay when target has multiple attempts,
  // slowing down distributed attacks without denying service to the real account owner.
  const emailCounter = await checkRateLimit(`rl:login:email_attempts:${cleanEmail}`, 100, 900);
  if (emailCounter.totalAttempts > 3) {
    const delayMs = Math.min(1000, (emailCounter.totalAttempts - 3) * 100);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  if (!compoundLimit.allowed) {
    return {
      allowed: false,
      error: `Account temporarily locked due to multiple failed login attempts. Please wait ${Math.ceil(compoundLimit.resetSeconds / 60)} minutes.`,
    };
  }

  if (!ipLimit.allowed) {
    return {
      allowed: false,
      error: `Too many login attempts from your IP. Please try again after ${Math.ceil(ipLimit.resetSeconds / 60)} minutes.`,
    };
  }

  return { allowed: true };
}

export async function resetLoginRateLimit(email: string, ip: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanIp = (ip || '127.0.0.1').trim();
  await resetRateLimit(`rl:login:lockout:${cleanEmail}:${cleanIp}`);
  await resetRateLimit(`rl:login:email_attempts:${cleanEmail}`);
}
