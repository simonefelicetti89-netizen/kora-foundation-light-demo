-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 015: Company-Safe Aggregation Layer
-- Migration:   015_company_safe_aggregation_layer
-- Created:     2026-06-14
-- Block:       B153 — Company-Safe Aggregation Layer (Foundation)
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Creates 4 analytics-schema objects that expose ONLY aggregate / safe-field
-- data to authenticated company users:
--
--   1. fn_company_worker_status()           — SECURITY DEFINER function
--   2. fn_company_activation_summary(text)  — SECURITY DEFINER function
--   3. v_company_uploaded_record_safe       — VIEW (postgres-owned)
--   4. v_company_uef_eligibility_summary    — VIEW (postgres-owned)
--
-- These objects are the ONLY permitted bridge between company users and
-- personal.* / analytics.uef_record. Company routes MUST read from this layer.
-- Company routes MUST NEVER query personal.* or analytics.uef_record directly.
--
-- PRINCIPLE (non-negotiable, founder decision B153):
--   "Company input can create worker-level impact.
--    Company output cannot expose worker-level impact."
--
-- SAFETY GUARANTEES — enforced by construction, not by application discipline:
--
--   [G1] No worker_id, pseudonym_id, raw_hash, created_by in any output column.
--        These identifiers are excluded from the SELECT list of every object.
--
--   [G2] Suppression threshold N≥10 (canonical value: SAFE_AGGREGATION_THRESHOLD
--        in lib/constants/kora.ts) is enforced in SQL for all participation /
--        engagement counts. Counts in [1, 9] → NULL. Count = 0 → 0. Count ≥ 10
--        → actual count. NULL is returned, never a sentinel (-1 or 'suppressed').
--
--   [G3] Tenant isolation via kora.tenant_id() (reads kora_tenant_id from
--        JWT app_metadata — canonical key since migration 006). The caller
--        cannot forge their own JWT claim: app_metadata is writable only via
--        Admin API / service_role.
--
-- SECURITY MECHANISM
-- ──────────────────
-- Functions (SECURITY DEFINER):
--   Created by postgres (superuser, BYPASSRLS). At call time, kora.tenant_id()
--   reads the CALLER's JWT and returns their tenant UUID.
--   WHERE tenant_id = kora.tenant_id() is the only permitted isolation clause.
--   personal.* tables have FORCE ROW LEVEL SECURITY — does not apply to
--   superusers (PostgreSQL §5.8 Row Security Policies).
--
-- Views (postgres-owned, security_invoker = false [PostgreSQL default]):
--   Views run permission checks as the VIEW OWNER (postgres = superuser =
--   BYPASSRLS) → can read personal.* despite FORCE ROW LEVEL SECURITY.
--   WHERE tenant_id = kora.tenant_id() in the view definition enforces
--   tenant isolation for the calling session's JWT.
--   Only the `authenticated` role has SELECT on these views; `anon` is revoked.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Canonical suppression threshold
-- Matches lib/constants/kora.ts: SAFE_AGGREGATION_THRESHOLD = 10
-- Change only in concert with the TypeScript constant.
-- Counts in [1, 9] are suppressed (NULL). 0 is not suppressed (no activity).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  RAISE NOTICE 'B153 — SAFE_AGGREGATION_THRESHOLD = 10 (canonical, matches lib/constants/kora.ts)';
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- OBJECT 1: analytics.fn_company_worker_status
-- ═══════════════════════════════════════════════════════════════════════════════
-- Worker status aggregate for the authenticated company's tenant.
-- Source: personal.worker_identity — status field only.
-- Output: aggregate counts per status + coverage_pct. No individual rows.
-- Suppression: not applied — status counts are organisational (not participant-
--   identifying). A count of 5 workers with status='active' does not reveal
--   which specific workers are active.

