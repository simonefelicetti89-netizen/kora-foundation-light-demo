-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 061: Operational Case Primitive
-- Migration:   061_operational_case_primitive
-- Created:     2026-09-13
-- Block:       KORA-WP-007 — Operational Case Primitive
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Implements doc 73 (DD-2 Advisor Canonical Operating Model) §12 "Tasks &
-- Cases (Q12)" and doc 78 (DD-1 KORA Control Plane) §30 "Control-Plane
-- Case / Work Item Model" — the single, generic, cross-domain Case
-- primitive, verbatim:
--
--   "A Case is a bounded unit of Advisor work tied to an organisation
--   (Company or Partner) and, where relevant, a specific canonical object
--   (Commitment, Program, Review, Certification, Capability Validation).
--   Conceptual fields: owning Advisor, linked organisation, linked
--   canonical object (optional — some Cases are general, e.g. 'onboarding
--   prep'), priority, due date, status (open / in-progress / blocked /
--   resolved / escalated), escalation target, resolution note, handoff
--   record on reassignment, and an immutable status-change history."
--   — doc 73 §12
--
--   "Reuses DD-2's shared Case/Task primitive exactly (73 §12), extended
--   with an internal/Admin organisation-context option alongside Company
--   and Partner — the same generic primitive, not a second case system."
--   — doc 78 §30
--
-- CASE-vs-TASK SCOPE GATE (resolved, not assumed)
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 73 §12 separately defines a Task: "a smaller, often checklist-style
-- unit within or alongside a Case — lighter weight, not always requiring
-- its own Case." Task IS a real, distinct, frozen concept — but this WP's
-- own registry entry (file 102, KORA-WP-007) proposes new persistence of
-- exactly ONE table ("Proposed New: `operational_cases` table +
-- status-machine service") and its own Acceptance criterion tests only
-- Case reuse across an Advisor-origin and an Admin-origin flow — Task is
-- never named in either field. "Case/Task" in the WP's own Purpose line
-- is read as informally describing what a Case *is* (a bounded task of
-- Advisor/Admin work), not as authorizing a second persisted primitive.
-- KORA-WP-034 ("Advisor Tasks & Cases") is the most likely future owner of
-- any dedicated Task entity — its own title names Task explicitly, where
-- WP-007's does not. Building a Task table here would anticipate that WP.
-- CASE ONLY is implemented. No task table, no task status, no assignee,
-- no due-date-distinct-from-Case, no checklist.
--
-- ORGANISATION SCOPE — polymorphic by design, not a design gap
-- ─────────────────────────────────────────────────────────────────────────
-- `organisation_type` is `company` | `partner` | `admin` (doc 78 §30's own
-- three-way extension). `organisation_id` cannot carry a single physical
-- FK because it refers to two different tables (`analytics.tenant` for
-- company, `network.partner_identity` for partner) depending on that type,
-- and is NULL for `admin` (an internal/administrative Case with no
-- specific Company or Partner — doc 78 §30's own worked examples: "finance
-- exception," "conflict/recusal escalation" can be organisation-less).
-- Referential integrity for `company`/`partner` is enforced at the service
-- layer, which validates existence in the correct target table before
-- insert — the same trade-off already accepted implicitly wherever a
-- polymorphic reference exists without a native Postgres conditional FK.
-- Only `company` is exercised by this WP's own Acceptance test (Advisor
-- and Admin flows both use `company`); `partner` is included in the CHECK
-- vocabulary because doc 78 §30 names it as part of the same frozen
-- three-way scope, not because this WP builds Partner-side consumption.
--
-- LINKED CANONICAL OBJECT — no fabricated FK to non-existent tables
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 73 §12 names five possible linked canonical object types:
-- Commitment, Program, Review, Certification, Capability Validation. None
-- of these exist in code truth (KORA-WP-020/021/023/024/etc. remain
-- ABSENT) — no speculative FK to a non-existent table is created, per this
-- session's own established "readiness not object" discipline. The
-- vocabulary is persisted (for forward-compatible querying once those
-- objects exist) but `linked_object_id` carries no FK constraint and is
-- always optional — "some Cases are general" (doc 73 §12, verbatim).
--
-- IMMUTABLE STATUS-CHANGE HISTORY — via KORA-WP-006, not a new table
-- ─────────────────────────────────────────────────────────────────────────
-- WP-007's own registry text: "Audit: Case status-change history, via
-- `KORA-WP-006`." The Case row itself carries only current state; every
-- creation, status transition, and reassignment (owning_advisor_id change)
-- is recorded as a `governance_event` (the generic substrate — no exact
-- match exists among WP-006's 14 named governed-action categories, same
-- reasoning as every other non-catalogued event this session). This is
-- the "immutable status-change history" doc 73 §12 names — not a second,
-- redundant history table (Step 15's own instruction: do not duplicate
-- governance history).
--
-- CREATION/READ AUTHORITY — exactly the two Acceptance-named origins
-- ─────────────────────────────────────────────────────────────────────────
-- Acceptance: "one Case from an Advisor flow and one from an Admin flow
-- both queryable through one interface." Only ADVISOR and KORA_ADMIN may
-- create; each reads only their own Cases, KORA_ADMIN reads all. No
-- Company/Partner/Worker read or write path exists in this WP — not
-- required by Acceptance, and building one would be scope invention
-- ("UI: minimal Case list" is read as an internal Advisor/Admin surface,
-- not a Company-facing product screen).
--
-- ADVISOR CASE CREATION — light existence check, not a WP-031 validity gate
-- ─────────────────────────────────────────────────────────────────────────
-- WP-007's own Hard Deps field names only `KORA-WP-005` (Governance Event
-- Substrate) — it does NOT hard-depend on `KORA-WP-031` (Advisor
-- Assignment). The service layer therefore does not import or require
-- `evaluateAdvisorAssignmentValidity()` (that would create an undeclared
-- dependency). It does perform one minimal integrity check for a
-- `company`-scoped Advisor-created Case: a real `advisor.advisor_assignment`
-- row (any status, not required to be active) must exist tying the caller
-- to that company — "a bounded unit of Advisor work tied to an
-- organisation" (doc 73 §12) is not meaningful without some genuine
-- relationship, but this is deliberately lighter than the H-A/Decision-4
-- active-Assignment operational gate already built for WP-033/035/036,
-- which this WP does not extend.
--
-- ADMIN-021 DEPRECATION GATE — verified, nothing left to remove
-- ─────────────────────────────────────────────────────────────────────────
-- File 102 assigns `ADMIN-021` (dead Admin sidebar links) as a cleanup
-- Primary Closure of this WP ("Data/Migration Impact: ADDITIVE + one
-- deprecation"). Direct repository inspection (this task, not assumed):
-- `lib/navigation/admin-nav-groups.ts` and `components/layout/Sidebar.tsx`
-- are the sole admin sidebar navigation sources; every non-`inactive`/
-- non-`comingSoon` href in the current `ADMIN_NAV_GROUPS` resolves to a
-- real `page.tsx`; the one entry with no page (`/admin/future-vision`) is
-- explicitly `inactive: true`, which the Sidebar component's own comment
-- confirms is "NOT rendered as navigable link" — not a dead link, working
-- as designed (CLAUDE.md's Future Vision discipline). `git log` on that
-- file shows a prior, unrelated commit (`7032f62`, "retire residual demo
-- surfaces") already removed several dead entries. Conclusion: ADMIN-021's
-- dead sidebar links no longer exist in the codebase — closed already by
-- prior, independent refactors, before this WP's implementation. No file
-- is touched for this gate; the finding is recorded here as the closure
-- evidence this WP owns.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gov.operational_case (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- doc 78 §30's three-way organisation scope. organisation_id is
  -- deliberately not a native FK (polymorphic target) — see header.
  organisation_type  text          NOT NULL
                                   CHECK (organisation_type IN ('company', 'partner', 'admin')),
  organisation_id    uuid          NULL,

  -- doc 73 §12: "linked canonical object (optional)". No FK — see header.
  linked_object_type text          NULL
                                   CHECK (linked_object_type IS NULL OR linked_object_type IN (
                                     'commitment', 'program', 'review', 'certification', 'capability_validation'
                                   )),
  linked_object_id   uuid          NULL,

  -- doc 73 §12: "owning Advisor" — nullable for Admin-origin Cases with no
  -- Advisor owner (doc 78 §30's own Admin-only exception examples).
  owning_advisor_id  uuid          NULL REFERENCES advisor.advisor_identity (id) ON DELETE SET NULL,

  -- Origin of the Case — the two Acceptance-named flows.
  created_by_role    text          NOT NULL
                                   CHECK (created_by_role IN ('ADVISOR', 'KORA_ADMIN')),

  -- Minimal human-readable identity for the "minimal Case list" UI
  -- acceptance — not named verbatim in doc 73 §12's field list, but a
  -- Case cannot be usably "queryable through one interface" without one;
  -- same pragmatic minimum as the sibling WP-035 appointment's `subject`.
  subject            text          NOT NULL
                                   CHECK (char_length(subject) BETWEEN 1 AND 200),

  -- doc 73 §12 conceptual fields — no frozen vocabulary for priority
  -- exists anywhere cited, so it is free text, not an invented enum.
  priority           text          NULL,
  due_date           timestamptz   NULL,

  -- doc 73 §12, verbatim status vocabulary — exactly these five, no more.
  status             text          NOT NULL DEFAULT 'open'
                                   CHECK (status IN ('open', 'in-progress', 'blocked', 'resolved', 'escalated')),

  escalation_target  text          NULL,
  resolution_note    text          NULL,

  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT operational_case_org_id_required_unless_admin
    CHECK ((organisation_type = 'admin') OR (organisation_id IS NOT NULL)),

  CONSTRAINT operational_case_linked_object_pair
    CHECK ((linked_object_type IS NULL) = (linked_object_id IS NULL))
);

COMMENT ON TABLE gov.operational_case IS
  'Operational Case Primitive (doc 73 §12, doc 78 §30, KORA-WP-007) — the '
  'single generic Case reused across Advisor, Admin, Company, and Partner '
  'domains. Case-only: no Task persistence (see this migration''s own '
  'header). No dedicated history table — status-change/reassignment '
  'history is the audit.governance_event log (KORA-WP-006), not a second '
  'audit surface.';

CREATE INDEX IF NOT EXISTS idx_operational_case_org         ON gov.operational_case (organisation_type, organisation_id);
CREATE INDEX IF NOT EXISTS idx_operational_case_advisor     ON gov.operational_case (owning_advisor_id);
CREATE INDEX IF NOT EXISTS idx_operational_case_status      ON gov.operational_case (status);

CREATE TRIGGER trg_operational_case_updated_at
  BEFORE UPDATE ON gov.operational_case
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Defense-in-depth only — the real enforcement boundary is the service
-- layer (lib/operations/operational-case-service.ts), since every actual
-- read/write goes through the service-role client, which bypasses RLS
-- (`rolbypassrls = true`, confirmed this session). No Company/Partner/
-- Worker policy exists — not required by this WP's own Acceptance, and
-- none is added speculatively.

ALTER TABLE gov.operational_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.operational_case FORCE ROW LEVEL SECURITY;

CREATE POLICY "operational_case_kora_admin_all" ON gov.operational_case
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- Advisor reads/creates only Cases they own — a raw subquery against
-- advisor_identity is safe here (no cycle: advisor_identity's own policies
-- never reference gov.operational_case back).
CREATE POLICY "operational_case_advisor_own_select" ON gov.operational_case
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND owning_advisor_id IN (
      SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "operational_case_advisor_own_insert" ON gov.operational_case
  FOR INSERT WITH CHECK (
    kora.kora_role() = 'ADVISOR'
    AND created_by_role = 'ADVISOR'
    AND owning_advisor_id IN (
      SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "operational_case_advisor_own_update" ON gov.operational_case
  FOR UPDATE USING (
    kora.kora_role() = 'ADVISOR'
    AND owning_advisor_id IN (
      SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
    )
  );

-- ── GRANTs ───────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON gov.operational_case TO service_role;
GRANT SELECT, INSERT, UPDATE ON gov.operational_case TO authenticated;
-- No DELETE grant for anyone: closed Cases are a status, never a row
-- removal (doc 73 §12's own "immutable status-change history" implies the
-- row itself is never destroyed once created).

-- ── Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT, INSERT, UPDATE ON gov.operational_case FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON gov.operational_case FROM service_role;
-- DROP POLICY IF EXISTS "operational_case_advisor_own_update" ON gov.operational_case;
-- DROP POLICY IF EXISTS "operational_case_advisor_own_insert" ON gov.operational_case;
-- DROP POLICY IF EXISTS "operational_case_advisor_own_select" ON gov.operational_case;
-- DROP POLICY IF EXISTS "operational_case_kora_admin_all" ON gov.operational_case;
-- DROP TRIGGER IF EXISTS trg_operational_case_updated_at ON gov.operational_case;
-- DROP INDEX IF EXISTS gov.idx_operational_case_status;
-- DROP INDEX IF EXISTS gov.idx_operational_case_advisor;
-- DROP INDEX IF EXISTS gov.idx_operational_case_org;
-- DROP TABLE IF EXISTS gov.operational_case;
-- Rollback is safe at any time: this migration creates one new table in
-- the existing `gov` schema, touching no existing column, row, policy,
-- table, function, or schema — migrations 001-060 remain exactly as they
-- were. No admin-nav-groups.ts / Sidebar.tsx change is made by this
-- migration (the ADMIN-021 gate required no code change — see header).
