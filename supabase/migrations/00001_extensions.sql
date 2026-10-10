-- Migration: 00001_extensions.sql
-- Enables required Postgres extensions and creates the auth schema if not present (for standalone Postgres)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    CREATE TYPE vector;
    CREATE FUNCTION vector_in(cstring, oid, integer) RETURNS vector LANGUAGE internal AS 'varcharin';
    CREATE FUNCTION vector_out(vector) RETURNS cstring LANGUAGE internal AS 'varcharout';
    CREATE FUNCTION vector_typmod_in(cstring[]) RETURNS integer LANGUAGE internal AS 'varchartypmodin';
    CREATE TYPE vector (
      INPUT = vector_in,
      OUTPUT = vector_out,
      TYPMOD_IN = vector_typmod_in,
      LIKE = text
    );
  END IF;
END $$;

-- Safely initialize auth schema if running on plain Postgres (skipped on hosted Supabase)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      encrypted_password TEXT,
      email_confirmed_at TIMESTAMPTZ,
      raw_app_meta_data JSONB DEFAULT '{"provider": "email", "providers": ["email"]}',
      raw_user_meta_data JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Mock auth.uid() function if not already provided by Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS UUID AS $func$
    BEGIN
      RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    $func$ LANGUAGE plpgsql STABLE;
  END IF;
END $$;

-- Mock auth.jwt() function if not already provided by Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'auth' AND p.proname = 'jwt'
  ) THEN
    CREATE OR REPLACE FUNCTION auth.jwt()
    RETURNS JSONB AS $func$
    BEGIN
      RETURN NULLIF(current_setting('request.jwt.claims', true), '')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      RETURN '{}'::JSONB;
    END;
    $func$ LANGUAGE plpgsql STABLE;
  END IF;
END $$;
