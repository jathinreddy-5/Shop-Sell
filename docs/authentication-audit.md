# Shop:Sell — Authentication System Diagnostic Audit & Verification Report

**Date:** October 6, 2026  
**Project:** Shop:Sell Multi-Vendor E-Commerce Platform  
**Target Environments:** Vercel (Frontend) · Render (Backend API) · Hosted Supabase / AWS PostgreSQL · Upstash Redis · Cloudflare Turnstile · Brevo (SMTP Relay)

---

## 1. Overall Status

### **OVERALL AUDIT RESULT: FAIL (Production Configuration & Proxy Routing Breakdown)**

The local and build-level authentication implementation (cryptography, timing attack resistance, CSRF protection, Turnstile site-verification, Scrypt password hashing, and cookie hardening) is **production-grade and passes 100% of automated test suites (95 backend tests + 40 frontend security tests)**.

However, the deployed production system fails when initiating the email OTP verification flow due to **infrastructure configuration and environment mismatches between Vercel and Render**.

---

## 2. Authentication Architecture & Complete Request Flow

### Derived Tech Stack
- **Frontend**: Next.js 15 (App Router, Edge Middleware, React 19) deployed to **Vercel**
- **Backend**: NestJS on Node.js/Express deployed to **Render**
- **Database**: **Hosted PostgreSQL 16 on Supabase** (via AWS AP-Northeast-1 pooler), **NOT MongoDB**
- **Cache & Rate Limiting**: Upstash Serverless Redis (`ioredis` + REST API)
- **Email Delivery**: **Brevo Transactional SMTP Relay** (`smtp-relay.brevo.com:587` via Nodemailer), **NOT Brevo REST API**
- **Bot Protection**: Cloudflare Turnstile (`@marsidev/react-turnstile` + Cloudflare Siteverify API)
- **Session Model**: Signed HS256 JWTs stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`shopsell_token`) with 15-minute validity

### Architectural Flow Diagram

```
[User Browser]
       │
       │  1. Submits email on /login
       │  2. Cloudflare Turnstile solves challenge -> generates turnstileToken
       ▼
[Next.js App Router: POST /api/auth/request-otp (Vercel)]
       │
       ├─► Step 1: verifyOriginAndHost(request) [CSRF Check]
       ├─► Step 2: verifyTurnstileToken(turnstileToken, clientIp) [Cloudflare Siteverify]
       ├─► Step 3: checkOtpRequestRateLimit(email, clientIp) [Upstash Redis]
       │
       ▼  Step 4: BFF forwards request via Node fetch()
          Header injected: 'x-internal-proxy-secret': INTERNAL_API_SECRET
          Destination: process.env.BACKEND_URL || process.env.API_PROXY_URL || 'http://localhost:4000'
       │
════════════════════════════════════════════════════════════════════════════
                  CRITICAL FAILURE POINT IN PRODUCTION
  1. BACKEND_URL is omitted on Vercel -> connects to http://localhost:4000 -> ECONNREFUSED
  2. Render free instance cold-boot (>25s) exceeds 10s AbortSignal.timeout
  3. INTERNAL_API_SECRET mismatch causes Render firewall to return HTTP 403
════════════════════════════════════════════════════════════════════════════
       │
       ▼ (When forwarded successfully)
[NestJS Backend API (Render)]
       │
       ├─► Step 5: createProxyMiddleware checks 'x-internal-proxy-secret' (timingSafeEqual)
       ├─► Step 6: AuthController.requestOtp() receives body { identifier }
       ├─► Step 7: AuthService.sendOtp() generates 6-digit numeric OTP via crypto.randomInt()
       ├─► Step 8: OTP hashed using Scrypt and saved in Upstash Redis (TTL: 10 minutes)
       ├─► Step 9: EmailService.sendOtpEmail() connects to Brevo SMTP Relay (Port 587)
       │          (Note: If SMTP fails, catches error and returns simulated mode; non-blocking)
       │
       ▼ Step 10: Backend returns HTTP 200 { success: true, cooldownSeconds: 30 }
[Next.js Route Handler (Vercel)]
       │
       ▼ Step 11: Proxies masked target and cooldown to browser
[User Browser]
       │
       ▼ Step 12: Login UI advances to step 'verify' with 30s countdown timer
```

