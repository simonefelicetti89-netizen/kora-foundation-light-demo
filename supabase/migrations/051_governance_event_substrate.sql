-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 051: Shared Governance Event / Provenance Substrate
-- Migration:   051_governance_event_substrate
-- Created:     2026-09-12
-- Block:       KORA-WP-005 — Shared Governance Event/Provenance Substrate
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Resolves the Case/Audit dependency ambiguity (`92` §9, "Lock 9"): prior
-- planning had Case→Audit in one place and Audit→Case in another. The chosen
-- direction is a shared, lower-level governance event/provenance substrate
-- that both the existing audit.audit_log (extended later by KORA-WP-006) and
-- the future Operational Case primitive (KORA-WP-007) can be built from as
-- consumers — neither one depends on the other.
--
-- KORA-GLOBAL, NOT ORGANISATION-OWNED (`95` §16's corrected org-reference rule)
-- ─────────────────────────────────────────────────────────────────────────────
-- This substrate is a system-level primitive, not a Company-scoped resource —
-- mirrors audit.audit_log's own existing, already-correct precedent exactly
-- (its tenant_id is nullable: "system-level events have no tenant"). An event
-- MAY optionally reference a tenant when relevant to its provenance; nothing
-- here enforces or requires tenant ownership the way a Company-scoped table
-- does, and no fabricated organisation foreign key is introduced.
--
-- GENERIC — NOT AUDIT-SPECIFIC, NOT CASE-SPECIFIC (KORA-WP-005's own Out of
-- Scope)
-- ───────────────────────────────────────────────────────────────────────────
-- `event_type` is a free-form text field, deliberately NOT constrained to a
-- fixed enum/taxonomy here — inventing the full audit event taxonomy or Case
-- status vocabulary belongs to KORA-WP-006/007, not this primitive. This
-- migration does not modify audit.audit_log in any way.
--
-- APPEND-ONLY, ENFORCED AT DATABASE LEVEL (KORA-WP-005's own Acceptance:
-- "event insertion works; edit attempt rejected")
-- ───────────────────────────────────────────────────────────────────────────
-- audit.audit_log's own immutability is documented as RLS + application-layer
-- discipline only ("No UPDATE or DELETE policies — enforced at RLS +
-- application layer", migration 001) — a weaker guarantee than what this
-- substrate's own acceptance criterion requires. This migration instead
-- reuses the stronger, already-proven pattern from migration 049
-- (analytics.methodology_snapshot): a BEFORE UPDATE OR DELETE trigger that
-- RAISEs an exception unconditionally, for every role including service_role
-- (which bypasses RLS but not triggers) — genuinely enforced at the database
-- level, not merely undocumented-but-possible.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. audit.governance_event ───────────────────────────────────────────────────
-- Lives in the existing `audit` schema (already service_role-USAGE-granted by
-- migration 002) alongside, not inside, audit.audit_log — a new, distinct,
-- generic table, not a modification of the existing one.

CREATE TABLE IF NOT EXISTS audit.governance_event (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provenance: WHERE this event came from and WHO caused it. Both required —
  -- the recording caller must supply real provenance, never silently
  -- manufactured by this substrate itself.
  source_module  text          NOT NULL,
  actor_role     text          NOT NULL,
  actor_id       text          NOT NULL,

  -- Generic kind, deliberately unconstrained (see header) — the taxonomy is a
  -- consumer decision (KORA-WP-006/007/008/013), not this primitive's.
  event_type     text          NOT NULL,

  -- Generic optional domain reference — "what this event is about", mirroring
  -- audit.audit_log's resource_type/resource_id shape under different names
  -- to avoid implying this IS the audit log. Nullable: not every governance
  -- event necessarily has one single object.
  object_type    text,
  object_id      text,

  -- Optional context, mirroring audit.audit_log's own nullable tenant_id
  -- exactly ("system-level events have no tenant") — never mandatory
  -- ownership, but referentially valid when supplied.
  tenant_id      uuid          REFERENCES analytics.tenant (id),

  -- Structured context, mirroring audit.audit_log.payload exactly.
  payload        jsonb         NOT NULL DEFAULT '{}'::jsonb,

  occurred_at    timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — append-only by design, matching audit.audit_log's own
  -- convention exactly.
);

CREATE INDEX IF NOT EXISTS idx_governance_event_type       ON audit.governance_event (event_type);
CREATE INDEX IF NOT EXISTS idx_governance_event_source     ON audit.governance_event (source_module);
CREATE INDEX IF NOT EXISTS idx_governance_event_actor      ON audit.governance_event (actor_id);
CREATE INDEX IF NOT EXISTS idx_governance_event_tenant     ON audit.governance_event (tenant_id);
CREATE INDEX IF NOT EXISTS idx_governance_event_object     ON audit.governance_event (object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_governance_event_occurred   ON audit.governance_event (occurred_at DESC);

-- ── 2. Append-only enforcement — DB-level trigger, not a naming convention ──────
-- Reuses migration 049's proven pattern exactly: rejects UPDATE/DELETE
-- unconditionally, for every role, including service_role.

CREATE OR REPLACE FUNCTION audit.reject_governance_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: audit.governance_event rows cannot be updated or deleted — this is an append-only substrate. A correction is always a NEW event, never a mutation of an existing one.';
END;
$$;

CREATE TRIGGER trg_governance_event_immutable
  BEFORE UPDATE OR DELETE ON audit.governance_event
  FOR EACH ROW
  EXECUTE FUNCTION audit.reject_governance_event_mutation();

-- ── 3. RLS — defensive, fail-closed; no consumer-specific authorization ─────────
-- No KORA_ADMIN-all policy is added here (unlike KORA-WP-004's
-- company_memberships) — this substrate has no UI or KORA_ADMIN-facing read
-- surface of its own yet (that belongs to whichever of KORA-WP-006/007
-- eventually exposes it). RLS is enabled and forced with zero policies:
-- every role, including KORA_ADMIN's own session client, gets zero rows via
-- the ordinary session path. Only the service-role insertion helper (§4,
-- via the canonical getSupabaseServiceClient() factory, which bypasses RLS
-- by role, not by a policy defined here) can write.

ALTER TABLE audit.governance_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.governance_event FORCE ROW LEVEL SECURITY;

-- ── 4. GRANT service_role access ─────────────────────────────────────────────
-- Per the lesson found and fixed in KORA-WP-004 (migration 050): a schema-
-- level USAGE grant (migration 002 already grants service_role USAGE on the
-- audit schema) does NOT cover a table created later — each table needs its
-- own explicit grant. INSERT only: this substrate is genuinely append-only,
-- so no UPDATE/DELETE grant is given even to service_role (the trigger in
-- §2 would reject it anyway; omitting the grant makes the intent explicit
-- one layer earlier). SELECT is granted so a future consumer WP can read
-- events back without needing its own migration to add it.

GRANT SELECT, INSERT ON audit.governance_event TO service_role;

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKE below
-- REVOKE SELECT, INSERT ON audit.governance_event FROM service_role;
-- DROP TRIGGER IF EXISTS trg_governance_event_immutable ON audit.governance_event;
-- DROP FUNCTION IF EXISTS audit.reject_governance_event_mutation();
-- DROP INDEX IF EXISTS audit.idx_governance_event_occurred;
-- DROP INDEX IF EXISTS audit.idx_governance_event_object;
-- DROP INDEX IF EXISTS audit.idx_governance_event_tenant;
-- DROP INDEX IF EXISTS audit.idx_governance_event_actor;
-- DROP INDEX IF EXISTS audit.idx_governance_event_source;
-- DROP INDEX IF EXISTS audit.idx_governance_event_type;
-- DROP TABLE IF EXISTS audit.governance_event;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else — audit.audit_log and every other existing table,
-- policy, and grant are untouched by this migration or by rolling it back.