CREATE OR REPLACE FUNCTION analytics.fn_company_worker_status()
RETURNS TABLE (
  total_workers  bigint,
  invited        bigint,
  active         bigint,
  pending        bigint,
  disabled       bigint,
  coverage_pct   numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = personal, analytics, kora, public
AS $$
  SELECT
    COUNT(*)                                                              AS total_workers,
    COUNT(*)  FILTER (WHERE status = 'invited')                          AS invited,
    COUNT(*)  FILTER (WHERE status = 'active')                           AS active,
    COUNT(*)  FILTER (WHERE status = 'pending')                          AS pending,
    COUNT(*)  FILTER (WHERE status = 'disabled')                         AS disabled,
    CASE
      WHEN COUNT(*) = 0 THEN 0::numeric
      ELSE ROUND(
        (COUNT(*) FILTER (WHERE status = 'active'))::numeric
        / COUNT(*)::numeric * 100,
        1
      )
    END                                                                   AS coverage_pct
  FROM personal.worker_identity
  WHERE tenant_id = kora.tenant_id();
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_company_worker_status() TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_company_worker_status() FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- OBJECT 2: analytics.fn_company_activation_summary
-- ═══════════════════════════════════════════════════════════════════════════════
-- Initiative and participation aggregate for the authenticated company's tenant.
-- Source: personal.worker_initiative + personal.worker_participation.
--
-- SUPPRESSION [G2] — encoded in SQL, not in application code:
--   Per-pillar and global participation counts:
--     count = 0       → 0      (no activity, not suppressed)
--     count in [1,9]  → NULL   (below threshold, suppressed)
--     count ≥ 10      → count  (safe to show)
--   This replicates the semantics of the TypeScript safeCount() function in
--   workers/activation-aggregate/route.ts (B109/B109-B) in SQL.
--
-- p_period: reserved for future use (worker_initiative has no reporting_period
--   column as of migration 008). Pass NULL to get all-time aggregate.

CREATE OR REPLACE FUNCTION analytics.fn_company_activation_summary(
  p_period text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = personal, analytics, kora, public
AS $$
  WITH
  published AS (
    -- Published initiatives for this tenant only — no worker identifiers
    SELECT id, pillar
    FROM personal.worker_initiative
    WHERE tenant_id = kora.tenant_id()
      AND status    = 'published'
  ),
  engagements AS (
    -- Participation rows for published initiatives — initiative_id + status only.
    -- worker_id is deliberately excluded: [G1].
    SELECT wp.initiative_id, wp.status
    FROM personal.worker_participation wp
    JOIN published p ON p.id = wp.initiative_id
    WHERE wp.status IN ('interested', 'registered', 'attended')
  ),
  pillar_stats AS (
    -- Per-pillar aggregate: initiative count + raw participation count
    SELECT
      p.pillar,
      COUNT(DISTINCT p.id)           AS published_initiatives_count,
      COUNT(e.initiative_id)         AS total_participations_raw
    FROM published p
    LEFT JOIN engagements e ON e.initiative_id = p.id
    GROUP BY p.pillar
  ),
  global AS (
    SELECT
      COALESCE(SUM(published_initiatives_count), 0) AS total_published,
      COALESCE(SUM(total_participations_raw),    0) AS total_engagements_raw
    FROM pillar_stats
  )
  SELECT jsonb_build_object(
    'total_published_initiatives', (SELECT total_published FROM global),
    -- Global engagement: NULL for [1,9], 0 for 0, count for ≥10
    'total_engagements',
      CASE
        WHEN (SELECT total_engagements_raw FROM global) BETWEEN 1 AND 9 THEN NULL
        ELSE (SELECT total_engagements_raw FROM global)
      END,
    'total_engagements_suppressed',
      (SELECT total_engagements_raw FROM global) BETWEEN 1 AND 9,
    -- Per-pillar breakdown with independent suppression per pillar
    'pillar_breakdown',
      COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'pillar',               ps.pillar,
            'published_initiatives', ps.published_initiatives_count,
            -- Pillar participation: NULL for [1,9], 0 for 0, count for ≥10
            'total_participations',
              CASE
                WHEN ps.total_participations_raw BETWEEN 1 AND 9 THEN NULL
                ELSE ps.total_participations_raw
              END,
            'suppressed',
              ps.total_participations_raw BETWEEN 1 AND 9,
            'suppression_threshold', 10
          )
          ORDER BY ps.pillar
        ) FROM pillar_stats ps),
        '[]'::jsonb
      ),
    'safe_aggregation_threshold', 10,
    'privacy_note',
      'Conteggi partecipazione < 10 soppressi per privacy (N≥10). Nessun dato individuale incluso.'
  );