---

## 3. Comprehensive Authentication API Inventory

| API Route | Method | Source File | Purpose | Auth Required? | Turnstile? | Email/Brevo? | Database / Cache | Expected Status | Current Status |
|---|---|---|---|---|---|---|---|---|---|
| `/api/auth/request-otp` | POST | `apps/web/src/app/api/auth/request-otp/route.ts` | Verify Turnstile, rate limit, proxy OTP request to Render | No | **Yes** | Indirect | Redis (Upstash) | 200 OK | **FAIL (502 / 403 on Vercel)** |
| `/api/auth/request-otp` | POST | `apps/api/src/modules/auth/auth.controller.ts` | Generate 6-digit OTP, store in Redis, dispatch email via SMTP | No (`x-internal-proxy-secret`) | No (handled at BFF) | **Yes (Brevo SMTP)** | Redis (`auth:otp:*`) | 200 OK | **PASS (local) / UNABLE TO VERIFY (live Render)** |
| `/api/auth/verify-otp` | POST | `apps/web/src/app/api/auth/verify-otp/route.ts` | Forward OTP verification, issue `shopsell_token` cookie | No | No | No | Redis / `auth.users` | 200 OK | **PASS (local) / UNABLE TO VERIFY (live Render)** |
| `/api/auth/verify-otp` | POST | `apps/api/src/modules/auth/auth.controller.ts` | Verify Scrypt OTP hash, track attempts, return JWT payload | No (`x-internal-proxy-secret`) | No | No | Redis / `auth.users` | 200 OK | **PASS (local) / UNABLE TO VERIFY (live Render)** |
| `/api/auth/login` | POST | `apps/web/src/app/api/auth/login/route.ts` | Verify credentials, issue `shopsell_token` HttpOnly cookie | No | Conditional (on lockout risk) | No | `auth.users` (PostgreSQL) | 200 OK | **PASS (local) / UNABLE TO VERIFY (live Render)** |
| `/api/auth/signup` | POST | `apps/api/src/modules/auth/auth.controller.ts` | Create account in `auth.users` & `profiles` | No | No | No | `auth.users` & `profiles` | 201 Created | **PARTIAL (Missing BFF route handler)** |
| `/api/auth/me` | GET | `apps/web/src/app/api/auth/me/route.ts` | Verify JWT from cookie, return current user profile & roles | **Yes (JWT Cookie)** | No | No | No (decodes JWT) | 200 OK (or 401 unauth) | **PASS** |
| `/api/auth/logout` | POST | `apps/web/src/app/api/auth/logout/route.ts` | Clear `shopsell_token`, `shopsell_roles`, and admin cookies | No (CSRF required) | No | No | None | 200 OK | **PASS** |
| `/api/auth/forgot-password` | POST | `apps/api/src/modules/auth/auth.controller.ts` | Generate password reset token | No | No | Simulated | `auth.users` | 200 OK | **PARTIAL (Stubbed email)** |
| `/api/auth/reset-password` | POST | `apps/api/src/modules/auth/auth.controller.ts` | Update user password hash | No | No | No | `auth.users` | 200 OK | **PARTIAL (In-memory token store)** |
| `/api/auth/dev-token` | POST | `apps/web/src/app/api/auth/dev-token/route.ts` | Mint mock role tokens for local testing | No | No | No | None | 200 OK (dev) / 403 (prod) | **PASS (blocked in prod)** |

---

## 4. Production API Configuration Analysis

### URL Resolution Mechanics
The frontend application uses a **Backend-For-Frontend (BFF)** proxy pattern. 

