-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 029: Emergency Rollback for Migration 027
-- File:    029_rollback_027_if_needed.sql
-- Created: 2026-06-21
-- ───────────────────────────────────────────────────────────────────────────────
-- ⚠️  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING ⚠️
-- ───────────────────────────────────────────────────────────────────────────────
-- This migration is NOT part of the normal Gate 2 apply sequence.
-- It exists ONLY to restore pre-027 access if applying mig 027 breaks
-- a required staging path (e.g., worker provisioning fails because the
-- service-role path is not yet in the production build).
--
-- DO NOT APPLY THIS MIGRATION UNLESS:
--   1. Migration 027 has already been applied (and verified to be applied).
--   2. Applying 027 has caused a confirmed staging breakage that cannot
--      be fixed by a forward migration (e.g., worker provisioning fails
--      and the service-role path is not yet deployed).
--   3. The rollback has been explicitly approved by the technical owner.
--   4. You are operating on the dedicated staging project only.
--   5. Production is explicitly out of scope for this rollback.
--
-- DO NOT APPLY THIS MIGRATION IF:
--   - Migration 027 has NOT been applied (this file would be a no-op
--     but misleading — do not apply preemptively).
--   - Real worker data is present in the target environment.
--   - Production is the target — production requires separate approval.
--   - A forward fix (e.g., deploying the service-role path and re-running
--     the failing provisioning flow) is available instead.
--
-- RELATIONSHIP TO MIG 027:
--   Migration 027 removes direct KORA_ADMIN access to selected personal.*
--   tables and analytics.impact_unit, routing all admin operations through
--   SECURITY DEFINER functions and service-role paths.
--   This migration re-adds those 6 dropped policies — and only those — to
--   restore the pre-027 access model temporarily until the root cause is fixed.
--
-- STAGING ONLY:
--   Apply to staging project haqflkurpmeaxpikozjl only.
--   Do not apply to production without a separate, explicit approval process.
--
-- Gate 2 OPEN — NOT part of the normal apply sequence.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Runtime notice: reminds operator of preconditions at apply time.
DO $$
BEGIN
  RAISE NOTICE
    '029_rollback_027_if_needed: EMERGENCY ROLLBACK — '
    'Apply ONLY after mig 027 has been applied AND has caused a confirmed breakage. '
    'Do not apply preemptively. Staging only. Technical owner approval required. '
    'Forward-fix (deploy service-role path) is always preferred over this rollback.';
END;
$$;

-- ── Restore: personal.worker_identity — KORA_ADMIN ALL ───────────────────────
-- Removed by mig 027. Restores temporary KORA_ADMIN INSERT path for worker
-- provisioning if service-role path (worker-provisioning-service-key.ts) is
-- not yet deployed or is confirmed broken.

DROP POLICY IF EXISTS worker_identity_kora_admin_all ON personal.worker_identity;

CREATE POLICY worker_identity_kora_admin_all ON personal.worker_identity
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN')
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ── Restore: personal.worker_pib — KORA_ADMIN ALL ────────────────────────────
-- Removed by mig 027. Restores diagnostic read access for KORA_ADMIN.
-- PIB must remain invisible to company roles — this policy does not
-- add any company or employer access to personal.worker_pib.

DROP POLICY IF EXISTS worker_pib_kora_admin_all ON personal.worker_pib;

CREATE POLICY worker_pib_kora_admin_all ON personal.worker_pib
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN')
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ── Restore: personal.worker_pseudonym_map — KORA_ADMIN ALL ──────────────────
-- Removed by mig 027. Most sensitive table: restores only to unblock confirmed
-- broken provisioning path. Should be re-removed by re-applying 027 or a
-- forward granularization migration as soon as the root cause is resolved.

DROP POLICY IF EXISTS worker_pseudonym_map_kora_admin_all ON personal.worker_pseudonym_map;

CREATE POLICY worker_pseudonym_map_kora_admin_all ON personal.worker_pseudonym_map
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN')
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ── Restore: personal.worker_profile_private — KORA_ADMIN ALL ────────────────
-- Removed by mig 027. Restores admin diagnostic access to private worker profile.

DROP POLICY IF EXISTS worker_profile_kora_admin_all ON personal.worker_profile_private;

CREATE POLICY worker_profile_kora_admin_all ON personal.worker_profile_private
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN')
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ── Restore: analytics.impact_unit — KORA_ADMIN SELECT ───────────────────────
-- Removed by mig 027. Restores direct diagnostic read for KORA_ADMIN.
-- Does not grant any company or worker access.

DROP POLICY IF EXISTS kora_admin_impact_unit_read ON analytics.impact_unit;

CREATE POLICY kora_admin_impact_unit_read ON analytics.impact_unit
  FOR SELECT
  USING (kora.kora_role() = 'KORA_ADMIN');

-- ── Restore: analytics.impact_unit — KORA_ADMIN INSERT ───────────────────────
-- Removed by mig 027. Restores KORA_ADMIN write path for IU computation.

DROP POLICY IF EXISTS kora_admin_impact_unit_insert ON analytics.impact_unit;

CREATE POLICY kora_admin_impact_unit_insert ON analytics.impact_unit
  FOR INSERT
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ═══════════════════════════════════════════════════════════════════════════════
-- POST-APPLY VERIFICATION QUERIES (run manually after applying this migration)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- 1. Confirm rollback policies exist:
--    SELECT policyname, tablename FROM pg_policies
--    WHERE policyname IN (
--      'worker_identity_kora_admin_all',
--      'worker_pib_kora_admin_all',
--      'worker_pseudonym_map_kora_admin_all',
--      'worker_profile_kora_admin_all',
--      'kora_admin_impact_unit_read',
--      'kora_admin_impact_unit_insert'
--    )
--    ORDER BY tablename, policyname;
--    Expected: 6 rows.
--
-- 2. Confirm RLS still enabled and forced on all personal.* tables:
--    SELECT relname, relrowsecurity, relforcerowsecurity
--    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--    WHERE n.nspname = 'personal' AND c.relkind = 'r'
--    ORDER BY relname;
--    Expected: all rows have relrowsecurity = true AND relforcerowsecurity = true.
--
-- 3. Confirm anon has no access to personal.*:
--    SELECT grantee, table_name FROM information_schema.role_table_grants
--    WHERE table_schema = 'personal' AND grantee = 'anon';
--    Expected: 0 rows.
--
-- 4. Confirm no company role has a direct personal.* policy:
--    SELECT policyname, tablename FROM pg_policies
--    WHERE schemaname = 'personal'
--    AND (policyname ILIKE '%company%' OR policyname ILIKE '%viewer%');
--    Expected: 0 rows (workforce_baseline company_own_baseline_read is in
--    personal schema but is aggregate data, not individual — verify separately).
--
-- 5. Confirm worker own-access policies still exist:
--    SELECT policyname FROM pg_policies
--    WHERE schemaname = 'personal' AND policyname ILIKE '%worker_own%'
--    ORDER BY policyname;
--    Expected: worker own policies still present (rollback does not touch them).
--
-- 6. Confirm this rollback applies only to the 6 intended policies:
--    Compare with pre-027 policy list from GATE2_PHASE1_POST_MIGRATION_VERIFICATION.md.
--    Any policy not in that list should not have been added by this migration.
-- ═══════════════════════════════════════════════════════════════════════════════

COMMIT;
