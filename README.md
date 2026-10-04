# Shop:Sell — Production-Grade Multi-Vendor Marketplace (No Docker Architecture)

A high-performance, multi-vendor marketplace platform built for scale, featuring real-time personalized recommendations, typo-tolerant search, transactional inventory management, and role-based dual identity (Customer + Seller + Admin).

Built with **Zero Docker dependencies** using best-of-breed serverless and hosted cloud platforms:
- **Primary Database**: Hosted PostgreSQL on Supabase (`pgvector`, RLS, JSONB, monthly partitions)
- **Cache, Rate Limiting & Queues**: Upstash Serverless Redis (free tier) + BullMQ
- **Typo-Tolerant Search & Autocomplete**: Typesense Cloud
- **Payments**: Razorpay (INR) with server-side HMAC SHA256 signature verification & webhooks
- **Media Storage & CDN**: Cloudflare R2 with custom public domain
- **Frontend Hosting**: Vercel (Next.js 15 App Router)
- **API & Worker Hosting**: Railway or Render (Native Node.js buildpacks, no containers)

---

## 🏗️ Monorepo Architecture

```
Shop:Sell/
├── apps/
│   ├── web/                              # Next.js 15 (App Router, TS, Tailwind, shadcn/ui)
│   │   ├── src/app/
│   │   │   ├── (customer)/               # Customer routes: Home feed, Search, Product, Cart, Checkout, Orders
│   │   │   ├── (seller)/                 # Seller routes: Dashboard, Products, Orders, Inventory alerts
│   │   │   │                             # (Subdomain-ready via Next.js middleware)
│   │   │   └── admin/                    # Admin routes: Applications, Moderation, Disputes, Analytics, Categories
│   │   └── src/middleware.ts             # Role enforcement + Subdomain rewriting (seller.*)
│   └── api/                              # NestJS modular backend (REST + GraphQL foundation)
│       └── src/
│           ├── common/                   # SupabaseAuthGuard, RolesGuard, RateLimitGuard, Redis factory
│           ├── database/                 # PostgreSQL pool with transaction & error resilience
│           ├── modules/                  # Auth, Products, Sellers, Search, Cart, Orders, Payments, Events, Recommendations, Admin, Payouts
│           └── worker.ts                 # Dedicated BullMQ async worker process
├── packages/
│   └── shared/                           # Shared TypeScript types, Zod schemas, constants, decay math (λ = ln(2)/7)
├── scripts/
│   ├── seed.ts                           # Cloud database migration & 200-product seed runner
│   └── reindex.ts                        # Typesense Cloud catalog indexer
├── supabase/
│   ├── migrations/                       # SQL migrations (pgvector, ACID schemas, RLS, Indexes, Triggers)
│   └── seeds/
│       └── seed.sql                      # 20 categories, 5 sellers & stores, 200 products with 384-dim embeddings
├── test/
│   └── k6/load-test.js                   # High-concurrency load testing script (300 VUs, p95 < 200ms)
├── .github/workflows/ci.yml              # CI pipeline (install, type-check, test — no container builds)
├── .env.example                          # Environment configuration template for all hosted services
├── docs/architecture.md                  # Scaling guide: Read replicas, PgBouncer, CDN caching, Sharding
└── package.json                          # Monorepo workspaces & development scripts
```

---

## ☁️ Hosted Services Setup Guide (Free Tier)

No local Docker daemon is needed. Set up the free-tier cloud accounts below and configure `.env`:

### 1. Hosted Supabase (Database & Auth)
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In **Project Settings -> Database -> Connection String**:
   - Copy the URI for **Transaction Pooler** (`port 6543`) as `DATABASE_URL`.
   - Copy the URI for **Session connection** (`port 5432`) as `DATABASE_DIRECT_URL`.
3. In **Project Settings -> API**:
   - Copy `Project URL` to `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL`.
   - Copy `anon public` key to `SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Copy `service_role secret` to `SUPABASE_SERVICE_ROLE_KEY`.
   - Copy `JWT Secret` to `SUPABASE_JWT_SECRET`.

### 2. Upstash Redis (Cache, Feed, Rate Limiter & BullMQ)
1. Go to [upstash.com](https://upstash.com) and create a free serverless Redis database.
2. Under **Connect Details**, choose **Node.js (ioredis)** and copy the connection string:
   - Paste into `REDIS_URL` in `.env` (starts with `rediss://...`).

