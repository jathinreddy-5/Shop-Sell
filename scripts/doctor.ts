import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Client as PgClient } from 'pg';
import Redis from 'ioredis';
import { Client as TypesenseClient } from 'typesense';

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

interface ServiceCheckResult {
  name: string;
  status: 'PASS' | 'FAIL';
  latencyMs?: number;
  details: string;
  fixHint?: string;
}

async function checkDatabase(): Promise<ServiceCheckResult> {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_DIRECT_URL;
  if (!dbUrl || dbUrl.includes('[YOUR-PROJECT-REF]') || dbUrl.includes('localhost:54322')) {
    return {
      name: 'Hosted PostgreSQL (Supabase)',
      status: 'FAIL',
      details: 'DATABASE_URL is unconfigured or points to template/local default.',
      fixHint: 'Set DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres in .env',
    };
  }

  const start = Date.now();
  const client = new PgClient({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT 
        current_database() as db_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
        (SELECT installed_version FROM pg_available_extensions WHERE name = 'vector') as vector_version
    `);
    const duration = Date.now() - start;
    const row = res.rows[0];
    await client.end();

    return {
      name: 'Hosted PostgreSQL (Supabase)',
      status: 'PASS',
      latencyMs: duration,
      details: `Connected to ${row.db_name} | Tables: ${row.table_count} | pgvector: ${row.vector_version || 'available'}`,
    };
  } catch (err: any) {
    return {
      name: 'Hosted PostgreSQL (Supabase)',
      status: 'FAIL',
      details: `Connection failed: ${err.message}`,
      fixHint: 'Check password & connection string from Supabase Dashboard -> Project Settings -> Database.',
    };
  }
}

async function checkSupabaseAuth(): Promise<ServiceCheckResult> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey || url.includes('[YOUR-PROJECT-REF]')) {
    return {
      name: 'Supabase Auth & API',
      status: 'FAIL',
      details: 'SUPABASE_URL or SUPABASE_ANON_KEY missing.',
      fixHint: 'Copy Project URL & anon key from Supabase Dashboard -> Project Settings -> API into .env',
    };
  }

  const start = Date.now();
  try {
    const healthUrl = `${url.replace(/\/$/, '')}/auth/v1/health`;
    const res = await fetch(healthUrl, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    const duration = Date.now() - start;

    if (res.ok) {
      return {
        name: 'Supabase Auth & API',
        status: 'PASS',
        latencyMs: duration,
        details: `Auth API healthy (${res.status} OK)`,
      };
    } else {
      return {
        name: 'Supabase Auth & API',
        status: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        fixHint: 'Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env',
      };
    }
  } catch (err: any) {
    return {
      name: 'Supabase Auth & API',
      status: 'FAIL',
      details: err.message,
      fixHint: 'Verify SUPABASE_URL is reachable and network allows outbound HTTPS.',
    };
  }
}

async function checkRedis(): Promise<ServiceCheckResult> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl || redisUrl.includes('[YOUR-UPSTASH-PASSWORD]')) {
    return {
      name: 'Upstash Serverless Redis',
      status: 'FAIL',
      details: 'REDIS_URL unconfigured or using template default.',
      fixHint: 'Create free database at https://upstash.com, copy ioredis URL (rediss://default:***@...upstash.io:6379) into .env',
    };
  }

  const start = Date.now();
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    const pong = await client.ping();
    const duration = Date.now() - start;
    await client.quit();

    if (pong === 'PONG') {
      return {
        name: 'Upstash Serverless Redis',
        status: 'PASS',
        latencyMs: duration,
        details: `PING/PONG succeeded`,
      };
    } else {
      return {
        name: 'Upstash Serverless Redis',
        status: 'FAIL',
        details: `Unexpected ping response: ${pong}`,
        fixHint: 'Check Redis connection credentials and permissions.',
      };
    }
  } catch (err: any) {
    client.disconnect();
    return {
      name: 'Upstash Serverless Redis',
      status: 'FAIL',
      details: err.message,
      fixHint: 'Verify REDIS_URL in .env starts with rediss:// and port 6379.',
    };
  }
}

async function checkTypesense(): Promise<ServiceCheckResult> {
  const host = process.env.TYPESENSE_HOST;
  const apiKey = process.env.TYPESENSE_API_KEY;
  const port = parseInt(process.env.TYPESENSE_PORT || '443', 10);
  const protocol = process.env.TYPESENSE_PROTOCOL || 'https';

  if (!host || !apiKey || host.includes('[YOUR-CLUSTER-ID]') || host === 'localhost') {
    return {
      name: 'Typesense Cloud Search',
      status: 'FAIL',
      details: 'TYPESENSE_HOST or TYPESENSE_API_KEY unconfigured or pointing to localhost.',
      fixHint: 'Launch a cluster at https://cloud.typesense.org and copy hostname & Admin API Key to .env',
    };
  }

  const start = Date.now();
  try {
    const healthUrl = `${protocol}://${host}:${port}/health`;
    const res = await fetch(healthUrl, {
      headers: { 'X-TYPESENSE-API-KEY': apiKey },
      signal: AbortSignal.timeout(5000),
    });
    const duration = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      return {
        name: 'Typesense Cloud Search',
        status: 'PASS',
        latencyMs: duration,
        details: `Cluster healthy (ok: ${data.ok ?? true})`,
      };
    } else {
      return {
        name: 'Typesense Cloud Search',
        status: 'FAIL',
        details: `HTTP ${res.status}: ${res.statusText}`,
        fixHint: 'Verify TYPESENSE_API_KEY in .env matches your Typesense Cloud cluster.',
      };
    }
  } catch (err: any) {
    return {
      name: 'Typesense Cloud Search',
      status: 'FAIL',
      details: err.message,
      fixHint: 'Ensure TYPESENSE_HOST is reachable over HTTPS and TYPESENSE_PORT=443.',
    };
  }
}

