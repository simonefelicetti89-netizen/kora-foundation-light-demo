-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 063: ADMIN-020 Effort-Capture Mechanism
-- Migration:   063_admin_020_effort_capture
-- Created:     2026-09-14
-- Block:       KORA-WP-008 — ADMIN-020 Effort-Capture Mechanism
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Doc 92 §10 ("Lock 10, Resolved"), verbatim: "ADMIN-020's first-pilot
-- mechanism now explicitly captures actual effort, not merely event
-- occurrence: every governed human-activity completion requires a
-- duration/effort field (explicit duration entry, start/stop, or a
-- completed-task effort field — no complex time-tracking product required)
-- alongside its state-transition event. Minimum activities: kickoff,
-- onboarding assistance, data-quality exception, Advisor preparation,
-- Advisor call, Advisor follow-up, Review support, Certification/Validation
-- (when triggered), privacy/support exception, Admin governance activity.
-- `event occurred ≠ effort measured` — the distinction is now structural,
-- not implicit."
--
-- This migration builds only the generic capture primitive (this WP's own
-- Acceptance: "Test F (97) — 45+60 minutes of Advisor activity measurable
-- as 105 minutes, not 2 events") — it does NOT wire this into any existing
-- workflow's route/service (that is each consuming WP's own future job,
-- e.g. KORA-WP-038's Advisor-prep hook, explicitly out of this WP's scope).
--
-- WHAT THIS IS NOT (explicit boundaries, per KORA-WP-008's own Out of Scope
-- and the adjacent WP-015/WP-040 registry entries)
-- ───────────────────────────────────────────────────────────────────────────
-- - NOT KORA-WP-015's Resource Allocation Ledger (Company financial
--   governance, `resource_allocation` table, conservation-tested position
--   enum) — a completely separate domain, untouched by this migration.
-- - NOT KORA-WP-040's Economic Evidence Register — that WP's own registry
--   entry is explicit: "Data/Migration Impact: NONE — no application table,
--   no migration". This migration produces the raw workload-effort facts
--   WP-040's own manual procedure would later compose from; it does not
--   itself compute cost, cash, ROI, or any economic value.
-- - NOT individual Worker effort/productivity tracking. Doc 92 §10's ten
--   named activities (kickoff, onboarding assistance, data-quality
--   exception, Advisor preparation, Advisor call, Advisor follow-up, Review
--   support, Certification/Validation, privacy/support exception, Admin
--   governance activity) are exclusively KORA-internal-operator activities
--   (KORA_ADMIN, Advisor) — none names or implies Worker-level activity.
--   This table has no worker_id, no worker reference of any kind, and no
--   code path in this migration or its accompanying service ever reads or
--   writes anything Worker-related.
--
-- PRIVACY — "aggregate-only query layer, no individual-operator ranking
-- exposed" (KORA-WP-008's own registry Auth/RLS field, verbatim)
-- ───────────────────────────────────────────────────────────────────────────
-- Deliberately stronger than a mere "aggregate query, but raw rows are also
-- readable by KORA_ADMIN" design: this table grants ZERO row-level read
-- access to ANY session role, including KORA_ADMIN's own session client —
-- mirroring `personal.worker_pib`'s own "zero application-role policies on
-- this table... never employer-visible" precedent (see
-- lib/architecture/registry.ts), applied here to protect individual-
-- operator (KORA_ADMIN/Advisor) workload data from ever being read as a
-- per-actor ranking, by any path, not merely by convention. The ONLY way
-- any caller can ever read this data is the accompanying service's own
-- aggregate function, which groups by activity_category (optionally by
-- tenant/date range) and never returns actor_id in its output.
--
-- APPEND-ONLY, ENFORCED AT DATABASE LEVEL — reuses KORA-WP-005's own
-- migration 051 pattern for audit.governance_event exactly (this WP's own
-- Hard Dep): a BEFORE UPDATE OR DELETE trigger that RAISEs unconditionally,
-- for every role including service_role. "No complex time-tracking product
-- required" (doc 92 §10) — a correction is always a NEW event, never an
-- edit of an existing one, matching governance_event's own discipline.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. gov.workload_event ────────────────────────────────────────────────────
-- Lives in the existing `gov` schema (already service_role-USAGE-granted by
-- migration 002), alongside gov.internal_operator, gov.capability_grant,
-- gov.operational_case — the established home for KORA-internal-operator
-- primitives, none of them Company- or Worker-facing.

