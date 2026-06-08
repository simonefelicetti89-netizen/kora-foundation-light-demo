-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 006: Canonical tenant key reconciliation
-- Migration:   006_canonical_tenant_key
-- Created:     2026-06-08
-- Supersedes:  003 + 004 for the kora.tenant_id() function only.
-- ───────────────────────────────────────────────────────────────────────────────
-- PROBLEM (migrations 003 + 004):
--   kora.tenant_id() reads app_metadata ->> 'tenant_id' (no prefix).
--   kora-session.ts (requireCompanyUser, getTenantFromSession) reads
--   app_metadata.kora_tenant_id (namespaced key).
--   All provisioning routes (live-company, provision) write kora_tenant_id.
--
--   Mismatch: kora.tenant_id() returned NULL for every provisioned company user
--   → RLS policies using kora.tenant_id() blocked all company rows silently.
--
-- RESOLUTION — canonical key: 'kora_tenant_id'
--   Authority hierarchy:
--     kora-session.ts       reads  app_metadata.kora_tenant_id
--     provision/route.ts    writes app_metadata.kora_tenant_id
--     kora.tenant_id()      now    reads app_metadata.kora_tenant_id  (this migration)
--
-- BACKWARD COMPAT:
--   'tenant_id' (pre-006 legacy) is kept as third-priority fallback.
--   Remove after confirming all auth.users carry kora_tenant_id.
--
-- SECURITY: unchanged — app_metadata is writable only via Admin API / service_role.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION kora.tenant_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      -- 1. Top-level claim (future custom JWT hook path)
      NULLIF(
        current_setting('request.jwt.claims', true)::jsonb ->> 'kora_tenant_id',
        ''
      ),
      -- 2. app_metadata.kora_tenant_id — CANONICAL KEY (kora-session.ts + provision route)
      NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'kora_tenant_id',
        ''
      ),
      -- 3. Legacy fallback: 'tenant_id' from pre-006 provisioning (no known users)
      NULLIF(
        current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
        ''
      )
    ),
    ''
  )::uuid;
$$;

NOTIFY pgrst, 'reload schema';

-- Verify the updated function body contains the canonical key.
-- Expected: 'kora_tenant_id' must appear in the routine_definition.
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'kora'
  AND routine_name = 'tenant_id';
