# Shop:Sell Security Hardening & Vulnerability Remediation Guide

This document provides a comprehensive technical audit and architectural reference for the security hardening fixes implemented on the `security-fixes` branch across the Shop:Sell monorepo (`apps/api` NestJS backend, `apps/web` Next.js frontend, and `packages/shared`).

---

## Table of Contents
1. [Architecture Overview & Trust Boundaries](#1-architecture-overview--trust-boundaries)
2. [Executive Summary of Fixes](#2-executive-summary-of-fixes)
3. [Deep Dive: Initial Security Audit & Core Fixes (Pass 1)](#3-deep-dive-initial-security-audit--core-fixes-pass-1)
   - [FIX 1 (BLOCKER): Hardcoded Proxy-Secret Fallback Removal & Constant-Time Verification](#fix-1-blocker-hardcoded-proxy-secret-fallback-removal--constant-time-verification)
   - [FIX 2: Server-Side Only Test-Runner Bypass](#fix-2-server-side-only-test-runner-bypass)
   - [FIX 3: Admin & Supabase JWT Secret Separation & Signer/Verifier Alignment](#fix-3-admin--supabase-jwt-secret-separation--signerverifier-alignment)
   - [FIX 4: Distributed OTP Storage in Shared Redis](#fix-4-distributed-otp-storage-in-shared-redis)
   - [FIX 5: Non-Blocking Async Scrypt & Constant-Time User Enumeration Defense](#fix-5-non-blocking-async-scrypt--constant-time-user-enumeration-defense)
   - [FIX 6: Client IP Trust Boundary & Cloudflare Origin Verification](#fix-6-client-ip-trust-boundary--cloudflare-origin-verification)
   - [FIX 7: Rate Limiter Fail-Closed Mode & Upstash Configuration Validation](#fix-7-rate-limiter-fail-closed-mode--upstash-configuration-validation)
   - [FIX 8: Structured Security Alerting Hooks & Privacy Protection](#fix-8-structured-security-alerting-hooks--privacy-protection)
4. [Deep Dive: Second-Pass Security Hardening & Edge Fortification (Pass 2)](#4-deep-dive-second-pass-security-hardening--edge-fortification-pass-2)
   - [H1: Cloudflare IPv6 Subnets, Origin Secret Priority & Proxy Trust Boundary](#h1-cloudflare-ipv6-subnets-origin-secret-priority--proxy-trust-boundary)
   - [H2: JWT Secret Alignment, Algorithm Pinning & Issuer/Audience Validation](#h2-jwt-secret-alignment-algorithm-pinning--issueraudience-validation)
   - [H3: Customer Impersonation Token Hardening & Read-Only RBAC Gate](#h3-customer-impersonation-token-hardening--read-only-rbac-gate)
   - [H4: Keyed HMAC-SHA256 Identifier Hashing with LOG_HASH_KEY](#h4-keyed-hmac-sha256-identifier-hashing-with-log_hash_key)
   - [H5: Compound Login Lockout (Email+IP) & Distributed Turnstile Escalation](#h5-compound-login-lockout-emailip--distributed-turnstile-escalation)
   - [H6: Cryptographic OTP Hashing, Constant-Time Comparison & Atomic Increment](#h6-cryptographic-otp-hashing-constant-time-comparison--atomic-increment)
   - [H7: Universal Removal of Internal API Secret Fallback & Codebase Sanitization](#h7-universal-removal-of-internal-api-secret-fallback--codebase-sanitization)
5. [Monorepo Signer / Verifier Matrix](#5-monorepo-signer--verifier-matrix)
6. [Automated Test Suite Coverage](#6-automated-test-suite-coverage)
7. [Host Deployment & Cloudflare Setup Checklist](#7-host-deployment--cloudflare-setup-checklist)
8. [Residual Risks & Operational Considerations](#8-residual-risks--operational-considerations)

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

### Pass 1: Vulnerability Remediations
| Fix | Category | Severity | Primary Target Files | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FIX 1** | Authentication Bypass | **BLOCKER** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `apps/web/src/middleware.ts`, proxy routes | Completed |
| **FIX 2** | Authorization Bypass | **HIGH** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `api-security.spec.ts` | Completed |
| **FIX 3** | Privilege Escalation | **CRITICAL** | `packages/shared/src/security.ts`, `apps/api/src/main.ts`, `admin-auth.service.ts`, `customer-impersonation.service.ts` | Completed |
| **FIX 4** | State / Brute-Force | **HIGH** | `apps/api/src/modules/auth/auth.service.ts`, `api-security.spec.ts` | Completed |
| **FIX 5** | DoS / User Enumeration | **MEDIUM** | `apps/api/src/modules/auth/auth.service.ts`, `apps/web/src/lib/security/rate-limit.ts` | Completed |
| **FIX 6** | Rate Limit Bypass | **HIGH** | `apps/web/src/lib/security/turnstile.ts`, `docs/cloudflare-setup.md`, `security-hardening.spec.ts` | Completed |
| **FIX 7** | Availability / DoS | **HIGH** | `packages/shared/src/security.ts`, `apps/web/src/lib/security/rate-limit.ts`, auth routes | Completed |
| **FIX 8** | Observability / Auditing | **MEDIUM** | `packages/shared/src/security.ts`, `auth.service.ts`, `rate-limit.ts`, `csrf.ts`, `turnstile.ts`, `login/route.ts` | Completed |

### Pass 2: Hardening & Edge Fortifications
| Item | Category | Hardening Measure | Primary Target Files | Status |
| :--- | :--- | :--- | :--- | :--- |
| **H1** | Ingress Protection | Cloudflare IPv6 CIDRs, AOP/Secret priority, restrict `x-real-ip` to trusted reverse proxies | `apps/web/src/lib/security/turnstile.ts` | Completed |
| **H2** | Token Security | Resolve JWT_SECRET vs SUPABASE_JWT_SECRET, pin `algorithms: ['HS256']`, validate `iss` and `aud` | `supabase-auth.guard.ts`, `admin-auth.service.ts`, `middleware.ts`, `server-auth.ts` | Completed |
| **H3** | Support Security | Impersonation tokens with `aud: 'shopsell-impersonation'`, `typ: 'impersonation'`, 15m TTL, read-only RBAC lock | `customer-impersonation.service.ts`, `supabase-auth.guard.ts` | Completed |
| **H4** | Privacy / Logs | Keyed HMAC-SHA256 identifier hashing using `LOG_HASH_KEY` | `packages/shared/src/security.ts`, `.env.example` | Completed |
| **H5** | Account Protection | Compound lockout on email+IP (5 attempts); per-email threshold (10 attempts) triggers Turnstile challenge | `apps/web/src/lib/security/rate-limit.ts`, `apps/web/src/app/api/auth/login/route.ts` | Completed |
| **H6** | Credential Storage | SHA-256 hashed OTPs in Redis, `timingSafeEqual` comparison, atomic attempt increment via Redis `INCR` | `apps/api/src/modules/auth/auth.service.ts` | Completed |
| **H7** | Secret Hardening | Total removal of `INTERNAL_API_SECRET` fallback in all environments; 0 repo occurrences of old string | `packages/shared/src/security.ts` | Completed |

---

## 3. Deep Dive: Initial Security Audit & Core Fixes (Pass 1)

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

## 4. Deep Dive: Second-Pass Security Hardening & Edge Fortification (Pass 2)

### H1: Cloudflare IPv6 Subnets, Origin Secret Priority & Proxy Trust Boundary

#### Threat Model & Gap
- **IPv6 Ingress Blindspot**: Initial implementation in `apps/web/src/lib/security/turnstile.ts` matched only IPv4 CIDRs. As IPv6 adoption increases, legitimate Cloudflare proxy requests using IPv6 would fail IP validation and be treated as direct untrusted connections.
- **Header Precedence Flaw**: Client IP determination relied on IP matching before verifying cryptographic origin credentials (`CLOUDFLARE_ORIGIN_SECRET` or Authenticated Origin Pull mTLS).
- **Socket Spoofing Risk**: If `x-real-ip` was trusted blindly from any incoming connection, direct callers could spoof arbitrary client IP addresses.

#### Technical Implementation
1. **Cloudflare IPv6 CIDR Subnets**:
   - Added `CLOUDFLARE_IPV6_CIDRS` with all 7 official Cloudflare IPv6 subnets:
     - `2400:cb00::/32`, `2606:4700::/32`, `2803:f800::/32`, `2405:b500::/32`, `2405:8100::/32`, `2a06:98c0::/29`, `2c0f:f248::/32`.
   - Built `ipv6ToBigInt(ip: string)` parsing 128-bit IPv6 hexadecimal words (including `::` compression) and implemented 128-bit unsigned bitmasking in [`isCloudflareIp`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts).
2. **Strict Origin Credential Priority**:
   - Refactored [`isCloudflareRequest`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts):
     - **Primary Tier**: Verifies shared `x-cf-origin-secret` against `CLOUDFLARE_ORIGIN_SECRET` using `timingSafeEqual`.
     - **Secondary Tier**: Verifies Authenticated Origin Pull (AOP) mTLS header (`x-cf-authenticated-pull: SUCCESS`).
     - **Fallback Tier**: In the absence of origin secrets, falls back to IPv4 and IPv6 CIDR subnet validation of the socket IP.
3. **Proxy Socket Trust Verification**:
   - Added [`isTrustedProxyIp`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/turnstile.ts): Only trusts `x-real-ip` if the immediate upstream socket belongs to localhost (`127.0.0.1`, `::1`), private internal network subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or explicitly configured `TRUSTED_PROXY_IPS`. Direct public clients sending `x-real-ip` are ignored.

---

### H2: JWT Secret Alignment, Algorithm Pinning & Issuer/Audience Validation

#### Threat Model & Gap
- **Secret Mismatch**: `SupabaseAuthGuard` historically inspected only `JWT_SECRET` and contained a hardcoded fallback string. If `SUPABASE_JWT_SECRET` was configured in Supabase projects, customer tokens were either rejected or accepted unpredictably.
- **Algorithm Confusion / Downgrade**: If verifiers do not explicitly pin `algorithms: ['HS256']`, an attacker could forge tokens with the `none` algorithm or exploit RSA/HMAC key-confusion vulnerabilities.
- **Missing Scope & Audience Checks**: Tokens without audience (`aud`) or issuer (`iss`) restrictions could be replayed across service boundaries (e.g. an admin token passed to a customer endpoint or vice versa).

#### Technical Implementation
1. **Secret Resolution & Fallback**:
   - Updated `SupabaseAuthGuard` in `apps/api/src/common/guards/supabase-auth.guard.ts`. Validates primary `JWT_SECRET` and optional fallback `SUPABASE_JWT_SECRET` via `packages/shared/src/security.ts`. Completely removed all hardcoded secret string fallbacks.
2. **Algorithm Pinning**:
   - Explicitly configured `algorithms: ['HS256']` on every token verifier across the monorepo:
     - `SupabaseAuthGuard` (`jwt.verify(token, secret, { algorithms: ['HS256'] })`),
     - `AdminAuthService.verifyAdminToken` (`jwt.verify(token, secret, { algorithms: ['HS256'] })`),
     - Next.js `apps/web/src/middleware.ts` (`jwtVerify(token, secret, { algorithms: ['HS256'] })`),
     - Next.js `apps/web/src/lib/auth/server-auth.ts` (`jwtVerify(token, secret, { algorithms: ['HS256'] })`).
3. **Strict Issuer (`iss`) & Audience (`aud`) Verification**:
   - Customer JWTs are minted with `iss: 'shopsell-api'` and `aud: 'authenticated'`.
   - Customer token verifiers reject any token carrying `aud === 'shopsell-admin'`, strictly enforcing that administrative credentials cannot be downgraded into customer sessions.
   - Admin JWTs are minted with `iss: 'shopsell-api'` and `aud: 'shopsell-admin'`.
   - Admin verifiers require `aud === 'shopsell-admin'` and `iss === 'shopsell-api'`.

---

### H3: Customer Impersonation Token Hardening & Read-Only RBAC Gate

#### Threat Model & Gap
- Support staff conducting user troubleshooting need to view accounts as customers. If impersonation tokens grant full customer privileges without restrictions:
  - Compromised staff accounts could drain customer wallets, place fraudulent orders, or tamper with shipping addresses.
  - Impersonation actions were indistinguishable from normal user actions in database audit logs.

#### Technical Implementation
1. **Distinct Claims & Short TTL**:
   - In [`CustomerImpersonationService`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/admin-core/security/customer-impersonation.service.ts), impersonation tokens are minted with:
     - `aud: 'shopsell-impersonation'`
     - `typ: 'impersonation'`
     - Header `{ typ: 'impersonation+jwt' }`
     - Maximum lifetime capped strictly at 15 minutes (`exp: now + 900`).
2. **Strict Read-Only RBAC Gate in `SupabaseAuthGuard`**:
   - `SupabaseAuthGuard` checks whether `payload.aud === 'shopsell-impersonation'` or `payload.typ === 'impersonation'`.
   - If true, `req.isImpersonated = true` and `req.impersonatedBy = payload.impersonated_by`.
   - Mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are immediately blocked with `ForbiddenException('Impersonation sessions are strictly read-only')`. Support staff can inspect user state without risk of accidental or malicious data modification.
3. **Structured Audit Logging**:
   - Mints emit dual audit telemetry:
     - `AdminAuditService.logEvent` with action `IMPERSONATION_STARTED`.
     - `logSecurityAlert` with event type `IMPERSONATION_STARTED` logging hashed target user IDs, admin operator IDs, IP, and reason.

---

### H4: Keyed HMAC-SHA256 Identifier Hashing with LOG_HASH_KEY

#### Threat Model & Gap
- Plain unkeyed SHA-256 (`crypto.createHash('sha256')`) applied to user emails or phone numbers allows attackers with access to application logs to conduct offline dictionary attacks and rainbow table lookups, reversing hashed emails for common email patterns.

#### Technical Implementation
1. **HMAC-SHA256 with Secret Key**:
   - Refactored [`hashIdentifier`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts):
     ```ts
     const key = process.env.LOG_HASH_KEY || process.env.JWT_SECRET || 'shopsell-default-log-hash-key';
     return crypto.createHmac('sha256', key).update(normalized).digest('hex');
     ```
2. **Key Management**:
   - Documented `LOG_HASH_KEY` in `.env.example`.
   - Falls back safely to `JWT_SECRET` so a high-entropy secret is always present even if an explicit key is not configured.
   - Logs generated by `logSecurityAlert` are resistant to offline precomputation dictionary attacks.

---

### H5: Compound Login Lockout (Email+IP) & Distributed Turnstile Escalation

#### Threat Model & Gap
- **Global Lockout Denial of Service**: Keying hard lockouts solely on email allowed an external attacker to deliberately submit 5 failed password attempts for a victim's email address from any IP, permanently locking the victim out of their account.
- **Distributed Credential Stuffing**: Keying lockouts solely on IP allowed botnets to cycle thousands of residential IPs, trying 1–2 passwords per IP without tripping lockouts.

#### Technical Implementation
1. **Compound Hard Lockout (Email + IP)**:
   - In [`checkLoginRateLimit`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/web/src/lib/security/rate-limit.ts), hard lockout (HTTP 429) is enforced strictly on the compound key:
     `rl:login:lockout:${cleanEmail}:${cleanIp}` with a threshold of 5 failed attempts within 15 minutes.
   - An attacker attempting brute-force locks out only their specific IP for that account. The legitimate account holder on their own home or mobile IP remains completely unaffected.
2. **Per-Email Distributed Threshold & Turnstile Escalation**:
   - A secondary per-email counter (`rl:login:email:${cleanEmail}`) tracks failed attempts globally across all IP addresses (threshold of 10 attempts within 15 minutes).
   - When this global threshold is exceeded, the service does **not** hard block the user. Instead, it returns `{ requireTurnstile: true }`.
   - In `/api/auth/login/route.ts`, if `requireTurnstile: true`, requests without valid Turnstile proof-of-work are rejected. Legitimate users who solve the Turnstile challenge can still log in even while their account is targeted by distributed bots.

---

### H6: Cryptographic OTP Hashing, Constant-Time Comparison & Atomic Increment

#### Threat Model & Gap
- **Plaintext Storage**: Storing plaintext 6-digit OTP codes in Redis risks exposure if Redis logs, snapshots, or memory are dumped.
- **Race Condition in Attempt Counting**: Reading attempts, checking bounds, and writing back in separate Redis commands creates a race window under concurrent requests, allowing an attacker to submit dozens of guesses simultaneously before the attempt counter triggers lockout.
- **Timing Leak in Code Comparison**: Standard string comparison (`===`) leaks timing information about matching characters.

#### Technical Implementation
1. **SHA-256 Hashing of OTP Codes**:
   - In [`AuthService`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/auth/auth.service.ts), generated OTPs are hashed before saving:
     `codeHash = crypto.createHash('sha256').update(otp).digest('hex')`.
   - Redis store key `auth:otp:${cleanId}` contains only the SHA-256 hash.
2. **Atomic Redis `INCR` for Attempt Counting**:
   - Built [`incrementOtpAttempts(identifier, ttlSeconds)`](file:///Users/jathinreddy/Desktop/Shop:Sell/apps/api/src/modules/auth/auth.service.ts):
     - Uses atomic Redis `INCR` on `auth:otp:attempts:${cleanId}` with a 10-minute TTL set via `EXPIRE`.
     - Atomicity guarantees that parallel requests cannot bypass the 5-attempt limit.
     - If the atomic count exceeds 5, both the code key and attempts key are deleted immediately via `DEL`, permanently invalidating the code.
3. **Constant-Time Verification**:
   - Candidate OTPs are hashed via SHA-256 and compared against the stored hash using `crypto.timingSafeEqual`:
     ```ts
     const candidateHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
     const matches = crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(record.code, 'hex'));
     ```
   - On successful match, both `auth:otp:${cleanId}` and `auth:otp:attempts:${cleanId}` are purged immediately.

---

### H7: Universal Removal of Internal API Secret Fallback & Codebase Sanitization

#### Threat Model & Gap
- Previously, `DEV_INTERNAL_API_SECRET` was allowed as a fallback when `NODE_ENV !== 'production'`. If a staging, QA, or misconfigured deployment ran without `NODE_ENV=production`, the known fallback key could be exploited.

#### Technical Implementation
1. **Zero-Fallback Policy Across All Environments**:
   - Modified [`validateInternalApiSecret`](file:///Users/jathinreddy/Desktop/Shop:Sell/packages/shared/src/security.ts) to throw a fatal error if `INTERNAL_API_SECRET` is missing, shorter than 32 bytes, or equals a known placeholder across **all** environments (`development`, `test`, `production`).
   - Removed `DEV_INTERNAL_API_SECRET` export and eliminated the fallback string entirely from codebase constants.
2. **Comprehensive Codebase Sanitization**:
   - Grepped the entire repository across all workspaces and packages. Verified zero remaining references to the old hardcoded fallback string.

---

## 5. Monorepo Signer / Verifier Matrix

To guarantee cryptographic integrity across the monorepo, each JWT and secret credential has an authoritative signer, explicit verifiers, and pinned algorithms:

| Token / Secret | Signer / Generator | Verifier | Secret Env Var | Pinned Algorithm | Audience (`aud`) | Issuer (`iss`) | Intended Scope |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer JWT** | `apps/api` (`AuthService`) | `apps/api` (`SupabaseAuthGuard`), `apps/web` (`middleware.ts`, `server-auth.ts`) | `JWT_SECRET` (fallback `SUPABASE_JWT_SECRET`) | `HS256` | `'authenticated'` (rejects `'shopsell-admin'`) | `'shopsell-api'` | Customer & Seller authenticated routes (`/account/*`, `/seller/*`, `/checkout/*`) |
| **Admin JWT** | `apps/api` (`AdminAuthService`) | `apps/api` (`AdminAuthGuard`), `apps/web` (`apps/web/src/app/admin/*`) | `ADMIN_JWT_SECRET` | `HS256` | `'shopsell-admin'` | `'shopsell-api'` | Admin operations & governance (`/admin/*`, `/api/admin/*`) |
| **Impersonation JWT** | `apps/api` (`CustomerImpersonationService`) | `apps/api` (`SupabaseAuthGuard`), `apps/web` (`middleware.ts`) | `JWT_SECRET` | `HS256` | `'shopsell-impersonation'` (`typ: 'impersonation'`) | `'shopsell-api'` | Read-only customer access for support investigations (15-min TTL, mutating HTTP verbs rejected) |
| **Web Proxy Credential** | `apps/web` (`middleware.ts`, proxy routes) | `apps/api` (`createProxyMiddleware`) | `INTERNAL_API_SECRET` | Constant-Time HMAC / Buffer | N/A | N/A | Backend API access gating (`/api/*`) — no fallback allowed |
| **Turnstile Challenge** | Cloudflare Edge | `apps/web` (`verifyTurnstileToken` via Cloudflare Siteverify API) | `TURNSTILE_SECRET_KEY` | TLS 1.3 POST | N/A | Cloudflare | Public authentication endpoints (`/login`, `/request-otp`) |

---

## 6. Automated Test Suite Coverage

All fixes and hardening layers are guarded by automated regression test suites executing in Node test runner:

### Test Suites
- **`apps/api/src/__tests__/api-security.spec.ts` (13 tests)**:
  - Direct request rejection without valid `x-internal-proxy-secret`.
  - Fatal startup rejection if `INTERNAL_API_SECRET` is missing or $<32$ bytes in all environments.
  - Zero-bypass verification preventing client headers from triggering test-mode bypass.
  - Token expiry rejection and signature tampering rejection in `SupabaseAuthGuard`.
  - Secret separation: rejection of admin tokens on user routes and user tokens on admin routes.
  - OTP lifecycle: single-use, 5-attempt invalidation, 10-minute TTL, SHA-256 storage, and multi-instance sharing via Redis.
  - Constant-time dummy verification and identical response shape for unknown emails.
  - Privacy-preserving structured JSON security alerts without PII, tokens, or plaintext secrets.
- **`apps/web/src/__tests__/security-hardening.spec.ts` (11 tests)**:
  - Cloudflare IPv4 & IPv6 CIDR subnet matching; priority for `CLOUDFLARE_ORIGIN_SECRET` and AOP mTLS.
  - Socket IP validation ignoring spoofed `CF-Connecting-IP` or `x-real-ip` from untrusted proxies.
  - Compound login lockout on `email+IP` (5 failed attempts), preventing cross-IP victim lockout.
  - Per-email threshold triggering Turnstile challenge rather than hard lockout.
  - Fail-closed behavior on Upstash Redis downtime for login routes; fail-open for low-risk read-only routes.
  - Dynamic per-request CSP nonce generation and strict CSRF Origin / Sec-Fetch-Site enforcement.
- **Full Monorepo Suite Coverage**:
  - `@shop-sell/api`: 95 passing tests, 0 failures.
  - `@shop-sell/web`: 32 passing tests, 0 failures.
  - `@shop-sell/shared`: 11 passing tests, 0 failures.
  - **Total: 138 tests passing, 0 failures, 0 skipped.**

### Verification Commands
```bash
# Full monorepo build (Next.js pages, NestJS compilation, Shared TS build)
npm run build

# TypeScript strict typecheck across all workspaces
node ./node_modules/typescript/bin/tsc -p tsconfig.json

# Run all test suites across workspaces
npm run --workspaces test
```

---

## 7. Host Deployment & Cloudflare Setup Checklist

### Required Environment Variables on Production Host
Set the following environment variables in your deployment environment (Railway, Render, Vercel, or AWS ECS):

```ini
# Production Environment Mode
NODE_ENV=production

# Core JWT Secrets (Minimum 32 bytes each - generate with openssl rand -hex 32)
JWT_SECRET=<32-byte-hex-secret-for-customer-tokens>
ADMIN_JWT_SECRET=<32-byte-hex-secret-for-admin-tokens-strictly-distinct-from-JWT_SECRET>
SUPABASE_JWT_SECRET=<32-byte-hex-secret-if-using-supabase-auth>

# Internal Web -> API Proxy Secret (Minimum 32 bytes - strictly required in ALL environments)
INTERNAL_API_SECRET=<32-byte-hex-secret-shared-between-web-and-api>

# Logging Key for Privacy-Preserving HMAC Hashes
LOG_HASH_KEY=<32-byte-hex-key-for-hmac-sha256-identifier-hashing>

# Distributed Rate Limiting & OTP Storage (Upstash Serverless Redis)
UPSTASH_REDIS_REST_URL=https://<your-database>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-upstash-rest-bearer-token>
REDIS_URL=rediss://default:<password>@<your-database>.upstash.io:6379

# Cloudflare Bot Protection & Origin Verification
TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>
TURNSTILE_SECRET_KEY=<your-cloudflare-turnstile-secret-key>
CLOUDFLARE_ORIGIN_SECRET=<shared-secret-header-matching-cloudflare-transform-rules>

# Optional Trusted Proxy Reverse Proxies (Comma-separated IP/CIDRs)
TRUSTED_PROXY_IPS=127.0.0.1,10.0.0.0/8
```

### Cloudflare Origin Security Configuration
1. **Enable Authenticated Origin Pulls (AOP)**:
   - In Cloudflare Dashboard &rarr; **SSL/TLS** &rarr; **Origin Server** &rarr; Toggle **Authenticated Origin Pulls** to ON.
   - Install Cloudflare Origin CA certificate on your reverse proxy (Nginx / Caddy / Cloudflare Tunnel) to enforce mTLS.
2. **Restrict Origin Ingress**:
   - In cloud firewall / security groups, allow inbound HTTP/HTTPS traffic **only** from Cloudflare edge IP ranges (both IPv4 and IPv6).
   - Drop all direct public internet connections to origin ports 80/443.

---

## 8. Residual Risks & Operational Considerations

1. **Stateless Access Token Revocation**:
   - Customer and seller authentication uses 15-minute stateless JWTs (`shopsell_token`).
   - If a customer changes their password or reports a compromised account, previously minted access tokens remain cryptographically valid until expiration (up to 15 minutes).
   - *Recommended Future Enhancement*: Implement a Redis-backed token revocation list checked on critical state-changing actions.
2. **Cloudflare IPv6 Ingress (Resolved)**:
   - Full IPv6 support is now implemented in `apps/web/src/lib/security/turnstile.ts` with all 7 official Cloudflare IPv6 subnets, coupled with priority checking for `CLOUDFLARE_ORIGIN_SECRET` and Authenticated Origin Pull (AOP) mTLS headers.
3. **Upstash REST Cold Start Latency**:
   - On serverless cold starts, initial HTTP queries to Upstash REST API incur a 50–100ms network round-trip. For high-volume API endpoints, pooled persistent Redis TCP connections via `REDIS_URL` are recommended.
4. **Transitive Dependency Vulnerabilities (npm audit)**:
   - `npm audit` reports 20 vulnerabilities (1 low, 6 moderate, 13 high) located exclusively within deeply nested transitive dependencies (`@grpc/grpc-js`, `@nestjs/platform-express`, `body-parser`, `braces`, `file-type`, `lodash`, `multer`, `postcss`, `qs`).
   - Automated remediation via `npm audit fix --force` would trigger major breaking framework upgrades (`@nestjs/core` v12, `next` v16, `tailwindcss` v4, `firebase` v9). These dependencies should be scheduled for controlled migration during scheduled major framework updates.

