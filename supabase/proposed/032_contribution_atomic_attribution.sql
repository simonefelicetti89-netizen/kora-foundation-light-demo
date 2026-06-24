-- supabase/proposed/032_contribution_atomic_attribution.sql
-- PROPOSED MIGRATION — NOT APPLIED TO ANY DATABASE.
-- Purpose: atomic KORA Contribution attribution for cross-company bookings.
--
-- NUMBERING: was previously proposed as 026 — renumbered to 032 to avoid conflict
-- with applied migration 026_company_route_rls_gaps.sql. Last applied migration
-- in forward pipeline: 031_revoke_public_execute_uef_definer_functions.sql.
--
-- PROBLEM (C-9): attributeContributionForBooking() in lib/commons/cross-company-attribution.ts
-- writes 2 rows to commons.contribution_event sequentially without a transaction wrapper.
-- If the second INSERT fails with a non-idempotency error, the first row is committed → partial.
--
-- SOLUTION: this function wraps both INSERTs in a single PL/pgSQL transaction block,
-- guaranteeing atomic attribution (both succeed or both rollback).
--
-- PREREQUISITES:
--   - commons schema must exist (migration 025 REVISED + applied and confirmed)
--   - commons.contribution_event table must exist with M025-6 fields:
--     source_type, event_type, contribution_component_hint, is_cross_company, privacy_threshold_met
--   - commons.booking table must exist
--   - Gate 3 must be closed (production apply) or staging-only (synthetic data)
-- SCHEMA COMPAT: updated 2026-06-24 to populate M025-6 fields on both INSERTs.
-- M025-7 NOTE: this function uses ON CONFLICT ON CONSTRAINT uq_contribution_booking
--   (tenant_id, role, source_booking_id). That constraint is UNCHANGED by M025-7.
--   M025-7 only modified uq_contribution_external (used by adoption events, not bookings).
--   No changes required to this function for M025-7 compatibility.
--
-- GATE STATUS: Gate 3 OPEN — NOT APPLIED.
-- APPLY: only after CTO review and Gate 3 closure. Do NOT run supabase db push.
-- APPLY ORDER: must be applied AFTER migration 025. Do not apply standalone.
-- CALLER: update attributeContributionForBooking() in lib/commons/cross-company-attribution.ts
--         to call this RPC via .rpc('attribute_contribution_for_booking_atomic', ...)
--         after this migration is applied to the target environment.
--
-- REVIEW REQUIRED: CTO + Gate 3 sign-off before production apply.

-- Gate 2 OPEN reminder: NOT applied to any live database.
-- This file exists for review and planning only.

-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE OR REPLACE FUNCTION commons.attribute_contribution_for_booking_atomic(
  p_booking_id       uuid,
  p_post_id          uuid,
  p_post_tenant_id   uuid,
  p_worker_tenant_id uuid,
  p_reporting_period text    DEFAULT '2026-Q2',
  p_promoter_weight  numeric DEFAULT 1.0000,
  p_origin_weight    numeric DEFAULT 0.5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = commons, analytics, public
AS $$
DECLARE
  v_caller_role   text;
  v_written       int := 0;
  v_row           jsonb;
BEGIN
  -- Auth check: only KORA_ADMIN or service_role may call this function.
  v_caller_role := kora.kora_role();
  IF current_role NOT IN ('service_role', 'postgres') AND v_caller_role <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'attribute_contribution_for_booking_atomic: accesso negato — ruolo: %', v_caller_role;
  END IF;

  -- INSERT promoter row (booking host tenant)
  -- M025-6 fields: source_type='booking', event_type='attendance_marked', is_cross_company=true.
  -- privacy_threshold_met is not set here — the N≥10 check is enforced by
  -- booking_aggregate_for_promoter() at read time. Set to false at write time.
  INSERT INTO commons.contribution_event (
    tenant_id, source_booking_id, source_post_id,
    role, contribution_kind, impact_weight, evidence_status, reporting_period,
    source_type, event_type, contribution_component_hint,
    is_cross_company, privacy_threshold_met
  ) VALUES (
    p_post_tenant_id, p_booking_id, p_post_id,
    'promoter', 'cross_company_participation', p_promoter_weight, 'verified', p_reporting_period,
    'booking', 'attendance_marked', 'activation_depth',
    true, false
  )
  ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING;

  GET DIAGNOSTICS v_written = ROW_COUNT;

  -- INSERT origin_employer row (worker's home tenant) — same transaction
  INSERT INTO commons.contribution_event (
    tenant_id, source_booking_id, source_post_id,
    role, contribution_kind, impact_weight, evidence_status, reporting_period,
    source_type, event_type, contribution_component_hint,
    is_cross_company, privacy_threshold_met
  ) VALUES (
    p_worker_tenant_id, p_booking_id, p_post_id,
    'origin_employer', 'cross_company_participation', p_origin_weight, 'verified', p_reporting_period,
    'booking', 'attendance_marked', 'activation_depth',
    true, false
  )
  ON CONFLICT ON CONSTRAINT uq_contribution_booking DO NOTHING;

  GET DIAGNOSTICS v_written = v_written + ROW_COUNT;

  -- Both rows committed atomically — no partial attribution possible.
  RETURN jsonb_build_object('contribution_written', v_written, 'errors', 0);

EXCEPTION WHEN OTHERS THEN
  -- RAISE re-throws, rolling back both INSERTs — no partial write.
  RAISE;
END;
$$;

-- Grants: service_role only. KORA_ADMIN path goes via service_role in BookingService.
REVOKE ALL ON FUNCTION commons.attribute_contribution_for_booking_atomic FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commons.attribute_contribution_for_booking_atomic TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─── CALLER UPDATE (post-migration) ──────────────────────────────────────────
-- In lib/commons/cross-company-attribution.ts, replace attributeContributionForBooking():
--
-- export async function attributeContributionForBooking(params) {
--   const { db, bookingId, postId, postTenantId, workerTenantId, reportingPeriod } = params;
--   const { data, error } = await (db as any)
--     .schema('commons')
--     .rpc('attribute_contribution_for_booking_atomic', {
--       p_booking_id:       bookingId,
--       p_post_id:          postId,
--       p_post_tenant_id:   postTenantId,
--       p_worker_tenant_id: workerTenantId,
--       p_reporting_period: reportingPeriod ?? '2026-Q2',
--     });
--   if (error) {
--     console.error('[attribution] atomic RPC error:', error.message, { bookingId });
--     return { contribution_written: 0, errors: 1 };
--   }
--   return data as { contribution_written: number; errors: number };
-- }
