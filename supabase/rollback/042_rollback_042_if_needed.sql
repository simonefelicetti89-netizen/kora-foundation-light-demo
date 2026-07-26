-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 042                                        ║
-- ║  (042_kora_link_company_partner_provisioning.sql).                         ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 042 has been applied and caused confirmed breakage.         ║
-- ║    2. A forward fix (043+) is not viable.                                  ║
-- ║    3. Rollback has been explicitly approved by the technical owner.        ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received KORA Link migrations at all).         ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    fn_company_link_status_aggregate reverts to its pre-13B body (identical ║
-- ║    to 036_kora_link_rpc_functions.sql) — COMPANY_ADMIN access reverts to   ║
-- ║    claim+tenant only, with NO analytics.company_identity provisioning      ║
-- ║    check. Gate 4 finding 2 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10)     ║
-- ║    reopens for this RPC.                                                    ║
-- ║                                                                              ║
-- ║  WHAT THIS DROPS:                                                          ║
-- ║    - analytics.company_identity (table, indexes, policies, trigger) —      ║
-- ║      DESTRUCTIVE if any row has been provisioned since 042 was applied.    ║
-- ║      Any company account relying on this table for provisioning will lose  ║
-- ║      that mapping; access reverts to claim-only (see above).               ║
-- ║    - kora_link.is_provisioned_company_role()                               ║
-- ║    - kora_link.is_provisioned_partner(uuid)                                ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH:                                                 ║
-- ║    - network.partner_identity — pre-existing (migration 012), never        ║
-- ║      altered by 042, not altered by this rollback either.                  ║
-- ║    - Any other kora_link table, policy, or function.                       ║
-- ║    - personal.worker_identity or any WORKER-facing behavior.               ║
-- ║                                                                              ║
-- ║  BEFORE APPLYING: back up analytics.company_identity if it holds any real  ║
-- ║  provisioning data — this rollback is destructive to that table.           ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/042_rollback_042_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ── 1. Restore fn_company_link_status_aggregate to its pre-13B (036) body ────

CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(
  p_tenant_id uuid
)
RETURNS TABLE (
  status      text,
  count       bigint,
  suppressed  boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
BEGIN
  IF kora.kora_role() NOT IN ('COMPANY_ADMIN', 'KORA_ADMIN') THEN
    RETURN;
  END IF;

  IF kora.kora_role() = 'COMPANY_ADMIN' THEN
    IF p_tenant_id IS NULL OR p_tenant_id <> kora.tenant_id() THEN
      RETURN;
    END IF;
  END IF;

  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH raw_counts AS (
    SELECT
      CASE
        WHEN l.status IN ('generated','assigned_to_tenant','delivered','activation_pending')
             AND l.pre_activation_expires_at IS NOT NULL
             AND l.pre_activation_expires_at <= now()
          THEN 'expired'
        ELSE l.status
      END AS status_bucket,
      COUNT(*)::bigint AS raw_count
    FROM kora_link.links l
    WHERE l.tenant_id = p_tenant_id
    GROUP BY 1
  )
  SELECT
    rc.status_bucket,
    CASE WHEN rc.raw_count BETWEEN 1 AND 9 THEN NULL ELSE rc.raw_count END,
    rc.raw_count BETWEEN 1 AND 9
  FROM raw_counts rc
  ORDER BY 1;

END;
$$;

COMMENT ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) IS
  'KORA-LINK-S08 — company-safe aggregate counts by status bucket, threshold-suppressed. '
  'COMPANY_ADMIN (own tenant only) or KORA_ADMIN (any tenant). '
  'Never returns link_id, token_digest, or worker_id. '
  'SECURITY DEFINER. search_path explicit.';

-- ── 2. Drop the 13B helper functions ──────────────────────────────────────────

DROP FUNCTION IF EXISTS kora_link.is_provisioned_company_role();
DROP FUNCTION IF EXISTS kora_link.is_provisioned_partner(uuid);

-- ── 3. Drop analytics.company_identity ────────────────────────────────────────
-- DESTRUCTIVE — see warning above.

DROP TRIGGER IF EXISTS trg_company_identity_updated_at ON analytics.company_identity;
DROP TABLE IF EXISTS analytics.company_identity;

-- ── 4. POST-APPLY VERIFICATION ────────────────────────────────────────────────
/*
-- Confirm the helper functions are gone:
SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'kora_link' AND p.proname IN ('is_provisioned_company_role', 'is_provisioned_partner');
-- Expected: 0.

-- Confirm the table is gone:
SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'analytics' AND c.relname = 'company_identity';
-- Expected: 0.

-- Confirm fn_company_link_status_aggregate no longer references the dropped function:
SELECT prosrc ILIKE '%is_provisioned_company_role%' FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'kora_link' AND p.proname = 'fn_company_link_status_aggregate';
-- Expected: false.
*/

COMMIT;