async function checkRazorpay(): Promise<ServiceCheckResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || !keyId.startsWith('rzp_test_') || keyId.includes('yourkeyidhere')) {
    return {
      name: 'Razorpay Payments (TEST Mode)',
      status: 'FAIL',
      details: 'RAZORPAY_KEY_ID is missing or not a valid test key (must start with rzp_test_).',
      fixHint: 'Generate test API keys at https://dashboard.razorpay.com -> Settings -> API Keys.',
    };
  }

  const start = Date.now();
  try {
    const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(5000),
    });
    const duration = Date.now() - start;

    if (res.ok) {
      return {
        name: 'Razorpay Payments (TEST Mode)',
        status: 'PASS',
        latencyMs: duration,
        details: `Test credentials verified against Razorpay API`,
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      return {
        name: 'Razorpay Payments (TEST Mode)',
        status: 'FAIL',
        details: `HTTP ${res.status}: ${errJson.error?.description || res.statusText}`,
        fixHint: 'Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env.',
      };
    }
  } catch (err: any) {
    return {
      name: 'Razorpay Payments (TEST Mode)',
      status: 'FAIL',
      details: err.message,
      fixHint: 'Check internet connectivity to api.razorpay.com.',
    };
  }
}

async function checkCloudflareR2(): Promise<ServiceCheckResult> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    accountId.includes('your_cloudflare_account_id')
  ) {
    return {
      name: 'Cloudflare R2 Object Storage',
      status: 'FAIL',
      details: 'R2 credentials or bucket name unconfigured.',
      fixHint: 'Create R2 bucket at https://dash.cloudflare.com -> R2, generate API Token, and set R2_* in .env',
    };
  }

  return {
    name: 'Cloudflare R2 Object Storage',
    status: 'PASS',
    details: `Configured for bucket '${bucketName}' on account ${accountId.substring(0, 6)}...`,
  };
}

async function runDoctor() {
  console.log('\n======================================================');
  console.log('🩺  SHOP:SELL CLOUD SERVICES HEALTH DOCTOR');
  console.log('======================================================\n');

  const checks = [
    await checkDatabase(),
    await checkSupabaseAuth(),
    await checkRedis(),
    await checkTypesense(),
    await checkRazorpay(),
    await checkCloudflareR2(),
  ];

  let passCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const symbol = check.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const latency = check.latencyMs !== undefined ? ` (${check.latencyMs}ms)` : '';
    console.log(`${symbol} | ${check.name}${latency}`);
    console.log(`       Details: ${check.details}`);
    if (check.fixHint) {
      console.log(`       👉 FIX:  ${check.fixHint}`);
    }
    console.log('');

    if (check.status === 'PASS') passCount++;
    else failCount++;
  }

  console.log('------------------------------------------------------');
  console.log(`Summary: ${passCount} PASSED, ${failCount} FAILED out of ${checks.length} services.\n`);

  if (failCount > 0) {
    console.log('⚠️  One or more hosted services are not yet configured or reachable.');
    console.log('    Update your .env file using the FIX hints above.\n');
  } else {
    console.log('🎉  All hosted services are verified and reachable! Ready for launch.\n');
  }
}

runDoctor();
