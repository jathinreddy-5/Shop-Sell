# Shop:Sell — High-Traffic Architecture & Scaling Guide

This document outlines the architectural blueprints, traffic patterns, and data layer scaling strategies for **Shop:Sell** as the platform grows from 10k to 10M+ daily active users.

---

## 1. Primary Database & Read Replicas

### Topology
- **Primary Node (Writer)**: Dedicated exclusively to state mutations — order placement (ACID transactions with row locks), cart updates, application review, seller product CRUD, and inventory changes.
- **Read Replicas (Readers)**:
  - 2+ read replicas behind an internal DNS / load-balanced endpoint (`DATABASE_REPLICA_URL`).
  - Read queries for catalog browsing, product detail pages (PDPs), category navigation, and seller dashboard analytics route to replicas.
  - Replicas scale independently with streaming asynchronous replication (sub-10ms replication lag).

### Connection Pooling with PgBouncer
- **Mode**: Transaction Pooling (`pool_mode = transaction`).
- **Rationale**: Next.js Server Components and NestJS endpoints hold connections only for the duration of the query/transaction rather than idle connection-per-client.
- **Capacity**: Reduces 5,000 concurrent web client connections to 50–100 actual PostgreSQL backend server connections, preventing backend memory exhaustion and context-switching bottlenecks.
- **Prepared Statements**: Configured with `server_reset_query = DISCARD ALL` or statement naming disabled for compatibility with transaction-level pooling.

---

## 2. Recommendation Engine & Redis Architecture

### Redis Cluster Topology
- **Production Setup**: Redis Cluster with 3 master nodes and 3 replicas across separate Availability Zones.
- **Key Partitioning / Hash Tags**:
  - User-specific keys use hash tags `{uid}` to ensure co-location on the same cluster slot:
    - `{uid}:recent_searches` (Sorted set, score = timestamp, cap 50, TTL 90 days)
    - `{uid}:recent_views` (Sorted set of product IDs, cap 100)
    - `{uid}:interest` (Hash of decayed category/term weights)
    - `{uid}:feed` (Precomputed homepage feed, TTL 5 min)
- **High Throughput Event Buffer**:
  - High velocity user clickstream events (`impression`, `view`, `click`) write directly to Redis Stream `stream:events` or temporary memory buffer before async batch ingestion into Postgres `user_events` partitions via BullMQ workers.

---

## 3. Storage & CDN Edge Caching

### Cloudflare R2 + Edge CDN
- **Asset Storage**: Cloudflare R2 provides S3-compatible zero-egress fee storage for product media, vendor logos, and review attachments.
- **Image Optimization & Transformations**:
  - Dynamic sizing, format conversion (WebP/AVIF), and quality reduction happen on the CDN edge via Cloudflare Image Optimization.
- **Cache-Control Headers**:
  - Product media URLs include content hashes (e.g., `https://media.shopsell.in/products/{uuid}_{hash}.webp`).
  - Cache-Control: `public, max-age=31536000, immutable`.
- **API & Catalog Edge Caching**:
  - Category listings and static product pages are served with `Cache-Control: s-maxage=60, stale-while-revalidate=300`.
  - Immediate cache purges triggered via Cloudflare API webhook when a seller updates product price or status.

---

## 4. Partitioning & When to Shard

### Current Table Partitioning
- **`user_events` Table**: Partitioned by Range (`PARTITION BY RANGE (created_at)`), partitioned monthly.
  - Allows dropping older historical partitions instantaneously (`DROP TABLE user_events_2025_01`) without table-locking `DELETE` queries.
  - Retains index efficiency for monthly analytical rollups.

### Horizontal Sharding Triggers (When to Shard)
Shop:Sell should move from a single Postgres cluster (Primary + Read Replicas) to horizontal sharding when any of the following triggers are met:

1. **Write IOPS Saturation**: Primary writer node write IOPS consistently exceed 80% on maximum enterprise provisioned SSDs (e.g. > 64,000 IOPS).
2. **Order Volume**: Sustained order placement rate exceeds 1,000 orders/sec during flash sales.
3. **Table Size**: Primary transactional tables (`orders`, `order_items`) exceed 500 million rows and table bloat degrades autovacuum.

### Sharding Strategy
- **Sharding Key**: `store_id` (Tenant-based sharding for Seller/Store domain) or `user_id` (Consistent hash ring for Orders and Carts).
- **Tooling**: Citus Data extension for PostgreSQL or Vitess-style routing layer.

---

## 5. Security & Isolation Matrix

| Layer | Mechanism | Protection |
| :--- | :--- | :--- |
| **Edge / Ingress** | Cloudflare WAF + Rate Limiting | DDoS protection, bot filtering, brute force prevention |
| **API Boundary** | NestJS `SupabaseAuthGuard` & `RolesGuard` | Validates cryptographically signed JWTs, extracts dual-roles (`customer`, `owner`, `admin`) |
| **Database Layer** | PostgreSQL Row-Level Security (RLS) | Hard defense-in-depth: Customers cannot select foreign orders/carts; Sellers cannot read/write foreign stores/products |
| **Transactional Integrity** | `SELECT ... FOR UPDATE` | Prevents inventory race conditions and negative stock on concurrent flash sales |
| **Payment Webhooks** | Idempotency Key + HMAC Signature Verification | Guarantees zero double-charging or double-order processing |
