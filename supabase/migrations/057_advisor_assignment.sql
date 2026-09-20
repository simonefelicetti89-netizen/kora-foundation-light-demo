-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 057: Advisor Assignment + Validity Rule + Minimum
--        Prerequisite-Eligibility Data
-- Migration:   057_advisor_assignment
-- Created:     2026-09-13
-- Block:       KORA-WP-031 — Advisor Assignment + Validity Rule + Minimum
--              Prerequisite-Eligibility Data
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Builds the third of doc 76 (DD-2.1) §2-§4's three-concept model: Assignment
-- Role Context. `advisor_identity` and `advisor_role_qualification` (migration
-- 056, KORA-WP-030) are NOT touched — this migration is additive only.
--
-- Advisor Identity ≠ Advisor Qualification ≠ Advisor Assignment (doc 73 §3,
-- doc 76 §3(3)). A qualification says what role the Advisor is qualified to
-- perform; an Assignment says where/for whom that Advisor is actually
-- assigned. Frozen sources for this migration: doc 73 (DD2 Advisor Canonical
-- Operating Model) §3 "Assignment Model" and §15 "Privacy, Tenancy,
-- Multi-Assignment Invariants"; doc 76 (DD2.1) §3(3) "Assignment Role
-- Context", §15 "Assignment Validity Rule"; doc 98 §4 (Errata 2 — WP-031 owns
-- the minimum prerequisite-evidence data it evaluates, so validity never
-- hidden-depends on KORA-WP-039).
--
-- ASSIGNMENT MODEL (doc 73 §3, doc 76 §3(3), verbatim in substance)
-- ──────────────────────────────────────────────────────────────────
-- "An Assignment is the record that grants an Advisor Profile scoped access
-- to one Company or one Partner." Doc 76 §3(3) adds: "every Assignment now
-- explicitly names the role the Advisor is operating in for that
-- organisation/context: Company Advisor or Partner Advisor. The role used
-- for an Assignment must have a corresponding active qualification."
--
-- COMPANY-ONLY TARGET IN THIS MIGRATION — NOT A REDEFINITION
-- ─────────────────────────────────────────────────────────────
-- Doc 73 §3's full conceptual model names both Company and Partner as valid
-- organisation targets. Partner Membership does not exist yet (KORA-WP-051,
-- gated behind the "Partner delivery selected" Scope Trigger, not activated).
-- Building a Partner-target column/FK now would anticipate WP-051, which
-- this WP's own authorization explicitly forbids ("Do not anticipate
-- KORA-WP-051 Partner Delivery"). `organisation_type` is added as a
-- discriminator column with a single legal value today ('company') so the
-- table is honestly a "which kind of organisation" record, not silently
-- Company-only forever — widening the CHECK and adding a nullable
-- `partner_id` column later (when KORA-WP-053 needs it, per its own Hard
-- Deps: 030, 031, 051) is additive, not destructive. This mirrors
-- `company_memberships.role`'s own precedent exactly (migration 050: "single
-- valid value today... present as a column, not hardcoded away").
--
-- CARDINALITY (doc 73 §3, verbatim)
-- ────────────────────────────────
-- "First-pilot supported cardinality is exactly one active Company Advisor
-- per Company at a time... the Assignment primitive already supports N
-- Assignments per Company; only the business rule limiting it to one active
-- Assignment is a first-pilot constraint, not a schema constraint." Enforced
-- below via a partial unique index on (company_id) WHERE status='active' —
-- not a table-wide UNIQUE, so historical (ended) rows are never blocked. One
-- Company Advisor MAY serve multiple Companies (doc 73 §3: "un Advisor può
-- seguire più Company") — no constraint restricts advisor_id's fan-out.
--
-- HISTORY NEVER DELETED (doc 73 §3, §15; doc 76 §15)
-- ─────────────────────────────────────────────────────
-- "An ended Assignment is closed, never deleted, remains queryable... every
-- object it produced stays attributed to it." No DELETE grant exists on this
-- table for anyone. Ending requires `reason` (doc 73 §3: "reason (required
-- when ending)") and sets `effective_to` — both structurally enforced below,
-- mirroring `company_memberships.ended_at`'s own consistency-CHECK
-- convention (migration 050) exactly.
--
-- ASSIGNMENT VALIDITY RULE (doc 76 §15, verbatim) — WHAT THIS WP EVALUATES
-- ───────────────────────────────────────────────────────────────────────
-- "An Assignment is operationally valid only if: the Advisor identity is
-- active/eligible; the corresponding Role Qualification is active; the
-- Assignment itself is active; Academy/prerequisite gates required for that
-- specific workflow are satisfied; and no instance-level recusal/deny
-- applies." This WP's own registry text narrows the last two inputs to
-- exactly what it owns: "qualification-active + prerequisite-eligibility-
-- present + no-conflict, all from data this WP owns" — i.e. WITHOUT
-- depending on KORA-WP-078's Academy engine or KORA-WP-037's recusal
-- workflow, both explicitly Out of Scope here. `conflict_flag` below is the
-- minimal "no-conflict" data point this WP owns (default false — nothing
-- sets it true yet; KORA-WP-037 is the eventual owner of the workflow that
-- would ever flip it). No recusal UI, investigation, or notification
-- mechanism is built here.
--
-- MINIMUM PREREQUISITE-ELIGIBILITY DATA (doc 98 §4 Errata 2; registry's own
-- "Proposed New" field, verbatim field list)
-- ───────────────────────────────────────────────────────────────────────────
-- "prerequisite-eligibility fields on (or a minimal record related to)
-- Advisor Role Qualification: status, source/evidence reference, effective
-- date, expiry date where applicable, last-verified timestamp, verified-by
-- actor." Modeled as `advisor.advisor_prerequisite_eligibility`, one row per
-- `advisor_role_qualification` (UNIQUE FK) — a minimal record RELATED TO the
-- qualification, not a new column bag merged into it (keeps the WP-030
-- qualification table's own shape untouched). `status` is a 2-value
-- MET/NOT_MET vocabulary — the registry text does not name a canonical
-- status vocabulary beyond "prerequisite-eligibility-present," so this is
-- the minimal vocabulary matching that exact phrase, not an invented
-- richer one (no rating, no percentage, no score). No manual operator UI is
-- built over this data here — that is explicitly KORA-WP-039's scope
-- (registry Out of Scope: "the manual operator UI over this data
-- (KORA-WP-039)"); this migration provides only the persisted substrate a
-- future WP-039 UI and a same-WP service function can read/write.
--
-- "QUALIFICATION-ACTIVE" — EXACT INTERPRETATION, DISCLOSED
-- ────────────────────────────────────────────────────────
-- Doc 76 §14's own worked example ("Company Advisor Qualification =
-- QUALIFIED... Company Advisor Assignments continue normally") is the only
-- concrete evidence of what "active" means for a Role Qualification. This
-- migration/service therefore treats "active" as literally `status =
-- 'QUALIFIED'` — the strictest, most literally evidenced reading. `RENEWAL
-- DUE` is NOT treated as active by this WP (no frozen source states
-- otherwise); this is a disclosed, narrow interpretation, not an invented
-- one — a future WP may revisit it if a frozen source is found to say
-- otherwise.
--
-- NO ADVISOR EXPERIENCE UI, NO MATCHING ENGINE (this WP's own registry: "UI:
-- N/A at this WP") — no route, no page is added by this migration or its
-- companion service. No Company-side RLS read policy is added either:
-- Company-facing visibility of "who is my assigned Advisor" is KORA-WP-033's
-- scope (its own registry: "Company Advisor profile surface"), not built
-- here — mirrors migration 056's own "Self scope only, Organisation
-- Assignment scope is KORA-WP-031's/-033's scope, not modeled here" pattern.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. advisor.advisor_assignment ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS advisor.advisor_assignment (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  advisor_id         uuid          NOT NULL REFERENCES advisor.advisor_identity (id) ON DELETE CASCADE,

  -- Discriminator with a single legal value today — 'company' — see header.
  -- Widened additively (never destructively) when KORA-WP-051/053 exist.
  organisation_type  text          NOT NULL DEFAULT 'company'
                                  CHECK (organisation_type = 'company'),

  -- Cross-schema FK to the canonical Company/tenant entity — same convention
  -- already used by network.partner_identity (migration 042), kora_commons
  -- (migration 013), audit.governance_event (migration 051), and every
  -- Company-scoped table since migration 001.
  company_id         uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Assignment Role Context (doc 76 §3(3)) — must correlate with the target:
  -- a 'company' target can only ever pair with the 'Company Advisor' role
  -- (doc 76 §3's own worked examples: "Assignment A → Company X → role:
  -- Company Advisor"). Widened when a 'partner' organisation_type exists.
  role               text          NOT NULL
                                  CHECK (role IN ('Company Advisor', 'Partner Advisor')),

  CONSTRAINT advisor_assignment_role_matches_target
    CHECK (organisation_type <> 'company' OR role = 'Company Advisor'),

  -- Lifecycle (doc 73 §3): 'active' / 'ended' only — reassignment closes the
  -- old row and opens a new one; it never mutates role/target in place.
  status             text          NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'ended')),

  effective_from     timestamptz   NOT NULL DEFAULT now(),
  effective_to       timestamptz   NULL,

  -- "reason (required when ending)" — doc 73 §3, verbatim.
  reason             text          NULL,

  -- Minimal "no-conflict" input this WP owns for its validity predicate
  -- (see header) — default false; only ever set by a later, KORA-WP-037-
  -- owned recusal workflow, not built here.
  conflict_flag      boolean       NOT NULL DEFAULT false,

  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),

  -- Structural integrity only (mirrors company_memberships.ended_at's own
  -- consistency CHECK, migration 050, exactly): effective_to is set if and
  -- only if the Assignment has actually ended.
  CONSTRAINT advisor_assignment_effective_to_consistency
    CHECK ((status = 'ended') = (effective_to IS NOT NULL)),

  CONSTRAINT advisor_assignment_reason_required_when_ended
    CHECK (status <> 'ended' OR reason IS NOT NULL),

  CONSTRAINT advisor_assignment_no_impossible_range
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

COMMENT ON TABLE advisor.advisor_assignment IS
  'Assignment Role Context (doc 76 DD-2.1 §3(3)) — the record that grants an '
  'Advisor Profile scoped access to one Company (Partner target: KORA-WP-051+, '
  'not built here). Distinct domain fact from Advisor Identity/Qualification '
  '(migration 056) — see this migration''s own header. History never deleted; '
  'ending requires a reason (doc 73 §3).';

-- First-pilot cardinality (doc 73 §3, verbatim): exactly one ACTIVE Company
-- Advisor per Company at a time. A partial unique index, not a table-wide
-- UNIQUE, so historical (ended) rows are never blocked and an Advisor may
-- hold active Assignments to many different Companies simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS uq_advisor_assignment_one_active_company_advisor
  ON advisor.advisor_assignment (company_id)
  WHERE status = 'active' AND organisation_type = 'company';

CREATE INDEX IF NOT EXISTS idx_advisor_assignment_advisor ON advisor.advisor_assignment (advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_assignment_company ON advisor.advisor_assignment (company_id);
CREATE INDEX IF NOT EXISTS idx_advisor_assignment_status  ON advisor.advisor_assignment (status);

-- ── 2. advisor.advisor_prerequisite_eligibility ────────────────────────────────
-- Minimum Prerequisite-Eligibility Data (doc 98 §4 Errata 2) — a minimal
-- record RELATED TO advisor_role_qualification (migration 056), one row per
-- qualification (UNIQUE FK), never a column merged into that table (keeps
-- WP-030's own table shape untouched, per this WP's own Step 21 discipline:
-- "no second source of truth for qualification status" — this table is a
-- DIFFERENT fact, prerequisite evidence, not a copy of qualification status).

CREATE TABLE IF NOT EXISTS advisor.advisor_prerequisite_eligibility (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  role_qualification_id  uuid          NOT NULL UNIQUE
                                       REFERENCES advisor.advisor_role_qualification (id) ON DELETE CASCADE,

  -- "prerequisite-eligibility-present" (WP-031's own registry phrase) — the
  -- minimal 2-value vocabulary matching that exact phrase; no invented
  -- richer scale (no rating, percentage, or score).
  status                 text          NOT NULL DEFAULT 'NOT_MET'
                                       CHECK (status IN ('MET', 'NOT_MET')),

  source_reference       text          NULL,
  effective_date         timestamptz   NULL,
  expiry_date            timestamptz   NULL,
  last_verified_at       timestamptz   NULL,

  -- KORA_ADMIN operator id who last verified this record. No FK (same
  -- convention as company_identity.created_by, migration 042: informational
  -- only, not an access-control input).
  verified_by            uuid          NULL,

  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT advisor_prerequisite_eligibility_no_impossible_range
    CHECK (expiry_date IS NULL OR effective_date IS NULL OR expiry_date >= effective_date)
);

COMMENT ON TABLE advisor.advisor_prerequisite_eligibility IS
  'Minimum Prerequisite-Eligibility Data (doc 98 §4 Errata 2) — the data '
  'KORA-WP-031''s own validity-check reads, owned here so validity never '
  'hidden-depends on KORA-WP-039''s (not yet built) manual operator UI. One '
  'row per advisor_role_qualification (migration 056); a distinct fact from '
  'qualification status, never a copy of it.';

CREATE INDEX IF NOT EXISTS idx_advisor_prerequisite_eligibility_status ON advisor.advisor_prerequisite_eligibility (status);

-- ── 3. Row Level Security ──────────────────────────────────────────────────────
-- KORA_ADMIN: full access ("Admin creates the Assignment" — doc 73 §3's own
-- worked flow). ADVISOR: self-read only (doc 76 §7A "Self scope" extended —
-- an Advisor reading their OWN Assignment/eligibility is about themselves,
-- not organisation-scoped data; doc 73's own Advisor Home spec lists "which
-- Companies/Partners am I responsible for" as self-scope information).
-- COMPANY_ADMIN, PARTNER, WORKER: NO policy — FORCE ROW LEVEL SECURITY means
-- zero rows via the ordinary session path, fail-closed. Organisation-scoped
-- Company visibility (doc 76 §7B) is explicitly KORA-WP-033's scope, not
-- modeled here — mirrors migration 056's identical precedent exactly.

ALTER TABLE advisor.advisor_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_assignment FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_assignment_kora_admin_all" ON advisor.advisor_assignment
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_assignment_own_select" ON advisor.advisor_assignment
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND advisor_id IN (
      SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
    )
  );

ALTER TABLE advisor.advisor_prerequisite_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_prerequisite_eligibility FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_prerequisite_eligibility_kora_admin_all" ON advisor.advisor_prerequisite_eligibility
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_prerequisite_eligibility_own_select" ON advisor.advisor_prerequisite_eligibility
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND role_qualification_id IN (
      SELECT rq.id FROM advisor.advisor_role_qualification rq
      JOIN advisor.advisor_identity ai ON ai.id = rq.advisor_id
      WHERE ai.auth_user_id = auth.uid()
    )
  );

-- ── 4. GRANTs ────────────────────────────────────────────────────────────────
-- Same deliberate departure from a broad authenticated-write grant as
-- migration 056: all writes happen exclusively through the server-side
-- Advisor Assignment service. No DELETE for anyone, on either table —
-- Assignment/eligibility history is never physically removed.

GRANT SELECT, INSERT, UPDATE ON advisor.advisor_assignment                TO service_role;
GRANT SELECT, INSERT, UPDATE ON advisor.advisor_prerequisite_eligibility  TO service_role;
GRANT SELECT ON advisor.advisor_assignment                TO authenticated;
GRANT SELECT ON advisor.advisor_prerequisite_eligibility  TO authenticated;

-- ── 5. updated_at triggers ────────────────────────────────────────────────────
-- Reuses the existing global set_updated_at() function (migration 001) —
-- no new trigger function invented.

DROP TRIGGER IF EXISTS trg_advisor_assignment_updated_at ON advisor.advisor_assignment;
CREATE TRIGGER trg_advisor_assignment_updated_at
  BEFORE UPDATE ON advisor.advisor_assignment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_advisor_prerequisite_eligibility_updated_at ON advisor.advisor_prerequisite_eligibility;
CREATE TRIGGER trg_advisor_prerequisite_eligibility_updated_at
  BEFORE UPDATE ON advisor.advisor_prerequisite_eligibility
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- DROP TRIGGER IF EXISTS trg_advisor_prerequisite_eligibility_updated_at ON advisor.advisor_prerequisite_eligibility;
-- DROP TRIGGER IF EXISTS trg_advisor_assignment_updated_at ON advisor.advisor_assignment;
-- REVOKE SELECT ON advisor.advisor_prerequisite_eligibility FROM authenticated;
-- REVOKE SELECT ON advisor.advisor_assignment FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON advisor.advisor_prerequisite_eligibility FROM service_role;
-- REVOKE SELECT, INSERT, UPDATE ON advisor.advisor_assignment FROM service_role;
-- DROP POLICY IF EXISTS "advisor_prerequisite_eligibility_own_select" ON advisor.advisor_prerequisite_eligibility;
-- DROP POLICY IF EXISTS "advisor_prerequisite_eligibility_kora_admin_all" ON advisor.advisor_prerequisite_eligibility;
-- DROP POLICY IF EXISTS "advisor_assignment_own_select" ON advisor.advisor_assignment;
-- DROP POLICY IF EXISTS "advisor_assignment_kora_admin_all" ON advisor.advisor_assignment;
-- DROP INDEX IF EXISTS advisor.idx_advisor_prerequisite_eligibility_status;
-- DROP TABLE IF EXISTS advisor.advisor_prerequisite_eligibility;
-- DROP INDEX IF EXISTS advisor.idx_advisor_assignment_status;
-- DROP INDEX IF EXISTS advisor.idx_advisor_assignment_company;
-- DROP INDEX IF EXISTS advisor.idx_advisor_assignment_advisor;
-- DROP INDEX IF EXISTS advisor.uq_advisor_assignment_one_active_company_advisor;
-- DROP TABLE IF EXISTS advisor.advisor_assignment;
-- Rollback is safe at any time: this migration creates two new tables in the
-- existing `advisor` schema (migration 056), touching nothing else — no
-- existing column, row, policy, table, or schema is altered by this
-- migration or by rolling it back.