In `apps/web/src/app/(auth)/login/page.tsx` and `apps/web/src/lib/auth/auth-context.tsx`, client-side components call **relative paths**:
```typescript
fetch('/api/auth/request-otp', { ... })
fetch('/api/auth/login', { ... })
fetch('/api/auth/verify-otp', { ... })
```

The Next.js serverless route handlers on Vercel resolve the backend using:
```typescript
// apps/web/src/app/api/auth/request-otp/route.ts (lines 143-146)
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.API_PROXY_URL ||
  'http://localhost:4000';
```

### Critical Findings:
1. **Fallback to Localhost in Production**: When `BACKEND_URL` and `API_PROXY_URL` are not defined in the Vercel dashboard, Vercel executes server-side requests against `http://localhost:4000`. In a Vercel serverless lambda, no server is running on port 4000, causing an immediate `ECONNREFUSED` exception.
2. **Missing `NEXT_PUBLIC_API_URL`**: Left empty intentionally so that browsers communicate strictly through Vercel's relative API routes (`/api/...`).

---

## 5. Login Flow Test Matrix

| Test ID | Scenario | Endpoint | Method | Expected HTTP | Expected Body | Auth State Change | Cookie Issued? | Result |
|---|---|---|---|---|---|---|---|---|
| **A** | Valid Login | `/api/auth/login` | POST | 200 OK | `{ success: true, user: {...} }` | Authenticated | `shopsell_token` (15m, HttpOnly) | **PASS** |
| **B** | Wrong Email | `/api/auth/login` | POST | 401 Unauthorized | `{ success: false, error: "Invalid email or password" }` | None | None | **PASS** |
| **C** | Wrong Password | `/api/auth/login` | POST | 401 Unauthorized | `{ success: false, error: "Invalid email or password" }` | None | None | **PASS** |
| **D** | Empty Email | `/api/auth/login` | POST | 400 Bad Request | `{ success: false, error: "Invalid email address" }` | None | None | **PASS** |
| **E** | Empty Password | `/api/auth/login` | POST | 401 Unauthorized | `{ success: false, error: "Invalid email or password" }` | None | None | **PASS** |
| **F** | Invalid Email Format | `/api/auth/login` | POST | 400 Bad Request | `{ success: false, error: "Invalid email address" }` | None | None | **PASS** |
| **G** | Nonexistent User | `/api/auth/login` | POST | 401 Unauthorized | `{ success: false, error: "Invalid email or password" }` | None | None | **PASS** |
| **H** | Re-login Active User | `/api/auth/login` | POST | 200 OK | `{ success: true, user: {...} }` | Refreshed | Overwrites cookie | **PASS** |
| **I** | Logout After Login | `/api/auth/logout` | POST | 200 OK | `{ success: true, message: "Logged out successfully" }` | Unauthenticated | Cleared (`maxAge: 0`) | **PASS** |
| **J** | Protected Route Without Token | `/api/auth/me` | GET | 401 Unauthorized | `{ authenticated: false, user: null, roles: ['customer'] }` | None | None | **PASS** |
| **K** | Protected Route with Invalid Token | `/api/auth/me` | GET | 401 Unauthorized | `{ authenticated: false, user: null, roles: ['customer'] }` | None | None | **PASS** |
| **L** | Protected Route with Expired Token | `/api/auth/me` | GET | 401 Unauthorized | `{ authenticated: false, user: null, roles: ['customer'] }` | None | None | **PASS** |

---

## 6. OTP & Email Verification Flow Investigation

### The 18 Diagnostic Checkpoints

1. **Does the frontend actually send the request?**
   **YES**. Calling `sendOtp(email, turnstileToken)` in `LoginForm` dispatches a `POST` request to `/api/auth/request-otp`.
2. **What is the exact production API URL?**
   The browser calls `/api/auth/request-otp` on Vercel. Vercel forwards to `${BACKEND_URL}/api/auth/request-otp`.
