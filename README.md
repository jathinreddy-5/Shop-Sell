# Shop:Sell

<div align="center">

# 🛍️ Shop:Sell
### Enterprise-Grade Multi-Vendor E-Commerce & Marketplace Platform

**Discover. Shop. Sell. Govern.**

A full-stack, cloud-native multi-vendor marketplace connecting customers, sellers, and administrators through a unified, high-performance shopping engine.

---

[![Tests](https://img.shields.io/badge/Tests-138%20Passing-brightgreen?style=for-the-badge&logo=node.js)](file:///Users/jathinreddy/Desktop/Shop:Sell#-interactive-testing-suite)
[![Security Hardening](https://img.shields.io/badge/Security-Hardened%20(Edge%20%2B%20RBAC)-blueviolet?style=for-the-badge&logo=shield)](file:///Users/jathinreddy/Desktop/Shop:Sell#-cloudflare-security-turnstile--origin-protection)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Backend-E0234E?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169E1?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![pgvector](https://img.shields.io/badge/Vector-pgvector%20384--dim-00C49F?style=for-the-badge&logo=vectorlogolib)](https://github.com/pgvector/pgvector)
[![Typesense](https://img.shields.io/badge/Search-Typesense-FF5722?style=for-the-badge&logo=typesense)](https://typesense.org/)
[![Redis](https://img.shields.io/badge/Redis-Upstash%20RateLimit-DC382D?style=for-the-badge&logo=redis)](https://upstash.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-3395FF?style=for-the-badge)](https://razorpay.com/)
[![Cloudflare](https://img.shields.io/badge/Edge-Cloudflare%20Turnstile-F38020?style=for-the-badge&logo=cloudflare)](https://www.cloudflare.com/)

<br />

#### ⚡ Quick Jump Navigation

[**🚀 Quick Start**](#-quick-start) • [**🛡️ Edge Security**](#-cloudflare-security-turnstile--origin-protection) • [**📐 Architecture Drawers**](#-interactive-architecture-drawers) • [**🛒 Experiences**](#-interactive-experience-tours) • [**🧪 Tests**](#-interactive-testing-suite) • [**📚 Docs Hub**](#-documentation-hub)

</div>

---

## 🚀 Quick Start

Follow this interactive 4-step checklist to run Shop:Sell locally in under 3 minutes:

<details open>
<summary><b>1. Clone & Install Dependencies</b></summary>

```bash
# Clone the repository
git clone https://github.com/jathinreddy-5/Shop-Sell.git
cd Shop-Sell

# Install dependencies across all monorepo workspaces (apps/web, apps/api, packages/shared)
npm install
```
</details>

<details open>
<summary><b>2. Configure Environment Variables</b></summary>

```bash
# Copy the environment template
cp .env.example .env
```

<details>
<summary><b>🔍 View Key Environment Variables Matrix (Click to expand)</b></summary>

| Variable | Default (Dev) | Description |
|---|---|---|
| `NODE_ENV` | `development` | Set to `production` in live deployments |
| `JWT_SECRET` | `dev-jwt-secret-min-32-chars-long!` | Shared symmetric key for HS256 JWT signing & verification |
| `SUPABASE_JWT_SECRET` | `dev-jwt-secret-min-32-chars-long!` | Supabase token signature secret (must match JWT_SECRET in dev) |
| `INTERNAL_API_SECRET` | `dev-internal-api-secret-min-32-chars!` | Shared secret for trusted web-to-API proxy endpoints |
| `LOG_HASH_KEY` | `dev-log-hash-key-min-32-chars-long!` | HMAC-SHA256 salt for GDPR-compliant PII log redaction |
| `ENABLE_DEMO_ACCOUNTS` | `false` | Development flag for local testing accounts |
| `UPSTASH_REDIS_REST_URL` | *(Optional in dev)* | Upstash Redis URL for distributed rate limiting & token blacklist |
| `UPSTASH_REDIS_REST_TOKEN` | *(Optional in dev)* | Upstash REST authentication token |
| `CLOUDFLARE_TURNSTILE_SECRET_KEY` | *(Optional in dev)* | Cloudflare Turnstile CAPTCHA secret |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | *(Optional in dev)* | Public site key rendered in client-side auth forms |

</details>
</details>

<details open>
<summary><b>3. Seed Database & Synchronize Search Engine</b></summary>

```bash
# Seed PostgreSQL tables, sample sellers, categories, and pgvector embeddings
npm run seed

# Synchronize product catalogue into Typesense search engine
npm run reindex
```
</details>

<details open>
<summary><b>4. Launch Development Servers</b></summary>

```bash
# Start frontend (Next.js 15) and backend (NestJS) concurrently
npm run dev
```

- 🌐 **Web Front**: [http://localhost:3000](http://localhost:3000)
- 🔌 **API Engine**: [http://localhost:4000](http://localhost:4000)

</details>

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 🛡️ Cloudflare Security, Turnstile & Origin Protection

Shop:Sell is engineered with defense-in-depth edge protection to prevent credential stuffing, bot scraping, and unauthorized origin traffic:

```mermaid
flowchart TD
    Traffic[Client Traffic] --> CF[Cloudflare Edge CDN / WAF]
    CF --> Turnstile{Turnstile Challenge}
    Turnstile -->|Bot / Malicious| Block[403 / Managed Challenge]
    Turnstile -->|Verified Human| Proxy[Authenticated Origin Pull]
    Proxy --> MW[Next.js Edge Middleware]
    
    subgraph "Next.js Security Boundary"
        MW --> RL{Upstash Redis RateLimiter}
        RL -->|Exceeded / Lockout| Throttle[429 Too Many Requests]
        RL -->|Allowed| CSRF{Same-Origin CSRF Check}
        CSRF -->|Cross-Origin POST| Reject[403 CSRF Detected]
        CSRF -->|Verified| Auth[Token Signature & Role Check]
    end

    Auth --> API[NestJS API Core]
    API --> RLS[PostgreSQL Row-Level Security]
```

<details>
<summary><b>🔒 Interactive Edge Security Breakdown (Click to expand)</b></summary>

- **Cloudflare Turnstile**: Managed challenge protection on login (`/login`), OTP generation (`/api/auth/request-otp`), and seller applications (`/become-a-seller`).
- **Cryptographic Token Verification**: Edge middleware verifies short-lived (15 min) JWT access tokens via `jose` (HS256) using `JWT_SECRET`. Client-submitted `shopsell_roles` cookies are never trusted for authorization.
- **Shared-Store Rate Limiting**: Per-email and per-IP login throttling, 5 OTPs/hour limit, and lockout after 5 failed verification attempts via Upstash Redis.
- **Origin Protection & Authenticated Origin Pulls**: Ensure origin web traffic is strictly restricted to official Cloudflare IP ranges and verified via client TLS certificates.
- **Detailed Checklist**: Refer to [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md) for step-by-step dashboard instructions.

</details>

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 📐 Interactive Architecture Drawers

Explore the architecture and system flows through interactive collapsible diagrams:

<details>
<summary><b>1. 🛒 Customer Discovery & Shopping Lifecycle (Click to expand)</b></summary>

```mermaid
flowchart TD
    Start([Customer Visits Shop:Sell]) --> Home[Marketplace Homepage]

    Home --> Browse[Browse Categories]
    Home --> Search[Typesense Smart Search]
    Home --> Recommend[pgvector Recommendations]

    Browse --> Product[Product Detail Page]
    Search --> Product
    Recommend --> Product

    Product --> Cart[Add to Multi-Vendor Cart]
    Cart --> Checkout[Checkout & Shipping Address]
    Checkout --> Payment[Razorpay Payment Gateway]

    Payment --> Verify{HMAC Signature Verified?}
    Verify -->|Failed| Failed[Payment Failed / Retry]
    Verify -->|Valid| Order[Transactional Order Creation]

    Order --> Inventory[Atomic Stock Decrement]
    Inventory --> Seller[Seller Order Queues]
    Seller --> Fulfilment[Dispatch & Delivery]
    Order --> CustomerOrder[Customer Order History]
```

</details>

<details>
<summary><b>2. 🏪 Seller Store, Inventory & Payout Lifecycle (Click to expand)</b></summary>

```mermaid
flowchart LR
    Seller[Verified Seller] --> Dashboard[Seller Dashboard]
    
    Dashboard --> Catalog[Manage Catalogue]
    Catalog --> Add[Create Product & Upload Images]
    Catalog --> Specs[Technical Specifications & JSONB Attributes]
    Catalog --> Pricing[Dynamic Pricing & SKU Tracking]
    
    Dashboard --> Inv[Inventory Monitoring]
    Inv --> LowStock[Low Stock Alerts & Reorder Thresholds]
    
    Dashboard --> Orders[Orders Queue]
    Orders --> Pack[Pack & Mark Shipped]
    
    Dashboard --> Payouts[Automated Payout Engine]
    Payouts --> Escrow[Escrow Settlement Post-Return Window]
```

</details>

<details>
<summary><b>3. 🛡️ Admin Governance, Kill Switches & WORM Audit Trail (Click to expand)</b></summary>

```mermaid
flowchart TD
    Admin[Marketplace Administrator] --> Guard[Admin Auth Guard & RBAC]
    
    Guard --> PermCheck{Has Required Permission?}
    PermCheck -->|No| 403[403 Forbidden]
    PermCheck -->|Yes| Action[Execute Administrative Action]
    
    subgraph "Critical Action Protocol"
        Action --> DualRule{Requires 2-Man Approval?}
        DualRule -->|Yes| Approvals[Dual-Authorization Queue]
        Approvals --> Pending[Await 2nd Admin Sign-Off]
        DualRule -->|No / Approved| Apply[Apply Change]
    end
    
    subgraph "Emergency Safeguards"
        Apply --> KillSwitches[Platform Kill Switches]
        KillSwitches --> FreezePayouts[Freeze Payouts]
        KillSwitches --> DisableSeller[Quarantine Malicious Seller]
        KillSwitches --> Maintenance[Global Maintenance Mode]
    end
    
    subgraph "Compliance & Redaction"
        Apply --> Redactor[HMAC-SHA256 PII Redactor]
        Redactor --> WORM[Immutable WORM Audit Sink]
        WORM --> LocalSink[Append-Only Audit Ledger]
        WORM --> S3Lock[AWS S3 Object Lock / Cloudflare R2]
    end
```

</details>

<details>
<summary><b>4. 💳 Transactional Order & Razorpay Payment State Machine (Click to expand)</b></summary>

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant W as Next.js 15 Web
    participant A as NestJS API
    participant R as Razorpay Gateway
    participant DB as PostgreSQL (Supabase)

    C->>W: Initiate Checkout
    W->>A: POST /api/payments/create-order
    A->>R: Create Razorpay Order (INR, Receipt ID)
    R-->>A: Order Created (order_id, amount)
    A-->>W: Client Order Payload

    C->>R: Authorize Payment via UPI / Card / NetBanking
    R-->>W: Payment Response (payment_id, order_id, signature)

    W->>A: POST /api/payments/verify
    Note over A: Verify HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    
    critical Atomic Database Transaction
        A->>DB: Lock inventory rows FOR UPDATE
        A->>DB: Decrement product stock
        A->>DB: Insert master order & split seller order items
        A->>DB: Record payment transaction
    end

    A-->>W: Order Confirmation
    W-->>C: Display Success & Order Tracking Details
```

</details>

<details>
<summary><b>5. 🧠 pgvector & Typesense Search / Recommendation Pipeline (Click to expand)</b></summary>

```mermaid
flowchart LR
    subgraph "Instant Search (Typesense)"
        Query[Search Input: 'iphon 15 pro'] --> Typo[Typo Tolerance Engine]
        Typo --> Facets[Facet & Category Filters]
        Facets --> Instant[Sub-15ms Autocomplete Results]
    end

    subgraph "Vector Similarity (pgvector)"
        Item[Product Interactions & Purchases] --> Embed[384-dimensional Embeddings]
        Embed --> Cosine[Cosine Distance Operator <=>]
        Cosine --> Decay[Exponential Time-Decay Scoring]
        Decay --> Recs[Personalized 'You May Also Like' Grid]
    end
```

</details>

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 🛒 Interactive Experience Tours

<details>
<summary><b>🛍️ Customer Experience Showcase (Click to expand)</b></summary>

- **Instant Autocomplete & Typo Tolerance**: Fast search matching across names, descriptions, categories, and sellers.
- **Dynamic Category Explorers**: Filter by price brackets, tags, ratings, and instant availability.
- **Interactive Product Dossier**: Tabbed specifications, detailed dimensions, high-resolution imagery, and verified seller trust cards.
- **Multi-Vendor Shared Cart**: Buy items from multiple independent sellers in a single checkout session.
- **Progressive Onboarding**: Seamless post-login profiling for address management and shipping preferences.

</details>

<details>
<summary><b>🏪 Seller Experience Showcase (Click to expand)</b></summary>

- **Merchant Portal**: Dedicated dashboard tracking revenue, order fulfillment status, low-stock warnings, and metrics.
- **Product & Inventory Engine**: Complete CRUD over listings, multi-image upload support, category tagging, and JSONB custom specifications.
- **Automated Payout Engine**: Transparent ledger detailing gross sales, marketplace commission deductions, and net pending payouts.
- **Order Dispatch Workflow**: One-click status updates from `PENDING` → `CONFIRMED` → `SHIPPED` → `DELIVERED`.

</details>

<details>
<summary><b>🛡️ Administrator Experience Showcase (Click to expand)</b></summary>

- **Enterprise RBAC**: Fine-grained permissions (`USERS_READ`, `SELLERS_APPROVE`, `FINANCE_PAYOUT`, `SYSTEM_CONFIG`).
- **Emergency Kill Switches**: Instant platform-wide kill switches to freeze payouts, disable new user registrations, or halt order placements.
- **Two-Man Rule Dual Approvals**: High-risk operations (e.g. manual balance adjustments, seller bans) require sign-off by a secondary admin.
- **WORM Audit Trail**: Write-Once-Read-Many tamper-proof logging with cryptographic SHA-256 chain verification.

</details>

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 🧪 Interactive Testing Suite

The repository contains **138 automated unit, integration, and security tests** across all monorepo workspaces:

```text
┌───────────────────────────────────────────────────────────┐
│              MONOREPO TEST SUITE SUMMARY                  │
├──────────────────────────────┬──────────────┬─────────────┤
│ Workspace                    │ Test Count   │ Status      │
├──────────────────────────────┼──────────────┼─────────────┤
│ apps/web (Next.js 15)        │ 32 Tests     │ ✅ PASSING  │
│ apps/api (NestJS)            │ 95 Tests     │ ✅ PASSING  │
│ packages/shared (Types/RLS)  │ 11 Tests     │ ✅ PASSING  │
├──────────────────────────────┼──────────────┼─────────────┤
│ Total Monorepo Test Coverage │ 138 Tests    │ ✅ ALL PASS │
└──────────────────────────────┴──────────────┴─────────────┘
```

<details open>
<summary><b>👉 Click to run and inspect test commands</b></summary>

```bash
# Run all tests across the entire monorepo
npm run test

# Run Next.js security hardening and auth tests
npm --prefix apps/web test

# Run NestJS API and Admin Governance tests
npm --prefix apps/api test

# Run Shared Package & Database Migration tests
npm --prefix packages/shared test

# Run k6 load testing against local API
k6 run test/k6/load-test.js
```

</details>

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 🧩 Interactive Feature Matrix

| Feature | Scope | Status | Technology |
|---|---|---|---|
| **Multi-Vendor Storefront** | Customer | `✅ Production` | Next.js 15, React 18, Tailwind CSS |
| **Passwordless Email Auth** | Security | `✅ Production` | OTP Verification, TimingSafeEqual, Redis Lockout |
| **Typo-Tolerant Search** | Core | `✅ Production` | Typesense, Prefixes, Faceted Filtering |
| **Vector Similarity Engine** | Core | `✅ Production` | PostgreSQL, pgvector (384-dim), Time-Decay |
| **Multi-Seller Cart & Orders** | Customer | `✅ Production` | Atomic DB Transactions, Inventory Mutex |
| **Razorpay Checkout** | Payments | `✅ Production` | Server-Side HMAC-SHA256 Signature Verification |
| **Seller Portal & Analytics** | Seller | `✅ Production` | Next.js Dashboard, Stock Tracking, Payout Ledger |
| **Admin RBAC & Governance** | Admin | `✅ Production` | NestJS Guards, Elevation Tokens, Dual-Approvals |
| **WORM Compliance Logging** | Admin | `✅ Production` | Immutable S3 / Local Object Lock Sink |
| **Cloudflare Edge Defense** | Security | `✅ Production` | Turnstile, Authenticated Origin Pulls, Upstash Rate Limiter |

<p align="right"><a href="#shopsell">⬆ Back to Top</a></p>

---

## 📚 Documentation Hub

Explore in-depth design specifications and implementation guides:

| Document | Purpose |
|---|---|
| [`docs/cloudflare-setup.md`](docs/cloudflare-setup.md) | Step-by-step Cloudflare Turnstile, WAF rules & Authenticated Origin Pulls guide |
| [`docs/security-fixes.md`](docs/security-fixes.md) | Exhaustive documentation of all Phase 1 & 2 security hardening implementations |
| [`docs/admin-management-and-governance.md`](docs/admin-management-and-governance.md) | Full architectural specification for Admin RBAC, elevation & kill-switches |
| [`docs/architecture.md`](docs/architecture.md) | Scaling topology: PgBouncer, Read Replicas, Redis Clusters & CDN Caching |
| [`docs/user-onboarding-specification.md`](docs/user-onboarding-specification.md) | Progressive profiling flow and onboarding modal specification |
| [`docs/admin/permissions.md`](docs/admin/permissions.md) | Comprehensive admin roles and permission code matrix |
| [`docs/admin/audit.md`](docs/admin/audit.md) | Cryptographic audit trail, redaction format, and sink interfaces |

---

<div align="center">

**Built with pride for high-scale multi-vendor commerce.**  
*Shop:Sell — Discover. Shop. Sell. Govern.*

[⬆ Back to Top](#shopsell)

</div>
