-- Migration: 00003_indexes.sql
-- Optimizes query performance with required BTree, GIN, and HNSW Vector indexes

-- 1. Products Indexes
-- GIN index on products.attributes JSONB
CREATE INDEX IF NOT EXISTS idx_products_attributes_gin ON public.products USING gin (attributes);

-- HNSW Vector Index on products.embedding (384 dimensions, cosine distance)
CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw ON public.products USING hnsw (embedding vector_cosine_ops);

-- BTree indexes for common filters and relations
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products (store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_popularity ON public.products (sales_count DESC, view_count DESC);

-- 2. User Events Indexes (on the partitioned table)
-- BTree on (user_id, created_at desc)
CREATE INDEX IF NOT EXISTS idx_user_events_user_created ON public.user_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_anon_created ON public.user_events (anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON public.user_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_product ON public.user_events (product_id);

-- 3. Stores Indexes
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON public.stores (owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores (slug);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores (status);

-- 4. Categories Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- 5. Orders & Order Items Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_store_id ON public.order_items (store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- 6. Carts & Wishlists
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts (user_id);
CREATE INDEX IF NOT EXISTS idx_carts_anon_id ON public.carts (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists (user_id);

-- 7. Owner Applications
CREATE INDEX IF NOT EXISTS idx_owner_applications_user_id ON public.owner_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_owner_applications_status ON public.owner_applications (status);

-- 8. Reviews & Payouts
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_store_id ON public.payouts (store_id, created_at DESC);
