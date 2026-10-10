# Shop:Sell — Production Deployment Guide

This guide walks you through deploying the **Shop:Sell** Multi-Vendor Marketplace to production.

---

## Architecture Overview

- **Frontend (`apps/web`):** Next.js 15 (App Router, Tailwind CSS, Framer Motion)
- **Backend (`apps/api`):** NestJS (Express, BullMQ, TypeScript)
- **Shared Package (`packages/shared`):** Shared schemas, types, and security validators
- **Database:** Supabase PostgreSQL 16 (pgvector extension, Row Level Security)
- **Cache & Rate Limiting:** Upstash Redis
- **Search Engine:** Typesense Cloud
- **Email:** Gmail SMTP / Resend

---

## Deployment Topologies

Choose the setup that best fits your infrastructure:

### Option 1: Vercel (Frontend) + Railway / Render (Backend) *(Recommended)*

#### 1. Backend (`apps/api`) on Railway / Render
1. Connect your GitHub repository to Railway or Render.
2. Set Root Directory: `/` (repository root).
3. Set Build Command:
   ```bash
   npm run build
   ```
4. Set Start Command:
   ```bash
   npm --workspace=@shop-sell/api run start:prod
   ```
5. Configure Environment Variables (from `.env.example`):
   - `NODE_ENV=production`
   - `PORT=4000` (or leave default if cloud platform assigns `$PORT`)
   - `DATABASE_URL` (Supabase transaction pooler URL)
   - `JWT_SECRET` (generate with `openssl rand -hex 32`)
   - `ADMIN_JWT_SECRET` (generate with `openssl rand -hex 32`, distinct from `JWT_SECRET`)
   - `INTERNAL_API_SECRET` (generate with `openssl rand -hex 32`, match in frontend)
   - `LOG_HASH_KEY` (generate with `openssl rand -hex 32`)
   - `GMAIL_USER` and `GMAIL_APP_PASSWORD`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `CORS_ORIGIN=https://your-frontend-domain.com`
   - `FRONTEND_URL=https://your-frontend-domain.com`

#### 2. Frontend (`apps/web`) on Vercel
1. Import repository on Vercel.
2. Select Framework Preset: **Next.js**.
3. Build & Output Settings are automatically handled by [`vercel.json`](../vercel.json):
   - Build Command: `npm run --workspace=@shop-sell/shared build && npm run --workspace=@shop-sell/web build`
   - Output Directory: `apps/web/.next`
4. Configure Environment Variables in Vercel:
   - `NODE_ENV=production`
   - `API_PROXY_URL=https://your-api-domain.com`
   - `NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com`
   - `INTERNAL_API_SECRET` (same value as configured in the backend)
   - `JWT_SECRET` (same value as configured in the backend)
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` & `TURNSTILE_SECRET_KEY`

---

### Option 2: Single Server / VPS with Docker Compose

If you have a Linux VPS (DigitalOcean Droplet, AWS EC2, Hetzner, Linode):

1. Clone repository on the VPS:
   ```bash
   git clone <repo-url> /opt/shopsell
   cd /opt/shopsell
   ```
2. Copy and configure your production environment:
   ```bash
   cp .env.example .env
   # Edit .env with your production credentials
   nano .env
   ```
3. Launch with Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. Verify containers:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

## Database Migrations (Supabase)

Before launching traffic, apply database migrations to your Supabase PostgreSQL database:

```bash
# Apply migrations sequentially using psql or Supabase SQL Editor:
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00001_extensions.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00002_schema.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00003_indexes.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00004_rls.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00005_functions_triggers.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00009_firebase_auth.sql
psql "$DATABASE_DIRECT_URL" -f supabase/migrations/00010_upi_utr_verification.sql

# Seed initial categories and products:
psql "$DATABASE_DIRECT_URL" -f supabase/seeds/seed.sql
```

---

## Generating Production Secrets

Run the following commands to generate cryptographically secure 32-byte hex strings:

```bash
# JWT Secret:
openssl rand -hex 32

# Admin JWT Secret:
openssl rand -hex 32

# Internal API Proxy Secret:
openssl rand -hex 32

# Log Hash Secret:
openssl rand -hex 32
```

---

## Health Check & Verification

Once deployed, verify that both services are healthy:

1. **API Health Check:**
   ```bash
   curl -i https://your-api-domain.com/api/health
   # Expected: HTTP/1.1 200 OK {"status":"ok","service":"shop-sell-api",...}
   ```
2. **Frontend Availability:**
   ```bash
   curl -I https://your-frontend-domain.com/
   # Expected: HTTP/1.1 200 OK
   ```
3. **Security Headers Verification:**
   Ensure `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy` are active in the response headers.
