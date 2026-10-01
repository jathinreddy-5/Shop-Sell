import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Client as PgClient } from 'pg';
import { Client as TypesenseClient } from 'typesense';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

async function runReindex() {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_DIRECT_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres';

  const typesenseHost = process.env.TYPESENSE_HOST || 'localhost';
  const typesensePort = parseInt(process.env.TYPESENSE_PORT || '8108', 10);
  const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || 'http';
  const typesenseApiKey = process.env.TYPESENSE_API_KEY || 'xyz_typesense_local_dev_key_12345';

  console.log('🚀 Shop:Sell Typesense Cloud Reindex Runner');
  console.log(`📡 Connecting to Typesense Cloud: ${typesenseProtocol}://${typesenseHost}:${typesensePort}`);

  const typesense = new TypesenseClient({
    nodes: [
      {
        host: typesenseHost,
        port: typesensePort,
        protocol: typesenseProtocol,
      },
    ],
    apiKey: typesenseApiKey,
    connectionTimeoutSeconds: 5,
  });

  const pg = new PgClient({
    connectionString: dbUrl,
    ssl: dbUrl.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pg.connect();
    console.log('✅ Connected to PostgreSQL database.');

    // 1. Ensure Typesense collection schema exists
    const collectionName = 'products';
    try {
      await typesense.collections(collectionName).retrieve();
      console.log(`✅ Collection '${collectionName}' already exists.`);
    } catch {
      console.log(`📦 Creating collection '${collectionName}' in Typesense Cloud...`);
      await typesense.collections().create({
        name: collectionName,
        fields: [
          { name: 'name', type: 'string', facet: false },
          { name: 'slug', type: 'string', facet: false },
          { name: 'description', type: 'string', facet: false },
          { name: 'price', type: 'float', facet: true },
          { name: 'compare_at_price', type: 'float', facet: false, optional: true },
          { name: 'stock', type: 'int32', facet: true },
          { name: 'category_name', type: 'string', facet: true },
          { name: 'category_slug', type: 'string', facet: true },
          { name: 'store_id', type: 'string', facet: true },
          { name: 'store_name', type: 'string', facet: true },
          { name: 'rating_avg', type: 'float', facet: true },
          { name: 'rating_count', type: 'int32', facet: false },
          { name: 'sales_count', type: 'int32', facet: true },
          { name: 'view_count', type: 'int32', facet: true },
          { name: 'status', type: 'string', facet: true },
          { name: 'image', type: 'string', facet: false },
          { name: 'created_at', type: 'int64', facet: true },
        ],
      });
      console.log(`✅ Created collection '${collectionName}'.`);
    }

    // 2. Fetch products from PostgreSQL
    console.log('📦 Fetching catalog from database...');
    const res = await pg.query(
      `SELECT p.id, p.name, p.slug, p.description, p.price::float, p.compare_at_price::float,
              p.stock, p.rating_avg::float, p.rating_count, p.sales_count, p.view_count,
              p.status, p.images, EXTRACT(epoch FROM p.created_at)::bigint as created_at,
              c.name as category_name, c.slug as category_slug,
              s.id as store_id, s.store_name
       FROM public.products p
       JOIN public.categories c ON p.category_id = c.id
       JOIN public.stores s ON p.store_id = s.id
       WHERE p.status = 'active'`
    );

    const documents = res.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      price: r.price,
      compare_at_price: r.compare_at_price || undefined,
      stock: r.stock,
      category_name: r.category_name,
      category_slug: r.category_slug,
      store_id: r.store_id,
      store_name: r.store_name,
      rating_avg: r.rating_avg,
      rating_count: r.rating_count,
      sales_count: r.sales_count,
      view_count: r.view_count,
      status: r.status,
      image: r.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
      created_at: r.created_at,
    }));

    if (documents.length > 0) {
      console.log(`🔄 Bulk indexing ${documents.length} products to Typesense Cloud...`);
      await typesense.collections(collectionName).documents().import(documents, { action: 'upsert' });
      
      const coll = await typesense.collections(collectionName).retrieve();
      console.log(`✅ Successfully indexed products into Typesense Cloud!`);
      console.log(`📊 Typesense Collection '${collectionName}': ${coll.num_documents ?? documents.length} total documents.\n`);
    } else {
      console.log('⚠️ No active products found to index. Run `npm run seed` first.');
    }
  } catch (err: any) {
    console.error('❌ Error executing reindex:', err.message);
    if (!process.env.TYPESENSE_API_KEY || process.env.TYPESENSE_API_KEY.includes('xyz_typesense')) {
      console.log('\n💡 Tip: Provide your hosted Typesense Cloud credentials in .env:');
      console.log('   TYPESENSE_HOST=xxx.typesense.net\n   TYPESENSE_PORT=443\n   TYPESENSE_PROTOCOL=https\n   TYPESENSE_API_KEY=your_admin_api_key\n');
    }
    process.exit(1);
  } finally {
    await pg.end().catch(() => {});
  }
}

runReindex();
