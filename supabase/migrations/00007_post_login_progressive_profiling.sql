-- Migration: 00007_post_login_progressive_profiling.sql
-- Idempotent, reversible migration for Post-Login Progressive Profiling

-- 1. Alter public.profiles (Add new profiling and consent columns)
DO $$ BEGIN
  -- full_name already exists in 00002_schema.sql, ensure text
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_e164 text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say'));
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shopping_for text CHECK (shopping_for IN ('womens', 'mens', 'unisex', 'kids', 'prefer_not_to_say'));
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS default_pincode text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_18_plus boolean;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS age_range text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en-IN';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency text DEFAULT 'INR';
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS size_profile jsonb DEFAULT '{}'::jsonb;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"transactional": true, "marketing": false}'::jsonb;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_consent_text_version text;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_status text DEFAULT 'not_started' CHECK (onboarding_status IN ('not_started', 'step1_done', 'completed', 'skipped'));
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_skipped_count int DEFAULT 0;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_last_prompted_at timestamptz;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_completeness smallint DEFAULT 0;
END $$;

-- 2. Normalized Interest Categories Taxonomy
CREATE TABLE IF NOT EXISTS public.interest_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  parent_id uuid REFERENCES public.interest_categories(id) ON DELETE SET NULL,
  is_apparel boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed normalized interest categories
INSERT INTO public.interest_categories (slug, label, is_apparel, sort_order)
VALUES
  ('artisanal-crafts', 'Artisanal Crafts', false, 1),
  ('smart-gadgets', 'Smart Gadgets & Electronics', false, 2),
  ('sustainable-living', 'Sustainable & Eco Living', false, 3),
  ('apparel-menswear', 'Menswear & Accessories', true, 4),
  ('apparel-womenswear', 'Womenswear & Couture', true, 5),
  ('home-living', 'Home Decor & Living', false, 6),
  ('organic-foods', 'Gourmet & Organic Foods', false, 7),
  ('beauty-wellness', 'Clean Beauty & Wellness', false, 8),
  ('footwear-shoes', 'Designer Footwear', true, 9)
ON CONFLICT (slug) DO UPDATE
SET label = EXCLUDED.label, is_apparel = EXCLUDED.is_apparel;

-- 3. Profile Interests (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.profile_interests (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.interest_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, interest_id)
);

