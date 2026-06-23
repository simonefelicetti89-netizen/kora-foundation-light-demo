-- Migration 031: Revoke PUBLIC EXECUTE from UEF SECURITY DEFINER functions
-- Gate 2.3.1 — M-04 MEDIUM finding from migration 030 staging apply (2026-06-23)
--
-- BACKGROUND
-- Migration 030 created 4 SECURITY DEFINER functions and issued:
--   GRANT EXECUTE TO authenticated;
--   REVOKE EXECUTE FROM anon;
-- PostgreSQL grants EXECUTE to PUBLIC by default on CREATE FUNCTION.
-- REVOKE FROM anon is insufficient when PUBLIC still holds EXECUTE — anon inherits
-- EXECUTE through PUBLIC even after an explicit per-role REVOKE.
-- This migration resolves M-04 by revoking PUBLIC EXECUTE and replacing it with
-- explicit, least-privilege role grants.
--
-- ACCESS MATRIX POST-031
-- Role            fn_admin_uef_review  fn_admin_uef_update_review  fn_admin_uef_enrich  fn_advisor_uef_read
-- postgres        YES (owner)          YES (owner)                 YES (owner)          YES (owner)
-- service_role    YES (explicit)       YES (explicit)              YES (explicit)        YES (explicit)
-- authenticated   YES (030 grant)      YES (030 grant)             YES (030 grant)       YES (030 grant)
-- anon            NO                   NO                          NO                    NO
-- PUBLIC          NO (revoked here)    NO (revoked here)           NO (revoked here)     NO (revoked here)
--
-- Internal auth checks inside the functions remain the authoritative guard:
--   fn_admin_uef_review        — WHERE clause: service_role / postgres / KORA_ADMIN JWT
--   fn_admin_uef_update_review — RAISE EXCEPTION: service_role / postgres / KORA_ADMIN JWT
--   fn_admin_uef_enrich        — RAISE EXCEPTION: service_role / postgres / KORA_ADMIN JWT
--   fn_advisor_uef_read        — RAISE EXCEPTION: service_role / postgres; tenant-scoped ADVISOR JWT
-- Revoking PUBLIC EXECUTE is a defence-in-depth hardening — not a replacement for internal checks.
--
-- WHY service_role IS GRANTED
-- App routes use getSupabaseServiceClient() which connects via PostgREST as service_role.
-- Step 2 of the two-step rollout (switching review/route.ts GET Case B to supabase.rpc()) will
-- call these functions from service_role context. The internal auth checks already allow
-- service_role via current_role IN ('service_role', 'postgres').
--
-- WHY authenticated IS RETAINED
-- KORA_ADMIN and ADVISOR users authenticate via JWT and call these functions with the
-- authenticated role. The JWT role (kora.kora_role()) determines KORA_ADMIN vs ADVISOR
-- inside the function body.
--
-- ROLLBACK
-- See supabase/rollback/031_rollback_031_if_needed.sql
-- Do not apply rollback via supabase migration up. Manual only. CTO approval required.
--
-- Gate 2 status: Gate 2 CLOSED WITH CONDITIONS
-- Gate 3 status: OPEN — NOT CLOSED — no real worker data
-- Applies to:    haqflkurpmeaxpikozjl (kora-staging) — STAGING ONLY
-- Production:    NOT touched — apply requires Gate 3 close

BEGIN;

-- ── Step 1: Revoke PUBLIC EXECUTE ────────────────────────────────────────────
-- Removes the default PostgreSQL PUBLIC grant applied at CREATE FUNCTION time.
-- After this step anon has no path to EXECUTE any of these functions.

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  FROM PUBLIC;

-- ── Step 2: Grant EXECUTE to service_role ────────────────────────────────────
-- Explicit grant required after PUBLIC is revoked.
-- service_role is used by:
--   (a) app routes via getSupabaseServiceClient() (current: direct table access)
--   (b) future Step 2 RPC calls via supabase.rpc()
--   (c) supabase db query --linked smoke tests run as postgres/service_role

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  TO service_role;

GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  TO service_role;

-- ── Step 3: Confirm authenticated retain (already granted by 030) ─────────────
-- Re-issuing is idempotent and makes this migration self-documenting.

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  TO authenticated;

-- ── Step 4: Revoke from anon (belt-and-suspenders) ───────────────────────────
-- anon has no explicit grant after PUBLIC is revoked, but explicit REVOKE makes
-- intent unambiguous and survives future accidental PUBLIC re-grants.

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  FROM anon;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  FROM anon;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  FROM anon;

REVOKE EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  FROM anon;

COMMIT;

-- ── VERIFICA POST-APPLY ───────────────────────────────────────────────────────
-- Run manually after apply to confirm least-privilege grant state.
-- Expected results:
--   PUBLIC:       NOT in grantee list for any function
--   anon:         NOT in grantee list for any function
--   authenticated: EXECUTE on all 4 functions
--   service_role:  EXECUTE on all 4 functions
--   postgres:      EXECUTE on all 4 functions (owner, is_grantable=YES)
--
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'analytics'
--   AND routine_name IN (
--     'fn_admin_uef_review','fn_admin_uef_update_review',
--     'fn_admin_uef_enrich','fn_advisor_uef_read'
--   )
-- ORDER BY routine_name, grantee;
-- Expected rows: 12 (3 grantees × 4 functions: authenticated, postgres, service_role)
-- PUBLIC and anon rows: ABSENT
