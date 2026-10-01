-- Migration: 00004_rls.sql
-- Enables Row-Level Security (RLS) and defines role-scoped access control policies

-- Helper function: Get Current User ID safely from auth.uid() or JWT
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    auth.uid(),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
    NULLIF((current_setting('request.jwt.claims', true)::jsonb->>'sub'), '')::UUID
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Helper function: Check if current user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_uid UUID;
  user_roles TEXT[];
BEGIN
  current_uid := public.current_user_id();
  IF current_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Check profiles table
  SELECT roles INTO user_roles FROM public.profiles WHERE id = current_uid;
  IF user_roles IS NOT NULL AND required_role = ANY(user_roles) THEN
    RETURN TRUE;
  END IF;

  -- 2. Fallback to JWT app_metadata
  BEGIN
    IF (auth.jwt()->'app_metadata'->'roles')::jsonb ? required_role THEN
      RETURN TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore JSON parse errors
  END;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Shortcut helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role('admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_store_owner(check_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_uid UUID;
BEGIN
  current_uid := public.current_user_id();
  IF current_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.stores
    WHERE id = check_store_id AND owner_id = current_uid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. Profiles Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = public.current_user_id() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Owner Applications Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users see their own application, Admins see all" ON public.owner_applications;
CREATE POLICY "Users see their own application, Admins see all"
  ON public.owner_applications FOR SELECT
  USING (user_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users can submit seller application" ON public.owner_applications;
CREATE POLICY "Users can submit seller application"
  ON public.owner_applications FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

DROP POLICY IF EXISTS "Admins can update application status" ON public.owner_applications;
CREATE POLICY "Admins can update application status"
  ON public.owner_applications FOR UPDATE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Stores Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active stores viewable by public, owners/admins see all" ON public.stores;
CREATE POLICY "Active stores viewable by public, owners/admins see all"
  ON public.stores FOR SELECT
  USING (status = 'active' OR owner_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Store owners can update their store" ON public.stores;
CREATE POLICY "Store owners can update their store"
  ON public.stores FOR UPDATE
  USING (owner_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Store created by admin or system" ON public.stores;
CREATE POLICY "Store created by admin or system"
  ON public.stores FOR INSERT
  WITH CHECK (owner_id = public.current_user_id() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Categories Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Products Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active products viewable by all, owners view their own" ON public.products;
CREATE POLICY "Active products viewable by all, owners view their own"
  ON public.products FOR SELECT
  USING (
    status = 'active'
    OR store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Store owners can insert products to their store" ON public.products;
CREATE POLICY "Store owners can insert products to their store"
  ON public.products FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Store owners can update their products" ON public.products;
CREATE POLICY "Store owners can update their products"
  ON public.products FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Store owners can delete/archive their products" ON public.products;
CREATE POLICY "Store owners can delete/archive their products"
  ON public.products FOR DELETE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 6. Product Variants Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Product variants viewable by public" ON public.product_variants;
CREATE POLICY "Product variants viewable by public"
  ON public.product_variants FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Store owners manage their product variants" ON public.product_variants;
CREATE POLICY "Store owners manage their product variants"
  ON public.product_variants FOR ALL
  USING (
    product_id IN (
      SELECT p.id FROM public.products p
      JOIN public.stores s ON p.store_id = s.id
      WHERE s.owner_id = public.current_user_id()
    )
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 7. Carts & Cart Items Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage their own cart" ON public.carts;
CREATE POLICY "Users manage their own cart"
  ON public.carts FOR ALL
  USING (user_id = public.current_user_id() OR user_id IS NULL OR public.is_admin());

DROP POLICY IF EXISTS "Users manage their own cart items" ON public.cart_items;
CREATE POLICY "Users manage their own cart items"
  ON public.cart_items FOR ALL
  USING (
    cart_id IN (SELECT id FROM public.carts WHERE user_id = public.current_user_id() OR user_id IS NULL)
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 8. Wishlists Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users manage their own wishlist" ON public.wishlists;
CREATE POLICY "Users manage their own wishlist"
  ON public.wishlists FOR ALL
  USING (user_id = public.current_user_id() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 9. Orders Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers view their own orders, Sellers view their store orders, Admins view all" ON public.orders;
CREATE POLICY "Customers view their own orders, Sellers view their store orders, Admins view all"
  ON public.orders FOR SELECT
  USING (
    user_id = public.current_user_id()
    OR public.is_admin()
    OR id IN (
      SELECT oi.order_id FROM public.order_items oi
      JOIN public.stores s ON oi.store_id = s.id
      WHERE s.owner_id = public.current_user_id()
    )
  );

DROP POLICY IF EXISTS "Customers can create orders" ON public.orders;
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Admins or order handlers can update orders" ON public.orders;
CREATE POLICY "Admins or order handlers can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin() OR user_id = public.current_user_id());

-- -----------------------------------------------------------------------------
-- 10. Order Items Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers view items of their orders, sellers view items for their store" ON public.order_items;
CREATE POLICY "Customers view items of their orders, sellers view items for their store"
  ON public.order_items FOR SELECT
  USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = public.current_user_id())
    OR store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sellers can update fulfilment status for their store items" ON public.order_items;
CREATE POLICY "Sellers can update fulfilment status for their store items"
  ON public.order_items FOR UPDATE
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Order items insertable via order transaction" ON public.order_items;
CREATE POLICY "Order items insertable via order transaction"
  ON public.order_items FOR INSERT
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 11. Payouts Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Store owners view their store payouts, admins view all" ON public.payouts;
CREATE POLICY "Store owners view their store payouts, admins view all"
  ON public.payouts FOR SELECT
  USING (
    store_id IN (SELECT id FROM public.stores WHERE owner_id = public.current_user_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage payouts" ON public.payouts;
CREATE POLICY "Admins manage payouts"
  ON public.payouts FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 12. Reviews Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create review" ON public.reviews;
CREATE POLICY "Users can create review"
  ON public.reviews FOR INSERT
  WITH CHECK (user_id = public.current_user_id());

DROP POLICY IF EXISTS "Users can update their review or admins can moderate" ON public.reviews;
CREATE POLICY "Users can update their review or admins can moderate"
  ON public.reviews FOR UPDATE
  USING (user_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users or admins can delete review" ON public.reviews;
CREATE POLICY "Users or admins can delete review"
  ON public.reviews FOR DELETE
  USING (user_id = public.current_user_id() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- 13. User Events Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view their own events, admins view all" ON public.user_events;
CREATE POLICY "Users view their own events, admins view all"
  ON public.user_events FOR SELECT
  USING (user_id = public.current_user_id() OR public.is_admin());

DROP POLICY IF EXISTS "Events can be logged by any client" ON public.user_events;
CREATE POLICY "Events can be logged by any client"
  ON public.user_events FOR INSERT
  WITH CHECK (true);
