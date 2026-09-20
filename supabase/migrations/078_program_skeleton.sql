-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 078: Program Skeleton — Two-Level Schema Safety
-- Migration:   078_program_skeleton
-- Created:     2026-09-16
-- Block:       KORA-WP-026 — Program Skeleton — Two-Level Schema Safety
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/disposable-DB only by this task. NOT applied to
--              staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-026 entry: "Purpose: cheap schema-safety slice
-- genuinely satisfying `PROGRAM-001`'s frozen requirement... Proposed New:
-- `program_definition`/`program_participation` tables (degenerate two-level
-- case)... Acceptance: skeleton exists, unused unless a Commitment's action
-- needs organized delivery... Out of Scope: Program Factory/Brief/Capacity
-- Assembly (`KORA-WP-060`)."
--
-- SOLE SEMANTIC AUTHORITY: doc `69` (DD-3 Final Architecture Readout) §5/§6,
-- quoted in full because doc `95` §7 — also cited by this WP — is a
-- correction note about DEPENDENCY EDGES, not Program's own shape:
--
-- §5 — "What exactly is Program?": "The governed bridge from a Commitment to
-- delivery, in two internal layers: a Definition (what the Program is, who
-- it can belong to — Company/Partner/Territory-actor/Consortium) and a
-- Participation (one party's specific quota — budget, eligibility,
-- population). The split exists so that Product Truth's own frozen
-- cross-company and territorial Program scenarios don't require a later
-- destructive rebuild."
--
-- §6 — "What is the minimum first-pilot Program?": "The degenerate case of
-- the two-layer model: ONE Definition with ONE Participation, owned by a
-- single Company. No multi-Participation, no cross-company, no Territory,
-- no Prime linkage. Zero extra build cost is paid for this restraint — the
-- SAME SCHEMA SHAPE simply isn't exercised beyond one Participation yet."
--
-- This last sentence is read literally: the schema shape itself is an
-- ordinary one-to-many FK (one Definition, many Participation rows) —
-- "restraint" is a matter of USAGE discipline for the pilot (only one
-- Participation row is created in practice), never a DB-level
-- multiplicity constraint this migration would later have to drop. No
-- UNIQUE(program_definition_id) is added to `program_participation`.
--
-- CRITICAL SOURCED CORRECTION — NO COMMITMENT LINKAGE HERE
-- ────────────────────────────────────────────────────────
-- Doc `95` §7 ("Core Linkage vs. Program Linkage Correction"), quoted
-- verbatim: *"`KORA-WP-023` ('Core Decision Linkage') links only Resource
-- Allocation ↔ Commitment ↔ Evidence Plan ↔ Review — its dependency list is
-- [015, 021, 022], never [026] (Program skeleton) or [060] (full Program).
-- Program linkage, where it matters, is added by the Program-extension
-- package (KORA-WP-060) as its own concern. Mechanically verified: Check 10
-- confirms zero dependency edge from the core spine (019–024) to 026 or
-- 060."* This migration therefore adds NO `commitment_id` (or any other
-- Decision-Spine) foreign key anywhere — despite §5's own "governed bridge
-- FROM a Commitment" framing, the explicit, later, more specific correction
-- assigns that wiring to `KORA-WP-060`, not this WP. A disclosed, sourced
-- design decision, not an oversight.
--
-- WHAT THIS WP CREATES NOW vs. WHAT `KORA-WP-060` REMAINS RESPONSIBLE FOR
-- ─────────────────────────────────────────────────────────────────────────
-- NOW (this migration): the degenerate two-level shape only — Definition +
-- Participation, single-Company ownership, no lifecycle, no Commitment
-- linkage, no Partner/Territory/Consortium ownership, no Prime linkage, no
-- Program Factory/Brief/Capacity Assembly.
-- LATER (`KORA-WP-060`, its own Hard Deps `[026, 023]`, gated by its own
-- Scope Trigger "Full Program delivery selected," currently unactivated):
-- multi-Participation, cross-company/Partner/Territory-actor/Consortium
-- ownership (the `owner_type` CHECK below is deliberately a single-value
-- constraint specifically so `060` can widen it via a plain
-- `DROP CONSTRAINT`/`ADD CONSTRAINT` — no data migration, no rename, no
-- table split, no semantic reinterpretation of any existing row), Commitment
-- linkage (`095` §7), Program Factory/Brief/Capacity Assembly
-- (`PROGRAM-001B/002/003/004`), and the full PROGRAM-001 field surface
-- (objective/Capacity Node/access/Evidence/Reach/review/Value Destination,
-- doc `45`'s own PROGRAM-001 row) — none of which is invented here.
--
-- OWNERSHIP MODEL, DEGENERATE CASE ONLY
-- ────────────────────────────────────────
-- `program_definition.owner_type` is fixed to `'company'` (the only value
-- the CHECK constraint permits) — §6's own "owned by a single Company, no
-- cross-company, no Territory" restated as a real, enforced constraint, not
-- a comment. `program_participation.participant_tenant_id` is enforced (by
-- trigger, see §2 below) to always equal its own Definition's
-- `owner_tenant_id` — the concrete, DB-level form of "no cross-company."
--
-- SCOPE BOUNDARY
-- ───────────────
-- No lifecycle/status column (this WP's own §18 instruction: no speculative
-- draft/published/active/paused/completed/cancelled states — nothing
-- frozen requires one for the skeleton). No audit/governance_event emission
-- (registry's own "Audit: N/A at this slice"). No Worker/PIB reference of
-- any kind — Program/Participation here is Company-structural, never
-- person-level (confirmed: neither `owner_tenant_id` nor
-- `participant_tenant_id` references any Worker table). No taxonomy enum
-- (`ActionFamily`/`PillarCode`/fiscal perimeter) is redeclared or
-- referenced — none is canonically required at this skeleton layer. No
-- Prime, no KORA Space, no Partner semantics.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.program_definition ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.program_definition (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- "who it can belong to" (`69` §5) — degenerate case: Company only.
  owner_tenant_id  uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  owner_type       text          NOT NULL DEFAULT 'company' CHECK (owner_type = 'company'),

  -- "what the Program is" (`69` §5) — minimal, no opaque JSONB.
  name             text          NOT NULL CHECK (name <> ''),
  description      text,

  actor_role       text          NOT NULL,
  actor_id         text          NOT NULL,

  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_definition_owner_tenant ON analytics.program_definition (owner_tenant_id);

CREATE TRIGGER trg_program_definition_updated_at
  BEFORE UPDATE ON analytics.program_definition
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 2. analytics.program_participation ──────────────────────────────────────
-- Ordinary one-to-many FK to program_definition — NOT constrained to exactly
-- one row per Definition (see header: `69` §6's "restraint" is usage
-- discipline for the pilot, never a DB-level multiplicity limit).

CREATE TABLE IF NOT EXISTS analytics.program_participation (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  program_definition_id  uuid          NOT NULL REFERENCES analytics.program_definition (id) ON DELETE CASCADE,

  -- "one party's specific quota" (`69` §5) — degenerate case: must be the
  -- same Company as the Definition's own owner (enforced by trigger below).
  participant_tenant_id  uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- "budget, eligibility, population" (`69` §5, verbatim) — explicit,
  -- minimal, typed columns; nullable (not every Participation must state
  -- all three at skeleton stage).
  budget_amount          numeric(14,2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  eligibility_description text,
  population_estimate    integer       CHECK (population_estimate IS NULL OR population_estimate >= 0),

  actor_role             text          NOT NULL,
  actor_id               text          NOT NULL,

  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_participation_definition ON analytics.program_participation (program_definition_id);
CREATE INDEX IF NOT EXISTS idx_program_participation_tenant     ON analytics.program_participation (participant_tenant_id);

CREATE TRIGGER trg_program_participation_updated_at
  BEFORE UPDATE ON analytics.program_participation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- No-cross-company invariant (`69` §6) — the one real invariant this WP's
-- own §23 requires DB-level protection for: a Participation's own tenant
-- must always equal its Definition's own owner tenant. Enforced on both
-- INSERT and UPDATE (a later re-parent to a different Definition, or a
-- direct tenant-id edit, must be caught the same way).

CREATE OR REPLACE FUNCTION analytics.enforce_program_participation_same_company()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_tenant uuid;
BEGIN
  SELECT owner_tenant_id INTO v_owner_tenant
    FROM analytics.program_definition
    WHERE id = NEW.program_definition_id;

  IF v_owner_tenant IS NULL THEN
    RAISE EXCEPTION 'kora/not-found: referenced program_definition not found';
  END IF;

  IF NEW.participant_tenant_id IS DISTINCT FROM v_owner_tenant THEN
    RAISE EXCEPTION 'kora/cross-company-not-allowed: program_participation.participant_tenant_id must equal its program_definition.owner_tenant_id at skeleton stage (doc 69 §6 — no cross-company yet; KORA-WP-060 governs any future relaxation)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_program_participation_same_company
  BEFORE INSERT OR UPDATE ON analytics.program_participation
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_program_participation_same_company();

-- ── 3. RLS — Pattern A (identical shape to migration 065's analytics.commitment) ──

ALTER TABLE analytics.program_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.program_definition FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_program_definition" ON analytics.program_definition
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_program_definition_read" ON analytics.program_definition
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND owner_tenant_id = kora.tenant_id()
  );

ALTER TABLE analytics.program_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.program_participation FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_program_participation" ON analytics.program_participation
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_program_participation_read" ON analytics.program_participation
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND participant_tenant_id = kora.tenant_id()
  );

-- ── 4. GRANTs — writes via service_role only (mirrors migration 065's own commitment shape) ──

GRANT SELECT, INSERT, UPDATE ON analytics.program_definition TO service_role;
GRANT SELECT ON analytics.program_definition TO authenticated;

GRANT SELECT, INSERT, UPDATE ON analytics.program_participation TO service_role;
GRANT SELECT ON analytics.program_participation TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON analytics.program_participation FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.program_participation FROM service_role;
-- REVOKE SELECT ON analytics.program_definition FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.program_definition FROM service_role;
-- DROP POLICY IF EXISTS "company_own_program_participation_read" ON analytics.program_participation;
-- DROP POLICY IF EXISTS "kora_admin_all_program_participation" ON analytics.program_participation;
-- DROP POLICY IF EXISTS "company_own_program_definition_read" ON analytics.program_definition;
-- DROP POLICY IF EXISTS "kora_admin_all_program_definition" ON analytics.program_definition;
-- DROP TRIGGER IF EXISTS trg_program_participation_same_company ON analytics.program_participation;
-- DROP FUNCTION IF EXISTS analytics.enforce_program_participation_same_company();
-- DROP TRIGGER IF EXISTS trg_program_participation_updated_at ON analytics.program_participation;
-- DROP TABLE IF EXISTS analytics.program_participation;
-- DROP TRIGGER IF EXISTS trg_program_definition_updated_at ON analytics.program_definition;
-- DROP TABLE IF EXISTS analytics.program_definition;
-- Rollback is safe at any time — this migration inserts no seeded row, and
-- no other object references either table (confirmed by inventory: no
-- existing migration/view/function in this branch names program_definition
-- or program_participation).
