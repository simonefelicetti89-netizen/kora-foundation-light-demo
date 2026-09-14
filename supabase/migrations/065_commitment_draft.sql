-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 065: Commitment Draft / Governance Substrate (Layer A)
-- Migration:   065_commitment_draft
-- Created:     2026-09-14
-- Block:       KORA-WP-020 — Commitment Draft / Governance Substrate (Layer A)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- The draft-only Layer A of the three-layer Commitment split (doc 67 §3/§6,
-- doc 69 Q2/Q3, doc 73 §6). Commitment is DD-3's single canonical governance
-- object — Product Truth never freezes a separate "Decision" object; PT's
-- frozen Commitment Record (FT-019, 11 fields, verbatim) already IS the
-- complete decision-governance record. This migration persists exactly the
-- `draft` state of doc 67 §9.1's frozen state machine:
--
--   draft ──► committed ──► active ──► reviewable ──► reviewed ──┬──► closed
--                                                                 └──► reactivated
--
-- `status` is CHECK-pinned to 'draft' only — every later state requires its
-- own future migration to relax the constraint (KORA-WP-022 owns
-- `committed`; Review, owned elsewhere, owns the rest). This is the same
-- discipline migration 053 used for `commitment_ref CHECK (IS NULL)` —
-- physically preventing what a later WP alone may unlock, not a
-- service-layer convention that could be routed around.
--
-- FT-019 FIELD SET, VERBATIM (doc 67 §6)
-- ─────────────────────────────────────────
-- problem/objective · population · options considered · proposed choice &
-- rationale · Evidence Plan (1:1 reference) · evidence available/missing ·
-- expected outcome · capacity/delivery context · amount & horizon
-- (references Resource Allocation entries) · review date · owner (Decision
-- Owner role). All eleven are present below; only `problem_objective` is
-- NOT NULL — a draft is filled in progressively, so "Unknown/not yet
-- entered" is a real, nullable state for the rest, not zero/false/empty
-- (mirrors `analytics.observed_investment_fact`'s own nullable "if known"
-- fields, migration 053).
--
-- FORWARD REFERENCES THAT DO NOT YET HAVE A TABLE
-- ───────────────────────────────────────────────────
-- `evidence_plan_id` (KORA-WP-021, sequential AFTER this WP), `opportunity_id`
-- (KORA-WP-019, explicitly "nullable, never a hard dependency" per this WP's
-- own registry entry), `program_id` (KORA-WP-026) — all three columns exist,
-- per FT-019's own frozen shape, but are CHECK-constrained to always be NULL
-- until the WP that owns each future table adds the real FK — identical
-- discipline to migration 053's `commitment_ref`. No speculative FK to a
-- table that does not exist is created here.
--
-- THE ONE REAL REFERENCE: RESOURCE ALLOCATION (KORA-WP-015, COMPLETE)
-- ───────────────────────────────────────────────────────────────────────
-- "amount & horizon (references Resource Allocation entries)" is a
-- one-or-more relationship (doc 67 §6 "References out"), so it is not a
-- single nullable column on `commitment` — it is a real junction table,
-- `commitment_resource_reference`, with a genuine FK to
-- `analytics.resource_allocation(id)`. Referencing an entry here is
-- PURELY INFORMATIONAL — it never calls `allocate`/`commit`/`spend` and
-- never mutates `resource_allocation.remaining_amount`. The actual draw
-- against the ledger is the `commit` transaction's own job (KORA-WP-022,
-- explicitly out of scope here — "the constitutive `commit` transition
-- does not exist in this package").
--
-- SOFT "READY FOR DECISION" FLAG
-- ─────────────────────────────────
-- doc 73 §6, verbatim: the Advisor "may mark a draft 'ready for decision'
-- (a soft status, not authoritative)." `ready_for_decision boolean` is that
-- exact frozen capability — a plain flag, never a state-machine transition,
-- never gating or triggering `committed`.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Auth/RLS per this WP's own registry entry, verbatim: "Company-scoped,
-- Decision-Owner-authoring only — UI: draft UI (extended by Advisor at
-- KORA-WP-033)." This migration builds the Company-authoring path only.
-- doc 73 §6 records that a frozen Advisor DRAFT/EDIT-DRAFT capability
-- exists in Product Truth — wiring it in is a future WP's job (the
-- WP-007→WP-034 "thin Advisor layer over the core domain service" pattern
-- already established twice in this codebase), not silently built or
-- silently foreclosed here. No `committed`/`active`/`reviewable`/
-- `reviewed`/`closed`/`reactivated` transition, no Evidence Plan, no
-- Opportunity, no Program, no Review, no Decision Pack — all explicitly
-- out of this WP's scope (KORA-WP-019/021/022/023/024/026 and Review/
-- Decision Pack, owned elsewhere).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.commitment ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.commitment (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- doc 67 §9.1's frozen state machine — CHECK-pinned to 'draft' only.
  -- KORA-WP-022 alone may relax this constraint to add 'committed'.
  status                    text          NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),

  -- doc 73 §6 — a soft, non-authoritative flag. Never gates or triggers the
  -- `committed` transition.
  ready_for_decision        boolean       NOT NULL DEFAULT false,

  -- ── FT-019 field set, verbatim (doc 67 §6) ─────────────────────────────
  problem_objective         text          NOT NULL,
  population                text,
  options_considered        text[]        NOT NULL DEFAULT '{}',
  proposed_choice           text,
  rationale                 text,
  evidence_available_missing text,
  expected_outcome          text,
  capacity_delivery_context text,
  amount                    numeric(14,2),
  horizon                   text,
  review_date               date,
  owner_role                text          NOT NULL DEFAULT 'COMPANY_ADMIN',

  -- ── Forward references — present per FT-019's own shape, structurally
  -- prevented from pointing anywhere until the owning WP's own migration
  -- relaxes the constraint (identical discipline to migration 053's
  -- `commitment_ref`). ──────────────────────────────────────────────────
  evidence_plan_id          uuid          CHECK (evidence_plan_id IS NULL),
  opportunity_id            uuid          CHECK (opportunity_id IS NULL),
  program_id                uuid          CHECK (program_id IS NULL),

  -- Provenance — mirrors audit.audit_log/audit.governance_event and every
  -- other Lane-B table in this schema.
  actor_role                text          NOT NULL,
  actor_id                  text          NOT NULL,

  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commitment_tenant  ON analytics.commitment (tenant_id);