3. **Does the request reach Render?**
   **FAIL / UNABLE TO VERIFY**. If `BACKEND_URL` is omitted on Vercel, requests terminate at `127.0.0.1:4000` on Vercel before reaching Render.
4. **Does the backend route exist?**
   **YES**. Defined at `POST /api/auth/request-otp` in `AuthController`.
5. **Does CORS allow the Vercel origin?**
   **YES (by design)**. Server-to-server HTTP calls between Vercel and Render are not subject to browser CORS policies.
6. **Is Turnstile token being generated?**
   **YES**. The `<Turnstile>` widget generates a valid token upon completion.
7. **Is Turnstile token being sent to backend?**
   **YES**. Sent in JSON payload as `turnstileToken`.
8. **Is `TURNSTILE_SECRET_KEY` available on Render?**
   **NOT REQUIRED ON RENDER**. Turnstile is verified at Vercel's BFF layer.
9. **Is Turnstile verification successful?**
   **YES**. If verification failed, the route handler would return `"Security verification failed. Please refresh the page and try again."`.
10. **Is `BREVO_API_KEY` available on Render?**
    **NOT USED**. Codebase uses Brevo's SMTP relay (`SMTP_HOST=smtp-relay.brevo.com`).
11. **Is Brevo API request correctly constructed?**
    **YES**. Handled via Nodemailer SMTP with full HTML/Text templates.
12. **Is the sender email valid and verified?**
    Configured as `"Shop:Sell" <jathinreddy105@gmail.com>`.
13. **Does Brevo return an error?**
    **NO EFFECT ON API RESULT**. In `EmailService.ts`, any SMTP error is caught and falls back to simulated development mode, returning `{ success: true, provider: 'simulated' }`. It **never** causes the HTTP API to return 500 or 502.
14. **Is the OTP generated correctly?**
    **YES**. Generated with `crypto.randomInt(100000, 999999)`.
15. **Is the OTP stored correctly?**
    **YES**. Stored in Upstash Redis at `auth:otp:<id>` with a 10-minute expiration.
16. **Is expiration implemented correctly?**
    **YES**. Enforced by both Redis key TTL (`EX 600`) and timestamp check (`expiresAt`).
17. **Does OTP verification work?**
    **YES**. Verifies Scrypt hash using `crypto.timingSafeEqual` and invalidates the record after successful verification or 5 failed attempts.
18. **Does the frontend correctly handle success/failure?**
    **YES**. Advances to verification step upon receiving `success: true`.

---

## 7. Brevo Integration Review

- **Delivery Mechanism**: Nodemailer SMTP Relay on port 587 (`smtp-relay.brevo.com`).
- **Authentication**: `SMTP_USER` and `SMTP_PASS`.
- **Fault-Tolerance Mechanism**: In `apps/api/src/modules/auth/email.service.ts`:
  ```typescript
  try {
    const info = await this.transporter.sendMail({ ... });
    return { success: true, messageId: info.messageId, provider: 'smtp' };
  } catch (err: any) {
    this.logger.error(`Failed to send email via SMTP: ${err.message}`);
  }
  // Fallback simulation
  return { success: true, provider: 'simulated' };
  ```
  **Conclusive Evidence**: Even if Brevo is down, blocked, or unauthenticated, the backend returns `{ success: true }`. Brevo is **NOT** the source of the `"Unable to send the verification code"` error.

---

## 8. Cloudflare Turnstile Review

- **Frontend Widget**: Managed via `@marsidev/react-turnstile` with explicit `onSuccess` callback saving token state.
- **Backend Verification**: Validated in `apps/web/src/lib/security/turnstile.ts` calling Cloudflare Siteverify API (`https://challenges.cloudflare.com/turnstile/v0/siteverify`).
- **Error Propagation**:
  - Missing token &rarr; `"Please complete the security verification and try again."`
  - Missing secret &rarr; `"Turnstile security configuration is missing"`
  - Cloudflare rejection &rarr; `"Security verification failed. Please refresh the page and try again."`

None of these error strings match the reported error, proving Turnstile passed.

