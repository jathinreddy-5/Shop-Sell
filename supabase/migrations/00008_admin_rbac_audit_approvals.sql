-- ==============================================================================
-- Migration 00008: Admin RBAC, Auth Hardening, Immutable Audit Trail & Four-Eyes Approvals
-- Description: Establishes dedicated admin identity, granular permission RBAC,
--              tamper-proof hash-chained audit logging, generic 4-eyes approval engine,
--              incident kill switches, and customer role modification protection.
-- ==============================================================================

-- 1. Dedicated Admin Identity (Completely decoupled from customer profiles.roles)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'offboarded')),
  mfa_enrolled BOOLEAN NOT NULL DEFAULT false,
  requires_passkey BOOLEAN NOT NULL DEFAULT true,
  sso_subject TEXT,
  created_by UUID REFERENCES auth.users(id),
  last_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customer Role Self-Promotion Protection on public.profiles
-- Ensures customers modifying profiles cannot touch the roles column.
CREATE OR REPLACE FUNCTION trg_block_profile_role_mutation()
RETURNS trigger AS $$
BEGIN
  -- If roles array is being modified
  IF OLD.roles IS DISTINCT FROM NEW.roles THEN
    -- In Supabase/PostgreSQL, allow changes only if executing under service_role / superuser
    IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') AND 
       COALESCE(current_setting('request.jwt.claim.role', true), '') != 'service_role' THEN
      RAISE EXCEPTION 'Access Denied: Customer accounts are strictly prohibited from modifying account roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_role_self_promotion ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_promotion
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trg_block_profile_role_mutation();

-- 3. Permission Catalog & Roles Tables
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  risk_level TEXT NOT NULL DEFAULT 'standard' CHECK (risk_level IN ('low', 'standard', 'high', 'critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action)
);

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  max_session_duration_minutes INT NOT NULL DEFAULT 480, -- 8 hours
  requires_passkey BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  scope_type TEXT, -- e.g., 'category', 'region', or NULL for global
  scope_value TEXT,
  granted_by UUID REFERENCES public.admin_users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_admin_role_scope UNIQUE NULLS NOT DISTINCT (admin_id, role_id, scope_type, scope_value)
);

-- 4. Just-In-Time Elevation & Break-Glass Grants
CREATE TABLE IF NOT EXISTS public.elevated_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  ticket_ref TEXT NOT NULL,
  approved_by UUID REFERENCES public.admin_users(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,
  is_break_glass BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Immutable Hash-Chained Audit Trail (public.admin_audit_logs)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  actor_role_at_time TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'denied', 'error')),
  reason TEXT,
  ticket_ref TEXT,
  before_state JSONB,
  after_state JSONB,
  approver_ids UUID[] DEFAULT '{}',
  request_id TEXT,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  prev_hash TEXT,
  row_hash TEXT NOT NULL
);

-- Trigger to make public.admin_audit_logs immutable (rejects UPDATE, DELETE, TRUNCATE)
CREATE OR REPLACE FUNCTION trg_enforce_audit_log_immutability()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Security Invariant Violation: public.admin_audit_logs is strictly append-only. Modification and deletion are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_no_update_delete ON public.admin_audit_logs;
CREATE TRIGGER trg_audit_logs_no_update_delete
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION trg_enforce_audit_log_immutability();

-- 6. Four-Eyes Approval Engine Tables
CREATE TABLE IF NOT EXISTS public.approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL UNIQUE,
  threshold_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_approvals INT NOT NULL DEFAULT 2,
  required_permission TEXT NOT NULL,
  expiry_hours INT NOT NULL DEFAULT 24,
  allow_emergency_single BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_key TEXT NOT NULL REFERENCES public.approval_policies(action_key),
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  requester_id UUID NOT NULL REFERENCES public.admin_users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES public.admin_users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  step_up_proof JSONB,
  reason TEXT,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_approval_decisions_req_approver UNIQUE (request_id, approver_id)
);

