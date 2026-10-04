import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

async function runRlsTests() {
  const dbUrl = process.env.DATABASE_URL || process.env.DATABASE_DIRECT_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔒 Running Supabase RLS Policy Isolation SQL Tests...');
  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    const testSqlPath = path.join(__dirname, '../supabase/tests/00007_rls_isolation.sql');
    const sql = fs.readFileSync(testSqlPath, 'utf8');

    await client.query(sql);
    console.log('✅ RLS Isolation Test Passed:');
    console.log('   - User A cannot be accessed or modified by User B');
    console.log('   - Addresses and Consent Log are strictly isolated by auth.uid()');
    console.log('   - Duplicate default address per type rejected by unique partial index');
  } catch (err: any) {
    console.error('❌ RLS Test Failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runRlsTests();
