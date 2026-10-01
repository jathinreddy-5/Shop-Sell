-- ==============================================================================
-- 00006: REFUNDS, AUDIT LOGS & IDEMPOTENCY TABLES
-- ==============================================================================

-- 1. Dedicated Refunds Table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  razorpay_refund_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Audit Logs Table (Captures seller approvals/rejections, product moderation, refunds, payouts)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Dedicated Idempotency Table
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'global',
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_keys(expires_at);

-- ==============================================================================
-- RLS POLICIES FOR REFUNDS & AUDIT LOGS
-- ==============================================================================

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Refunds RLS
DROP POLICY IF EXISTS "Admins have full access to refunds" ON public.refunds;
CREATE POLICY "Admins have full access to refunds"
  ON public.refunds FOR ALL
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Customers can view refunds for their own orders" ON public.refunds;
CREATE POLICY "Customers can view refunds for their own orders"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM public.orders WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can view refunds for their store items" ON public.refunds;
CREATE POLICY "Store owners can view refunds for their store items"
  ON public.refunds FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT oi.order_id FROM public.order_items oi
      JOIN public.stores s ON oi.store_id = s.id
      WHERE s.owner_id = auth.uid()
    )
  );

-- Audit Logs RLS
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins and service roles can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins and service roles can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = actor_id);

-- Idempotency Keys RLS
DROP POLICY IF EXISTS "Authenticated users can read and insert idempotency keys" ON public.idempotency_keys;
CREATE POLICY "Authenticated users can read and insert idempotency keys"
  ON public.idempotency_keys FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