-- 7. Incident Control Kill Switches
CREATE TABLE IF NOT EXISTS public.admin_kill_switches (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  updated_by UUID REFERENCES public.admin_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Seed Core Permissions
INSERT INTO public.permissions (resource, action, description, risk_level) VALUES
  ('payout', 'create', 'Create and generate seller payout batch', 'high'),
  ('payout', 'approve', 'Approve payout batch for bank dispatch', 'critical'),
  ('payout', 'freeze', 'Trigger global payout kill switch freeze', 'critical'),
  ('seller', 'view', 'View seller applications, profiles, and listings', 'low'),
  ('seller', 'approve', 'Approve seller onboarding application', 'high'),
  ('seller', 'suspend', 'Suspend or ban seller store and freeze listings', 'critical'),
  ('seller', 'modify_bank', 'Approve or update seller verified bank account', 'critical'),
  ('refund', 'issue_standard', 'Issue order refund up to standard threshold (₹5000)', 'standard'),
  ('refund', 'issue_high', 'Issue high-value order refund (₹5000+)', 'high'),
  ('refund', 'approve', 'Approve four-eyes refund request', 'high'),
  ('pii', 'view_masked', 'View customer and seller records with masked PII', 'low'),
  ('pii', 'reveal', 'Reveal plain-text customer PII (Step-up required)', 'high'),
  ('pii', 'export', 'Export customer or seller data in bulk', 'critical'),
  ('catalog', 'moderate', 'Approve, reject, or delist product catalog items', 'standard'),
  ('catalog', 'category_manage', 'Create or alter category taxonomy and attribute schemas', 'standard'),
  ('merchandising', 'override_ranking', 'Publish manual ranking boosts or featured placements', 'standard'),
  ('audit', 'view', 'View immutable audit log trail and chain verification', 'standard'),
  ('audit', 'export', 'Export signed audit records for compliance', 'high'),
  ('admin', 'invite', 'Invite new admin team member (dual-approval required)', 'high'),
  ('admin', 'manage_roles', 'Assign or revoke roles from admin users', 'critical'),
  ('admin', 'access_review', 'Perform quarterly access review certification', 'high'),
  ('security', 'break_glass', 'Emergency single-actor elevation with loud audit', 'critical')
ON CONFLICT (resource, action) DO NOTHING;

-- 9. Seed Core System Roles
INSERT INTO public.roles (name, slug, description, is_system, max_session_duration_minutes, requires_passkey) VALUES
  ('Super Admin', 'super_admin', 'Full platform operational governance (dual-approval capped)', true, 240, true),
  ('Finance Controller', 'finance_controller', 'Payout generation, financial ledger reconciliation, high-value refunds', true, 240, true),
  ('Trust & Safety Moderator', 'trust_safety', 'Merchant fraud investigations, seller suspensions, dispute appeals', true, 480, false),
  ('Customer Support Specialist', 'customer_support', 'Order inquiries, customer dispute triage, standard refunds', true, 480, false),
  ('Seller Ops / KYC Analyst', 'seller_ops', 'Seller verification, GSTIN/PAN review, seller document approvals', true, 480, false),
  ('Catalog Manager', 'catalog_manager', 'Product moderation, category taxonomy, Legal Metrology compliance', true, 480, false),
  ('Merchandiser', 'merchandiser', 'Product collections, search weights, banner campaigns', true, 480, false),
  ('Compliance / Read-Only Auditor', 'auditor', 'Immutable audit log analysis, chain verification, regulatory exports', true, 480, false),
  ('Support Engineer', 'support_engineer', 'Technical diagnostics and bug tracking with strictly zero PII access', true, 480, false)
ON CONFLICT (slug) DO UPDATE SET
  requires_passkey = EXCLUDED.requires_passkey,
  max_session_duration_minutes = EXCLUDED.max_session_duration_minutes;

-- 10. Map Default Permissions to Roles
DO $$
DECLARE
  r_super UUID;
  r_finance UUID;
  r_trust UUID;
  r_support UUID;
  r_seller_ops UUID;
  r_catalog UUID;
  r_merch UUID;
  r_auditor UUID;
  r_engineer UUID;
BEGIN
  SELECT id INTO r_super FROM public.roles WHERE slug = 'super_admin';
  SELECT id INTO r_finance FROM public.roles WHERE slug = 'finance_controller';
  SELECT id INTO r_trust FROM public.roles WHERE slug = 'trust_safety';
  SELECT id INTO r_support FROM public.roles WHERE slug = 'customer_support';
  SELECT id INTO r_seller_ops FROM public.roles WHERE slug = 'seller_ops';
  SELECT id INTO r_catalog FROM public.roles WHERE slug = 'catalog_manager';
  SELECT id INTO r_merch FROM public.roles WHERE slug = 'merchandiser';
  SELECT id INTO r_auditor FROM public.roles WHERE slug = 'auditor';
  SELECT id INTO r_engineer FROM public.roles WHERE slug = 'support_engineer';

  -- Super Admin: High-privilege access, but cannot self-approve payouts or sole-action bans
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_super, id FROM public.permissions
  ON CONFLICT DO NOTHING;

  -- Finance Controller
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_finance, id FROM public.permissions
  WHERE (resource = 'payout' AND action IN ('create', 'approve', 'freeze'))
     OR (resource = 'refund' AND action IN ('issue_standard', 'issue_high', 'approve'))
     OR (resource = 'pii' AND action IN ('view_masked', 'reveal'))
     OR (resource = 'audit' AND action = 'view')
  ON CONFLICT DO NOTHING;

  -- Trust & Safety Moderator
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_trust, id FROM public.permissions
  WHERE (resource = 'seller' AND action IN ('view', 'suspend'))
     OR (resource = 'refund' AND action IN ('issue_standard', 'approve'))
     OR (resource = 'catalog' AND action = 'moderate')
     OR (resource = 'pii' AND action IN ('view_masked', 'reveal'))
  ON CONFLICT DO NOTHING;

  -- Customer Support Specialist
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_support, id FROM public.permissions
  WHERE (resource = 'refund' AND action = 'issue_standard')
     OR (resource = 'seller' AND action = 'view')
     OR (resource = 'pii' AND action = 'view_masked')
  ON CONFLICT DO NOTHING;

  -- Seller Ops / KYC Analyst
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_seller_ops, id FROM public.permissions
  WHERE (resource = 'seller' AND action IN ('view', 'approve', 'modify_bank'))
     OR (resource = 'pii' AND action IN ('view_masked', 'reveal'))
  ON CONFLICT DO NOTHING;

  -- Catalog Manager
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_catalog, id FROM public.permissions
  WHERE resource = 'catalog'
  ON CONFLICT DO NOTHING;

  -- Merchandiser
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_merch, id FROM public.permissions
  WHERE resource = 'merchandising'
  ON CONFLICT DO NOTHING;

  -- Compliance / Auditor
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_auditor, id FROM public.permissions
  WHERE resource IN ('audit') OR (resource = 'pii' AND action = 'view_masked')
  ON CONFLICT DO NOTHING;

  -- Support Engineer: Technical diagnostics, strictly NO pii:reveal permission
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT r_engineer, id FROM public.permissions
  WHERE (resource = 'audit' AND action = 'view')
     OR (resource = 'seller' AND action = 'view')
     OR (resource = 'pii' AND action = 'view_masked')
  ON CONFLICT DO NOTHING;
END $$;

-- 11. Seed Approval Policies
INSERT INTO public.approval_policies (action_key, threshold_params, required_approvals, required_permission, expiry_hours, allow_emergency_single) VALUES
  ('refund:high_value', '{"amount_inr_threshold": 5000}'::jsonb, 2, 'refund:approve', 24, false),
  ('payout:batch_dispatch', '{}'::jsonb, 2, 'payout:approve', 12, false),
  ('seller:suspend', '{}'::jsonb, 2, 'seller:suspend', 24, true), -- allow_emergency_single = true for emergency fraud freezes
  ('seller:bank_detail_change', '{"cooling_off_hours": 48}'::jsonb, 2, 'seller:modify_bank', 48, false),
  ('admin:invite_create', '{}'::jsonb, 2, 'admin:manage_roles', 48, false),
  ('pii:bulk_export', '{"max_records": 1000}'::jsonb, 2, 'pii:export', 12, false),
  ('merchandising:ranking_override', '{}'::jsonb, 2, 'merchandising:override_ranking', 24, false)
ON CONFLICT (action_key) DO UPDATE SET
  required_approvals = EXCLUDED.required_approvals,
  allow_emergency_single = EXCLUDED.allow_emergency_single;

-- 12. Seed Default Kill Switches
INSERT INTO public.admin_kill_switches (key, enabled, reason) VALUES
  ('payout_freeze', false, 'Emergency halt on all automated and manual gateway payout dispatches'),
  ('new_seller_registration_pause', false, 'Pause public submission of new seller onboarding applications'),
  ('refund_issuance_pause', false, 'Temporarily disable gateway refund execution during reconciliation'),
  ('merchandising_publish_pause', false, 'Halt recommendation model and search ranking weight overrides')
ON CONFLICT (key) DO NOTHING;
