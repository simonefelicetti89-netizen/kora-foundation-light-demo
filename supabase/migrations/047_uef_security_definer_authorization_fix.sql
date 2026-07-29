-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 047: UEF SECURITY DEFINER authorization bypass fix
-- Migration:   047_uef_security_definer_authorization_fix
-- Created:     2026-07-28
-- Sprint:      PILOT-TRUST-03 — UEF SECURITY DEFINER AUTHORIZATION FIX
-- Gate:        Gate 2 OPEN — written, applied to LOCAL only in this sprint.
--              NOT applied to staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- ROOT CAUSE (confirmed empirically, PILOT-TRUST-02 audit + this sprint's
-- reproduction, real PostgREST calls, not just SQL-text inspection):
--
--   The 4 SECURITY DEFINER functions introduced in migration 030
--   (fn_admin_uef_review, fn_admin_uef_update_review, fn_admin_uef_enrich,
--   fn_advisor_uef_read) each gate their "trusted server context" bypass on:
--
--     current_role NOT IN ('service_role', 'postgres')   -- (or the IN form)
--
--   `current_role` inside a SECURITY DEFINER function body is ALWAYS the
--   function OWNER (here: `postgres`), for every single caller, regardless of
--   which Postgres role actually invoked the function (this is standard,
--   documented PostgreSQL SECURITY DEFINER behavior — see PostgreSQL docs
--   §CREATE FUNCTION, Security). Confirmed empirically against a real local
--   PostgREST endpoint (not a manual role simulation) for all three caller
--   shapes:
--
--     caller          | session_user   | jwt role claim | current_role (inside fn)
--     anon            | authenticator  | anon           | postgres
--     authenticated   | authenticator  | authenticated  | postgres
--     service_role    | authenticator  | service_role   | postgres
--
--   `current_role` is therefore always `postgres` inside these functions,
--   making `current_role NOT IN ('service_role','postgres')` always FALSE —
--   the entire authorization IF-block was dead code for every caller,
--   including genuine WORKER/PARTNER/COMPANY_ADMIN/anonymous-role JWTs.
--   Reproduced and confirmed: a WORKER-claimed session could read
--   (fn_advisor_uef_read) and WRITE — approve/reject a review, mutate
--   payload enrichment (fn_admin_uef_update_review, fn_admin_uef_enrich) —
--   arbitrary analytics.uef_record rows across any tenant.
--
-- THE FIX
-- Both `current_role` and the `postgres` branch are removed as authorization
-- signals (neither ever reliably identified the real caller inside a
-- SECURITY DEFINER body — `postgres` was equally always-true for the same
-- reason). The trusted-service-context bypass is now read from
-- `request.jwt.claims ->> 'role'`, the JWT's own top-level Postgres role
-- claim set by GoTrue/PostgREST before the call — a session GUC, NOT a
-- role/permission-context value, so (like kora.kora_role()/kora.tenant_id(),
-- already relied upon elsewhere in this schema) it is NOT affected by the
-- SECURITY DEFINER owner switch. Confirmed empirically to correctly read
-- 'anon' / 'authenticated' / 'service_role' for the three real PostgREST
-- caller shapes above.
--
-- New helper: kora.is_service_role_context() — single source of truth for
-- this check, used by all 4 functions (avoids repeating the same jsonb
-- expression four times).
--
-- SCOPE — minimal, only this bug:
--   - No change to function signatures, return shapes, column whitelists,
--     action whitelists, or business logic.
--   - No change to GRANT/REVOKE (already least-privilege since migration 031 —
--     authenticated/service_role EXECUTE, anon/PUBLIC revoked. The bug was
--     inside the function body, not the GRANT).
--   - No new table, no new RLS policy, no data modified.
--   - requireWorkerUser tenant status, partner workspace, CSP, KORA Link:
--     out of scope for this migration (see PILOT-TRUST-02 audit — separate
--     findings, separate sprints).
--
-- AUTHORIZATION MATRIX (post-fix, unchanged from the ORIGINAL documented
-- intent of migration 030/031 — this migration corrects the enforcement of
-- an intent that was already written down but never actually executed):
--
--   FUNCTION                     | KORA_ADMIN | COMPANY_ADMIN | WORKER | PARTNER | SERVICE_ROLE
--   fn_admin_uef_review          | ALLOW      | DENY          | DENY   | DENY    | ALLOW
--   fn_admin_uef_update_review   | ALLOW      | DENY          | DENY   | DENY    | ALLOW
--   fn_admin_uef_enrich          | ALLOW      | DENY          | DENY   | DENY    | ALLOW
--   fn_advisor_uef_read          | DENY *     | DENY          | DENY   | DENY    | ALLOW
--     * ADVISOR role, own tenant only, is the sole JWT-path grantee — matches
--       the function's own pre-existing internal design (never granted to
--       KORA_ADMIN via JWT in the original 030 code). ADVISOR has no live
--       session-based auth path in lib/auth/kora-session.ts today (no
--       requireAdvisorUser(), no app/advisor/* route) and no current caller —
--       this fix preserves the original, already-documented design intent for
--       when the role is provisioned, without adding new access.
--
--   Rationale: analytics.uef_record is pipeline/company-operational data
--   (CLAUDE.md §13 — "Employer roles MUST NEVER see ... Individual UEF
--   records"; original migration 001/030 comments — "No COMPANY_ADMIN policy
--   — employers see only aggregated outputs"). WORKER and PARTNER have no
--   documented use case anywhere in routes/services/docs. KORA_ADMIN access
--   is preserved exactly as before (operational review/enrichment).
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION — safe to re-apply.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Helper: is this call in a genuine service_role trusted-server context? ────
-- Reads the JWT's own top-level `role` claim (set by GoTrue/PostgREST at
-- request time) — a session GUC, unaffected by SECURITY DEFINER context.
-- Returns false (never NULL) for any non-service_role caller, including when
-- no JWT claims are present at all (e.g. request.jwt.claims unset).

CREATE OR REPLACE FUNCTION kora.is_service_role_context()
  RETURNS boolean
  LANGUAGE sql
  STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  ) = 'service_role';
$$;

COMMENT ON FUNCTION kora.is_service_role_context() IS
  'Migration 047: authoritative check for "trusted service-role server context" '
  'inside SECURITY DEFINER functions. Reads the JWT top-level role claim '
  '(GUC-based, survives SECURITY DEFINER owner switch) — current_role/session_user '
  'do NOT reliably identify the caller inside a SECURITY DEFINER function body '
  'and must never be used for this purpose (see migration 047 root cause notes).';

-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 1: analytics.fn_admin_uef_review — auth check fixed
-- ════════════════════════════════════════════════════════════════════════════════

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
  -- Safe payload sub-fields (interpreter-derived, not raw HR data):
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
  -- payload JSONB intentionally absent — privacy boundary (Gate 2.3)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
  SELECT
    u.id,
    u.tenant_id,
    u.batch_id,
    u.reporting_period,
    u.raw_name,
    u.eligibility,
    u.primary_pillar,
    u.action_family,
    u.event_nature,
    u.approved_for_scoring,
    u.approved_for_bti_governance,
    u.approved_for_impact_units,
    u.data_completeness_score,
    u.missing_fields,
    u.review_status,
    u.reviewer_notes,
    u.reviewed_by,
    u.reviewed_at,
    u.created_at,
    -- Extract safe interpreter-derived sub-fields from payload:
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
      kora.is_service_role_context()
      OR kora.kora_role() = 'KORA_ADMIN'
    )
  ORDER BY u.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_review(uuid) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_review(uuid) IS
  'Gate 2.3 (migration 030), authorization fixed in migration 047: UEF review '
  'list — payload excluded, named safe columns returned. KORA_ADMIN or '
  'service_role only, enforced via kora.is_service_role_context() + '
  'kora.kora_role() — current_role is never used (see migration 047).';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 2: analytics.fn_admin_uef_update_review — auth check fixed
-- ════════════════════════════════════════════════════════════════════════════════

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
  -- Auth check: KORA_ADMIN via JWT, or genuine service_role context.
  -- Fail-closed: fixed in migration 047 — current_role never used (see root
  -- cause notes there; current_role is always the function owner here and
  -- never identifies the real caller).
  IF NOT kora.is_service_role_context()
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  -- Action whitelist
  IF p_action NOT IN ('approve', 'reject', 'needs_info') THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: invalid action ''%''. '
      'Must be: approve | reject | needs_info', p_action;
  END IF;

  -- Resolve eligibility for approved_for_impact_units logic
  SELECT eligibility INTO v_eligibility
  FROM analytics.uef_record
  WHERE id = p_uef_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fn_admin_uef_update_review: UEF record not found: %', p_uef_id;
  END IF;

  -- Apply review action
  UPDATE analytics.uef_record SET
    review_status               = p_action,
    reviewer_notes              = p_notes,
    reviewed_by                 = p_reviewer,
    reviewed_at                 = now(),
    approved_for_scoring        = (p_action = 'approve'),
    approved_for_bti_governance = (p_action = 'approve'),
    -- Only eligible records generate Impact Units (matches app-layer logic in review/route.ts)
    approved_for_impact_units   = (p_action = 'approve' AND v_eligibility = 'eligible'),
    updated_at                  = now()
  WHERE id = p_uef_id;
END;
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_update_review(uuid, text, text, text) IS
  'Gate 2.3 (migration 030), authorization fixed in migration 047: Controlled '
  'UEF review action (approve/reject/needs_info). KORA_ADMIN or service_role '
  'only, enforced via kora.is_service_role_context() + kora.kora_role().';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 3: analytics.fn_admin_uef_enrich — auth check fixed
-- ════════════════════════════════════════════════════════════════════════════════

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
    'initiative_domain',
    'event_type',
    'eligibility_class',
    'budget_class',
    'budget_amount',
    'budget_source',
    'evidence_level',
    'enrichment_notes'
  ];
BEGIN
  -- Auth check — fixed in migration 047 (see fn_admin_uef_update_review above
  -- and migration 047 root cause notes).
  IF NOT kora.is_service_role_context()
     AND kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: access denied — KORA_ADMIN required (role: %)',
      COALESCE(kora.kora_role(), 'NULL');
  END IF;

  -- Validate: only whitelisted keys allowed
  FOR v_key IN SELECT jsonb_object_keys(p_enrichment_fields) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'fn_admin_uef_enrich: enrichment field not allowed: ''%''. '
        'Whitelisted fields: initiative_domain, event_type, eligibility_class, '
        'budget_class, budget_amount, budget_source, evidence_level, enrichment_notes',
        v_key;
    END IF;
  END LOOP;

  -- Guard: rejected records cannot be enriched
  IF NOT EXISTS (
    SELECT 1 FROM analytics.uef_record
    WHERE id = p_uef_id AND review_status <> 'rejected'
  ) THEN
    RAISE EXCEPTION 'fn_admin_uef_enrich: record % is rejected or not found. '
      'Cannot enrich a rejected record.', p_uef_id;
  END IF;

  -- Merge enrichment into payload (whitelisted fields only) + provenance metadata
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

GRANT EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) FROM anon;

COMMENT ON FUNCTION analytics.fn_admin_uef_enrich(uuid, jsonb, text) IS
  'Gate 2.3 (migration 030), authorization fixed in migration 047: Controlled '
  'UEF payload enrichment with field whitelist. KORA_ADMIN or service_role '
  'only, enforced via kora.is_service_role_context() + kora.kora_role().';


-- ════════════════════════════════════════════════════════════════════════════════
-- OBJECT 4: analytics.fn_advisor_uef_read — auth check fixed
-- ════════════════════════════════════════════════════════════════════════════════
-- Authorization matrix unchanged from original 030 intent: ADVISOR (own
-- tenant only) via JWT, or genuine service_role context. KORA_ADMIN was
-- never granted JWT-path access to this specific function in the original
-- design (it has its own purpose-built functions above) — this fix does not
-- add that access; it only makes the pre-existing ADVISOR/service_role
-- intent actually enforced.

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
  -- Safe interpreter-derived sub-fields (non-raw, non-PII):
  event_type                  text,
  reason_codes                jsonb,
  budget_amount               numeric,
  evidence_level              text,
  initiative_domain           text,
  budget_class                text,
  needs_enrichment            boolean,
  financial_confidence        text,
  b11_enriched                boolean
  -- payload JSONB intentionally absent — Gate 2.3 H-01 revision / Gate 3 privacy boundary
  -- participants intentionally absent — small-team re-identification risk (Gate 3)
  -- raw_amount_value intentionally absent — potential PII in small datasets (Gate 3)
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = analytics, kora, public
AS $$
BEGIN
  -- Auth check: only ADVISOR role or genuine service_role context may call
  -- this function. Fixed in migration 047 — current_role never used.
  IF NOT kora.is_service_role_context() THEN
    IF kora.kora_role() <> 'ADVISOR' THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: access denied — ADVISOR role required (role: %)',
        COALESCE(kora.kora_role(), 'NULL');
    END IF;

    -- Tenant guard: ADVISOR can only query their own tenant.
    -- Explicit exception (not silent 0-rows) to surface cross-tenant attempts in logs.
    IF kora.tenant_id() IS DISTINCT FROM p_tenant_id THEN
      RAISE EXCEPTION
        'fn_advisor_uef_read: cross-tenant access denied — '
        'requested tenant: %, authorized tenant: %',
        p_tenant_id, kora.tenant_id();
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.tenant_id,
    u.batch_id,
    u.reporting_period,
    u.raw_name,
    u.eligibility,
    u.primary_pillar,
    u.action_family,
    u.event_nature,
    u.approved_for_scoring,
    u.approved_for_bti_governance,
    u.approved_for_impact_units,
    u.data_completeness_score,
    u.missing_fields,
    u.review_status,
    u.reviewer_notes,
    u.reviewed_by,
    u.reviewed_at,
    u.created_at,
    -- Interpreter-derived classification fields (not raw HR data):
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

GRANT EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_advisor_uef_read(uuid) FROM anon;

COMMENT ON FUNCTION analytics.fn_advisor_uef_read(uuid) IS
  'Gate 2.3 (migration 030), authorization fixed in migration 047: UEF review '
  'list for ADVISOR — tenant-scoped, payload excluded. ADVISOR (own tenant) or '
  'service_role only, enforced via kora.is_service_role_context() + '
  'kora.kora_role() + kora.tenant_id(). No JWT-path KORA_ADMIN bypass — '
  'unchanged from original design intent.';

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;