### 3. Typesense Cloud (Search & Autocomplete)
1. Go to [cloud.typesense.org](https://cloud.typesense.org) and launch a free/starter cluster.
2. Under **Cluster Dashboard -> Generate API Keys**:
   - Copy the cluster hostname (e.g. `xxx.a1.typesense.net`) to `TYPESENSE_HOST` and `NEXT_PUBLIC_TYPESENSE_HOST`.
   - Set `TYPESENSE_PORT=443` and `TYPESENSE_PROTOCOL=https`.
   - Copy the Admin API Key to `TYPESENSE_API_KEY`.
   - Copy or generate a Search-Only Key to `NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY`.

### 4. Razorpay (Payments in INR)
1. Go to [dashboard.razorpay.com](https://dashboard.razorpay.com) (free sandbox test mode).
2. Under **Settings -> API Keys**, generate a test key:
   - Copy Key ID to `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
   - Copy Key Secret to `RAZORPAY_KEY_SECRET`.
3. Under **Settings -> Webhooks**, configure a webhook secret and set `RAZORPAY_WEBHOOK_SECRET`.

### 5. Cloudflare R2 (Product Media Storage)
1. Go to [Cloudflare Dashboard -> R2](https://dash.cloudflare.com) and create a bucket `shopsell-product-media`.
2. Generate an R2 API token with read/write access:
   - Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`.
   - Connect a public domain or enable R2.dev domain for `R2_PUBLIC_DOMAIN`.

---

## 🚀 Quickstart & Development

### 1. Clone & Install
```bash
git clone https://github.com/your-org/shop-sell.git
cd shop-sell
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and paste your hosted credentials from the guide above
```

### 3. Apply Migrations & Seed Hosted Database
```bash
npm run seed
```
This connects to your hosted Supabase instance, automatically applies the 5 SQL migrations, and populates 20 categories, 5 seller stores, and 200 sample products with 384-dimensional unit vector embeddings.

### 4. Reindex Catalog into Typesense Cloud
```bash
npm run reindex
```
Syncs all active products from PostgreSQL into Typesense Cloud with schema facets, typo tolerance, and prefix matching.

### 5. Start Development Servers (Concurrent)
```bash
npm run dev
```
Starts both the **NestJS Backend API** (port 4000) and **Next.js 15 Web Application** (port 3000) simultaneously using `concurrently`.

To run components individually:
```bash
# Frontend only (Next.js)
npm run dev:web

# Backend API only (NestJS)
npm run dev:api

# BullMQ Background Worker service
npm run worker
```

---

## 🧪 Automated Testing

Run the full monorepo test suite (52 tests across all workspaces):
```bash
npm run test
```
- **`@shop-sell/shared`**: Decay math ($\lambda = \ln(2)/7$), Zod schemas, database migration integrity.
- **`@shop-sell/api`**: Supabase JWT guards, dual-role enforcement, Typesense filter generation, ACID order placement, Razorpay payment verification, recommendation blended scoring, diversity capping, store payout calculation, and sliding-window rate limiting.
- **`@shop-sell/web`**: Subdomain routing middleware (`seller.*` and `vendor.*`), role hierarchy navigation.

### Run High-Concurrency Load Test (k6)
```bash
k6 run test/k6/load-test.js
```
Simulates 300 virtual users across homepage feed requests, debounced search autocomplete, product detail pages, and checkout, asserting `p95 < 200ms` and `errorRate < 0.01`.

---

## 🚢 Production Deployment (No Containers)

### 1. Frontend: Vercel
- Connect the Git repository to [Vercel](https://vercel.com).
- Root Directory: `apps/web`.
- Framework Preset: `Next.js`.
- Build Command: `npm run build`.
- Add environment variables (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_TYPESENSE_*`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`).

### 2. Backend API: Railway or Render
- Connect repository to [Railway](https://railway.app) or [Render](https://render.com).
- Choose **Native Node.js Environment** (not Docker).
- Root Directory: `apps/api` (or run from root with workspaces).
- Build Command: `npm run build`.
- Start Command: `npm run start:prod` (or `node dist/main.js`).
- Add environment variables (`DATABASE_URL`, `REDIS_URL`, `SUPABASE_*`, `TYPESENSE_*`, `RAZORPAY_*`, `R2_*`).

### 3. Background Workers (BullMQ): Second Node.js Service
- In Railway or Render, create a second Background Worker service pointing to the same repository.
- Build Command: `npm run build`.
- Start Command: `npm run start:worker` (or `node dist/worker.js`).
- Shares the same `REDIS_URL`, `DATABASE_URL`, and `TYPESENSE_*` environment variables.

---

## 🔒 Cloudflare Security, Turnstile & Origin Protection

Shop:Sell incorporates a defense-in-depth edge security posture via Cloudflare:
- **Cloudflare Turnstile**: Managed challenge protection on login (`/login`), OTP generation (`/api/auth/request-otp`), and seller applications (`/become-a-seller`).
- **Cryptographic Token Verification**: Edge middleware verifies short-lived (15 min) JWT access tokens via `jose` (HS256) using `JWT_SECRET`. Client-submitted `shopsell_roles` cookies are never trusted for authorization.
- **Shared-Store Rate Limiting**: Per-email and per-IP login throttling, 5 OTPs/hour limit, and lockout after 5 failed verification attempts via Upstash Redis.
- **Origin Protection & Authenticated Origin Pulls**: Ensure origin web traffic is strictly restricted to official Cloudflare IP ranges and verified via client TLS certificates.
- **Detailed Checklist**: Refer to [`docs/cloudflare-setup.md`](file:///Users/jathinreddy/Desktop/Shop:Sell/docs/cloudflare-setup.md) for step-by-step dashboard instructions.

---

## ⚡ Scaling Architecture

Refer to [`docs/architecture.md`](file:///Users/jathinreddy/Desktop/Shop:Sell/docs/architecture.md) for details on PgBouncer pooling, read replica distribution, CDN caching, Redis cluster topology, and partitioning/sharding strategies.
