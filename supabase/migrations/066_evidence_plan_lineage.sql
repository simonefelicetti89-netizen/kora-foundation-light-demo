-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 066: Evidence Plan Lineage (Layer B)
-- Migration:   066_evidence_plan_lineage
-- Created:     2026-09-15
-- Block:       KORA-WP-021 — Evidence Plan Lineage (Layer B) — Primary Ex-Ante Version
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Doc 72 Lock 4, verbatim: "a material Commitment has one governing Evidence
-- Plan lineage — a primary immutable ex-ante version plus zero-or-more
-- immutable later versions/addenda, each dated and scoped, never a set of
-- unrelated competing plans." This migration builds that lineage exactly:
--
--   analytics.evidence_plan            — ONE row per Commitment (1:1,
--                                         UNIQUE(commitment_id)): the primary
--                                         ex-ante version.
--   analytics.evidence_plan_addendum   — MANY rows per evidence_plan: later,
--                                         immutable-from-creation additions,
--                                         each carrying an explicit
--                                         relationship to the version it
--                                         extends.
--
-- THE PRIMARY VERSION'S OWN STATE MACHINE (doc 67 §9.4, frozen)
-- ─────────────────────────────────────────────────────────────────
--   draft (attached pre-commit) → frozen-at-commit → collecting
--   (insufficient|partial|sufficient) → closed-at-review
--
-- This WP's own Purpose text is explicit: "primary version + immutable
-- addenda mechanism, **built before any commit path is exposed**." `status`
-- is therefore CHECK-pinned to 'draft' only here — identical discipline to
-- migration 065's `commitment.status` — because nothing in the current
-- system (Commitment itself is still draft-only, KORA-WP-020) can ever
-- legitimately drive it past `draft`. The freeze-at-commit TRANSITION
-- ITSELF belongs to KORA-WP-022 ("the freeze-at-commit trigger itself
-- (owned by KORA-WP-022)" — this WP's own registry Out of Scope, verbatim);
-- this migration deliberately does not add a way to reach any later status,
-- so Evidence Plan availability structurally cannot activate a Commitment.
--
-- ADDENDA ARE IMMUTABLE FROM CREATION, NOT FROM A LATER FREEZE
-- ────────────────────────────────────────────────────────────────
-- Unlike the primary version's own two-phase draft→frozen model, an
-- addendum has no draft phase at all — "creates a new, immutable version or
-- addendum" (doc 72 §6). `evidence_plan_addendum` therefore uses the
-- stronger append-only discipline already established for
-- audit.governance_event/gov.workload_event (migrations 051/063): zero
-- UPDATE/DELETE grant to service_role, PLUS a BEFORE UPDATE OR DELETE
-- trigger that rejects unconditionally, even for a superuser.
--
-- WHY AN ADDENDUM REQUIRES A NON-DRAFT PRIMARY
-- ───────────────────────────────────────────────
-- An addendum's entire purpose is recording a legitimate later change
-- without touching an ALREADY-IMMUTABLE primary version (doc 72 §6: "It
-- never rewrites what counted as evidence when the original Commitment was
-- made"). While the primary is still `draft`, it is itself mutable — a
-- change belongs in the draft directly, not in an addendum. A DB trigger
-- therefore rejects creating an addendum against a primary whose status is
-- still 'draft'. Because this migration also pins every primary to 'draft'
-- forever (until KORA-WP-022 relaxes that separately), no addendum can be
-- legitimately created yet in the current system — by construction, not by
-- an arbitrary rule: this is the correct, literal consequence of doc 72 §6
-- applied to a system where nothing has been committed yet. The mechanism
-- itself is real and real-DB proven (a manually-relaxed status suffices to
-- exercise it, exactly as the frozen source's own worked example — "three
-- months later" — presupposes a real Commitment that does not exist yet).
--
-- COMMITMENT.EVIDENCE_PLAN_ID — THE ONE FIELD THIS WP RELEASES
-- ───────────────────────────────────────────────────────────────
-- Migration 065 pinned `commitment.evidence_plan_id` to always NULL. This
-- migration, and only this migration, relaxes that one CHECK and adds the
-- real FK to `analytics.evidence_plan(id)` — `opportunity_id` and
-- `program_id` are untouched, still pinned NULL, still owned by
-- KORA-WP-019/026 respectively.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Auth/RLS per this WP's own registry entry, verbatim: "Company/Advisor-
-- visible, Company-authoring." This migration builds the Company-authoring
-- RLS path only (KORA_ADMIN full, COMPANY_ADMIN SELECT-only, identical
-- Pattern A shape to migrations 052/053/055/064/065). "Advisor-visible" is
-- real, frozen domain truth (doc 73 §6 lists Evidence Plan Lineage among
-- the objects an Advisor may VIEW/DRAFT/EDIT-DRAFT) — its own
-- implementation owner is the same KORA-WP-033 convergence item already
-- tracked for Commitment (WP-033's own report 121 named "Commitment/
-- Evidence/Review draft-support endpoints" as one deferred scope,
-- verbatim), extended here to explicitly cover Evidence Plan Lineage too.
-- No Advisor RLS policy or Advisor-facing service function is added by this
-- migration or by KORA-WP-021's own service module.
-- No Review, no Decision Linkage, no Decision Pack, no Program, no Living
-- KORAL — all explicitly out of this WP's scope.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Release commitment.evidence_plan_id — the one field this WP owns ─────

ALTER TABLE analytics.commitment DROP CONSTRAINT commitment_evidence_plan_id_check;

-- ── 2. analytics.evidence_plan — the primary ex-ante version, 1:1 with Commitment ──

CREATE TABLE IF NOT EXISTS analytics.evidence_plan (
  id                             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                      uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  commitment_id                  uuid          NOT NULL UNIQUE REFERENCES analytics.commitment (id) ON DELETE CASCADE,

  -- doc 67 §9.4's frozen state machine — CHECK-pinned to 'draft' only.
  -- KORA-WP-022 alone may relax this constraint to add 'frozen-at-commit'
  -- and the later collecting/closed-at-review states.
  status                         text          NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),

  -- doc 72 §6's own named content: "original evidence expectations ·
  -- criteria · confidence/quality expectations · review intention · what
  -- was known/missing at decision time." All nullable — a draft is filled
  -- in progressively, same "Unknown is a real state" discipline as
  -- commitment's own FT-019 fields (migration 065).
  evidence_expectations          text,
  criteria                       text,
  confidence_quality_expectations text,
  review_intention               text,
  known_missing_at_decision      text,

  actor_role                     text          NOT NULL,
  actor_id                       text          NOT NULL,

  created_at                     timestamptz   NOT NULL DEFAULT now(),
  updated_at                     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_plan_tenant ON analytics.evidence_plan (tenant_id);

ALTER TABLE analytics.commitment
  ADD CONSTRAINT commitment_evidence_plan_id_fkey
  FOREIGN KEY (evidence_plan_id) REFERENCES analytics.evidence_plan (id);

-- `updated_at` auto-bump — ordinary bookkeeping. Every field here is freely
-- editable while status='draft' (doc 73 §6's frozen EDIT-DRAFT capability,
-- applied to Evidence Plan exactly as it is to Commitment) — no field-level
-- immutability trigger is needed at this WP; the CHECK constraint alone is
-- what prevents the one real invariant (no status beyond 'draft').

CREATE OR REPLACE FUNCTION analytics.touch_evidence_plan_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evidence_plan_touch_updated_at
  BEFORE UPDATE ON analytics.evidence_plan
  FOR EACH ROW
  EXECUTE FUNCTION analytics.touch_evidence_plan_updated_at();

-- ── 3. analytics.evidence_plan_addendum — immutable from creation ───────────

CREATE TABLE IF NOT EXISTS analytics.evidence_plan_addendum (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  evidence_plan_id      uuid          NOT NULL REFERENCES analytics.evidence_plan (id) ON DELETE CASCADE,

  -- "an explicit relationship to the version it extends" (doc 72 §6) — NULL
  -- means it extends the primary version directly; a self-FK means it
  -- extends a specific prior addendum, forming a real chain rather than a
  -- flat unordered set.
  extends_addendum_id  uuid          REFERENCES analytics.evidence_plan_addendum (id),

  effective_from        date          NOT NULL,
  scope                 text          NOT NULL,
  content               text,

  actor_role            text          NOT NULL,
  actor_id              text          NOT NULL,

  created_at            timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — immutable from creation, nothing to bump.
);

CREATE INDEX IF NOT EXISTS idx_evidence_plan_addendum_tenant        ON analytics.evidence_plan_addendum (tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_plan_addendum_evidence_plan ON analytics.evidence_plan_addendum (evidence_plan_id);

-- Defense-in-depth: an addendum's tenant must match its evidence_plan's
-- tenant, and — the real semantic guard doc 72 §6 requires — its
-- evidence_plan must NOT be in 'draft' (an addendum only exists to avoid
-- touching an already-immutable primary; while still draft, edit the draft
-- directly). Because every evidence_plan is pinned to 'draft' in this WP's
-- own migration, this trigger currently rejects every insert — the correct,
-- literal consequence of doc 72 §6 in a system where nothing has been
-- committed yet, not an arbitrary restriction.

CREATE OR REPLACE FUNCTION analytics.enforce_evidence_plan_addendum_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  plan_tenant uuid;
  plan_status text;
BEGIN
  SELECT tenant_id, status INTO plan_tenant, plan_status
    FROM analytics.evidence_plan WHERE id = NEW.evidence_plan_id;

  IF plan_tenant IS NULL THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: referenced evidence_plan not found';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM plan_tenant THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: evidence_plan_addendum.tenant_id must match its evidence_plan';
  END IF;
  IF plan_status = 'draft' THEN
    RAISE EXCEPTION 'kora/lineage: an addendum cannot be created while its evidence_plan is still draft — edit the draft directly instead';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_evidence_plan_addendum_invariants
  BEFORE INSERT ON analytics.evidence_plan_addendum
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_evidence_plan_addendum_invariants();

-- Append-only, stronger layer — matches migration 051/063's own dual-layer
-- discipline: zero UPDATE/DELETE GRANT (below) plus this trigger, which
-- fires for every role including one that bypasses grants.

CREATE OR REPLACE FUNCTION analytics.reject_evidence_plan_addendum_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.evidence_plan_addendum rows are never updated or deleted — a correction is always a new addendum';
END;
$$;

CREATE TRIGGER trg_evidence_plan_addendum_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.evidence_plan_addendum
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_evidence_plan_addendum_mutation();

-- ── 4. RLS — Pattern A (tenant-claim-bound), per docs/RLS_COMPANY_SCOPED_PATTERN.md ──
-- Identical shape to analytics.commitment (migration 065): KORA_ADMIN full
-- access; COMPANY_ADMIN SELECT only, scoped by tenant claim. No Advisor
-- policy — see header (KORA-WP-033 convergence, not this migration).

ALTER TABLE analytics.evidence_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.evidence_plan FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_evidence_plan" ON analytics.evidence_plan
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_evidence_plan_read" ON analytics.evidence_plan
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

ALTER TABLE analytics.evidence_plan_addendum ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.evidence_plan_addendum FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_evidence_plan_addendum" ON analytics.evidence_plan_addendum
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_evidence_plan_addendum_read" ON analytics.evidence_plan_addendum
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 5. GRANTs ────────────────────────────────────────────────────────────────
-- evidence_plan: service_role needs SELECT+INSERT+UPDATE (draft is mutable,
-- same as commitment) but never DELETE (no cancellation state, no delete
-- function — same discipline as commitment). evidence_plan_addendum:
-- service_role needs SELECT+INSERT only — never UPDATE, never DELETE
-- (append-only, stronger than commitment_resource_reference's own
-- SELECT/INSERT/DELETE shape, because an addendum is never removed either,
-- unlike a mutable draft's resource reference). authenticated: SELECT only,
-- both tables.

GRANT SELECT, INSERT, UPDATE ON analytics.evidence_plan TO service_role;
GRANT SELECT ON analytics.evidence_plan TO authenticated;

GRANT SELECT, INSERT ON analytics.evidence_plan_addendum TO service_role;
GRANT SELECT ON analytics.evidence_plan_addendum TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON analytics.evidence_plan_addendum FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.evidence_plan_addendum FROM service_role;
-- REVOKE SELECT ON analytics.evidence_plan FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.evidence_plan FROM service_role;
-- DROP POLICY IF EXISTS "company_own_evidence_plan_addendum_read" ON analytics.evidence_plan_addendum;
-- DROP POLICY IF EXISTS "kora_admin_all_evidence_plan_addendum" ON analytics.evidence_plan_addendum;
-- DROP POLICY IF EXISTS "company_own_evidence_plan_read" ON analytics.evidence_plan;
-- DROP POLICY IF EXISTS "kora_admin_all_evidence_plan" ON analytics.evidence_plan;
-- DROP TRIGGER IF EXISTS trg_evidence_plan_addendum_no_mutation ON analytics.evidence_plan_addendum;
-- DROP FUNCTION IF EXISTS analytics.reject_evidence_plan_addendum_mutation();
-- DROP TRIGGER IF EXISTS trg_evidence_plan_addendum_invariants ON analytics.evidence_plan_addendum;
-- DROP FUNCTION IF EXISTS analytics.enforce_evidence_plan_addendum_invariants();
-- DROP TABLE IF EXISTS analytics.evidence_plan_addendum;
-- DROP TRIGGER IF EXISTS trg_evidence_plan_touch_updated_at ON analytics.evidence_plan;
-- DROP FUNCTION IF EXISTS analytics.touch_evidence_plan_updated_at();
-- ALTER TABLE analytics.commitment DROP CONSTRAINT commitment_evidence_plan_id_fkey;
-- DROP INDEX IF EXISTS analytics.idx_evidence_plan_tenant;
-- DROP TABLE IF EXISTS analytics.evidence_plan;
-- ALTER TABLE analytics.commitment ADD CONSTRAINT commitment_evidence_plan_id_check CHECK (evidence_plan_id IS NULL);
-- Rollback is safe at any time: this migration creates two new tables, adds
-- one FK to commitment.evidence_plan_id, and replaces that column's own
-- CHECK constraint with the FK — no existing row's data is altered, and no
-- other column of analytics.commitment is touched.
