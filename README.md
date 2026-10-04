

# 🛍️ Shop:Sell
### Multi-Vendor E-Commerce & Marketplace Platform

**Discover. Shop. Sell. Govern.**

Customers, sellers, and administrators on one marketplace engine: Next.js storefront, NestJS API, Supabase Postgres, Typesense search, Razorpay payments, and Cloudflare edge protection.

[![CI](https://github.com/jathinreddy-5/Shop-Sell/actions/workflows/ci.yml/badge.svg)](https://github.com/jathinreddy-5/Shop-Sell/actions)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-API-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Supabase](https://img.shields.io/badge/Postgres-Supabase-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Typesense](https://img.shields.io/badge/Search-Typesense-FF5722?style=flat-square)](https://typesense.org/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=flat-square&logo=redis&logoColor=white)](https://upstash.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-3395FF?style=flat-square)](https://razorpay.com/)
[![Cloudflare](https://img.shields.io/badge/Edge-Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)

</div>

---

## 🧭 Start Here: The Clickable Map

Everything in this README is reachable from the map below. Pick a node, then follow its link.

```mermaid
mindmap
  root((Shop:Sell))
    Run it
      Quick start
      Environment
      Seed and search index
    Understand it
      System map
      Request lifecycle
      Customer journey
      Seller journey
      Admin governance
      Payment flow
      Search and recommendations
    Secure it
      Edge defense
      Auth and tokens
      Rate limits
      Audit trail
    Trust it
      Tests
      CI
      Docs hub
    Ship it
      Deploy flow
      Pre-deploy checklist
```

| I want to... | Go to |
|---|---|
| Run the project locally | [🚀 Quick Start](#quick-start) |
| See how all the services connect | [🗺️ System Map](#system-map) |
| Follow one request from browser to database | [🔄 Request Lifecycle](#request-lifecycle) |
| Understand login and tokens | [🔐 Authentication](#authentication) |
| See what protects the edge | [🛡️ Security Map](#security-map) |
| See each role's journey | [🎭 Role Journeys](#role-journeys) |
| Understand payments | [💳 Payment Flow](#payment-flow) |
| Run the tests | [🧪 Testing](#testing) |
| Prepare a deployment | [🌐 Deployment](#deployment) |
| Read deeper docs | [📚 Docs Hub](#docs-hub) |

> **Tip:** GitHub renders the diagrams but does not make nodes inside them clickable. The table above and the ▶ sections below are the interactive part: click an arrow to expand.

---

<a id="quick-start"></a>
## 🚀 Quick Start

```mermaid
flowchart LR
    A["1. Clone and install"] --> B["2. Configure .env"]
    B --> C["3. Seed DB and index search"]
    C --> D["4. npm run dev"]
    D --> E["Web :3000 and API :4000"]
```

<details open>
<summary><b>1. Clone and install</b></summary>

```bash
git clone https://github.com/jathinreddy-5/Shop-Sell.git
cd Shop-Sell
npm ci        # installs all workspaces: apps/web, apps/api, packages/shared
```
</details>

<details open>
<summary><b>2. Configure environment variables</b></summary>

```bash
cp .env.example .env
# Generate each secret separately, never reuse values between variables or environments:
openssl rand -hex 32
```

<details>
<summary><b>🔍 Environment variable reference (names only)</b></summary>

| Variable | Used by | Notes |
|---|---|---|
| `NODE_ENV` | all | Must be `production` in live deployments |
| `JWT_SECRET` | api, web | Same value in both, at least 32 bytes |
| `SUPABASE_JWT_SECRET` | api | Supabase token signature secret |
| `ADMIN_JWT_SECRET` | api | Admin tokens, must differ from `JWT_SECRET` |
| `INTERNAL_API_SECRET` | api, web | Web-to-API proxy secret, at least 32 bytes, no default |
| `LOG_HASH_KEY` | api, web | HMAC key for hashing identifiers in logs, separate from `JWT_SECRET` |
| `ENABLE_DEMO_ACCOUNTS` | api, web | Local testing only. App refuses to start if `true` in production |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | api, web | Rate limiting and OTP storage |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | web | Server only |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | web | Public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | api | Server only, never a `NEXT_PUBLIC_` variable |
| `RAZORPAY_KEY_SECRET` | api | Server only |

Secrets must be at least 32 bytes and must not be placeholders. The apps fail at startup otherwise.
</details>
</details>

<details open>
<summary><b>3. Seed the database and search index</b></summary>

```bash
npm run seed      # sample sellers, categories, products, pgvector embeddings
npm run reindex   # sync the catalogue into Typesense
```
</details>

<details open>
<summary><b>4. Start the dev servers</b></summary>

```bash
npm run dev
```

- 🌐 Web: http://localhost:3000
- 🔌 API: http://localhost:4000 (rejects calls without the internal proxy secret)
</details>

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

<a id="system-map"></a>
## 🗺️ System Map

```mermaid
flowchart LR
    U["👤 Browser"] -->|HTTPS| CF["☁️ Cloudflare<br/>WAF + Turnstile"]
    CF --> W["🖥️ apps/web<br/>Next.js 15"]
    W -->|"x-internal-proxy-secret"| A["⚙️ apps/api<br/>NestJS :4000"]
    W --> RL[("Upstash Redis<br/>rate limits")]
    A --> OT[("Redis<br/>hashed OTPs")]
    A --> DB[("Supabase Postgres<br/>RLS + pgvector")]
    A --> TS[("Typesense<br/>search")]
    A --> RP["💳 Razorpay"]
    A --> AU[("WORM audit sink<br/>S3 Object Lock or R2")]
    SH["📦 packages/shared<br/>schemas + types"] -.-> W
    SH -.-> A
```

```mermaid
mindmap
  root((Tech stack))
    Frontend
      Next.js 15
      React 18
      Tailwind CSS
      Edge middleware
    Backend
      NestJS
      Guards and RBAC
      Admin governance
    Data
      Supabase Postgres
      Row level security
      pgvector 384 dim
      JSONB attributes
    Search
      Typesense
      Typo tolerance
      Facets
    Edge and abuse
      Cloudflare
      Turnstile
      Upstash Redis
    Payments
      Razorpay
      HMAC verification
```

<details>
<summary><b>▶ Repository map</b></summary>

```text
Shop-Sell/
├── apps/
│   ├── web/        Next.js app: storefront, seller portal, auth proxy routes, middleware
│   └── api/        NestJS API: auth, orders, payments, admin governance
├── packages/
│   └── shared/     Zod schemas, types, security validators (server-only entry)
├── scripts/        seed and reindex
├── test/k6/        load tests
├── docs/           cloudflare-setup, security-fixes, architecture, admin specs
└── .github/workflows/ci.yml
```
</details>

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

<a id="request-lifecycle"></a>
## 🔄 Request Lifecycle

```mermaid
flowchart TD
    R["Incoming request"] --> CF{"Cloudflare WAF<br/>and bot checks"}
    CF -->|Blocked| X1["403 / challenge"]
    CF -->|Pass| MW["Next.js middleware"]
    MW --> N["Generate CSP nonce<br/>add security headers"]
    N --> CS{"Mutating method?"}
    CS -->|Yes| OR{"Origin matches<br/>or Sec-Fetch-Site same-origin?"}
    OR -->|No| X2["403 CSRF blocked"]
    OR -->|Yes| TK
    CS -->|No| TK{"Protected route?"}
    TK -->|No| PG["Render page"]
    TK -->|Yes| JV{"Verify JWT<br/>signature, expiry, role"}
    JV -->|Invalid| X3["307 to /login"]
    JV -->|Wrong role| X4["307 to /become-a-seller"]
    JV -->|OK| PX["Proxy to apps/api<br/>with internal secret"]
    PX --> AG{"API guards re-verify<br/>token and role"}
    AG -->|Fail| X5["401 / 403"]
    AG -->|OK| BL["Business logic + RLS queries"]
```

---

<a id="authentication"></a>
## 🔐 Authentication

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant W as apps/web
    participant A as apps/api
    participant R as Redis
    B->>W: POST /api/auth/request-otp + Turnstile token
    W->>W: CSRF check, Turnstile verify, rate limit (5/hr per email and IP)
    W->>A: forward with proxy secret
    A->>R: store SHA-256 hash of OTP, 10 min TTL
    A-->>B: generic 200 (same response for unknown emails)
    B->>W: POST /api/auth/verify-otp
    W->>A: forward
    A->>R: constant-time compare, INCR attempts (max 5, then invalidated)
    A-->>W: signed JWT HS256, 15 min
    W-->>B: HttpOnly, SameSite=Lax cookie shopsell_token
```

```mermaid
mindmap
  root((Tokens))
    Customer token
      HS256 pinned
      iss shopsell-api
      aud authenticated
      15 minutes
    Admin token
      aud shopsell-admin
      Separate secret
      Elevation for risky actions
    Impersonation token
      aud shopsell-impersonation
      15 minutes
      Read only
      Audited
    Cookie
      HttpOnly
      SameSite Lax
      Secure in production
      Max-Age 900
```

<details>
<summary><b>▶ Route protection table</b></summary>

| Situation | Result |
|---|---|
| No token on a protected page | Redirect to `/login?redirect=...` |
| Customer token on `/seller/*` | Redirect to `/become-a-seller` |
| Tampered `shopsell_roles` cookie | Ignored, only the signed token counts |
| Expired or wrong-signature token | Rejected in middleware, proxy route, and API |
| Direct call to the API without proxy secret | `403` |
| Impersonation token on POST/PUT/PATCH/DELETE | `403`, sessions are read-only |
</details>

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

<a id="security-map"></a>
## 🛡️ Security Map

```mermaid
mindmap
  root((Security))
    Edge
      Cloudflare WAF
      Turnstile on login OTP and seller apply
      Authenticated Origin Pulls
      Cloudflare IP range checks
    Identity
      JWT HS256 pinned
      Issuer and audience checks
      Role from signed token only
      Admin RBAC and elevation
    Abuse control
      OTP 5 per hour
      OTP 5 attempts then invalid
      Login lockout by email and IP
      Turnstile escalation after 10 attempts
      Fail closed when Redis is down
    Request integrity
      Origin and Sec-Fetch-Site CSRF
      Internal proxy secret
      Constant time comparisons
    Browser
      Nonce based CSP
      HSTS
      X-Frame-Options DENY
      nosniff
      Referrer policy
    Data and audit
      Row level security
      HMAC hashed identifiers in logs
      Two man approvals
      WORM audit trail
    Secrets
      Startup validation
      32 byte minimum
      No dev fallbacks
      Env files gitignored
```

<details>
<summary><b>▶ Edge defense, step by step</b></summary>

```mermaid
flowchart TD
    T["Client traffic"] --> CF["Cloudflare edge"]
    CF --> TS{"Turnstile"}
    TS -->|Bot| B1["Blocked / challenged"]
    TS -->|Human| AOP["Authenticated Origin Pull"]
    AOP --> MW["Next.js middleware"]
    MW --> RL{"Rate limiter"}
    RL -->|Exceeded| T1["429"]
    RL -->|OK| CSRF{"CSRF check"}
    CSRF -->|Cross-origin| B2["403"]
    CSRF -->|OK| AU["Token + role check"]
    AU --> API["NestJS API"]
    API --> RLS["Postgres row level security"]
```

- **Turnstile** protects `/login`, `/api/auth/request-otp`, and `/become-a-seller`.
- **Token checks** use `jose` in the web layer and `jsonwebtoken` in the API, both pinned to HS256.
- **Rate limits** live in a shared Redis store so they hold across instances.
- **Origin protection** means the origin only accepts Cloudflare traffic. See [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md).
</details>

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

<a id="role-journeys"></a>
## 🎭 Role Journeys

```mermaid
mindmap
  root((Roles))
    Customer
      Browse and search
      Product page
      Multi vendor cart
      Checkout
      Order history
    Seller
      Apply and KYC approval
      Owner role
      Manage catalogue
      Inventory alerts
      Order queue
      Payouts
    Admin
      RBAC permissions
      Approve sellers
      Kill switches
      Dual approvals
      Audit trail
```

<details>
<summary><b>🛒 Customer: discovery to delivery</b></summary>

```mermaid
flowchart TD
    Start(["Visit Shop:Sell"]) --> Home["Homepage"]
    Home --> Browse["Browse categories"]
    Home --> Search["Typesense search"]
    Home --> Rec["pgvector recommendations"]
    Browse --> P["Product page"]
    Search --> P
    Rec --> P
    P --> Cart["Multi-vendor cart"]
    Cart --> Co["Checkout and address"]
    Co --> Pay["Razorpay payment"]
    Pay --> V{"Signature valid?"}
    V -->|No| F["Failed, retry"]
    V -->|Yes| O["Create order"]
    O --> Inv["Atomic stock decrement"]
    Inv --> SQ["Seller order queues"]
    O --> CH["Customer order history"]
```
</details>

<details>
<summary><b>🏪 Seller: store, inventory, payouts</b></summary>

```mermaid
flowchart LR
    S["Verified seller"] --> D["Dashboard"]
    D --> C["Catalogue"]
    C --> C1["Create product, upload images"]
    C --> C2["Specs and JSONB attributes"]
    C --> C3["Pricing and SKUs"]
    D --> I["Inventory"]
    I --> I1["Low stock alerts"]
    D --> O["Orders queue"]
    O --> O1["Pack and ship"]
    D --> P["Payouts"]
    P --> P1["Settlement after return window"]
```

Order status flow: `PENDING` → `CONFIRMED` → `SHIPPED` → `DELIVERED`.
</details>

<details>
<summary><b>👮 Admin: governance, kill switches, audit</b></summary>

```mermaid
flowchart TD
    A["Administrator"] --> G["Admin guard and RBAC"]
    G --> PC{"Has permission?"}
    PC -->|No| N["403"]
    PC -->|Yes| ACT["Admin action"]
    ACT --> DR{"Needs two-person approval?"}
    DR -->|Yes| Q["Approval queue"]
    Q --> W2["Second admin signs off"]
    DR -->|No or approved| AP["Apply change"]
    AP --> KS["Kill switches:<br/>freeze payouts, quarantine seller,<br/>maintenance mode"]
    AP --> RD["PII redactor<br/>HMAC-SHA256"]
    RD --> WORM["Append-only audit ledger"]
    WORM --> S3["S3 Object Lock or Cloudflare R2"]
```

Permissions include `USERS_READ`, `SELLERS_APPROVE`, `FINANCE_PAYOUT`, `SYSTEM_CONFIG`. Full matrix: [`docs/admin/permissions.md`](docs/admin/permissions.md).
</details>

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

<a id="payment-flow"></a>
## 💳 Payment Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant W as Web
    participant A as API
    participant R as Razorpay
    participant DB as Postgres
    C->>W: Start checkout
    W->>A: POST /api/payments/create-order
    A->>R: Create order (INR, receipt id)
    R-->>A: order_id, amount
    A-->>W: order payload
    C->>R: Pay via UPI, card, or netbanking
    R-->>W: payment_id, order_id, signature
    W->>A: POST /api/payments/verify
    Note over A: Verify HMAC-SHA256 of order_id|payment_id with the key secret, server-side only
    Note over A,DB: One atomic transaction: lock stock rows, decrement stock, create order and seller items, record payment
    A->>DB: commit
    A-->>W: order confirmation
    W-->>C: success and tracking
```

> Never mark an order paid from the client's success message. The server verifies the signature (and should also reconcile with Razorpay webhooks).

---

## 🧠 Search & Recommendations

```mermaid
flowchart LR
    subgraph Search["Instant search: Typesense"]
        Q["Query with a typo"] --> T["Typo tolerance"]
        T --> F["Facets and category filters"]
        F --> R1["Fast autocomplete results"]
    end
    subgraph Vector["Similarity: pgvector"]
        I["Views and purchases"] --> E["384-dim embeddings"]
        E --> CD["Cosine distance"]
        CD --> DK["Time-decay scoring"]
        DK --> R2["You may also like"]
    end
```

---

<a id="testing"></a>
## 🧪 Testing

```mermaid
flowchart LR
    T["npm run test"] --> W["apps/web<br/>auth, CSRF, headers"]
    T --> A["apps/api<br/>guards, OTP, admin"]
    T --> S["packages/shared<br/>validators, types"]
```

```bash
npm run test                       # everything
npm --prefix apps/web test         # web security and auth tests
npm --prefix apps/api test         # API and admin governance tests
npm --prefix packages/shared test  # shared package tests
k6 run test/k6/load-test.js        # load test against a local API
```

<details>
<summary><b>▶ What the security tests cover</b></summary>

- Tampered role cookie, missing, expired, and wrong-signature tokens
- Cookie flags: HttpOnly, SameSite, Max-Age, Secure in production
- Turnstile failure, CSRF (cross-origin, missing, and `null` Origin), proxy-secret rejection
- OTP expiry, attempt limits, single use
- Login lockout, anti-enumeration
- CSP nonce uniqueness and security headers
- Startup validation of secrets and demo-account flag in production
</details>

Check the [CI status](https://github.com/jathinreddy-5/Shop-Sell/actions) for the current pass/fail state.

<p align="right"><a href="#shopsell">⬆ Back to top</a></p>

---

## 🧩 Feature Matrix

| Feature | Scope | Technology |
|---|---|---|
| Multi-vendor storefront | Customer | Next.js 15, React 18, Tailwind CSS |
| Passwordless email login | Security | OTP, hashed storage, constant-time compare, Redis lockout |
| Typo-tolerant search | Core | Typesense, facets |
| Vector recommendations | Core | pgvector 384-dim, time decay |
| Multi-seller cart and orders | Customer | Atomic transactions, stock locking |
| Razorpay checkout | Payments | Server-side HMAC-SHA256 verification |
| Seller portal | Seller | Dashboard, stock tracking, payout ledger |
| Admin RBAC and governance | Admin | Guards, elevation tokens, dual approvals |
| WORM audit logging | Admin | Append-only sink, S3 Object Lock or R2 |
| Edge defense | Security | Cloudflare, Turnstile, Authenticated Origin Pulls, Upstash rate limits |

---

<a id="deployment"></a>
## 🌐 Deployment

```mermaid
flowchart TD
    A["Set host env vars<br/>(fresh secrets)"] --> B["Cloudflare: DNS proxied<br/>SSL Full strict"]
    B --> C["Run migrations"]
    C --> D["Deploy to staging"]
    D --> E{"Smoke tests pass?"}
    E -->|No| F["Fix and redeploy"]
    F --> D
    E -->|Yes| G["Deploy to production"]
    G --> H["Watch logs: 429s, failed logins, 5xx"]
```

<details>
<summary><b>▶ Pre-deploy checklist</b></summary>

- [ ] CI is green on the branch being deployed
- [ ] `.env` files never committed; git history scanned for secrets
- [ ] Fresh production secrets, none reused from dev
- [ ] `NODE_ENV=production`, `ENABLE_DEMO_ACCOUNTS` unset
- [ ] API reachable only through the web app (proxy secret plus network rules)
- [ ] Production Turnstile keys with the real domain added
- [ ] OTP email sent from a transactional provider with SPF, DKIM, DMARC
- [ ] Database backups enabled and a restore tested
- [ ] Row level security and storage rules reviewed
- [ ] Payments verified server-side, webhooks configured
- [ ] Error monitoring and alerts for failed logins
- [ ] `npm audit --omit=dev` reviewed
</details>

---

<a id="docs-hub"></a>
## 📚 Docs Hub

| Document | Purpose |
|---|---|
| [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md) | Turnstile, WAF rules, Authenticated Origin Pulls |
| [`docs/security-fixes.md`](docs/security-fixes.md) | All security hardening changes and the signer/verifier matrix |
| [`docs/admin-management-and-governance.md`](docs/admin-management-and-governance.md) | Admin RBAC, elevation, kill switches |
| [`docs/architecture.md`](docs/architecture.md) | Scaling topology: PgBouncer, replicas, Redis, CDN |
| [`docs/user-onboarding-specification.md`](docs/user-onboarding-specification.md) | Progressive profiling and onboarding |
| [`docs/admin/permissions.md`](docs/admin/permissions.md) | Admin roles and permission codes |
| [`docs/admin/audit.md`](docs/admin/audit.md) | Audit trail, redaction format, sinks |

---

<div align="center">

**Shop:Sell: Discover. Shop. Sell. Govern.**

[⬆ Back to top](#shopsell)

</div>