$$;

GRANT EXECUTE ON FUNCTION analytics.fn_company_activation_summary(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION analytics.fn_company_activation_summary(text) FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- OBJECT 3: analytics.v_company_uploaded_record_safe
-- ═══════════════════════════════════════════════════════════════════════════════
-- Safe-field view of personal.uploaded_record for company users.
-- JOINs analytics.source_batch to:
--   (a) enforce tenant isolation by construction (batch.tenant_id = kora.tenant_id())
--   (b) carry reporting_period and batch metadata needed by company routes.
--
-- EXCLUDED by construction [G1] — never present in output:
--   pseudonym_id   — worker pseudonym, ties record to a specific worker post-processing
--   raw_hash       — SHA-256 of original row (deduplication token, not needed by company)
--   privacy_redacted — internal processing flag
--   reviewed_at, reviewed_by — internal admin review metadata
--
-- INCLUDED — safe company-relevant fields:
--   record_id, batch_id, tenant_id, reporting_period
--   eligibility_status, primary_pillar, action_family, event_nature, review_status
--   initiative_name_raw (payload), evidence_level (payload), budget_class (payload)
--   created_at, updated_at
--   batch metadata: source_type, batch_status
--
-- NOTE: initiative_name_raw may contain free-text submitted by the company.
--   PII guard (buildSafeName regex) remains at application layer — not replicable
--   in SQL. Routes must continue to apply PII scrubbing on this field.
--
-- DECISION (founder B153): uploaded_record rows are company-submitted inputs.
--   Exposing their safe fields (minus worker identifiers) is appropriate.
--   Vincolo invariato: pseudonym_id, raw_hash excluded per costruzione.
--
-- Security: view owner = postgres (migration runner = superuser = BYPASSRLS).
--   security_invoker = false (PostgreSQL default): permission checks run as
--   postgres → bypasses FORCE ROW LEVEL SECURITY on personal.uploaded_record.
--   WHERE tenant isolation uses kora.tenant_id() from the caller's JWT.

CREATE OR REPLACE VIEW analytics.v_company_uploaded_record_safe AS
SELECT
  ur.id                                          AS record_id,
  ur.batch_id,
  ur.tenant_id,
  sb.reporting_period,
  sb.source_type                                 AS batch_source_type,
  sb.batch_status,
  -- Safe record classification — no worker identifiers
  ur.eligibility_status,
  ur.primary_pillar,
  ur.action_family,
  ur.event_nature,
  ur.review_status,
  -- Safe payload fields — extracted from JSONB
  -- initiative_name_raw: PII guard remains at application layer (route buildSafeName)
  ur.payload ->> 'initiative_name'               AS initiative_name_raw,
  ur.payload ->> 'evidence_level'                AS evidence_level,
  ur.payload ->> 'budget_class'                  AS budget_class,
  ur.created_at,
  ur.updated_at
  -- NEVER included: ur.pseudonym_id, ur.raw_hash, ur.privacy_redacted,
  --                 ur.reviewed_at (reviewed_by is not a column in uploaded_record)
FROM personal.uploaded_record ur
JOIN analytics.source_batch sb ON sb.id = ur.batch_id
WHERE ur.tenant_id = kora.tenant_id()   -- [G3] caller's tenant only (kora_tenant_id in JWT)
;

GRANT SELECT ON analytics.v_company_uploaded_record_safe TO authenticated;
REVOKE SELECT ON analytics.v_company_uploaded_record_safe FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- OBJECT 4: analytics.v_company_uef_eligibility_summary
-- ═══════════════════════════════════════════════════════════════════════════════
-- Per-(tenant, reporting_period) aggregate view of UEF eligibility and review state.
-- Returns one row per (tenant_id, reporting_period). Routes filter by period.
-- No individual UEF records exposed — aggregated by period only.
--
-- No suppression threshold applied here: these are counts of UEF records
-- (pipeline events), not of individual workers. The counts do not reveal
-- how many workers participated — only how many pipeline records were processed.
--
-- raw_name field — exposed as life_program_names (LIFE-pillar only, DISTINCT array):
-- DECISION (founder B153): raw_name is assumed always a programme name, never
-- individual PII. If real data violates this assumption, revisit this view.
-- This decision is traceable in the schema.
--
-- iu_average_ev: analytics.impact_unit does not exist in Foundation Light DB.
-- Field preserved as NULL::numeric placeholder for schema stability.
-- When impact_unit is available, reinstate the iu_avg CTE and LEFT JOIN.
--
-- Security: view owner = postgres (BYPASSRLS).
--   analytics.uef_record has no company SELECT policy. The view bypasses this
--   via postgres ownership and enforces tenant isolation via kora.tenant_id().

CREATE OR REPLACE VIEW analytics.v_company_uef_eligibility_summary AS
SELECT
  ur.tenant_id,
  ur.reporting_period,
  -- Eligibility distribution (UEF pipeline counts — not worker counts)
  COUNT(*)                                                                   AS total_uef_records,
  COUNT(*) FILTER (WHERE ur.eligibility = 'eligible')                        AS eligible_count,
  COUNT(*) FILTER (WHERE ur.eligibility = 'limited')                         AS limited_count,
  COUNT(*) FILTER (WHERE ur.eligibility = 'blocked')                         AS blocked_count,
  -- Review pipeline state
  COUNT(*) FILTER (WHERE ur.review_status = 'pending')                       AS pending_review_count,
  COUNT(*) FILTER (WHERE ur.approved_for_scoring = true)                     AS approved_for_scoring_count,
  COUNT(*) FILTER (WHERE ur.review_status = 'needs_more_data')               AS needs_more_data_count,
  COUNT(*) FILTER (WHERE ur.review_status = 'rejected')                      AS rejected_count,
  COUNT(*) FILTER (WHERE ur.approved_for_impact_units = true)                AS approved_for_impact_units_count,
  -- Review completion rate (0.0–1.0)
  CASE
    WHEN COUNT(*) = 0 THEN 0::numeric
    ELSE ROUND(
      (COUNT(*) - COUNT(*) FILTER (WHERE ur.review_status = 'pending'))::numeric
      / COUNT(*)::numeric,
      4
    )
  END                                                                        AS review_completion_rate,
  -- LIFE programme names — raw_name for LIFE-pillar records only.
  -- Founder decision B153: raw_name exposed as programme name, never individual PII.
  -- If real data violates this assumption, revisit this view.
  array_agg(DISTINCT ur.raw_name) FILTER (WHERE ur.primary_pillar = 'LIFE') AS life_program_names,
  -- analytics.impact_unit not present in Foundation Light DB — placeholder for schema stability.
  NULL::numeric                                                              AS iu_average_ev
FROM analytics.uef_record ur
WHERE ur.tenant_id = kora.tenant_id()   -- [G3] caller's tenant only (kora_tenant_id in JWT)
GROUP BY ur.tenant_id, ur.reporting_period
;

GRANT SELECT ON analytics.v_company_uef_eligibility_summary TO authenticated;
REVOKE SELECT ON analytics.v_company_uef_eligibility_summary FROM anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache
-- ═══════════════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