CREATE INDEX IF NOT EXISTS idx_commitment_status  ON analytics.commitment (tenant_id, status);

-- `updated_at` auto-bump — ordinary bookkeeping, not a governance invariant
-- (unlike migration 064's monotonic remaining_amount, nothing on this table
-- is restricted from changing while status='draft' — EDIT-DRAFT is a fully
-- frozen, unrestricted capability per doc 73 §6).

CREATE OR REPLACE FUNCTION analytics.touch_commitment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commitment_touch_updated_at
  BEFORE UPDATE ON analytics.commitment
  FOR EACH ROW
  EXECUTE FUNCTION analytics.touch_commitment_updated_at();

-- ── 2. analytics.commitment_resource_reference ───────────────────────────────
-- The real "amount & horizon references Resource Allocation entries"
-- relationship (doc 67 §6) — one-or-more, hence a junction table, not a
-- single column. `tenant_id` is denormalized onto this table (rather than
-- resolved via a join every time) purely so RLS and the tenant-consistency
-- trigger below can apply directly to this table, matching this schema's
-- existing convention of always carrying tenant_id on a Company-scoped row.

CREATE TABLE IF NOT EXISTS analytics.commitment_resource_reference (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid        NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  commitment_id                uuid       NOT NULL REFERENCES analytics.commitment (id) ON DELETE CASCADE,
  resource_allocation_entry_id uuid       NOT NULL REFERENCES analytics.resource_allocation (id),
  actor_role                  text        NOT NULL,
  actor_id                    text        NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT commitment_resource_reference_unique UNIQUE (commitment_id, resource_allocation_entry_id)
);

CREATE INDEX IF NOT EXISTS idx_commitment_resource_reference_tenant     ON analytics.commitment_resource_reference (tenant_id);
CREATE INDEX IF NOT EXISTS idx_commitment_resource_reference_commitment ON analytics.commitment_resource_reference (commitment_id);

-- Defense-in-depth: a referenced Resource Allocation entry must belong to
-- the same tenant as both this row and the Commitment it is attached to —
-- cross-tenant referencing is rejected at the DB level, not only checked in
-- the service layer.

CREATE OR REPLACE FUNCTION analytics.enforce_commitment_resource_reference_tenant_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  commitment_tenant uuid;
  entry_tenant      uuid;
