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
-- ║    5. DPO / privacy owner is informed (see privacy warning below).         ║
-- ║                                                                              ║
-- ║  ⚠ PRIVACY WARNING — APPLYING THIS FILE:                                  ║
-- ║                                                                              ║
-- ║    A. RESTORES kora_admin_all_uef POLICY:                                  ║
-- ║       KORA_ADMIN JWT gains direct ALL access to analytics.uef_record,      ║
-- ║       including the raw payload field (HR/welfare ingestion data, PII).    ║
-- ║       This RE-OPENS the privacy gap closed by migration 030.               ║
-- ║                                                                              ║
-- ║    B. RESTORES advisor_tenant_uef_read POLICY:                             ║
-- ║       ADVISOR JWT gains direct SELECT on analytics.uef_record,             ║
-- ║       including the raw payload field (HR/welfare raw data, PII).          ║
-- ║       Gate 2.3 H-01 finding: this was identified as a HIGH privacy risk.   ║
-- ║       Re-opening ADVISOR raw payload access is a PRIVACY REGRESSION.       ║
-- ║                                                                              ║
-- ║    DPO must be informed if either policy is restored in any environment    ║
-- ║    that has or may receive real worker data.                                ║
-- ║    CTO + privacy sign-off required before applying.                        ║
-- ║                                                                              ║
-- ║  DO NOT APPLY TO PRODUCTION without separate CTO sign-off and DPO         ║
-- ║  notification. Staging and production rollback must be confirmed            ║
-- ║  separately.                                                                ║
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
    'This restores kora_admin_all_uef AND advisor_tenant_uef_read. '
    'KORA_ADMIN JWT regains direct ALL access including raw payload. '
    'ADVISOR JWT regains direct SELECT including raw payload (Gate 2.3 H-01 regression). '
    'Both restorations are PRIVACY REGRESSIONS. '
    'Ensure CTO approval and DPO notification before applying. '
    'DO NOT apply to production without separate explicit approval.';
END;
$$;

-- ── 1. Restore kora_admin_all_uef ────────────────────────────────────────────
-- Re-adds the broad policy removed by migration 030.
-- ⚠ WARNING: re-opens raw payload access for KORA_ADMIN JWT.

DROP POLICY IF EXISTS kora_admin_all_uef ON analytics.uef_record;

CREATE POLICY kora_admin_all_uef ON analytics.uef_record
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 2. Restore advisor_tenant_uef_read ───────────────────────────────────────
-- Re-adds the ADVISOR SELECT policy removed by migration 030 (H-01 revision).
-- ⚠ WARNING: re-opens raw payload access for ADVISOR JWT (tenant-scoped SELECT).
-- This is a PRIVACY REGRESSION — Gate 2.3 H-01 finding identified this as HIGH risk.
-- DPO must be informed before restoring this policy in any environment with real data.

DROP POLICY IF EXISTS advisor_tenant_uef_read ON analytics.uef_record;

CREATE POLICY advisor_tenant_uef_read ON analytics.uef_record
  FOR SELECT
  USING (
    kora.kora_role() = 'ADVISOR'
    AND tenant_id = kora.tenant_id()
  );

-- ── 3. Drop 030 SECURITY DEFINER functions ────────────────────────────────────
-- These are no longer needed if rolling back to pre-030 state.
-- Includes fn_advisor_uef_read added in the H-01 revision.

DROP FUNCTION IF EXISTS analytics.fn_admin_uef_review(uuid);
DROP FUNCTION IF EXISTS analytics.fn_admin_uef_update_review(uuid, text, text, text);
DROP FUNCTION IF EXISTS analytics.fn_admin_uef_enrich(uuid, jsonb, text);
DROP FUNCTION IF EXISTS analytics.fn_advisor_uef_read(uuid);

-- ── 4. Note: app routes ───────────────────────────────────────────────────────
-- After this rollback, app routes that were updated for 030 (e.g., review/route.ts
-- GET Case B without payload SELECT) should be reverted to restore payload-derived
-- fields in the review response.
-- Check: review/route.ts, enrich/route.ts, uef-service-key.ts.

-- ── 5. POST-APPLY VERIFICATION ───────────────────────────────────────────────
/*
-- Confirm kora_admin_all_uef is restored:
SELECT policyname FROM pg_policies
WHERE tablename = 'uef_record' AND schemaname = 'analytics' AND policyname = 'kora_admin_all_uef';
-- Expected: 1 row.

-- Confirm advisor_tenant_uef_read is restored (Gate 2.3 H-01 regression — DPO informed):
SELECT policyname FROM pg_policies
WHERE tablename = 'uef_record' AND schemaname = 'analytics' AND policyname = 'advisor_tenant_uef_read';
-- Expected: 1 row.

-- Confirm all 030 SECURITY DEFINER functions are dropped:
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'analytics'
  AND routine_name IN (
    'fn_admin_uef_review',
    'fn_admin_uef_update_review',
    'fn_admin_uef_enrich',
    'fn_advisor_uef_read'
  );
-- Expected: 0 rows.
*/

COMMIT;