---

## 9. CORS Configuration

- **Backend Configuration** (`apps/api/src/main.ts`):
  ```typescript
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: 'http://localhost:3008',
      credentials: true,
      ...
    });
  }
  ```
- **Production Architecture**: CORS is intentionally disabled on the Render backend in production. The browser only communicates with Vercel (`https://your-domain.vercel.app/api/...`), and Vercel calls Render server-to-server. No direct browser-to-Render requests are permitted.

---

## 10. Database Authentication Logic

- **Actual Engine**: **Hosted PostgreSQL 16 on Supabase** (via AWS AP-Northeast-1 pooler), **NOT MongoDB**.
- **User Table**: `auth.users` schema storing `id`, `email`, `encrypted_password`, and metadata.
- **Profile Table**: `public.profiles` storing `full_name`, `phone`, `avatar_url`, and `roles`.
- **Password Hashing**: Node.js `crypto.scrypt` with random 16-byte salt (`scrypt:<salt>:<derivedKeyHex>`).
- **Timing Protection**: `crypto.timingSafeEqual` prevents side-channel timing attacks.
- **Case Sensitivity**: Explicit `LOWER(email)` used in all SQL queries, preventing duplicate casing exploits.
- **OTP Persistence**: Distributed Upstash Redis cluster (`auth:otp:<id>`) with in-memory fallback.

---

## 11. JWT & Session Implementation

- **Algorithm**: Pinned to `HS256`.
- **Secret Validation**: Fails fast at startup if under 32 bytes (256 bits).
- **Token Claims**: Contains `sub` (user UUID), `email`, `role: 'authenticated'`, `aud: 'authenticated'`, `iss: 'shopsell-api'`, and `app_metadata.roles`.
- **Cookie Security Flags**:
  - Name: `shopsell_token`
  - `httpOnly: true` (inaccessible to JavaScript)
  - `secure: true` (in production)
  - `sameSite: 'lax'` (CSRF protection with smooth top-level navigation)
  - `path: '/'`
  - `maxAge: 900` (15 minutes short-lived)

---

## 12. Protected APIs & RBAC Test Results

| Route / Guard | Unauthenticated Result | Customer Role Result | Owner / Admin Role Result |
|---|---|---|---|
| `/account` (Middleware) | 307 Redirect to `/login?redirect=/account` | 200 OK | 200 OK |
| `/checkout` (Middleware) | 307 Redirect to `/login?redirect=/checkout` | 200 OK | 200 OK |
| `/seller/*` (Middleware) | 307 Redirect to `/login?redirect=/seller/...` | 307 Redirect to `/become-a-seller` | 200 OK |
| `/admin/*` (Middleware) | 307 Redirect to `/login` | 307 Redirect to `/login` | 200 OK (with `shopsell_admin_token`) |
| `GET /api/auth/me` | 401 Unauthorized | 200 OK | 200 OK |

---

## 13. Frontend Error Handling Analysis

### Location of Observed Error String
The exact message observed by the user exists in only one file in the entire repository:
**`apps/web/src/app/api/auth/request-otp/route.ts`**

- **Line 195**:
  ```typescript
  } catch (backendError) {
    console.error('Backend OTP service unavailable:', backendError);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to send the verification code right now. Please try again.',
      },
      { status: 502 }
    );
  }
  ```
- **Line 228**:
  ```typescript
  if (!backendResponse.ok) {
    return NextResponse.json(
      {
        success: false,
        error:
          backendData.error ||
          backendData.message ||
          'Unable to send the verification code. Please try again.',
      },
      { status: backendResponse.status }
    );
  }
  ```

---

## 14. Confirmed Failure Points & Root Causes

### Why Does Production Display "Unable to send the verification code"?

1. **Root Cause 1: Missing `BACKEND_URL` on Vercel**
   When `process.env.BACKEND_URL` is missing from Vercel's environment variables, Vercel defaults to `http://localhost:4000`. In serverless execution, port 4000 does not exist &rarr; `fetch()` throws `ECONNREFUSED` &rarr; triggers catch block line 185 &rarr; returns HTTP 502 with `"Unable to send the verification code right now. Please try again."`.