BEGIN
  SELECT tenant_id INTO commitment_tenant FROM analytics.commitment WHERE id = NEW.commitment_id;
  SELECT tenant_id INTO entry_tenant FROM analytics.resource_allocation WHERE id = NEW.resource_allocation_entry_id;

  IF commitment_tenant IS NULL OR entry_tenant IS NULL THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: referenced commitment or resource_allocation entry not found';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM commitment_tenant OR NEW.tenant_id IS DISTINCT FROM entry_tenant THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: commitment_resource_reference.tenant_id must match both the Commitment and the Resource Allocation entry it references';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commitment_resource_reference_tenant_match
  BEFORE INSERT ON analytics.commitment_resource_reference
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_commitment_resource_reference_tenant_match();

-- ── 3. RLS — Pattern A (tenant-claim-bound), per docs/RLS_COMPANY_SCOPED_PATTERN.md ──
-- Identical shape to analytics.resource_allocation/need_hypothesis/
-- observed_investment_fact: KORA_ADMIN full access; COMPANY_ADMIN SELECT
-- only, scoped by tenant claim. All writes happen exclusively through the
-- server-side Commitment service (getSupabaseServiceClient()) — no ordinary
-- session ever inserts or updates either table directly. Advisor RLS is
-- deliberately not added here — this WP's own scope is Company-authoring
-- only (see header).

ALTER TABLE analytics.commitment ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.commitment FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_commitment" ON analytics.commitment
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_commitment_read" ON analytics.commitment
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

ALTER TABLE analytics.commitment_resource_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.commitment_resource_reference FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_commitment_resource_reference" ON analytics.commitment_resource_reference
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_commitment_resource_reference_read" ON analytics.commitment_resource_reference
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 4. GRANTs ────────────────────────────────────────────────────────────────
-- service_role needs SELECT + INSERT + UPDATE on `commitment` (a draft is
-- mutable) but never DELETE (no deletion capability — a draft that is no
-- longer wanted has no frozen "cancelled/discarded" state per doc 67 §9.1;
-- none is invented here). `commitment_resource_reference` additionally
-- needs DELETE — unlinking a proposed Resource Allocation reference is an
-- ordinary part of revising a mutable draft, and a junction row is not
-- itself a governed historical fact the way a Resource Allocation ledger
-- entry is. authenticated needs SELECT only on both tables.

GRANT SELECT, INSERT, UPDATE ON analytics.commitment TO service_role;
GRANT SELECT ON analytics.commitment TO authenticated;

GRANT SELECT, INSERT, DELETE ON analytics.commitment_resource_reference TO service_role;
GRANT SELECT ON analytics.commitment_resource_reference TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON analytics.commitment_resource_reference FROM authenticated;
-- REVOKE SELECT, INSERT, DELETE ON analytics.commitment_resource_reference FROM service_role;
-- REVOKE SELECT ON analytics.commitment FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.commitment FROM service_role;
-- DROP POLICY IF EXISTS "company_own_commitment_resource_reference_read" ON analytics.commitment_resource_reference;
-- DROP POLICY IF EXISTS "kora_admin_all_commitment_resource_reference" ON analytics.commitment_resource_reference;
-- DROP POLICY IF EXISTS "company_own_commitment_read" ON analytics.commitment;
-- DROP POLICY IF EXISTS "kora_admin_all_commitment" ON analytics.commitment;
-- DROP TRIGGER IF EXISTS trg_commitment_resource_reference_tenant_match ON analytics.commitment_resource_reference;
-- DROP FUNCTION IF EXISTS analytics.enforce_commitment_resource_reference_tenant_match();
-- DROP TABLE IF EXISTS analytics.commitment_resource_reference;
-- DROP TRIGGER IF EXISTS trg_commitment_touch_updated_at ON analytics.commitment;
-- DROP FUNCTION IF EXISTS analytics.touch_commitment_updated_at();
-- DROP INDEX IF EXISTS analytics.idx_commitment_status;
-- DROP INDEX IF EXISTS analytics.idx_commitment_tenant;
-- DROP TABLE IF EXISTS analytics.commitment;
-- Rollback is safe at any time: this migration creates two new tables and
-- touches nothing else — no existing column, row, policy, or table
-- (including analytics.tenant and analytics.resource_allocation, only
-- referenced via FKs) is altered by this migration or by rolling it back.
