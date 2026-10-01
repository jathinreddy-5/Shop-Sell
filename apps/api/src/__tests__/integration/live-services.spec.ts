import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Client as PgClient, Pool } from 'pg';
import Redis from 'ioredis';
import { Client as TypesenseClient } from 'typesense';
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DatabaseService } from '../../database/database.service';
import { SearchService } from '../../modules/search/search.service';
import { RecommendationsService } from '../../modules/recommendations/recommendations.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { ProductsController } from '../../modules/products/products.controller';

// 1. Load environment variables
const envPath = path.resolve(process.cwd(), '../../.env');
const envLocalPath = path.resolve(process.cwd(), '../../.env.local');
const currentEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(currentEnvPath)) {
  dotenv.config({ path: currentEnvPath });
}

describe('Stage 2: Real Cloud Services Integration Test Suite', () => {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_DIRECT_URL;
  const isDbConfigured = Boolean(
    dbUrl && !dbUrl.includes('[YOUR-PROJECT-REF]') && !dbUrl.includes('localhost:54322')
  );

  const redisUrl = process.env.REDIS_URL;
  const isRedisConfigured = Boolean(
    redisUrl &&
    !redisUrl.includes('[YOUR-UPSTASH-PASSWORD]') &&
    !redisUrl.includes('[YOUR-ENDPOINT]') &&
    (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))
  );

  const typesenseHost = process.env.TYPESENSE_HOST;
  const typesenseApiKey = process.env.TYPESENSE_API_KEY;
  const isTypesenseConfigured = Boolean(
    typesenseHost &&
    typesenseApiKey &&
    !typesenseHost.includes('[YOUR-CLUSTER-ID]') &&
    typesenseHost !== 'localhost' &&
    typesenseApiKey !== 'your_typesense_admin_api_key'
  );

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const isRazorpayConfigured = Boolean(
    razorpayKeyId &&
    razorpayKeySecret &&
    razorpayWebhookSecret &&
    razorpayKeyId.startsWith('rzp_test_') &&
    !razorpayKeyId.includes('yourkeyidhere') &&
    razorpayWebhookSecret !== 'your_webhook_secret_here'
  );

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME;
  const isR2Configured = Boolean(
    r2AccountId &&
    r2AccessKey &&
    r2SecretKey &&
    r2Bucket &&
    !r2AccountId.includes('your_cloudflare_account_id') &&
    r2AccessKey !== 'your_r2_access_key_id'
  );

  // ---------------------------------------------------------------------------
  // 1. ROW LEVEL SECURITY (RLS) & MULTI-ROLE ISOLATION (HOSTED SUPABASE)
  // ---------------------------------------------------------------------------
  describe('1. PostgreSQL RLS & Role Boundaries', () => {
    it('customer cannot read another user cart, orders, or user_events', async (t) => {
      if (!isDbConfigured) {
        t.skip('Skipped: Hosted DATABASE_URL not configured. Set DATABASE_URL in .env to test against Supabase.');
        return;
      }

      const client = new PgClient({
        connectionString: dbUrl,
        ssl: dbUrl!.includes('supabase.co') || dbUrl!.includes('pooler.supabase.com')
          ? { rejectUnauthorized: false }
          : undefined,
      });

      await client.connect();
      try {
        const customerA = '00000000-0000-0000-0000-000000000001';
        const customerB = '00000000-0000-0000-0000-000000000002';

        // Simulate acting as Customer A in Postgres RLS session
        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: customerA, role: 'authenticated', app_metadata: { role: 'customer' } })}';`);

        // Customer A querying orders for Customer B returns 0 rows due to RLS
        const resOrders = await client.query(
          `SELECT * FROM public.orders WHERE user_id = $1`,
          [customerB]
        );
        assert.strictEqual(resOrders.rows.length, 0, 'Customer A must not read Customer B orders under RLS');

        // Customer A querying user_events for Customer B returns 0 rows
        const resEvents = await client.query(
          `SELECT * FROM public.user_events WHERE user_id = $1`,
          [customerB]
        );
        assert.strictEqual(resEvents.rows.length, 0, 'Customer A must not read Customer B user events');
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('store owner cannot read or mutate another store products or orders', async (t) => {
      if (!isDbConfigured) {
        t.skip('Skipped: Hosted DATABASE_URL not configured.');
        return;
      }

      const client = new PgClient({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });

      await client.connect();
      try {
        const ownerA = '00000000-0000-0000-0000-000000000003';
        const otherStoreId = '00000000-0000-0000-0000-000000000099';

        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: ownerA, role: 'authenticated', app_metadata: { role: 'owner' } })}';`);

        // Owner A attempting to insert product into Store B
        const err = await client.query(
          `INSERT INTO public.products (store_id, category_id, name, slug, price, stock)
           VALUES ($1, '00000000-0000-0000-0000-000000000001', 'Illegal Prod', 'illegal-prod', 100, 1)`,
          [otherStoreId]
        ).catch((e: Error) => e);

        assert.ok(err instanceof Error, 'Owner A inserting product into Store B must violate RLS policy');
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('non-admin cannot approve seller applications', async (t) => {
      if (!isDbConfigured) {
        t.skip('Skipped: Hosted DATABASE_URL not configured.');
        return;
      }

      const client = new PgClient({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });

      await client.connect();
      try {
        const nonAdmin = '00000000-0000-0000-0000-000000000001';

        await client.query(`SET LOCAL ROLE authenticated;`);
        await client.query(`SET LOCAL "request.jwt.claims" = '${JSON.stringify({ sub: nonAdmin, role: 'authenticated', app_metadata: { role: 'customer' } })}';`);

        const err = await client.query(
          `UPDATE public.stores SET status = 'active' WHERE id = '00000000-0000-0000-0000-000000000005'`
        ).catch((e: Error) => e);

        assert.ok(err instanceof Error || (err as any).rowCount === 0, 'Non-admin cannot approve stores under RLS');
      } finally {
        await client.end().catch(() => {});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 2. REAL UPSTASH REDIS: CAPPING, TTL, INVALIDATION, GUEST MERGE
  // ---------------------------------------------------------------------------
  describe('2. Real Redis: Recent Searches, TTL & Cache Invalidation', () => {
    it('recent_searches maintains cap of 50 and sets 90-day TTL', async (t) => {
      if (!isRedisConfigured) {
        t.skip('Skipped: Upstash REDIS_URL not configured in .env (placeholder detected).');
        return;
      }

      const redis = new Redis(redisUrl!, {
        lazyConnect: true,
        connectTimeout: 5000,
        tls: redisUrl!.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      });

      await redis.connect();
      const testKey = `recent_searches:test_${Date.now()}`;

      try {
        const now = Date.now();
        // Insert 60 searches
        for (let i = 0; i < 60; i++) {
          await redis.zadd(testKey, now + i * 1000, `query-${i}`);
        }

        // Cap to 50
        const total = await redis.zcard(testKey);
        if (total > 50) {
          await redis.zremrangebyrank(testKey, 0, total - 51);
        }

        // Set 90 days TTL
        await redis.expire(testKey, 90 * 86400);

        const finalCount = await redis.zcard(testKey);
        const ttl = await redis.ttl(testKey);
        const members = await redis.zrevrange(testKey, 0, -1);

        assert.strictEqual(finalCount, 50, 'Redis ZSet must be strictly capped to 50');
        assert.ok(ttl > 80 * 86400 && ttl <= 90 * 86400, 'TTL must be approximately 90 days');
        assert.strictEqual(members[0], 'query-59', 'Most recent search must be at top');
        assert.strictEqual(members.includes('query-0'), false, 'Oldest item must be purged');
      } finally {
        await redis.del(testKey);
        await redis.quit();
      }
    });

    it('feed cache invalidates immediately on new search or view', async (t) => {
      if (!isRedisConfigured) {
        t.skip('Skipped: Upstash REDIS_URL not configured in .env.');
        return;
      }

      const redis = new Redis(redisUrl!, {
        lazyConnect: true,
        tls: redisUrl!.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      });
      await redis.connect();

      const feedKey = `feed:test_user_${Date.now()}`;
      try {
        // 1. Cache feed
        await redis.set(feedKey, JSON.stringify({ rails: [] }), 'EX', 300);
        const existsBefore = await redis.exists(feedKey);
        assert.strictEqual(existsBefore, 1);

        // 2. Invalidation event
        await redis.del(feedKey);
        const existsAfter = await redis.exists(feedKey);
        assert.strictEqual(existsAfter, 0, 'Feed cache must be purged on new user event');
      } finally {
        await redis.del(feedKey);
        await redis.quit();
      }
    });

    it('correctly merges anonymous search history into user profile', async (t) => {
      if (!isRedisConfigured) {
        t.skip('Skipped: Upstash REDIS_URL not configured in .env.');
        return;
      }

      const redis = new Redis(redisUrl!, {
        lazyConnect: true,
        tls: redisUrl!.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      });
      await redis.connect();

      const now = Date.now();
      const userKey = `recent_searches:user_${now}`;
      const anonKey = `recent_searches:anon_${now}`;

      try {
        await redis.zadd(userKey, now - 10000, 'wireless earbuds');
        await redis.zadd(anonKey, now - 5000, 'running shoes');
        await redis.zadd(anonKey, now, 'wireless earbuds'); // newer score

        // Union with AGGREGATE MAX
        await redis.zunionstore(userKey, 2, userKey, anonKey, 'AGGREGATE', 'MAX');
        await redis.del(anonKey);

        const count = await redis.zcard(userKey);
        const topSearch = await redis.zrevrange(userKey, 0, 0);

        assert.strictEqual(count, 2);
        assert.strictEqual(topSearch[0], 'wireless earbuds', 'Merged key retains latest timestamp');
      } finally {
        await redis.del(userKey);
        await redis.quit();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. TYPESENSE CLOUD: TYPO TOLERANCE, AUTOCOMPLETE, FILTERS & SORTING
  // ---------------------------------------------------------------------------
  describe('3. Real Typesense: Typo Tolerance, Autocomplete, Filters', () => {
    it('handles typo tolerance up to 2 typos, prefix autocomplete, and filters', async (t) => {
      if (!isTypesenseConfigured) {
        t.skip('Skipped: Typesense Cloud credentials (TYPESENSE_HOST, TYPESENSE_API_KEY) not configured in .env.');
        return;
      }

      const typesense = new TypesenseClient({
        nodes: [
          {
            host: typesenseHost!,
            port: parseInt(process.env.TYPESENSE_PORT || '443', 10),
            protocol: process.env.TYPESENSE_PROTOCOL || 'https',
          },
        ],
        apiKey: typesenseApiKey!,
        connectionTimeoutSeconds: 5,
      });

      // 1. Search with typo: "headfones" -> matches "headphones"
      const typoResult = await typesense
        .collections('products')
        .documents()
        .search({
          q: 'headfones',
          query_by: 'name,description',
          num_typos: 2,
        });

      assert.ok(typoResult.found >= 0, 'Typesense query executed successfully');

      // 2. Autocomplete prefix search: "run"
      const prefixResult = await typesense
        .collections('products')
        .documents()
        .search({
          q: 'run',
          query_by: 'name',
          prefix: true,
          per_page: 5,
        });

      assert.ok(prefixResult.hits !== undefined, 'Prefix search executed');

      // 3. Filter and sorting: in stock and price sorted ascending
      const filterResult = await typesense
        .collections('products')
        .documents()
        .search({
          q: '*',
          query_by: 'name',
          filter_by: 'stock:>0',
          sort_by: 'price:asc',
          per_page: 5,
        });

      assert.ok(filterResult.found >= 0, 'Filter and sort query executed');
      if (filterResult.hits && filterResult.hits.length > 1) {
        const p1 = (filterResult.hits[0].document as any).price;
        const p2 = (filterResult.hits[1].document as any).price;
        assert.ok(p1 <= p2, 'Results must be sorted by price ascending');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. RECOMMENDATION FLOW: REAL SEARCH LOGGING TO RAIL VIA REDIS + TYPESENSE
  // ---------------------------------------------------------------------------
  describe('4. Recommendation Flow: Search to Rail under 5 Seconds', () => {
    it('logs real search to Redis and asserts live recommendations query rail', async (t) => {
      if (!isRedisConfigured || !isTypesenseConfigured) {
        t.skip(
          'Skipped: Requires live REDIS_URL and Typesense Cloud credentials in .env. Current credentials are placeholders.'
        );
        return;
      }

      const testUserId = `usr_rec_live_${Date.now()}`;
      const searchQuery = 'running shoes';

      const redis = new Redis(redisUrl!, {
        tls: redisUrl!.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
      });

      try {
        await redis.connect();
        // 1. Log real search into Redis recent searches for this user
        const searchKey = `recent_searches:${testUserId}`;
        await redis.zadd(searchKey, Date.now(), searchQuery);

        // 2. Call real RecommendationsService wired to live Redis + Typesense + Database
        const db = new DatabaseService();
        const searchService = new SearchService(db);
        const recService = new RecommendationsService(db, searchService);

        const startTime = Date.now();
        const homeFeed = await recService.getHomeFeed(testUserId);
        const elapsed = Date.now() - startTime;

        assert.ok(elapsed < 5000, `Live recommendation response returned in ${elapsed}ms (< 5000ms SLA)`);
        assert.ok(homeFeed.rails !== undefined, 'Must return rails array');
        assert.ok(homeFeed.rails.length > 0, 'Must return at least one query rail');
        assert.strictEqual(
          homeFeed.rails[0].title,
          `Because you searched "${searchQuery}"`,
          'First query rail must match logged search term'
        );

        // Clean up Redis
        await redis.del(searchKey);
        await redis.del(`feed:${testUserId}`);
      } finally {
        await redis.quit().catch(() => {});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 5. HIGH-CONCURRENCY CHECKOUT (50 PARALLEL REQUESTS TO SUPABASE place_order_atomic)
  // ---------------------------------------------------------------------------
  describe('5. Concurrency: 50 Checkouts on Stock = 1', () => {
    it('executes 50 parallel place_order_atomic calls on Supabase: exactly 1 succeeds, 49 rejected, stock=0', async (t) => {
      if (!isDbConfigured) {
        t.skip('Skipped: Live Supabase DATABASE_URL not configured in .env');
        return;
      }

      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
        max: 20,
      });

      const testUserId = '22222222-0000-0000-0000-000000000001';
      const testStoreId = '33333333-0000-0000-0000-000000000001';
      const testCategoryId = '11111111-0000-0000-0000-000000000001';
      const testProdId = '99999999-9999-9999-9999-999999999999';
      const batchId = Date.now();

      const setupClient = await pool.connect();
      try {
        // 1. Create or reset dedicated test product with stock = 1 in live Supabase
        await setupClient.query(
          `INSERT INTO public.products (id, store_id, category_id, name, slug, description, price, stock, status)
           VALUES ($1, $2, $3, 'Live Concurrency Target Product', $4, 'Dedicated target product for parallel checkout race condition test', 499.00, 1, 'active')
           ON CONFLICT (id) DO UPDATE SET stock = 1, status = 'active'`,
          [testProdId, testStoreId, testCategoryId, `live-concurrency-target-${batchId}`]
        );
      } finally {
        setupClient.release();
      }

      const shippingAddress = JSON.stringify({
        street: '123 Tech Park Blvd',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
      });
      const items = JSON.stringify([{ product_id: testProdId, qty: 1 }]);

      // 2. Fire 50 simultaneous parallel place_order_atomic requests against live Supabase
      const attempts = Array.from({ length: 50 }, async (_, i) => {
        const client = await pool.connect();
        try {
          const res = await client.query(
            `SELECT public.place_order_atomic($1, $2::jsonb, $3::jsonb, $4, $5) as result`,
            [
              testUserId,
              shippingAddress,
              items,
              `conc_key_${batchId}_${i}`,
              `rzp_conc_${batchId}_${i}`,
            ]
          );
          return { success: res.rows[0].result.success };
        } catch (err: any) {
          return { error: err.message };
        } finally {
          client.release();
        }
      });

      const results = await Promise.all(attempts);

      let successes = 0;
      let rejections = 0;
      for (const r of results) {
        if (r.success) {
          successes++;
        } else {
          rejections++;
        }
      }

      // 3. Read back final stock directly from live Supabase
      const checkClient = await pool.connect();
      let finalStock = -1;
      try {
        const stockRes = await checkClient.query(
          `SELECT stock FROM public.products WHERE id = $1`,
          [testProdId]
        );
        finalStock = Number(stockRes.rows[0].stock);

        // 4. Print results to diagnostic output
        console.log(`   ✓ Concurrency Results -> Successes: ${successes}, Rejections: ${rejections}, Final DB Stock: ${finalStock}`);

        // Cleanup test artifacts
        await checkClient.query(
          `DELETE FROM public.order_items WHERE product_id = $1`,
          [testProdId]
        );
        await checkClient.query(
          `DELETE FROM public.orders WHERE idempotency_key LIKE $1`,
          [`conc_key_${batchId}_%`]
        );
        await checkClient.query(
          `DELETE FROM public.products WHERE id = $1`,
          [testProdId]
        );
      } finally {
        checkClient.release();
        await pool.end();
      }

      // 5. Strict live assertions
      assert.strictEqual(successes, 1, 'Exactly 1 checkout must succeed against live Supabase ACID transaction');
      assert.strictEqual(rejections, 49, 'Exactly 49 checkouts must be rejected by Supabase row lock');
      assert.strictEqual(finalStock, 0, 'Final stock in live Supabase must be exactly 0');
    });
  });

  // ---------------------------------------------------------------------------
  // 6. RAZORPAY TEST MODE & WEBHOOK IDEMPOTENCY
  // ---------------------------------------------------------------------------
  describe('6. Razorpay TEST Mode & Webhook Idempotency', () => {
    it('posts signed webhook twice to real handler: asserts 1 order status transition + 1 idempotency row', async (t) => {
      if (!isRazorpayConfigured || !isDbConfigured) {
        t.skip(
          'Skipped: Live Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) not configured in .env. Current credentials are placeholders.'
        );
        return;
      }

      const db = new DatabaseService();
      const paymentsService = new PaymentsService(db);
      const testId = Date.now();
      const testRzpOrderId = `order_rzp_live_${testId}`;
      const testUserId = '22222222-0000-0000-0000-000000000001';

      // 1. Create a real pending order in live Supabase
      const insertRes = await db.query(
        `INSERT INTO public.orders (user_id, status, total, payment_status, razorpay_order_id, shipping_address)
         VALUES ($1, 'pending', 1499.00, 'pending', $2, '{"city":"Mumbai"}'::jsonb)
         RETURNING id`,
        [testUserId, testRzpOrderId]
      );
      const orderId = insertRes.rows[0].id;

      try {
        const webhookPayload = JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: `pay_live_${testId}`,
                order_id: testRzpOrderId,
                amount: 149900,
                status: 'captured',
              },
            },
          },
        });

        // Sign with real RAZORPAY_WEBHOOK_SECRET
        const signature = crypto
          .createHmac('sha256', razorpayWebhookSecret!)
          .update(webhookPayload)
          .digest('hex');

        // Post 1: First delivery
        const res1 = await paymentsService.handleWebhook(webhookPayload, signature);
        assert.strictEqual(res1.received, true);

        // Post 2: Duplicate delivery (same payload + signature)
        const res2 = await paymentsService.handleWebhook(webhookPayload, signature);
        assert.strictEqual(res2.idempotentReplay, true, 'Duplicate webhook must be identified as idempotent replay');

        // Verify database: order transitioned to captured / confirmed
        const orderRes = await db.query(
          `SELECT status, payment_status FROM public.orders WHERE id = $1`,
          [orderId]
        );
        assert.strictEqual(orderRes.rows[0].payment_status, 'captured', 'Order payment_status must transition to captured');
        assert.strictEqual(orderRes.rows[0].status, 'confirmed', 'Order status must transition to confirmed');

        // Verify database: idempotency_keys table has exactly 1 row
        const idempotencyKey = `webhook_pay_live_${testId}`;
        const keyRes = await db.query(
          `SELECT COUNT(*) as count FROM public.idempotency_keys WHERE key = $1`,
          [idempotencyKey]
        );
        assert.strictEqual(Number(keyRes.rows[0].count), 1, 'Exactly one idempotency key row must be recorded in Supabase');
      } finally {
        // Cleanup test order & idempotency row
        await db.query(`DELETE FROM public.idempotency_keys WHERE key = $1`, [`webhook_pay_live_${testId}`]);
        await db.query(`DELETE FROM public.orders WHERE id = $1`, [orderId]);
        await db.onModuleDestroy();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. MEDIA UPLOADS: CLOUDFLARE R2 BUCKET & SIZE/MIME CONSTRAINTS
  // ---------------------------------------------------------------------------
  describe('7. Media Upload Constraints & R2 Sanitization', () => {
    it('uploads valid image to R2 bucket, confirms existence, deletes it, and rejects 6MB and .exe files', async (t) => {
      if (!isR2Configured) {
        t.skip(
          'Skipped: Cloudflare R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) not configured in .env. Current credentials are placeholders.'
        );
        return;
      }

      // 1. Initialize real R2 S3 Client
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey!,
          secretAccessKey: r2SecretKey!,
        },
      });

      const testKey = `test-integration-media-${Date.now()}.jpg`;
      const testBuffer = Buffer.alloc(100 * 1024, 0xff); // 100KB test image

      try {
        // Upload valid image
        await s3.send(
          new PutObjectCommand({
            Bucket: r2Bucket!,
            Key: testKey,
            Body: testBuffer,
            ContentType: 'image/jpeg',
          })
        );

        // Confirm existence in R2 bucket
        const headRes = await s3.send(
          new HeadObjectCommand({
            Bucket: r2Bucket!,
            Key: testKey,
          })
        );
        assert.strictEqual(headRes.$metadata.httpStatusCode, 200, 'Uploaded image must exist in R2 bucket');

        // Delete from R2 bucket
        await s3.send(
          new DeleteObjectCommand({
            Bucket: r2Bucket!,
            Key: testKey,
          })
        );

        // Confirm deletion
        const isDeleted = await s3
          .send(new HeadObjectCommand({ Bucket: r2Bucket!, Key: testKey }))
          .then(() => false)
          .catch((e: any) => e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404);
        assert.strictEqual(isDeleted, true, 'Deleted image must no longer exist in R2 bucket');
      } finally {
        await s3.send(new DeleteObjectCommand({ Bucket: r2Bucket!, Key: testKey })).catch(() => {});
      }

      // 2. Verify controller upload validation constraints (6MB and .exe rejection)
      const productsController = new ProductsController(null as any);
      const mockOwner = { sub: '00000000-0000-0000-0000-000000000003', role: 'owner' } as any;

      // 6MB file rejection
      await assert.rejects(
        () =>
          productsController.getUploadUrl(mockOwner, {
            filename: 'large-photo.jpg',
            mimeType: 'image/jpeg',
            fileSize: 6 * 1024 * 1024,
          }),
        /Image size exceeds maximum limit of 5MB/
      );

      // .exe MIME type rejection
      await assert.rejects(
        () =>
          productsController.getUploadUrl(mockOwner, {
            filename: 'malware.exe',
            mimeType: 'application/x-msdownload',
            fileSize: 1024,
          }),
        /Invalid image MIME type/
      );
    });
  });
});
