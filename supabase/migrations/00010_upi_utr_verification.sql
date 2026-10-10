-- Migration: 00010_upi_utr_verification.sql
-- Adds UPI and UTR verification columns to public.orders

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'upi',
  ADD COLUMN IF NOT EXISTS upi_id TEXT,
  ADD COLUMN IF NOT EXISTS utr_number TEXT,
  ADD COLUMN IF NOT EXISTS utr_status TEXT DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID;

CREATE INDEX IF NOT EXISTS idx_orders_utr_number ON public.orders (utr_number);
CREATE INDEX IF NOT EXISTS idx_orders_utr_status ON public.orders (utr_status);
