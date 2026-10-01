import * as dotenv from 'dotenv';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

async function runSeed() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_DIRECT_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres';

  console.log('🚀 Shop:Sell Database Migration & Seed Runner');
  console.log(`📡 Connecting to PostgreSQL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') || dbUrl.includes('pooler.supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully.');

    // 1. Run migrations in sequence
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      console.log(`📁 Applying ${migrationFiles.length} SQL migrations...`);
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await client.query(sql);
        console.log(`   ✓ Applied: ${file}`);
      }
    }

    // 2. Run Seed SQL
    const seedPath = path.join(__dirname, '../supabase/seeds/seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Applying database seeds (20 categories, 5 stores, 200 products)...');
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      await client.query(seedSql);
      console.log('✅ Successfully seeded database with catalog and 384-dim vector embeddings!');
    } else {
      console.warn('⚠️ Seed file not found at:', seedPath);
    }

    // 3. Report row counts per table
    console.log('\n📊 Row Counts per Table:');
    console.log('------------------------------------------------------');
    const tablesRes = await client.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `);

    for (const row of tablesRes.rows) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) as count FROM public."${row.table_name}"`);
        const count = countRes.rows[0].count;
        console.log(`   • ${row.table_name.padEnd(25)} : ${count} rows`);
      } catch (err: any) {
        console.log(`   • ${row.table_name.padEnd(25)} : [error checking: ${err.message}]`);
      }
    }
    console.log('------------------------------------------------------\n');
  } catch (err: any) {
    console.error('❌ Error executing database seed:', err.message);
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('[YOUR-PROJECT-REF]')) {
      console.log('\n💡 Tip: Provide your hosted Supabase connection string in .env:');
      console.log('   DATABASE_URL=postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres\n');
    }
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

runSeed();
