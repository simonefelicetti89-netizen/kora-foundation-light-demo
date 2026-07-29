-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 047                                        ║
-- ║  (047_uef_security_definer_authorization_fix.sql).                         ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  ⚠ WARNING — THIS RESTORES A CONFIRMED, EXPLOITABLE VULNERABILITY ⚠        ║
-- ║                                                                              ║
-- ║  Applying this file reverts fn_admin_uef_review, fn_admin_uef_update_review,║
-- ║  fn_admin_uef_enrich and fn_advisor_uef_read to the pre-047 state, where    ║
-- ║  the internal authorization check (`current_role NOT IN                    ║
-- ║  ('service_role','postgres')`) is DEAD CODE for every caller — ANY         ║
-- ║  authenticated role (WORKER, PARTNER, COMPANY_ADMIN, or an authenticated    ║
-- ║  JWT with no kora_role claim at all) can read AND write arbitrary          ║
-- ║  analytics.uef_record rows across any tenant. This was reproduced and      ║
-- ║  confirmed empirically in PILOT-TRUST-02 and PILOT-TRUST-03.              ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 047 has been applied and caused confirmed breakage of a    ║
-- ║       legitimate consumer (KORA_ADMIN review/enrich flow, ADVISOR path)    ║
-- ║       that cannot be fixed forward.                                        ║
-- ║    2. A forward fix (048+) is not viable in the required timeframe.        ║
-- ║    3. Rollback has been explicitly approved by the technical owner, WITH   ║
-- ║       explicit acknowledgment that this reopens a CRITICAL authorization   ║
-- ║       bypass on analytics.uef_record.                                     ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received migration 030, 031, or 047).          ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    The exact pre-047 function bodies (current_role-based checks), and      ║
-- ║    drops kora.is_service_role_context().                                  ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH:                                                 ║
-- ║    - GRANT/REVOKE state (unchanged by 047, so unchanged here).            ║
-- ║    - Any RLS policy, any other schema, any other role, any data.          ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/047_rollback_047_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ── Restore fn_admin_uef_review to the pre-047 (vulnerable) auth check ───────

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_review(p_batch_id uuid)
RETURNS TABLE (
  id                          uuid,
  tenant_id                   uuid,
  batch_id                    uuid,
  reporting_period            text,
  raw_name                    text,
  eligibility                 text,
  primary_pillar              text,
  action_family               text,
  event_nature                text,
  approved_for_scoring        boolean,
  approved_for_bti_governance boolean,
  approved_for_impact_units   boolean,
  data_completeness_score     numeric,
  missing_fields              text[],
  review_status               text,
  reviewer_notes              text,
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  created_at                  timestamptz,
  event_type                  text,
  reason_codes                jsonb,
  budget_amount               numeric,
  participants                integer,
  evidence_level              text,
  source_tier                 text,
  amount_parsing_status       text,
  participants_approximate    boolean,
  raw_amount_value            numeric,
  initiative_domain           text,
  budget_class                text,
  needs_enrichment            boolean,
  financial_confidence        text,
  enrichment_missing_fields   jsonb,
  interpreter_version         text,
  scoring_locked              boolean,
  enriched_by                 text,
  enriched_at                 text,
  b11_enriched                boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
  SELECT
    u.id, u.tenant_id, u.batch_id, u.reporting_period, u.raw_name, u.eligibility,
    u.primary_pillar, u.action_family, u.event_nature, u.approved_for_scoring,
    u.approved_for_bti_governance, u.approved_for_impact_units,
    u.data_completeness_score, u.missing_fields, u.review_status,
    u.reviewer_notes, u.reviewed_by, u.reviewed_at, u.created_at,
    (u.payload ->> 'event_type'),
    (u.payload -> 'reason_codes'),
    (u.payload ->> 'budget_amount')::numeric,
    (u.payload ->> 'participants')::integer,
    (u.payload ->> 'evidence_level'),
    (u.payload ->> 'source_tier'),
    (u.payload ->> 'amount_parsing_status'),
    (u.payload ->> 'participants_approximate')::boolean,
    (u.payload ->> 'raw_amount_value')::numeric,
    (u.payload ->> 'initiative_domain'),
    (u.payload ->> 'budget_class'),
    (u.payload ->> 'needs_enrichment')::boolean,
    (u.payload ->> 'financial_confidence'),
    (u.payload -> 'enrichment_missing_fields'),
    (u.payload ->> 'interpreter_version'),
    (u.payload ->> 'scoring_locked')::boolean,
    (u.payload ->> 'enriched_by'),
    (u.payload ->> 'enriched_at'),
    (u.payload ->> 'b11_enriched')::boolean
  FROM analytics.uef_record u
  WHERE u.batch_id = p_batch_id
    AND (
      current_role IN ('service_role', 'postgres')
      OR kora.kora_role() = 'KORA_ADMIN'
    )
  ORDER BY u.created_at ASC;
$$;

-- ── Restore fn_admin_uef_update_review ────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_update_review(
  p_uef_id    uuid,
  p_action    text,
  p_notes     text,
  p_reviewer  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
DECLARE
  v_eligibility text;
BEGIN
  IF current_role NOT IN ('service_role', 'postgres')
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  IF p_action NOT IN ('approve', 'reject', 'needs_info') THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: invalid action ''%''. '
      'Must be: approve | reject | needs_info', p_action;
  END IF;

  SELECT eligibility INTO v_eligibility
  FROM analytics.uef_record
  WHERE id = p_uef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: UEF record not found: %', p_uef_id;
  END IF;

  UPDATE analytics.uef_record SET
    review_status               = p_action,
    reviewer_notes              = p_notes,
    reviewed_by                 = p_reviewer,
    reviewed_at                 = now(),
    approved_for_scoring        = (p_action = 'approve'),
    approved_for_bti_governance = (p_action = 'approve'),
    approved_for_impact_units   = (p_action = 'approve' AND v_eligibility = 'eligible'),
    updated_at                  = now()
  WHERE id = p_uef_id;
END;
$$;

-- ── Restore fn_admin_uef_enrich ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics.fn_admin_uef_enrich(
  p_uef_id            uuid,
  p_enrichment_fields jsonb,
  p_reviewer          text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
DECLARE
  v_key   text;
  v_allowed_keys text[] := ARRAY[
    'initiative_domain', 'event_type', 'eligibility_class', 'budget_class',
    'budget_amount', 'budget_source', 'evidence_level', 'enrichment_notes'
  ];
BEGIN
  IF current_role NOT IN ('service_role', 'postgres')
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_enrichment_fields) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'fn_admin_uef_enrich: enrichment field not allowed: ''%''. '
        'Whitelisted fields: initiative_domain, event_type, eligibility_class, '
        'budget_class, budget_amount, budget_source, evidence_level, enrichment_notes',
        v_key;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM analytics.uef_record
    WHERE id = p_uef_id AND review_status <> 'rejected'
  ) THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: record % is rejected or not found. '
      'Cannot enrich a rejected record.', p_uef_id;
  END IF;

  UPDATE analytics.uef_record SET
    payload = payload
      || p_enrichment_fields
      || jsonb_build_object(
           'enriched_by',  p_reviewer,
           'enriched_at',  now()::text,
           'b11_enriched', true
         ),
    updated_at = now()
  WHERE id = p_uef_id;
END;
$$;

-- ── Restore fn_advisor_uef_read ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION analytics.fn_advisor_uef_read(p_tenant_id uuid)
RETURNS TABLE (
  id                          uuid,
  tenant_id                   uuid,
  batch_id                    uuid,
  reporting_period            text,
  raw_name                    text,
  eligibility                 text,
  primary_pillar              text,
  action_family               text,
  event_nature                text,
  approved_for_scoring        boolean,
  approved_for_bti_governance boolean,
  approved_for_impact_units   boolean,
  data_completeness_score     numeric,
  missing_fields              text[],
  review_status               text,
  reviewer_notes              text,
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  created_at                  timestamptz,
  event_type                  text,
  reason_codes                jsonb,
  budget_amount               numeric,
  evidence_level              text,
  initiative_domain           text,
  budget_class                text,
  needs_enrichment            boolean,
  financial_confidence        text,
  b11_enriched                boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
BEGIN
  IF current_role NOT IN ('service_role', 'postgres') THEN
    IF kora.kora_role() <> 'ADVISOR' THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: access denied — ADVISOR role required (role: %)',
        COALESCE(kora.kora_role(), 'NULL');
    END IF;

    IF kora.tenant_id() IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: cross-tenant access denied — '
        'requested tenant: %, authorized tenant: %',
        p_tenant_id, kora.tenant_id();
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    u.id, u.tenant_id, u.batch_id, u.reporting_period, u.raw_name, u.eligibility,
    u.primary_pillar, u.action_family, u.event_nature, u.approved_for_scoring,
    u.approved_for_bti_governance, u.approved_for_impact_units,
    u.data_completeness_score, u.missing_fields, u.review_status,
    u.reviewer_notes, u.reviewed_by, u.reviewed_at, u.created_at,
    (u.payload ->> 'event_type'),
    (u.payload -> 'reason_codes'),
    (u.payload ->> 'budget_amount')::numeric,
    (u.payload ->> 'evidence_level'),
    (u.payload ->> 'initiative_domain'),
    (u.payload ->> 'budget_class'),
    (u.payload ->> 'needs_enrichment')::boolean,
    (u.payload ->> 'financial_confidence'),
    (u.payload ->> 'b11_enriched')::boolean
  FROM analytics.uef_record u
  WHERE u.tenant_id = p_tenant_id
  ORDER BY u.created_at ASC;
END;
$$;

-- ── Drop the helper introduced by 047 ─────────────────────────────────────────

DROP FUNCTION IF EXISTS kora.is_service_role_context();

NOTIFY pgrst, 'reload schema';

-- ── POST-APPLY VERIFICATION ───────────────────────────────────────────────────
/*
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'kora' AND routine_name = 'is_service_role_context';
-- Expected: 0 rows (dropped).
*/

COMMIT;
