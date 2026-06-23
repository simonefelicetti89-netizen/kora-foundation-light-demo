-- Rollback 031 — Restore PUBLIC EXECUTE on UEF SECURITY DEFINER functions
--
-- ██████████████████████████████████████████████████████████████████████████
-- WARNING: APPLYING THIS FILE IS A SECURITY REGRESSION.
--
-- Migration 031 revoked PUBLIC EXECUTE from 4 UEF SECURITY DEFINER functions
-- to enforce least-privilege SECURITY DEFINER posture (M-04 fix).
--
-- Applying this rollback RE-GRANTS PUBLIC EXECUTE on all 4 functions.
-- This means anon, company workers, company admins, and any other DB role
-- can CALL these functions (though internal auth checks still protect data).
--
-- Gate 2.3 M-04 finding is REOPENED by this rollback.
--
-- AUTHORIZATION REQUIRED:
--   1. Explicit written CTO / technical-owner approval.
--   2. Documented root cause that forced the rollback (e.g., confirmed service_role
--      path failure that cannot be resolved forward via a 032 patch migration).
--   3. Confirmed target environment (staging vs. production are separate decisions).
--   4. DPO must be informed if this rollback is applied to any environment
--      that has ever held real worker data.
--
-- STRONGLY PREFERRED ALTERNATIVE:
--   Deploy a 032 patch migration to fix the specific grant issue rather than
--   reverting the full least-privilege posture.
-- ██████████████████████████████████████████████████████████████████████████
--
-- ROLLS BACK:    Migration 031 (031_revoke_public_execute_uef_definer_functions.sql)
-- PREREQUISITE:  Migration 031 must be applied before this rollback makes sense.
-- TARGET:        haqflkurpmeaxpikozjl (kora-staging) — separate approval for production.
-- STATUS:        NOT APPLIED — manual-only emergency artifact.
-- APPLY VIA:     supabase db query --linked --file supabase/rollback/031_rollback_031_if_needed.sql
-- DO NOT RUN:    supabase migration up

DO $$
BEGIN
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'ROLLBACK 031: Restoring PUBLIC EXECUTE on UEF DEFINER fns.';
  RAISE NOTICE 'SECURITY REGRESSION: Gate 2.3 M-04 finding REOPENED.';
  RAISE NOTICE 'PUBLIC EXECUTE restored on fn_admin_uef_review,';
  RAISE NOTICE '  fn_admin_uef_update_review, fn_admin_uef_enrich,';
  RAISE NOTICE '  fn_advisor_uef_read.';
  RAISE NOTICE 'Internal auth checks remain active — data not directly exposed.';
  RAISE NOTICE 'Reason for rollback must be documented before execution.';
  RAISE NOTICE '==========================================================';
END $$;

BEGIN;

-- Restore PUBLIC EXECUTE (pre-031 state)
-- This re-enables anon access to call functions (internal auth checks block data)

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  TO PUBLIC;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  TO PUBLIC;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  TO PUBLIC;

GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  TO PUBLIC;

-- Remove explicit service_role grant (was added by 031 as replacement for PUBLIC)
-- service_role still has access through the restored PUBLIC grant.

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid)
  FROM service_role;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text)
  FROM service_role;

REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text)
  FROM service_role;

REVOKE EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid)
  FROM service_role;

COMMIT;

-- ── POST-APPLY VERIFICATION ───────────────────────────────────────────────────
-- Run after rollback to confirm pre-031 grant state restored:
-- Expected: PUBLIC row present for all 4 functions; service_role row ABSENT.
--
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'analytics'
--   AND routine_name IN (
--     'fn_admin_uef_review','fn_admin_uef_update_review',
--     'fn_admin_uef_enrich','fn_advisor_uef_read'
--   )
-- ORDER BY routine_name, grantee;
-- Expected grantees per function: PUBLIC, authenticated, postgres
-- (12 rows total, service_role absent)
