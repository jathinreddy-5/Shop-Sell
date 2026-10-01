import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Migrations & Schema Verification', () => {
  const migrationsDir = path.resolve(__dirname, '../../../../supabase/migrations');
  const migrationFiles = [
    '00001_extensions.sql',
    '00002_schema.sql',
    '00003_indexes.sql',
    '00004_rls.sql',
    '00005_functions_triggers.sql',
  ];

  it('should find all required migration files', () => {
    for (const file of migrationFiles) {
      const fullPath = path.join(migrationsDir, file);
      assert.ok(fs.existsSync(fullPath), `Migration file ${file} should exist`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(content.length > 50, `Migration file ${file} should not be empty`);
    }
  });

  it('should verify pgvector extension and 384-dim vector type in schema', () => {
    const extContent = fs.readFileSync(path.join(migrationsDir, '00001_extensions.sql'), 'utf8');
    assert.ok(extContent.includes('CREATE EXTENSION IF NOT EXISTS "vector"'), 'Must enable vector extension');

    const schemaContent = fs.readFileSync(path.join(migrationsDir, '00002_schema.sql'), 'utf8');
    assert.ok(schemaContent.includes('embedding vector(384)'), 'Must declare embedding vector(384) column');
  });

  it('should verify all required tables exist in schema migration', () => {
    const schemaContent = fs.readFileSync(path.join(migrationsDir, '00002_schema.sql'), 'utf8');
    const expectedTables = [
      'public.profiles',
      'public.owner_applications',
      'public.stores',
      'public.categories',
      'public.products',
      'public.product_variants',
      'public.carts',
      'public.cart_items',
      'public.wishlists',
      'public.orders',
      'public.order_items',
      'public.payouts',
      'public.reviews',
      'public.user_events',
    ];

    for (const table of expectedTables) {
      assert.ok(schemaContent.includes(table), `Schema must declare table ${table}`);
    }
  });

  it('should verify required indexes in 00003_indexes.sql', () => {
    const indexContent = fs.readFileSync(path.join(migrationsDir, '00003_indexes.sql'), 'utf8');
    // GIN on products.attributes
    assert.ok(
      indexContent.includes('USING gin (attributes)'),
      'Must contain GIN index on products.attributes'
    );
    // HNSW on products.embedding
    assert.ok(
      indexContent.includes('USING hnsw (embedding vector_cosine_ops)'),
      'Must contain HNSW vector index on products.embedding'
    );
    // BTree on products store_id, category_id, status
    assert.ok(indexContent.includes('public.products (store_id)'), 'Must index store_id on products');
    assert.ok(indexContent.includes('public.products (category_id)'), 'Must index category_id on products');
    assert.ok(indexContent.includes('public.products (status)'), 'Must index status on products');
    // BTree on user_events(user_id, created_at DESC)
    assert.ok(
      indexContent.includes('public.user_events (user_id, created_at DESC)'),
      'Must index (user_id, created_at DESC) on user_events'
    );
  });

  it('should verify RLS enabled and policies declared for all tables', () => {
    const rlsContent = fs.readFileSync(path.join(migrationsDir, '00004_rls.sql'), 'utf8');
    const tables = [
      'profiles',
      'owner_applications',
      'stores',
      'categories',
      'products',
      'product_variants',
      'carts',
      'cart_items',
      'wishlists',
      'orders',
      'order_items',
      'payouts',
      'reviews',
      'user_events',
    ];

    for (const t of tables) {
      assert.ok(
        rlsContent.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`),
        `RLS must be enabled on public.${t}`
      );
    }

    // Role helper functions
    assert.ok(rlsContent.includes('FUNCTION public.is_admin()'), 'Must declare public.is_admin()');
    assert.ok(rlsContent.includes('FUNCTION public.has_role('), 'Must declare public.has_role()');
    assert.ok(rlsContent.includes('FUNCTION public.is_store_owner('), 'Must declare public.is_store_owner()');
  });

  it('should verify transactional order placement function in 00005_functions_triggers.sql', () => {
    const funcContent = fs.readFileSync(path.join(migrationsDir, '00005_functions_triggers.sql'), 'utf8');
    assert.ok(
      funcContent.includes('FUNCTION public.place_order_transaction'),
      'Must define transactional order placement function'
    );
    assert.ok(
      funcContent.includes('FOR UPDATE'),
      'Transactional order placement must lock inventory rows with FOR UPDATE'
    );
    assert.ok(
      funcContent.includes('idempotency_key'),
      'Transactional order placement must support idempotency checking'
    );
  });
});
