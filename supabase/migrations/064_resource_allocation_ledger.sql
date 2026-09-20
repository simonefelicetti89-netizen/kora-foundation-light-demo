-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 064: Resource Allocation Ledger
-- Migration:   064_resource_allocation_ledger
-- Created:     2026-09-14
-- Block:       KORA-WP-015 — Resource Allocation Ledger
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- `COMPANY-005`'s conservation-tested ledger (doc 72 Lock 1, doc 70 §2-3).
-- Every euro a Company declares into KORA governance moves through exactly
-- four mutually-exclusive **current balance positions** — Available,
-- Allocated, Committed, Spent — which sum to the declared total at every
-- instant (the conservation invariant). Two of those positions are also
-- exit points for a **terminal, historical-only lifecycle label** — Released
-- and Reallocated — recording how value left an entry without it ever being
-- mutated. This migration is the first, and only, table implementing that
-- dual view; DD-3 explicitly deferred exact table/column design to
-- implementation (doc 72 §1) — the shape below is this task's own design,
-- not copied from a frozen schema.
--
-- THE SIX-LABEL / FOUR-POSITION DUAL VIEW
-- ─────────────────────────────────────────
-- `lifecycle_status` — six values, assigned once at row creation, NEVER
-- changed afterward: available, allocated, committed, spent, released,
-- reallocated. `current_balance_position` is a GENERATED column collapsing
-- the six to the four live buckets — available/allocated/committed/spent
-- pass through unchanged; released/reallocated generate NULL, because a
-- released/reallocated row is a closed historical marker that never again
-- contributes to the live sum (doc 72: "reclassified, permanently, as
-- Released/Reallocated — a closed, historically-queryable record").
--
-- WHY REMAINING_AMOUNT MUTATES BUT NOTHING ELSE DOES
-- ─────────────────────────────────────────────────────
-- Entries are amount-bearing and splittable (doc 70 §2): a transition may
-- draw only part of an entry's balance. The drawn portion becomes a brand
-- new row in the destination position, carrying `origin_entry_id` back to
-- the source; the source row's own `remaining_amount` is reduced by the
-- drawn amount and otherwise left exactly as it was — it does not change
-- position, does not lose its history, and can be drawn from again later
-- (the doc 70 §3 worked example draws from the same Allocated entry twice,
-- in steps 2 and 5, both against its shrinking remaining_amount). This is
-- therefore NOT an append-only table in the governance_event/workload_event
-- sense (migrations 051/063) — remaining_amount is the one field this
-- design deliberately allows to mutate, monotonically downward, enforced by
-- trigger below. `lifecycle_status`, `original_amount`, `target_label`,
-- `origin_entry_id`, `tenant_id`, `created_at` are immutable after
-- creation — also trigger-enforced, not merely a service-layer convention.
--
-- SPENT IS PERMANENT; CORRECTIONS NEVER MUTATE IT
-- ───────────────────────────────────────────────────
-- Spent is the one live position that is also terminal: nothing is ever
-- drawn from a Spent row again (doc 72: "counted once, forever"). A refund
-- or correction is a brand new Available row referencing the Spent row via
-- `origin_entry_id` — the Spent row itself is untouched, matching every
-- other terminal-record convention in this schema.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Company-scoped only, consuming KORA-WP-010's canonical Pattern A
-- (tenant-claim-bound) RLS template (docs/RLS_COMPANY_SCOPED_PATTERN.md),
-- same as the KORA-WP-014 precedent (migration 053). No Commitment, no
-- Program, no Opportunity — this table records only Resource Allocation's
-- own four-position ledger. `target_label` is a free-text descriptor (the
-- doc 70 worked example itself uses plain labels like "wellbeing 2026");
-- it is NOT an FK to any Commitment/Program table, because none exists yet
-- (KORA-WP-020+/KORA-WP-101) — a future migration, once those tables exist,
-- is the only place such an FK may be added, never this one. Exact
-- Cash-Truth recognition timing and the DIRECT vs. KORA-ORCHESTRATED
-- attribute both remain explicitly out of scope, deferred to the future
-- Commitment/Program work (doc 72 §4) — nothing here encodes either.
-- Effort/time capture (KORA-WP-008, gov.workload_event) is a wholly
-- separate axis — minutes of human activity, not euro-like resource
-- positions — and is not referenced by this migration.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.resource_allocation ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.resource_allocation (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Six-label lifecycle tag, set once at creation, never changed (enforced
  -- by trigger in section 2). available/allocated/committed/spent are both
  -- a lifecycle label and (while remaining_amount > 0) a live balance
  -- position; released/reallocated are terminal-only labels that never
  -- carry a live balance (remaining_amount is always 0 on such a row).
  lifecycle_status         text          NOT NULL
                                          CHECK (lifecycle_status IN (
                                            'available', 'allocated', 'committed',
                                            'spent', 'released', 'reallocated'
                                          )),

  -- Generated, not stored independently: the four-position view is always
  -- mechanically derived from lifecycle_status, so the two views can never
  -- drift out of sync with each other.
  current_balance_position text          GENERATED ALWAYS AS (
                                            CASE lifecycle_status
                                              WHEN 'available' THEN 'available'
                                              WHEN 'allocated' THEN 'allocated'
                                              WHEN 'committed' THEN 'committed'
                                              WHEN 'spent'     THEN 'spent'
                                              ELSE NULL
                                            END
                                          ) STORED,

  -- What this slice is earmarked for. NULL on a root declaration (doc 70 §3
  -- step 0 — a company declaring a pool has not yet targeted anything) and
  -- on released/reallocated markers (the target moved on with the value,
  -- recorded on the destination row instead). Free text, not an FK — see
  -- SCOPE BOUNDARY above.
  target_label             text,

  -- Immutable once set (trigger-enforced). The amount this specific row was
  -- created with — never adjusted after the fact.
  original_amount          numeric(14,2) NOT NULL CHECK (original_amount > 0),

  -- The one mutable numeric field: how much of this row's original amount
  -- is still live/undrawn. Starts equal to original_amount; monotonically
  -- non-increasing (trigger-enforced) as later transitions draw from it.
  -- Always 0 on a spent/released/reallocated row (spent because its value
  -- is fully and permanently realized; released/reallocated because their
  -- entire drawn amount immediately re-homes into a new row).
  remaining_amount         numeric(14,2) NOT NULL CHECK (remaining_amount >= 0),
  CONSTRAINT resource_allocation_remaining_not_over_original
    CHECK (remaining_amount <= original_amount),

  -- Correlation to the row this entry's value was drawn from. NULL only for
  -- a root declaration (doc 70 §3 step 0). Every other row — allocate,
  -- commit, spend, release/reallocate marker, the new live row a
  -- release/reallocate produces, and a refund — points back to its origin,
  -- making the full provenance chain queryable without inventing a
  -- separate audit table.
  origin_entry_id          uuid          REFERENCES analytics.resource_allocation (id),

  -- Provenance of who/what recorded this entry — mirrors the actor_role/
  -- actor_id shape already used by audit.audit_log, audit.governance_event
  -- (migration 005/051) and analytics.observed_investment_fact's
  -- recorded_by_role/recorded_by_id (migration 053).
  actor_role               text          NOT NULL,
  actor_id                 text          NOT NULL,

  created_at               timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resource_allocation_tenant  ON analytics.resource_allocation (tenant_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocation_origin  ON analytics.resource_allocation (origin_entry_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocation_status  ON analytics.resource_allocation (tenant_id, lifecycle_status);

-- ── 2. Invariant trigger — conservation + immutability ───────────────────────
-- Two layers of protection, matching this schema's established discipline
-- (migration 051 audit.governance_event, migration 063 gov.workload_event):
-- a GRANT-layer boundary (section 4 — service_role gets no DELETE at all)
-- plus a trigger that fires for every UPDATE regardless of role, including
-- a superuser who bypasses grants but never triggers. Unlike those two
-- append-only precedents, this table's trigger permits one specific,
-- narrowly-bounded mutation (remaining_amount decreasing) rather than
-- rejecting UPDATE outright — because doc 70 §2's own splittable-entry
-- model requires it. Every other column is exactly as immutable as an
-- append-only table's rows would be.

CREATE OR REPLACE FUNCTION analytics.enforce_resource_allocation_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.tenant_id cannot be changed once set';
  END IF;
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.lifecycle_status cannot be changed once set';
  END IF;
  IF NEW.target_label IS DISTINCT FROM OLD.target_label THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.target_label cannot be changed once set';
  END IF;
  IF NEW.original_amount IS DISTINCT FROM OLD.original_amount THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.original_amount cannot be changed once set';
  END IF;
  IF NEW.origin_entry_id IS DISTINCT FROM OLD.origin_entry_id THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.origin_entry_id cannot be changed once set';
  END IF;
  IF NEW.actor_role IS DISTINCT FROM OLD.actor_role THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.actor_role cannot be changed once set';
  END IF;
  IF NEW.actor_id IS DISTINCT FROM OLD.actor_id THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.actor_id cannot be changed once set';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation.created_at cannot be changed once set';
  END IF;
  IF NEW.remaining_amount > OLD.remaining_amount THEN
    RAISE EXCEPTION 'kora/conservation: analytics.resource_allocation.remaining_amount may only decrease, never increase';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resource_allocation_invariants
  BEFORE UPDATE ON analytics.resource_allocation
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_resource_allocation_invariants();

CREATE OR REPLACE FUNCTION analytics.reject_resource_allocation_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.resource_allocation rows are never deleted — history must remain inspectable';
END;
$$;

CREATE TRIGGER trg_resource_allocation_no_delete
  BEFORE DELETE ON analytics.resource_allocation
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_resource_allocation_delete();

-- ── 3. RLS — Pattern A (tenant-claim-bound), per docs/RLS_COMPANY_SCOPED_PATTERN.md ──
-- Identical shape to analytics.observed_investment_fact (migration 053):
-- KORA_ADMIN gets full access; COMPANY_ADMIN gets SELECT only, scoped by
-- tenant claim. Writes happen exclusively through the server-side
-- Resource Allocation service (getSupabaseServiceClient(), bypasses RLS by
-- role) — no ordinary session ever inserts or updates this table directly.

ALTER TABLE analytics.resource_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.resource_allocation FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_resource_allocation" ON analytics.resource_allocation
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_resource_allocation_read" ON analytics.resource_allocation
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 4. GRANTs ────────────────────────────────────────────────────────────────
-- service_role needs SELECT + INSERT (declarations and every transition
-- create a new row) + UPDATE (drawing from an existing row reduces its
-- remaining_amount — the one mutation this design allows, trigger-bounded
-- above) — but never DELETE (section 2's trigger would reject it anyway;
-- omitting the grant is the same defense-in-depth pairing used by
-- migration 051/063's append-only tables). authenticated needs SELECT only
-- (Company sessions read via the policy above, never write directly).

GRANT SELECT, INSERT, UPDATE ON analytics.resource_allocation TO service_role;
GRANT SELECT ON analytics.resource_allocation TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON analytics.resource_allocation FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.resource_allocation FROM service_role;
-- DROP POLICY IF EXISTS "company_own_resource_allocation_read" ON analytics.resource_allocation;
-- DROP POLICY IF EXISTS "kora_admin_all_resource_allocation" ON analytics.resource_allocation;
-- DROP TRIGGER IF EXISTS trg_resource_allocation_no_delete ON analytics.resource_allocation;
-- DROP FUNCTION IF EXISTS analytics.reject_resource_allocation_delete();
-- DROP TRIGGER IF EXISTS trg_resource_allocation_invariants ON analytics.resource_allocation;
-- DROP FUNCTION IF EXISTS analytics.enforce_resource_allocation_invariants();
-- DROP INDEX IF EXISTS analytics.idx_resource_allocation_status;
-- DROP INDEX IF EXISTS analytics.idx_resource_allocation_origin;
-- DROP INDEX IF EXISTS analytics.idx_resource_allocation_tenant;
-- DROP TABLE IF EXISTS analytics.resource_allocation;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else — no existing column, row, policy, or table
-- (including analytics.tenant, only referenced via a nullable-cascade FK)
-- is altered by this migration or by rolling it back.
