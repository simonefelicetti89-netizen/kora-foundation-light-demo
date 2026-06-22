-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 030 (030_uef_admin_access_hardening.sql). ║
-- ║  It is NOT part of the normal Gate 2 apply sequence.                       ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 030 has been applied and caused confirmed breakage.         ║
-- ║    2. A forward fix (031 or config change) is not viable.                  ║
-- ║    3. Rollback has been explicitly approved by CTO / technical owner.      ║
-- ║    4. The target environment is confirmed (staging vs. production).         ║
-- ║                                                                              ║
-- ║  ⚠ APPLYING THIS FILE RESTORES kora_admin_all_uef POLICY:                 ║
-- ║    KORA_ADMIN JWT gains direct ALL access to analytics.uef_record,         ║
-- ║    including the raw payload field containing HR/welfare ingestion data.   ║
-- ║    This RE-OPENS the privacy gap that migration 030 closed.                ║
-- ║    DPO must be informed if this is applied to any environment with         ║
-- ║    real worker data.                                                         ║
-- ║                                                                              ║
-- ║  DO NOT APPLY TO PRODUCTION without separate CTO sign-off.                 ║
-- ║  Staging and production rollback must be confirmed separately.              ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/030_rollback_030_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

DO $$
BEGIN
  RAISE NOTICE
    '030_rollback_030_if_needed: EMERGENCY ROLLBACK — '
    'This restores kora_admin_all_uef on analytics.uef_record. '
    'KORA_ADMIN JWT regains direct ALL access including raw payload field. '
    'Ensure CTO approval and DPO notification (if real data environment). '
    'DO NOT apply to production without separate explicit approval.';
END;
$$;

-- ── 1. Restore kora_admin_all_uef ────────────────────────────────────────────
-- Re-adds the broad policy removed by migration 030.
-- WARNING: this re-opens raw payload access for KORA_ADMIN JWT.

DROP POLICY IF EXISTS kora_admin_all_uef ON analytics.uef_record;

CREATE POLICY kora_admin_all_uef ON analytics.uef_record
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 2. Drop 030 SECURITY DEFINER functions ────────────────────────────────────
-- These are no longer needed if rolling back to pre-030 state.
-- Functions are optional post-rollback: they are safe to keep if preferred.
-- Drop them here for clean rollback state.

DROP FUNCTION IF EXISTS analytics.fn_admin_uef_review(uuid);
DROP FUNCTION IF EXISTS analytics.fn_admin_uef_update_review(uuid, text, text, text);
DROP FUNCTION IF EXISTS analytics.fn_admin_uef_enrich(uuid, jsonb, text);

-- ── 3. Note: app routes ───────────────────────────────────────────────────────
-- After this rollback, app routes that were updated for 030 (e.g., review/route.ts
-- GET Case B without payload SELECT) should be reverted to restore payload-derived
-- fields in the review response.
-- Check: review/route.ts, enrich/route.ts, uef-service-key.ts.

-- ── 4. POST-APPLY VERIFICATION ───────────────────────────────────────────────
/*
-- Confirm kora_admin_all_uef is restored:
SELECT policyname FROM pg_policies
WHERE tablename = 'uef_record' AND schemaname = 'analytics' AND policyname = 'kora_admin_all_uef';
-- Expected: 1 row.

-- Confirm 030 functions are dropped:
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'analytics'
  AND routine_name IN ('fn_admin_uef_review', 'fn_admin_uef_update_review', 'fn_admin_uef_enrich');
-- Expected: 0 rows.

-- Confirm advisor_tenant_uef_read is still present:
SELECT policyname FROM pg_policies
WHERE tablename = 'uef_record' AND schemaname = 'analytics' AND policyname = 'advisor_tenant_uef_read';
-- Expected: 1 row.
*/

COMMIT;
