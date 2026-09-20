-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 069: Core Decision Linkage
-- Migration:   069_core_decision_linkage
-- Created:     2026-09-15
-- Block:       KORA-WP-023 — Core Decision Linkage (Resource ↔ Commitment ↔
--              Evidence Plan ↔ Review), excluding Program entirely
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Doc 68 §8, verbatim: **`DECISION-008` (Resource↔Decision↔Program↔Spend↔
-- Evidence linkage) `IS` "the reference architecture itself (§1–§4), not a
-- separate object."** This is the decisive canonical finding for this WP:
-- Core Decision Linkage creates NO new domain truth and NO new stored
-- relationship — the real relationships already exist physically, built by
-- `KORA-WP-015`/`020`/`021`/`022` (`commitment.evidence_plan_id`,
-- `commitment_resource_reference`, `commitment_mvb_manifest.commitment_id`).
-- This migration adds exactly one thing: a read-only, derived VIEW that
-- projects those already-existing relationships into one canonical
-- traceability shape — "Data/Migration Impact: ADDITIVE" (registry `133`)
-- is satisfied by adding this view, not by duplicating any data.
--
-- WHY A VIEW, NOT A TABLE
-- ─────────────────────────
-- A view has no independent storage — it cannot become a second, drifting
-- source of truth for facts `commitment`/`evidence_plan`/
-- `commitment_resource_reference`/`commitment_mvb_manifest` already record.
-- `WITH (security_invoker = true)` (Postgres 15+, confirmed available —
-- staging/local both run Postgres 17) makes the view defer entirely to the
-- CALLER's own RLS standing on the underlying tables, rather than running
-- with the view owner's privileges — so this view introduces no new
-- authorization surface of its own; it is exactly what the registry's own
-- Auth/RLS field says: "inherited from linked objects."
--
-- REVIEW — NOT YET BUILT, HANDLED HONESTLY
-- ───────────────────────────────────────────
-- `KORA-WP-024` (Review) does not exist yet, and this WP's own Hard Deps
-- (`015,021,022`) do not include it — nothing here can or does implement
-- Review. The view carries a literal `NULL::uuid AS review_id` column so
-- the canonical trace shape is stable and Review-ready from day one,
-- exactly the same "structurally present, honestly NULL until the owning
-- WP exists" discipline already used for `commitment.opportunity_id`/
-- `program_id`/`evidence_plan.evidence_plan_id`-forward-refs and
-- `commitment_mvb_manifest.need_hypothesis_status_snapshot`. Once
-- `KORA-WP-024` creates a real `review` table, THAT WP's own migration is
-- the only place this view may be replaced (`CREATE OR REPLACE VIEW`) to
-- add the real join — never fabricated here.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Program is entirely excluded (registry, verbatim: "excluding Program
-- entirely... explicitly not KORA-WP-026/060 — mechanically verified: zero
-- dependency edge from the core spine (019–024) to 026 or 060", doc 95 §7).
-- No Need/Opportunity/KORA-Index/IU/Confidence/BTI/generic-KPI reference is
-- read or written by this view — it touches only the four already-real
-- Lane-B tables named above.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW analytics.commitment_decision_trace
WITH (security_invoker = true) AS
SELECT
  c.id                          AS commitment_id,
  c.tenant_id,
  c.status                      AS commitment_status,
  ep.id                         AS evidence_plan_id,
  ep.status                     AS evidence_plan_status,
  COALESCE(
    array_agg(DISTINCT crr.resource_allocation_entry_id)
      FILTER (WHERE crr.resource_allocation_entry_id IS NOT NULL),
    '{}'
  )                             AS resource_allocation_entry_ids,
  m.id                          AS mvb_manifest_id,
  -- KORA-WP-024 (Review) does not exist yet — see header. Never fabricated;
  -- only KORA-WP-024's own migration may ever change this to a real join.
  NULL::uuid                    AS review_id
FROM analytics.commitment c
LEFT JOIN analytics.evidence_plan ep
  ON ep.commitment_id = c.id
LEFT JOIN analytics.commitment_resource_reference crr
  ON crr.commitment_id = c.id
LEFT JOIN analytics.commitment_mvb_manifest m
  ON m.commitment_id = c.id
GROUP BY c.id, c.tenant_id, c.status, ep.id, ep.status, m.id;

-- No RLS policy is created on the view itself — `security_invoker = true`
-- defers entirely to the RLS already enforced on `commitment`/
-- `evidence_plan`/`commitment_resource_reference`/`commitment_mvb_manifest`
-- (all Pattern A, migrations 065/066/067). A caller who cannot already read
-- a given Commitment's row cannot see its trace either — no exception, no
-- new bypass.

GRANT SELECT ON analytics.commitment_decision_trace TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKE/DROP below
-- REVOKE SELECT ON analytics.commitment_decision_trace FROM service_role, authenticated;
-- DROP VIEW IF EXISTS analytics.commitment_decision_trace;
-- Rollback is safe at any time: this migration creates one read-only view
-- with no independent storage — no existing table, row, policy, or grant is
-- altered by this migration or by rolling it back.
