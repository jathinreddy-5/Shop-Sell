# SHOP:SELL PRODUCTION DEPLOYMENT & OPERATIONS GUIDE
**Zero-Docker Architecture: Hosted Cloud Platform Stack**

This guide documents the exact steps to deploy and operate the Shop:Sell multi-vendor marketplace across separate Development (`DEV`) and Production (`PROD`) environments using native cloud buildpacks (no Docker).

---

## 1. Cloud Architecture Overview

| Component | Provider | Build / Runtime Model | Scaling Strategy |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Vercel | Next.js 15 (App Router, Edge Runtime) | Serverless / Global Edge CDN |
| **Backend REST & GraphQL API** | Railway / Render | Native Node.js Buildpack (`node dist/main.js`) | Horizontal auto-scaling (1–10 instances) |
| **Background Jobs (BullMQ)** | Railway / Render | Native Node.js Worker (`node dist/worker.js`) | Concurrency = 5 per worker instance |
| **Primary Database** | Hosted Supabase | PostgreSQL 16 + `pgvector` + RLS | Connection Pooling (PgBouncer) + PITR |
| **Cache & Feed Store** | Upstash Redis | Serverless Redis with TLS (`rediss://`) | Automatic serverless auto-tiering |
| **Search Engine** | Typesense Cloud | Typo-Tolerant Distributed Cluster | High-availability dedicated nodes |
| **Object Storage & CDN** | Cloudflare R2 | S3-compatible, zero egress fees | Global Anycast edge cache |
| **Payments Gateway** | Razorpay | Standard Checkout + Webhooks (HMAC SHA256) | Idempotent webhook handling |

---

## 2. Project Provisioning (DEV vs. PROD)

Maintain strictly isolated cloud projects for Development and Production:

