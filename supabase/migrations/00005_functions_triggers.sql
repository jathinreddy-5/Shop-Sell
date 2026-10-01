-- Migration: 00005_functions_triggers.sql
-- Implements business logic triggers, rating aggregation, and the transactional order placement function

-- 1. Automatic Profile Creation Trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url, roles)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    ARRAY['customer']::TEXT[]
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped trigger on auth.users (requires supabase_admin role): %', SQLERRM;
END $$;

-- 2. Updated At Auto-updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_stores_updated_at ON public.stores;
CREATE TRIGGER set_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_carts_updated_at ON public.carts;
CREATE TRIGGER set_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Review Aggregation: Updates product and store rating_avg & count
CREATE OR REPLACE FUNCTION public.sync_review_ratings()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
  target_store_id UUID;
  new_prod_avg NUMERIC(3,2);
  new_prod_count INT;
  new_store_avg NUMERIC(3,2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  SELECT store_id INTO target_store_id FROM public.products WHERE id = target_product_id;

  -- Product ratings
  SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00), COUNT(*)
  INTO new_prod_avg, new_prod_count
  FROM public.reviews
  WHERE product_id = target_product_id;

  UPDATE public.products
  SET rating_avg = new_prod_avg, rating_count = new_prod_count
  WHERE id = target_product_id;

  -- Store ratings
  IF target_store_id IS NOT NULL THEN
    SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0.00)
    INTO new_store_avg
    FROM public.reviews r
    JOIN public.products p ON r.product_id = p.id
    WHERE p.store_id = target_store_id;

    UPDATE public.stores
    SET rating_avg = new_store_avg
    WHERE id = target_store_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_review_ratings ON public.reviews;
CREATE TRIGGER trigger_sync_review_ratings
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_ratings();

-- 4. ACID Transactional Order Placement Function
-- Locks inventory rows with SELECT FOR UPDATE, checks and decrements stock, creates order and order items
CREATE OR REPLACE FUNCTION public.place_order_transaction(
  p_user_id UUID,
  p_shipping_address JSONB,
  p_items JSONB, -- Array of {product_id: UUID, variant_id: UUID|null, qty: INT}
  p_idempotency_key TEXT,
  p_razorpay_order_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_item RECORD;
  v_product RECORD;
  v_item_price NUMERIC(12,2);
  v_order_total NUMERIC(12,2) := 0.00;
  v_existing_order_id UUID;
BEGIN
  -- 1. Idempotency Check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id
    FROM public.orders
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order_id,
        'idempotent_replay', true
      );
    END IF;
  END IF;

  -- 2. Validate Items Array
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order items cannot be empty';
  END IF;

  -- 3. Calculate Total & Lock Products with SELECT FOR UPDATE
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, variant_id UUID, qty INT)
  LOOP
    IF v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Quantity must be greater than zero for product %', v_item.product_id;
    END IF;

    -- Lock the product row for update
    SELECT id, store_id, price, stock, status
    INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;

    IF v_product.status != 'active' THEN
      RAISE EXCEPTION 'Product % is not active for sale', v_item.product_id;
    END IF;

    IF v_product.stock < v_item.qty THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_item.product_id, v_product.stock, v_item.qty;
    END IF;

    -- If variant specified, lock and check variant stock
    IF v_item.variant_id IS NOT NULL THEN
      DECLARE
        v_variant RECORD;
      BEGIN
        SELECT id, price, stock INTO v_variant
        FROM public.product_variants
        WHERE id = v_item.variant_id AND product_id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Product variant % not found for product %', v_item.variant_id, v_item.product_id;
        END IF;

        IF v_variant.stock < v_item.qty THEN
          RAISE EXCEPTION 'Insufficient stock for variant %. Available: %, Requested: %',
            v_item.variant_id, v_variant.stock, v_item.qty;
        END IF;

        v_item_price := v_variant.price;
        UPDATE public.product_variants SET stock = stock - v_item.qty WHERE id = v_item.variant_id;
      END;
    ELSE
      v_item_price := v_product.price;
    END IF;

    -- Decrement Product Inventory & Increment sales count
    UPDATE public.products
    SET stock = stock - v_item.qty,
        sales_count = sales_count + v_item.qty
    WHERE id = v_item.product_id;

    v_order_total := v_order_total + (v_item_price * v_item.qty);
  END LOOP;

  -- 4. Create the Order
  INSERT INTO public.orders (
    user_id,
    status,
    total,
    payment_status,
    razorpay_order_id,
    shipping_address,
    idempotency_key
  ) VALUES (
    p_user_id,
    'pending',
    v_order_total,
    'pending',
    p_razorpay_order_id,
    p_shipping_address,
    p_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 5. Create Order Items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, variant_id UUID, qty INT)
  LOOP
    SELECT store_id, price INTO v_product FROM public.products WHERE id = v_item.product_id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      store_id,
      qty,
      unit_price,
      fulfilment_status
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_product.store_id,
      v_item.qty,
      v_product.price,
      'unfulfilled'
    );
  END LOOP;

  -- 6. Clean up User Cart
  DELETE FROM public.cart_items
  WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = p_user_id);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total', v_order_total,
    'idempotent_replay', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alias for atomic order placement
CREATE OR REPLACE FUNCTION public.place_order_atomic(
  p_user_id UUID,
  p_shipping_address JSONB,
  p_items JSONB,
  p_idempotency_key TEXT,
  p_razorpay_order_id TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  RETURN public.place_order_transaction(p_user_id, p_shipping_address, p_items, p_idempotency_key, p_razorpay_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
