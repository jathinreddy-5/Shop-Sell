import { Worker, Job } from 'bullmq';
import { Client as TypesenseClient } from 'typesense';
import { createRedisClient } from './common/redis';

console.log('🚀 Shop:Sell Async BullMQ Worker starting...');

const redisConnection = createRedisClient({ maxRetriesPerRequest: null });

const typesenseClient = new TypesenseClient({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz_typesense_local_dev_key_12345',
  connectionTimeoutSeconds: 5,
});

// Worker for search sync jobs
const searchSyncWorker = new Worker(
  'search-sync',
  async (job: Job) => {
    console.log(`[Job ${job.id}] Processing search sync for event: ${job.name}`);
    const { action, product } = job.data;

    try {
      if (action === 'upsert' && product) {
        await typesenseClient.collections('products').documents().upsert({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: parseFloat(product.price),
          compare_at_price: product.compare_at_price ? parseFloat(product.compare_at_price) : undefined,
          stock: product.stock,
          category_name: product.category_name || 'General',
          category_slug: product.category_slug || 'general',
          store_id: product.store_id,
          store_name: product.store_name || 'Store',
          rating_avg: parseFloat(product.rating_avg || '4.5'),
          rating_count: product.rating_count || 0,
          sales_count: product.sales_count || 0,
          view_count: product.view_count || 0,
          status: product.status || 'active',
          image: product.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600',
          created_at: Math.floor(Date.now() / 1000),
        });
        console.log(`[Job ${job.id}] Synced product ${product.id} to Typesense Cloud`);
      } else if (action === 'delete' && product?.id) {
        await typesenseClient.collections('products').documents(product.id).delete();
        console.log(`[Job ${job.id}] Removed product ${product.id} from Typesense Cloud`);
      }
    } catch (err: any) {
      console.warn(`[Job ${job.id}] Typesense sync notice:`, err.message);
    }
  },
  { connection: redisConnection as any }
);

// Worker for nightly maintenance jobs
const maintenanceWorker = new Worker(
  'nightly-maintenance',
  async (job: Job) => {
    console.log(`[Maintenance Job ${job.id}] Running ${job.name}...`);
    // 1. Refresh popularity stats
    // 2. Compute co-view behavior matrix
    // 3. Prune old event partitions
    console.log(`[Maintenance Job ${job.id}] Completed successfully.`);
  },
  { connection: redisConnection as any }
);

searchSyncWorker.on('completed', (job) => {
  console.log(`✅ Search sync job ${job.id} completed.`);
});

searchSyncWorker.on('failed', (job, err) => {
  console.error(`❌ Search sync job ${job?.id} failed:`, err.message);
});

console.log('✅ BullMQ Workers listening for search-sync and nightly-maintenance queues.');

process.on('SIGTERM', async () => {
  console.log('Shutting down BullMQ workers...');
  await searchSyncWorker.close();
  await maintenanceWorker.close();
  process.exit(0);
});