-- 4. Pincode Serviceability & Waitlist
CREATE TABLE IF NOT EXISTS public.serviceable_pincodes (
  pincode text PRIMARY KEY,
  city text NOT NULL,
  state text NOT NULL,
  estimated_days int NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed sample serviceable Indian pincodes
INSERT INTO public.serviceable_pincodes (pincode, city, state, estimated_days)
VALUES
  ('560001', 'Bengaluru', 'Karnataka', 2),
  ('560034', 'Bengaluru', 'Karnataka', 2),
  ('560038', 'Bengaluru', 'Karnataka', 2),
  ('110001', 'New Delhi', 'Delhi', 3),
  ('110020', 'New Delhi', 'Delhi', 3),
  ('400001', 'Mumbai', 'Maharashtra', 2),
  ('400050', 'Mumbai', 'Maharashtra', 2),
  ('600001', 'Chennai', 'Tamil Nadu', 3),
  ('500001', 'Hyderabad', 'Telangana', 2),
  ('700001', 'Kolkata', 'West Bengal', 4)
ON CONFLICT (pincode) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.pincode_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Multi-Address Storage with Partial Unique Default Index
CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home', -- 'Home', 'Work', 'Other'
  type text NOT NULL CHECK (type IN ('shipping', 'billing')),
  recipient_name text NOT NULL,
  phone_e164 text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  landmark text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  country_code char(2) NOT NULL DEFAULT 'IN',
  gstin text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure each user has at most one default address per type (shipping / billing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_user_type_default
ON public.addresses (user_id, type)
WHERE is_default = true;

-- 6. Append-Only Consent Log
CREATE TABLE IF NOT EXISTS public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  consent_type text NOT NULL, -- e.g. 'marketing_email_sms'
  granted boolean NOT NULL,
  text_version text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Profile Completeness Recomputation Trigger/Function
CREATE OR REPLACE FUNCTION compute_profile_completeness(p public.profiles)
RETURNS smallint AS $$
DECLARE
  score smallint := 0;
BEGIN
  IF p.full_name IS NOT NULL AND length(trim(p.full_name)) > 0 THEN score := score + 20; END IF;
  IF (p.phone_e164 IS NOT NULL OR p.phone IS NOT NULL) AND p.phone_verified = true THEN score := score + 20; END IF;
  IF p.email_verified = true THEN score := score + 15; END IF;
  IF p.default_pincode IS NOT NULL AND length(trim(p.default_pincode)) = 6 THEN score := score + 15; END IF;
  IF p.shopping_for IS NOT NULL THEN score := score + 10; END IF;
  IF p.gender IS NOT NULL THEN score := score + 10; END IF;
  IF p.size_profile IS NOT NULL AND p.size_profile != '{}'::jsonb THEN score := score + 10; END IF;
  RETURN score;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION trg_recompute_profile_completeness()
RETURNS trigger AS $$
BEGIN
  NEW.profile_completeness := compute_profile_completeness(NEW);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_completeness ON public.profiles;
CREATE TRIGGER trg_profiles_completeness
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trg_recompute_profile_completeness();

-- 8. Data Rights: Export My Data Function
CREATE OR REPLACE FUNCTION export_my_data(target_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(p) - 'id' FROM public.profiles p WHERE p.id = target_user_id),
    'interests', (
      SELECT jsonb_agg(jsonb_build_object('id', ic.id, 'slug', ic.slug, 'label', ic.label))
      FROM public.profile_interests pi
      JOIN public.interest_categories ic ON pi.interest_id = ic.id
      WHERE pi.profile_id = target_user_id
    ),
    'addresses', (SELECT jsonb_agg(to_jsonb(a)) FROM public.addresses a WHERE a.user_id = target_user_id),
    'consent_history', (
      SELECT jsonb_agg(jsonb_build_object(
        'consent_type', cl.consent_type,
        'granted', cl.granted,
        'text_version', cl.text_version,
        'created_at', cl.created_at
      ))
      FROM public.consent_log cl
      WHERE cl.user_id = target_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Row-Level Security (RLS) Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pincode_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serviceable_pincodes ENABLE ROW LEVEL SECURITY;

-- Interest Categories & Serviceable Pincodes (Read-only for all authenticated & anon users)
DROP POLICY IF EXISTS "Public read interest categories" ON public.interest_categories;
CREATE POLICY "Public read interest categories"
ON public.interest_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read serviceable pincodes" ON public.serviceable_pincodes;
CREATE POLICY "Public read serviceable pincodes"
ON public.serviceable_pincodes FOR SELECT USING (true);

-- Addresses: Users can manage only their own rows
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses"
ON public.addresses FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Profile Interests: Users can manage only their own interests
DROP POLICY IF EXISTS "Users can manage own profile interests" ON public.profile_interests;
CREATE POLICY "Users can manage own profile interests"
ON public.profile_interests FOR ALL
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Consent Log: Users can insert and view their own log entries, but never modify or delete
DROP POLICY IF EXISTS "Users can view own consent log" ON public.consent_log;
CREATE POLICY "Users can view own consent log"
ON public.consent_log FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own consent log" ON public.consent_log;
CREATE POLICY "Users can insert own consent log"
ON public.consent_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Pincode Waitlist: Users can insert rows
DROP POLICY IF EXISTS "Users can join pincode waitlist" ON public.pincode_waitlist;
CREATE POLICY "Users can join pincode waitlist"
ON public.pincode_waitlist FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