### A. Supabase PostgreSQL
1. Create two projects at [database.new](https://database.new):
   - `shopsell-dev` (Development & Integration Testing)
   - `shopsell-prod` (Production)
2. In each project, enable the `vector` extension in **Database -> Extensions -> vector**.
3. Retrieve:
   - **Transaction Pooler URL** (Port 6543) -> `DATABASE_URL`
   - **Direct Connection URL** (Port 5432) -> `DATABASE_DIRECT_URL`
   - **Project URL & Anon Key** -> `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - **Service Role Key** -> `SUPABASE_SERVICE_ROLE_KEY`

### B. Upstash Redis
1. Create two databases at [console.upstash.com](https://console.upstash.com):
   - `shopsell-redis-dev`
   - `shopsell-redis-prod`
2. Enable TLS (Encryption in Transit) and copy the Node.js `rediss://...` connection string to `REDIS_URL`.

### C. Typesense Cloud
1. Launch two clusters at [cloud.typesense.org](https://cloud.typesense.org):
   - Development cluster (1 vCPU, 0.5 GB RAM)
   - Production cluster (Multi-node HA, 2 vCPU, 4 GB RAM)
2. Generate Admin API keys (`TYPESENSE_API_KEY`) and Search-Only API keys (`NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY`).

### D. Razorpay Payments
1. Generate **Test API Keys** (`rzp_test_...`) for DEV.
2. Complete business KYC in Razorpay Dashboard to generate **Live API Keys** (`rzp_live_...`) for PROD.
3. Configure webhook endpoint `https://api.yourdomain.com/api/payments/webhook` with events:
   - `payment.captured`
   - `order.paid`
   - `refund.processed`

### E. Cloudflare R2
1. Create buckets:
   - `shopsell-media-dev`
   - `shopsell-media-prod`
2. Attach custom domain or enable public R2 dev domain.
3. Generate S3-compatible R2 API tokens (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).

---

## 3. Database Migration & Seeding

### Applying Migrations
All migrations are located in `supabase/migrations/` in deterministic order:
- `00001_initial_schema.sql` (Tables, ENUMs, foreign keys, vector dimension 384)
- `00002_rls_policies.sql` (Multi-role customer, owner, admin RLS policies)
- `00003_indexes.sql` (B-Tree, GIN trigram, and HNSW vector index)
- `00004_triggers.sql` (Auto-updated timestamps, vector synchronization)
- `00005_functions_triggers.sql` (Atomic checkout function `place_order_atomic`)
- `00006_refunds_and_audit_logs.sql` (Dedicated refunds, audit logs, and idempotency tables)

Run the migration script against your DEV database:
```bash
# 1. Verify service reachability
npm run doctor

# 2. Run migrations and initial seed catalog (200 products, 20 categories, 5 stores)
npm run seed

# 3. Index catalog into Typesense Cloud
npm run reindex
```

---

## 4. Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel.
2. Set **Root Directory** to `apps/web`.
3. Set **Framework Preset** to `Next.js`.
4. Configure Build & Development Settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. Configure Environment Variables in Vercel:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   NEXT_PUBLIC_SELLER_URL=https://seller.yourdomain.com
   NEXT_PUBLIC_ADMIN_URL=https://yourdomain.com/admin
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROD-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-PROD-ANON-KEY]
   NEXT_PUBLIC_TYPESENSE_HOST=[YOUR-PROD-CLUSTER].a1.typesense.net
   NEXT_PUBLIC_TYPESENSE_PORT=443
   NEXT_PUBLIC_TYPESENSE_PROTOCOL=https
   NEXT_PUBLIC_TYPESENSE_SEARCH_ONLY_API_KEY=[YOUR-SEARCH-KEY]
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_[YOUR-KEY-ID]
   ```
6. Click **Deploy**.

---

## 5. Backend API & BullMQ Worker Deployment (Railway or Render)

Deploy as two services using native Node buildpacks (no Docker):

### Service 1: API Server
- **Root Directory:** `.` (Monorepo root)
- **Build Command:** `npm run build`
- **Start Command:** `npm --workspace=@shop-sell/api run start:prod`
- **Health Check Path:** `/api/health`
- **Port:** `4000` (or platform default `$PORT`)
- **Environment Variables:** Provide all production keys from `.env.example`.

### Service 2: BullMQ Background Worker
- **Root Directory:** `.` (Monorepo root)
- **Build Command:** `npm run build`
- **Start Command:** `npm --workspace=@shop-sell/api run start:worker`
- **Service Type:** Background Worker (no public HTTP port needed)
- **Environment Variables:** `DATABASE_URL`, `REDIS_URL`, `TYPESENSE_*`.

---

## 6. Pre-Launch Verification Checklist

- [ ] **Doctor Check:** Run `npm run doctor` to ensure all 6 hosted services return `✅ PASS`.
- [ ] **Unit Tests:** `npm run test` passes 100% (all 52+ unit test suites).
- [ ] **Integration Tests:** `npm run test:integration` passes against DEV services.
- [ ] **E2E Browser Test:** `npm run test:e2e` passes with all 12 step screenshots saved.
- [ ] **Load Benchmarks:** `npm run test:load` proves p95 < 200ms (cached) and < 500ms (uncached).
- [ ] **Security Audit:** `npm run security:audit` confirms 0 client secret leaks, valid CORS, and HSTS.
- [ ] **Razorpay KYC:** Bank account verified and live webhook secret configured.
- [ ] **GST & Invoicing:** GSTIN validated for seller registrations.
- [ ] **DNS & SSL:** Custom domains configured with TLS 1.3 certificates.

---

## 7. Rollback Plan

If an issue occurs post-deployment:
1. **Frontend Rollback:** In Vercel Dashboard -> Deployments, click `Instant Rollback` on the previous working deployment (takes < 5 seconds).
2. **API Rollback:** In Railway/Render Dashboard -> Deployments -> Redeploy previous commit.
3. **Database Schema Rollback:**
   - Database migrations use non-breaking additions (e.g. additive columns, new tables).
   - If a rollback is required, execute the down-migration SQL script via Supabase SQL Editor.
4. **Cache Flush:** If corrupted cache data is suspected, trigger a cache flush:
   ```bash
   # Connect to Redis and flush recommendation feed keys
   redis-cli -u $REDIS_URL --scan --pattern "feed:*" | xargs redis-cli -u $REDIS_URL del
   ```

---

## 8. PostgreSQL Backup & Restore Procedures

### Automated Backups
- Supabase automatically takes daily physical snapshots and retains them for 7 days (Free tier) or 30 days (Pro tier with Point-in-Time Recovery).

### Manual CLI Backup (`pg_dump`)
Run a logical dump before any major schema update:
```bash
# Dump complete schema and data
pg_dump "$DATABASE_DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Full Restore Procedure
To restore the database from a backup file:
```bash
# 1. Restore into a fresh database or staging instance
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$DATABASE_DIRECT_URL" \
  backup_YYYYMMDD_HHMMSS.dump

# 2. Rebuild HNSW vector indexes
psql "$DATABASE_DIRECT_URL" -c "REINDEX TABLE public.products;"

# 3. Synchronize Typesense index
npm run reindex
```