CREATE TABLE IF NOT EXISTS gov.workload_event (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Doc 92 §10's exact ten-item vocabulary, verbatim, no additions/omissions.
  activity_category  text          NOT NULL
                                   CHECK (activity_category IN (
                                     'kickoff',
                                     'onboarding_assistance',
                                     'data_quality_exception',
                                     'advisor_preparation',
                                     'advisor_call',
                                     'advisor_follow_up',
                                     'review_support',
                                     'certification_validation',
                                     'privacy_support_exception',
                                     'admin_governance_activity'
                                   )),

  -- Provenance: WHO performed the governed activity this effort measures.
  -- Both required, mirroring audit.governance_event's own discipline
  -- exactly — this substrate never manufactures actor attribution itself.
  actor_role         text          NOT NULL,
  actor_id           text          NOT NULL,

  -- "explicit duration entry" (doc 92 §10) — the simplest of the three
  -- named capture shapes ("no complex time-tracking product required");
  -- start/stop timestamps are explicitly not required by the frozen source
  -- and are not built here. Minutes, matching this WP's own Acceptance
  -- text ("45+60 minutes... measurable as 105 minutes").
  effort_minutes     integer       NOT NULL CHECK (effort_minutes > 0),

  -- Optional Company context — most of the ten activities are Company-
  -- specific (kickoff, onboarding, Review support, ...); "Admin governance
  -- activity" and some exception handling may be KORA-global. Nullable,
  -- mirroring audit.governance_event's own tenant_id exactly ("system-level
  -- events have no tenant").
  tenant_id          uuid          REFERENCES analytics.tenant (id),

  -- Optional generic domain reference — "what this effort relates to" (e.g.
  -- a Case id, an Assignment id) — mirroring audit.governance_event's own
  -- object_type/object_id shape exactly, deliberately reused rather than
  -- inventing a parallel naming convention. Nullable: not every captured
  -- effort necessarily has one single linked object.
  object_type        text,
  object_id          text,

  occurred_at        timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — append-only by design, matching audit.governance_event's
  -- own convention exactly. No worker_id column exists, and none is ever
  -- added by any later migration without a fresh, explicit Founder decision.
);

CREATE INDEX IF NOT EXISTS idx_workload_event_category  ON gov.workload_event (activity_category);
CREATE INDEX IF NOT EXISTS idx_workload_event_tenant     ON gov.workload_event (tenant_id);
CREATE INDEX IF NOT EXISTS idx_workload_event_object     ON gov.workload_event (object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_workload_event_occurred   ON gov.workload_event (occurred_at DESC);

-- ── 2. Append-only enforcement — DB-level trigger, not a naming convention ──────

CREATE OR REPLACE FUNCTION gov.reject_workload_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: gov.workload_event rows cannot be updated or deleted — this is an append-only substrate. A correction is always a NEW event, never a mutation of an existing one.';
END;
$$;

CREATE TRIGGER trg_workload_event_immutable
  BEFORE UPDATE OR DELETE ON gov.workload_event
  FOR EACH ROW
  EXECUTE FUNCTION gov.reject_workload_event_mutation();

-- ── 3. RLS — fail-closed, zero policies, not even for KORA_ADMIN ────────────────
-- No role's ordinary session client gets any row via RLS, by design (see
-- header). Only the service-role capture/aggregate helper
-- (getSupabaseServiceClient(), which bypasses RLS by role, not by a policy
-- defined here) can write or read, and the aggregate function is the only
-- read path ever exposed to application code.

ALTER TABLE gov.workload_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.workload_event FORCE ROW LEVEL SECURITY;

-- ── 4. GRANT service_role access ──────────────────────────────────────────────
-- INSERT + SELECT only — no UPDATE/DELETE grant even to service_role (the
-- trigger in §2 would reject it anyway; omitting the grant makes the intent
-- explicit one layer earlier, matching migration 051's own precedent).

GRANT SELECT, INSERT ON gov.workload_event TO service_role;

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKE below
-- REVOKE SELECT, INSERT ON gov.workload_event FROM service_role;
-- DROP TRIGGER IF EXISTS trg_workload_event_immutable ON gov.workload_event;
-- DROP FUNCTION IF EXISTS gov.reject_workload_event_mutation();
-- DROP INDEX IF EXISTS gov.idx_workload_event_occurred;
-- DROP INDEX IF EXISTS gov.idx_workload_event_object;
-- DROP INDEX IF EXISTS gov.idx_workload_event_tenant;
-- DROP INDEX IF EXISTS gov.idx_workload_event_category;
-- DROP TABLE IF EXISTS gov.workload_event;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else — every existing table, policy, and grant is
-- untouched by this migration or by rolling it back.
