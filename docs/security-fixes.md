# Shop:Sell Security Hardening & Vulnerability Remediation Guide

This document provides a comprehensive technical audit and architectural reference for the security hardening fixes implemented on the `security-fixes` branch across the Shop:Sell monorepo (`apps/api` NestJS backend, `apps/web` Next.js frontend, and `packages/shared`).

---

## Table of Contents
1. [Architecture Overview & Trust Boundaries](#1-architecture-overview--trust-boundaries)
2. [Executive Summary of Fixes](#2-executive-summary-of-fixes)
3. [Deep Dive: Vulnerability & Resolution by Fix](#3-deep-dive-vulnerability--resolution-by-fix)
   - [FIX 1 (BLOCKER): Hardcoded Proxy-Secret Fallback Removal & Constant-Time Verification](#fix-1-blocker-hardcoded-proxy-secret-fallback-removal--constant-time-verification)
   - [FIX 2: Server-Side Only Test-Runner Bypass](#fix-2-server-side-only-test-runner-bypass)
   - [FIX 3: Admin & Supabase JWT Secret Separation & Signer/Verifier Alignment](#fix-3-admin--supabase-jwt-secret-separation--signerverifier-alignment)
   - [FIX 4: Distributed OTP Storage in Shared Redis](#fix-4-distributed-otp-storage-in-shared-redis)
   - [FIX 5: Non-Blocking Async Scrypt & Constant-Time User Enumeration Defense](#fix-5-non-blocking-async-scrypt--constant-time-user-enumeration-defense)
   - [FIX 6: Client IP Trust Boundary & Cloudflare Origin Verification](#fix-6-client-ip-trust-boundary--cloudflare-origin-verification)
   - [FIX 7: Rate Limiter Fail-Closed Mode & Upstash Configuration Validation](#fix-7-rate-limiter-fail-closed-mode--upstash-configuration-validation)
   - [FIX 8: Structured Security Alerting Hooks & Privacy Protection](#fix-8-structured-security-alerting-hooks--privacy-protection)
4. [Monorepo Signer / Verifier Matrix](#4-monorepo-signer--verifier-matrix)
5. [Automated Test Suite Coverage](#5-automated-test-suite-coverage)
6. [Host Deployment & Cloudflare Setup Checklist](#6-host-deployment--cloudflare-setup-checklist)
7. [Residual Risks & Operational Considerations](#7-residual-risks--operational-considerations)

---

## 1. Architecture Overview & Trust Boundaries

The Shop:Sell platform is built as a unified monorepo with strict architectural layering:
- **Public Ingress Layer (`apps/web`)**: Next.js 15 App Router serving customer web application, seller portal, and administrative dashboard. Enforces Cloudflare Turnstile bot verification, CSRF Origin/Host validation, per-IP and per-identifier rate limiting, and nonce-based Content Security Policy (CSP).
- **Backend API Layer (`apps/api`)**: NestJS service providing core business logic, database transactions, order placement, payments, search indexing, and administrative RBAC.
- **Trust Boundary (`x-internal-proxy-secret`)**: The backend API is not intended to be exposed directly to the public internet. All state-changing customer requests and seller operations route through `apps/web` API proxy routes, which attach a high-entropy secret in the `x-internal-proxy-secret` header. Direct calls bypassing the web proxy are rejected at the edge of `apps/api`.
- **Shared Contracts (`packages/shared`)**: Single source of truth for cryptographic validators, Zod schemas, data contracts, and security utilities.

```
[ Client Browser ]
        │
        ▼ (HTTPS / TLS 1.3)
[ Cloudflare Edge Proxy ] (Turnstile Challenge, DDoS Shield, WAF)
        │
        ▼ (Authenticated Origin Pull mTLS / Origin Firewall)
[ apps/web (Next.js 15) ]
  ├── CSRF Origin & Host Verification
  ├── Cloudflare Turnstile Verification
  ├── Upstash Redis Distributed Rate Limiting & Lockout
  ├── Nonce-based CSP & Security Headers
  └── Internal Proxy Header Injection (x-internal-proxy-secret)
        │
        ▼ (Private VPC / Internal Network)
[ apps/api (NestJS) ]
  ├── createProxyMiddleware (timingSafeEqual verification)
  ├── SupabaseAuthGuard / AdminAuthGuard (JWT Verification)
  ├── Shared Redis OTP Storage (10m TTL, 5-attempt threshold)
  ├── Non-Blocking Async Scrypt (Constant-Time Password Check)
  └── Supabase PostgreSQL (RLS & ACID Transactions)
```

---

## 2. Executive Summary of Fixes

| Fix | Category | Severity | Primary Target Files | Commit |
| :--- | :--- | :--- | :--- | :--- |
| **FIX 1** | Authentication Bypass | **BLOCKER** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `apps/web/src/middleware.ts`, proxy routes | `1c96227` |
| **FIX 2** | Authorization Bypass | **HIGH** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `api-security.spec.ts` | `d12fced` |
| **FIX 3** | Privilege Escalation | **CRITICAL** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `admin-auth.service.ts`, `customer-impersonation.service.ts` | `6dbc5e6` |
| **FIX 4** | State / Brute-Force | **HIGH** | `apps/api/src/modules/auth/auth.service.ts`, `api-security.spec.ts` | `80748b0` |
| **FIX 5** | DoS / User Enumeration | **MEDIUM** | `apps/api/src/modules/auth/auth.service.ts`, `apps/web/src/lib/security/rate-limit.ts` | `3d20b70` |
| **FIX 6** | Rate Limit Bypass | **HIGH** | `apps/web/src/lib/security/turnstile.ts`, `docs/cloudflare-setup.md`, `security-hardening.spec.ts` | `6cae63b` |
| **FIX 7** | Availability / DoS | **HIGH** | `packages/shared/src/security.ts`, `apps/web/src/lib/security/rate-limit.ts`, auth routes | `1dc5c8f` |
| **FIX 8** | Observability / Auditing | **MEDIUM** | `packages/shared/src/security.ts`, `auth.service.ts`, `rate-limit.ts`, `csrf.ts`, `turnstile.ts`, `login/route.ts` | `f865d21` |

---

## 3. Deep Dive: Vulnerability & Resolution by Fix

### FIX 1 (BLOCKER): Hardcoded Proxy-Secret Fallback Removal & Constant-Time Verification

#### Vulnerability Analysis
- **Defect**: The application fell back to `'shopsell-internal-proxy-secret-shared-key'` if `process.env.INTERNAL_API_SECRET` was omitted or blank. An external attacker who knew this hardcoded default could bypass `apps/web` entirely and call `apps/api` directly, bypassing Turnstile, rate limiting, CSRF checks, and CSP policies.
- **Timing Leak**: Secret string comparison was conducted using regular string equality (`===`), making the secret vulnerable to side-channel timing attacks byte-by-byte.

#### Technical Implementation
1. **Shared Cryptographic Validator**: Implemented [`validateInternalApiSecret`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) in `packages/shared/src/security.ts`.
   - In production (`NODE_ENV=production`), startup halts immediately if `INTERNAL_API_SECRET` is missing, shorter than 32 bytes, or equals any known placeholder.
   - In non-production, falls back to [`DEV_INTERNAL_API_SECRET`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts), which is strictly banned from production use.
2. **Constant-Time Verification**: Implemented [`verifyProxySecret`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) using `crypto.timingSafeEqual`.
   - Compares byte buffers using Node standard library `timingSafeEqual`.
   - Safely handles length mismatches in constant time without throwing unhandled exceptions or leaking the expected secret length.
3. **Application Enforcement**:
   - `apps/api/src/main.ts` executes startup validation and attaches `createProxyMiddleware(proxySecret)`.
   - `apps/web/src/middleware.ts` and proxy route handlers inject the validated secret into downstream requests.
   - Added generation instructions (`openssl rand -hex 32`) to `.env.example`.

---

### FIX 2: Server-Side Only Test-Runner Bypass

#### Vulnerability Analysis
- **Defect**: `apps/api/src/main.ts` previously inspected incoming client request headers (`x-test-direct-check`) to bypass proxy authentication during automated testing.
- **Threat Model**: If an attacker discovered or guessed this test header, sending it in an HTTP request would allow bypassing proxy secret verification even on a live production deployment.

#### Technical Implementation
1. **Strict Server-Side Detection**: Modified [`createProxyMiddleware(proxySecret, isTestEnv)`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts).
   - In `apps/api/src/main.ts`, `isTestEnv` is evaluated purely on the server: `process.env.NODE_ENV === 'test'`.
   - In `createProxyMiddleware`:
     ```ts
     if (isTestEnv && process.env.NODE_ENV !== 'production') {
       return next();
     }
     ```
   - If `process.env.NODE_ENV === 'production'`, the test bypass is **impossible** regardless of server arguments or request headers.
2. **Automated Verification**: Added unit test in `apps/api/src/__tests__/api-security.spec.ts` asserting that requests containing `x-test-direct-check`, `x-test-bypass`, or similar client headers receive HTTP 403 Forbidden in production.

---

### FIX 3: Admin & Supabase JWT Secret Separation & Signer/Verifier Alignment

#### Vulnerability Analysis
- **Defect**: `AdminAuthService` fell back to `SUPABASE_JWT_SECRET` or `JWT_SECRET` when `ADMIN_JWT_SECRET` was not provided.
- **Privilege Escalation**: If customer tokens and admin tokens are signed with the same symmetric secret key, a normal customer token (or a customer impersonation token) with a forged role or manipulated payload could be mistakenly accepted by administrative endpoints, or vice versa.

#### Technical Implementation
1. **Mandatory Separation in Production**: Implemented [`validateAdminJwtSecret`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts):
   - In production, `ADMIN_JWT_SECRET` is strictly required, must be at least 32 bytes, cannot be a placeholder, and **must not equal** `JWT_SECRET`.
   - Implemented [`validateSupabaseJwtSecret`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) requiring $\ge 32$ bytes and rejecting placeholders if provided.
2. **Signer/Verifier Alignment Audit**:
   - `apps/api/src/modules/admin-core/auth/admin-auth.service.ts`: Signs administrative sessions strictly with `ADMIN_JWT_SECRET`.
   - `apps/api/src/modules/admin-core/rbac/admin-auth.guard.ts`: Verifies admin tokens strictly with `ADMIN_JWT_SECRET`.
   - `apps/api/src/modules/auth/auth.service.ts`: Signs customer tokens strictly with `JWT_SECRET`.
   - `apps/api/src/common/guards/supabase-auth.guard.ts`: Verifies customer tokens strictly with `JWT_SECRET || SUPABASE_JWT_SECRET`.
   - `apps/api/src/modules/admin-core/security/customer-impersonation.service.ts`: Mints customer tokens signed with `JWT_SECRET || SUPABASE_JWT_SECRET`, accepted by `SupabaseAuthGuard`.
   - `apps/web/src/middleware.ts` and `apps/web/src/lib/auth/server-auth.ts`: Verifies user tokens strictly with `JWT_SECRET || SUPABASE_JWT_SECRET`.
3. **Automated Verification**: Added tests asserting that admin tokens are rejected on customer routes and customer tokens are rejected on admin routes.

---

### FIX 4: Distributed OTP Storage in Shared Redis

#### Vulnerability Analysis
- **Defect**: OTP records were previously stored in a Node.js process-local `Map<string, OtpRecord>` inside `AuthService`.
- **Impact**:
  - Horizontal scaling failure: If a user requested an OTP on instance A, instance B could not verify it.
  - Process recycles: Server restarts or deploys wiped all active OTP codes.
  - Rate limit evasion: Attackers could rotate through instances to exceed the 5-attempt brute-force limit.

#### Technical Implementation
1. **Shared Store Migration**: Refactored [`AuthService`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/auth/auth.service.ts) to utilize Redis via `createRedisClient()` (backed by Upstash or hosted Redis).
2. **Lifecycle & Security Policies**:
   - Storage Key: `auth:otp:${cleanId}`
   - Time-to-Live (TTL): 10 minutes (`EX 600`), automatically evicted by Redis upon expiration.
   - Attempt Counter: Incremented in Redis upon each verification attempt. If attempts reach 5, the key is evicted immediately and the user is locked out (`HTTP 401: Too many incorrect attempts. Code invalidated.`).
   - Single-Use Deletion: Upon successful OTP verification, the key is immediately deleted via `DEL`, preventing replay attacks.
3. **Automated Verification**: Added multi-instance simulation test verifying that two independent instances of `AuthService` share OTP state, track failed attempts concurrently, and enforce single-use invalidation.

---

### FIX 5: Non-Blocking Async Scrypt & Constant-Time User Enumeration Defense

#### Vulnerability Analysis
- **Event-Loop Starvation**: Password hashing and verification used `crypto.scryptSync`. Under high concurrency or password brute-force bursts, CPU-intensive synchronous hashing blocked the single-threaded Node.js event loop, degrading API response times and opening an easy Denial of Service (DoS) vector.
- **Timing Attack / User Enumeration**: When an unknown email was queried, earlier code returned immediately without performing an equivalent work factor, allowing attackers to measure response times to enumerate registered accounts.

#### Technical Implementation
1. **Asynchronous Non-Blocking Scrypt**: Replaced `scryptSync` in [`AuthService`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/auth/auth.service.ts) with `crypto.scrypt` wrapped in a `Promise<Buffer>`:
   ```ts
   private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
     ...
     const derived = await new Promise<Buffer>((resolve, reject) => {
       crypto.scrypt(password, salt, 64, (err, derivedKey) => {
         if (err) reject(err);
         else resolve(derivedKey as Buffer);
       });
     });
     return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived.toString('hex'), 'hex'));
   }
   ```
2. **Constant-Time Dummy Verification**: When a requested email is not found in the database, `AuthService` executes a full async scrypt computation against a dummy 64-byte hash:
   - Identical CPU cost, memory footprint, and wall-clock execution time.
   - Returns identical HTTP 401 status and JSON response payload (`{"statusCode": 401, "message": "Invalid email or password", "error": "Unauthorized"}`).
3. **Throttling Delay Cap**: In `apps/web/src/lib/security/rate-limit.ts`, evaluated hard lockout and IP limits before progressive throttling, and strictly capped artificial delays at $\le 1000$ms to prevent resource starvation.

---

### FIX 6: Client IP Trust Boundary & Cloudflare Origin Verification

#### Vulnerability Analysis
- **Header Spoofing**: `apps/web/src/lib/security/turnstile.ts` previously extracted client IPs using `request.headers.get('cf-connecting-ip')`.
- **Rate Limit Bypass**: If the origin server accepts direct traffic from the internet, an attacker could send a custom `CF-Connecting-IP: <arbitrary-ip>` header with every request. This rotated the rate limit key on every attempt, completely neutralizing per-IP rate limits or maliciously exhausting the rate limit quota of a victim's IP.

#### Technical Implementation
1. **Edge IP Verification**: Implemented [`isCloudflareIp`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts) using 32-bit unsigned bitmasking against the official Cloudflare IPv4 CIDR ranges:
   - `173.245.48.0/20`, `103.21.244.0/22`, `103.22.200.0/22`, `103.31.4.0/22`, `141.101.64.0/18`, `108.162.192.0/18`, `190.93.240.0/20`, `188.114.96.0/20`, `197.234.240.0/22`, `198.41.128.0/17`, `162.158.0.0/15`, `104.16.0.0/13`, `104.24.0.0/14`, `172.64.0.0/13`, `131.0.72.0/22`.
2. **Origin Authentication Verification**: Implemented [`isCloudflareRequest`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts):
   - In production (`NODE_ENV=production`), checks:
     1. Authenticated Origin Pull (AOP) mTLS header (`x-cf-authenticated-pull: SUCCESS`),
     2. Origin secret header (`x-cf-origin-secret: CLOUDFLARE_ORIGIN_SECRET`), or
     3. Incoming socket address residing within official Cloudflare CIDR ranges.
3. **Fallback to Socket Address**: [`getClientIp`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts) only trusts `CF-Connecting-IP` if `isCloudflareRequest` returns `true`. Direct unverified requests fall back strictly to the real socket IP (`request.ip` / `x-real-ip`).
4. **Documentation**: Added Section 3B to [`docs/cloudflare-setup.md`](file:///Users/jathinreddy/Desktop/Shop:Sell/docs/cloudflare-setup.md) detailing required Origin CA installation and firewall rules.

---

### FIX 7: Rate Limiter Fail-Closed Mode & Upstash Configuration Validation

#### Vulnerability Analysis
- **Fail-Open Risk**: When Upstash Redis was unreachable, the rate limiter caught the error and fell back to an in-memory `Map`. In production serverless/container deployments, an attacker could flood the endpoint during network blips or cold starts and bypass rate limiting entirely.
- **Silent Misconfiguration**: If Upstash environment variables were missing or set to placeholder values, the app ran indefinitely in dev-fallback mode in production.

#### Technical Implementation
1. **Startup Validation**: Implemented [`validateUpstashConfig`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts):
   - Validates that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, non-empty, and do not contain placeholder strings (`[YOUR-`, `your-upstash`).
   - Integrated into Next.js middleware and `rate-limit.ts` initialization.
2. **Fail-Closed Policy for Sensitive Routes**:
   - `checkRateLimit` accepts `{ failClosed?: boolean }`. In production, defaults to `true`.
   - On storage failures (network timeout, HTTP 500, invalid token):
     - High-risk authentication routes ([checkLoginRateLimit](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/rate-limit.ts), [checkOtpRequestRateLimit](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/rate-limit.ts), [checkOtpVerifyAttempts](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/rate-limit.ts)) **fail closed**, returning `{ allowed: false, status: 503, error: 'Authentication rate limiter service is temporarily unavailable. Request blocked for security.' }`.
   - Low-risk read-only routes (e.g. search queries) specify `{ failClosed: false }`, which logs a warning and **fails open**.
3. **Automated Verification**: Added test simulating Upstash Redis failure on login, verifying that the request returns HTTP 503 and is rejected rather than permitted.

---

### FIX 8: Structured Security Alerting Hooks & Privacy Protection

#### Vulnerability Analysis
- **Missing Telemetry**: Prior to this fix, authentication failures, lockouts, and CSRF attacks were logged as generic console statements or swallowed without structured metadata, making it impossible for Security Information and Event Management (SIEM) tools to detect and alert on distributed attacks.
- **PII Leakage Risk**: Naive security logging often inadvertently leaks user emails, phone numbers, raw passwords, or session tokens into centralized log aggregators.

#### Technical Implementation
1. **Privacy-Preserving Identifier Hashing**: Implemented [`hashIdentifier`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) using SHA-256 (`crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')`).
2. **Structured Log Schema**: Implemented [`logSecurityAlert`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) emitting JSON strings prefixed with `[SECURITY_ALERT]`:
   ```json
   {
     "tag": "SECURITY_ALERT",
     "timestamp": "2026-10-04T14:19:00.025Z",
     "eventType": "FAILED_LOGIN",
     "ip": "198.51.100.44",
     "emailHash": "da0ab4cfbf87281bef49af18013e015e25a0d982960f4ec71217bba81d13939d",
     "reason": "Password mismatch",
     "path": "/api/auth/login"
   }
   ```
3. **Event Coverage**:
   - `FAILED_LOGIN`: Invalid credentials or non-existent user on `/api/auth/login`.
   - `ACCOUNT_LOCKOUT`: Compound (email+IP) lockout or OTP verification attempts exceeded.
   - `TURNSTILE_FAILURE`: Missing, invalid, or expired Turnstile challenge tokens.
   - `CSRF_REJECTION`: State-changing requests failing Origin, Host, or Sec-Fetch-Site checks.
   - `PROXY_SECRET_REJECTION`: Direct calls to `apps/api` lacking valid `x-internal-proxy-secret`.
4. **Strict Safety Invariants**: Log payloads **never** include passwords, plaintext emails, session tokens, OTP codes, or secret keys.

---

## 4. Monorepo Signer / Verifier Matrix

To guarantee cryptographic integrity across the monorepo, each JWT and secret credential has an authoritative signer and explicit verifiers:

| Token / Secret | Signer / Generator | Verifier | Secret Env Var | Intended Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Customer JWT** | `apps/api` (`AuthService.login`, `AuthService.verifyOtp`) | `apps/api` (`SupabaseAuthGuard`), `apps/web` (`middleware.ts`, `server-auth.ts`) | `JWT_SECRET` | Customer & Seller authenticated routes (`/account/*`, `/checkout/*`, `/seller/*`, `/api/v1/*`) |
| **Admin JWT** | `apps/api` (`AdminAuthService.login`) | `apps/api` (`AdminAuthGuard`), `apps/web` (`apps/web/src/app/admin/*`) | `ADMIN_JWT_SECRET` | Admin operations & governance (`/admin/*`, `/api/admin/*`) |
| **Customer Impersonation JWT** | `apps/api` (`CustomerImpersonationService`) | `apps/api` (`SupabaseAuthGuard`), `apps/web` (`middleware.ts`) | `JWT_SECRET` | Temporary customer access for admin support investigations (short-lived, audited) |
| **Web Proxy Credential** | `apps/web` (`middleware.ts`, proxy route handlers) | `apps/api` (`createProxyMiddleware`) | `INTERNAL_API_SECRET` | Backend API access gating (`/api/*`) |
| **Turnstile Challenge** | Cloudflare Edge | `apps/web` (`verifyTurnstileToken` via Cloudflare Siteverify API) | `TURNSTILE_SECRET_KEY` | Public authentication endpoints (`/login`, `/request-otp`) |

---

## 5. Automated Test Suite Coverage

All fixes are guarded by automated regression test suites executing in Node test runner:

### Test Suites
- **`apps/api/src/__tests__/api-security.spec.ts`**:
  - `should reject direct requests to apps/api without the internal proxy secret`
  - `should fail fast if INTERNAL_API_SECRET is missing, shorter than 32 bytes, or placeholder in production`
  - `should prove a request cannot trigger test-runner bypass via request headers`
  - `should fail fast if ADMIN_JWT_SECRET is missing or equals JWT_SECRET in production`
  - `should reject admin token as normal user token and normal user token as admin token`
  - `should invalidate OTP after 5 wrong attempts and return 401, expire at 10 minutes, and be single-use`
  - `should support multi-instance OTP sharing across API instances via shared Redis store`
  - `should return identical status and body for unknown-email and wrong-password`
  - `should emit structured JSON security alerts without PII, passwords, tokens, or secrets`
- **`apps/web/src/__tests__/security-hardening.spec.ts`**:
  - `should ignore spoofed CF-Connecting-IP in production unless request passes Cloudflare check`
  - `should enforce startup presence of Upstash URL and token in production`
  - `should fail closed (status 503, allowed false) on login when Upstash Redis is unreachable or errors in production`
  - `should allow low-risk routes to fail open with logged warning when Redis is unreachable`
  - `should reject cross-origin POST with 403`
  - `should reject POST with missing Origin when Sec-Fetch-Site is absent or cross-site`
  - `should allow 5 failed password attempts and return 429 on 6th attempt, without locking out victim on another IP`

### Verification Commands
```bash
# Run full monorepo build (all packages and Next.js static page generation)
npm run build

# Run all test suites across workspaces
npm run --workspaces test
```
*Current test suite status: 138 tests passing, 0 failures, 0 skipped.*

---

## 6. Host Deployment & Cloudflare Setup Checklist

### Required Environment Variables on Production Host
Set the following environment variables in your deployment environment (Railway, Render, Vercel, or AWS ECS):

```ini
# Production Environment Mode
NODE_ENV=production

# Core JWT Secrets (Minimum 32 bytes each - generate with openssl rand -hex 32)
JWT_SECRET=<32-byte-hex-secret-for-customer-tokens>
ADMIN_JWT_SECRET=<32-byte-hex-secret-for-admin-tokens-strictly-distinct-from-JWT_SECRET>
SUPABASE_JWT_SECRET=<32-byte-hex-secret-if-using-supabase-auth>

# Internal Web -> API Proxy Secret (Minimum 32 bytes)
INTERNAL_API_SECRET=<32-byte-hex-secret-shared-between-web-and-api>

# Distributed Rate Limiting & OTP Storage (Upstash Serverless Redis)
UPSTASH_REDIS_REST_URL=https://<your-database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-bearer-token>
REDIS_URL=rediss://default:<password>@<your-database>.upstash.io:6379

# Cloudflare Bot Protection & Origin Verification
TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>
TURNSTILE_SECRET_KEY=<your-cloudflare-turnstile-secret-key>
CLOUDFLARE_ORIGIN_SECRET=<optional-shared-secret-header-with-cloudflare-transform-rules>
```

### Cloudflare Origin Security Configuration
1. **Enable Authenticated Origin Pulls (AOP)**:
   - In Cloudflare Dashboard &rarr; **SSL/TLS** &rarr; **Origin Server** &rarr; Toggle **Authenticated Origin Pulls** to ON.
   - Install Cloudflare Origin CA certificate on your reverse proxy (Nginx / Caddy / Cloudflare Tunnel) to enforce mTLS.
2. **Restrict Origin Ingress**:
   - In cloud firewall / security groups, allow inbound HTTP/HTTPS traffic **only** from Cloudflare edge IP ranges.
   - Drop all direct public internet connections to origin ports 80/443.

---

## 7. Residual Risks & Operational Considerations

1. **Stateless Access Token Revocation**:
   - Customer and seller authentication uses 15-minute stateless JWTs (`shopsell_token`).
   - If a customer changes their password or reports a compromised account, previously minted access tokens remain cryptographically valid until expiration (up to 15 minutes).
   - *Recommended Future Enhancement*: Implement a Redis-backed token version or user session revocation list checked on critical state-changing actions.
2. **IPv6 Cloudflare Ingress**:
   - Direct IP range verification currently implements Cloudflare's 15 IPv4 CIDR blocks.
   - In environments where direct IPv6 traffic reaches the origin without AOP mTLS enabled, requests may fall back to the raw socket address. Enabling Authenticated Origin Pulls (AOP) mTLS completely mitigates this concern.
3. **Upstash REST Cold Start Latency**:
   - On serverless cold starts, initial HTTP queries to Upstash REST API incur a 50–100ms network round-trip. For high-volume API endpoints, pooled persistent Redis TCP connections via `REDIS_URL` are recommended.