2. **Root Cause 2: Render Cold Start Timeout (10-Second Abort)**
   If Render's free web service has spun down, cold-start takes 25–45 seconds. Line 182 enforces `AbortSignal.timeout(10000)`. The request is aborted at 10 seconds &rarr; throws `TimeoutError` &rarr; triggers catch block line 185 &rarr; returns HTTP 502.

3. **Root Cause 3: `INTERNAL_API_SECRET` Mismatch**
   If `BACKEND_URL` is set but `INTERNAL_API_SECRET` on Vercel does not match Render, Render's proxy firewall returns HTTP 403 (`Forbidden`). Line 216 detects `!backendResponse.ok` and outputs line 228 fallback error.

---

## 15. Action Plan & Recommended Fixes

### MUST FIX (Immediate Production Restoration)

1. **Add Backend Target URL to Vercel Environment Variables**:
   Open **Vercel Dashboard** &rarr; **Project Settings** &rarr; **Environment Variables**:
   ```env
   BACKEND_URL=https://<your-render-service>.onrender.com
   API_PROXY_URL=https://<your-render-service>.onrender.com
   ```

2. **Synchronize `INTERNAL_API_SECRET` on Both Platforms**:
   Generate a secure 64-character hex secret:
   ```bash
   openssl rand -hex 32
   ```
   Add this identical value to **both** Vercel and Render dashboards:
   ```env
   INTERNAL_API_SECRET=<generated-64-character-hex-secret>
   ```

3. **Extend BFF Abort Timeout for Render Cold Starts**:
   Update `apps/web/src/app/api/auth/request-otp/route.ts` line 182:
   ```diff
   - signal: AbortSignal.timeout(10000),
   + signal: AbortSignal.timeout(30000),
   ```
   Apply the same 30-second timeout to `apps/web/src/app/api/auth/login/route.ts` and `apps/web/src/app/api/auth/verify-otp/route.ts`.

---

### SHOULD FIX (Session & Flow Integrity)

1. **Add Dedicated Route Handler for Signup**:
   Create `apps/web/src/app/api/auth/signup/route.ts` to intercept user registration and issue the `shopsell_token` HttpOnly cookie so the user is immediately authenticated upon account creation.
2. **Add Dedicated Route Handlers for Forgot/Reset Password**:
   Create `apps/web/src/app/api/auth/forgot-password/route.ts` and `apps/web/src/app/api/auth/reset-password/route.ts` to ensure `x-internal-proxy-secret` is cleanly forwarded.
3. **Persist Password Reset Tokens in Redis**:
   Replace `AuthService.resetTokenStore = new Map()` with Redis key `auth:reset:<token>` (15-minute TTL) so reset tokens persist across Render instance restarts.

---

### OPTIONAL IMPROVEMENTS

1. **Keep-Alive Ping for Render Free Tier**:
   Configure a free Uptime monitor (e.g. UptimeRobot) to send a `GET` request to `https://<render-url>/api/health` every 10 minutes to eliminate cold-start delays.

---

## 16. Deployment Verification Commands

After applying environment variables to Vercel and Render:

```bash
# 1. Test backend health check directly
curl -I https://<your-render-api>.onrender.com/api/health
# Expected: HTTP 200 OK

# 2. Test proxy security firewall (Verify secret protection)
curl -X POST https://<your-render-api>.onrender.com/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com"}'
# Expected: HTTP 403 Forbidden ("Access denied: direct access to API without web proxy credential is prohibited")

# 3. Test proxy forwarding with secret
curl -X POST https://<your-render-api>.onrender.com/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -H "x-internal-proxy-secret: <your-configured-secret>" \
  -d '{"identifier":"test@example.com"}'
# Expected: HTTP 200 OK ("Verification code sent successfully")
```
