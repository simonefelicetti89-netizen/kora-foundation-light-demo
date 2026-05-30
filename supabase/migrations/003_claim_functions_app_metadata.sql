-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 003: JWT claim functions — app_metadata fallback
-- Migration:   003_claim_functions_app_metadata
-- Created:     2026-05-30
-- Gate:        Gate 3A — Supabase Auth + Claims + Tenant Isolation
-- ───────────────────────────────────────────────────────────────────────────────
-- PROBLEM (migration 001):
--   kora.kora_role() and kora.tenant_id() read only top-level JWT claims.
--   Supabase standard JWT nests custom claims inside app_metadata:
--     { "app_metadata": { "kora_role": "COMPANY_ADMIN", "tenant_id": "..." } }
--   Without a custom auth hook, top-level reads return NULL → kora_role = 'anonymous'
--   → all RLS policies fail → 0 rows for every authenticated user.
--
-- FIX:
--   Read top-level first (forward-compatible with a future custom JWT hook),
--   then fall back to app_metadata (standard Supabase location).
--   This makes RLS work correctly with Supabase's built-in auth without any hook.
--
-- SECURITY:
--   app_metadata is server-controlled (Admin API / service_role only).
--   Clients cannot modify app_metadata via supabase.auth.updateUser() —
--   that method only touches user_metadata.
--   Therefore kora_role and tenant_id remain user-non-editable.
--
-- APPLICATION:
--   Apply manually in Supabase SQL editor OR via:
--     supabase db push  (requires supabase CLI and linked project)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION kora.kora_role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    -- 1. Top-level claim (future custom JWT hook path)
    NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'kora_role', ''),
    -- 2. Nested under app_metadata (standard Supabase auth path)
    NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'kora_role', ''),
    -- 3. Default: no valid claim → anonymous (no RLS policy covers this → 0 rows)
    'anonymous'
  );
$$;

CREATE OR REPLACE FUNCTION kora.tenant_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(
    COALESCE(
      -- 1. Top-level claim (future custom JWT hook path)
      NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', ''),
      -- 2. Nested under app_metadata (standard Supabase auth path)
      NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id', '')
    ),
    ''
  )::uuid;
$$;

-- Grants are inherited from migration 001 — no change needed.
-- GRANT EXECUTE ON FUNCTION kora.tenant_id(), kora.kora_role() TO authenticated, anon;
