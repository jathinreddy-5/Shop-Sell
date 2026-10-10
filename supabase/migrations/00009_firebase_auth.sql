-- Migration: 00009_firebase_auth.sql
-- Adds firebase_uid to public.profiles for Firebase Phone Authentication identity mapping

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS firebase_uid TEXT;

-- Create unique index on firebase_uid so one Firebase account maps to at most one Shop:Sell profile
DO $$ BEGIN
  CREATE UNIQUE INDEX idx_profiles_firebase_uid
  ON public.profiles(firebase_uid)
  WHERE firebase_uid IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN null;
END $$;

-- Index for fast lookup by normalized phone number
DO $$ BEGIN
  CREATE INDEX idx_profiles_phone_lookup
  ON public.profiles(phone)
  WHERE phone IS NOT NULL;
EXCEPTION WHEN duplicate_table THEN null;
END $$;
