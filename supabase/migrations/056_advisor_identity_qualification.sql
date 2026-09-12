-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 056: Advisor Identity/Profile + Two Role Qualifications
-- Migration:   056_advisor_identity_qualification
-- Created:     2026-09-12
-- Block:       KORA-WP-030 — Advisor Identity/Profile + Two Role Qualifications
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Begins the Advisor environment (`app/advisor` does not exist before this WP).
-- Implements the frozen three-concept model from doc 76 (DD-2.1) §2-§4, §14 —
-- the ONLY frozen source WP-030 cites. Two of the three concepts are built here
-- (Identity/Profile, Role Qualification); the third (Assignment Role Context)
-- is explicitly KORA-WP-031's scope, not touched here.
--
-- ONE IDENTITY, TWO INDEPENDENT QUALIFICATIONS (doc 76 §2-§3)
-- ─────────────────────────────────────────────────────────────
-- "One human Advisor may be qualified as both Company Advisor and Partner
-- Advisor. KORA maintains one Advisor identity/profile for that person."
-- advisor.advisor_identity: exactly one row per human Advisor, never
-- duplicated because a person holds two roles.
-- advisor.advisor_role_qualification: a per-role governance record — NOT a
-- second identity. Exact canonical role names (doc 76 §2-§3, verbatim):
-- 'Company Advisor' and 'Partner Advisor'. A row exists per (advisor, role)
-- pair — both may exist simultaneously and independently for the same
-- advisor (UNIQUE (advisor_id, role) prevents duplicates of the SAME role,
-- not a "one role only" constraint).
--
-- MINIMAL SCOPE — DELIBERATELY NOT THE FULL §3(1) "CARRIES" LIST
-- ──────────────────────────────────────────────────────────────
-- Doc 76 §3(1) conceptually lists richer Identity/Profile properties
-- (biography, expertise tags, general availability, aggregate workload,
-- Academy/compliance summary, conflict declarations). None of those are
-- persisted here: they depend on WPs not yet built (Academy does not exist;
-- workload/effort-capture, KORA-WP-008, is not yet wired to the Advisor
-- context; conflict declarations have no governed mechanism yet). WP-030's
-- own registry text proposes only two tables with no elaborate column list —
-- this migration is the minimal identity/qualification substrate the dual-
-- qualification model requires, not the full future Advisor profile.
--
-- QUALIFICATION STATUS VOCABULARY — EXACT, FROM DOC 76 §4, VERBATIM
-- ─────────────────────────────────────────────────────────────────
-- "CANDIDATE → QUALIFICATION IN PROGRESS → QUALIFIED → RENEWAL DUE →
-- EXPIRED", "QUALIFIED → SUSPENDED (governance reason, temporary)",
-- "QUALIFIED → REVOKED (withdrawn)". These 7 strings are used verbatim
-- (same convention as migration 055's Need Hypothesis classification,
-- copied verbatim from its own frozen source) — no invented state, no
-- collapsed vocabulary. Doc 76 §4 explicitly states "No DB columns are
-- designed here — this is a governance-capability requirement" for the
-- qualification GOVERNANCE PROCESS (who approves what, when) — but the
-- STATUS VOCABULARY ITSELF is frozen text, not invented by this migration.
-- No state-transition-validity trigger is added: enforcing which
-- transitions are legal (e.g. CANDIDATE cannot jump directly to REVOKED) is
-- exactly the governance-process design doc 76 defers to a later,
-- Control-Plane-implementing WP — not designed or guessed at here.
--
-- IDENTITY LIFECYCLE — SEPARATE FROM QUALIFICATION LIFECYCLE (doc 76 §14)
-- ─────────────────────────────────────────────────────────────────────────
-- "Advisor Identity Lifecycle (one per person): candidate/onboarding →
-- active identity → unavailable → globally suspended → inactive/offboarded."
-- Doc 76's own worked example: an identity stays 'active' even if one role
-- qualification expires — the two lifecycles are independent by design, not
-- merged into a single status column. Physical tokens below translate the
-- doc's own slash/space phrasing into machine-safe values without changing
-- their meaning (same technique already used for `company_memberships`'
-- 'active'/'ended' translating a plain-English lifecycle).
--
-- DUAL ROLE NEVER MEANS CROSS-ROLE ACCESS (doc 76 §8) — NOT MODELED HERE
-- ─────────────────────────────────────────────────────────────────────────
-- Access enforcement for organisation-scoped data requires Assignment
-- (doc 76 §7B, KORA-WP-031, not built) — out of this migration's scope
-- entirely. This migration only implements doc 76 §7A's "Self scope": an
-- authenticated Advisor may read their own Identity/Profile and own Role
-- Qualifications without needing any organisation Assignment. No Company,
-- Partner, or Worker policy is added — those roles get zero rows via the
-- ordinary session path (RLS enabled + forced, no matching policy).
--
-- ADVISOR IDENTITY ≠ COMPANY/PARTNER MEMBERSHIP (WP-030's own Privacy/Trust
-- field) — no FK to analytics.company_memberships or a partner_memberships
-- table (which does not exist) is created or implied here.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. advisor schema ────────────────────────────────────────────────────────
-- New domain schema, same convention as network (Partner, migration 010),
-- commons (migration 013), kora_link (migration 034) — Advisor is its own
-- domain area, not a sub-concept of any existing schema.

CREATE SCHEMA IF NOT EXISTS advisor;

-- Schema-level USAGE is a prerequisite independent of any table-level GRANT
-- (same lesson already documented for network/migration 032, commons/
-- migration 046, gov/migration 002) — found here by this WP's own real-DB
-- validation ("permission denied for schema advisor" on the very first
-- INSERT attempt) before it could reach staging/production.
GRANT USAGE ON SCHEMA advisor TO service_role;
GRANT USAGE ON SCHEMA advisor TO authenticated;

-- ── 1. advisor.advisor_identity ───────────────────────────────────────────────
-- Mirrors network.partner_identity's shape (migration 012) — the closest
-- existing precedent for "map one auth user to one canonical domain identity,
-- KORA_ADMIN-provisioned, self-read-only via RLS" — adapted for Advisor's own
-- lifecycle vocabulary (doc 76 §14).

CREATE TABLE IF NOT EXISTS advisor.advisor_identity (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  uuid          NOT NULL UNIQUE,
  full_name     text          NOT NULL,
  status        text          NOT NULL DEFAULT 'candidate_onboarding'
                              CHECK (status IN (
                                'candidate_onboarding', 'active', 'unavailable',
                                'globally_suspended', 'inactive_offboarded'
                              )),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE advisor.advisor_identity IS
  'One row per human Advisor (doc 76 DD-2.1 §3(1)) — never duplicated because '
  'a person holds two role qualifications. KORA_ADMIN-provisioned only, no '
  'self-signup. Advisor Identity Lifecycle per doc 76 §14, independent of '
  'per-role qualification lifecycle (advisor_role_qualification.status).';

COMMENT ON COLUMN advisor.advisor_identity.auth_user_id IS
  'Supabase auth.users.id for this ADVISOR-role user (KORA-WP-002 session guard).';

CREATE INDEX IF NOT EXISTS idx_advisor_identity_auth_user ON advisor.advisor_identity (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_identity_status    ON advisor.advisor_identity (status);

-- ── 2. advisor.advisor_role_qualification ─────────────────────────────────────
-- One row per (advisor, role) — both 'Company Advisor' and 'Partner Advisor'
-- rows may exist simultaneously and independently for the same advisor_id
-- (doc 76 §2: dual-role eligibility). UNIQUE(advisor_id, role) prevents only
-- a duplicate row for the SAME role, never a second, different role.

CREATE TABLE IF NOT EXISTS advisor.advisor_role_qualification (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id    uuid          NOT NULL REFERENCES advisor.advisor_identity (id) ON DELETE CASCADE,

  role          text          NOT NULL
                              CHECK (role IN ('Company Advisor', 'Partner Advisor')),

  -- Doc 76 §4's exact 7-value qualification status vocabulary, verbatim.
  status        text          NOT NULL DEFAULT 'CANDIDATE'
                              CHECK (status IN (
                                'CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED',
                                'RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED'
                              )),

  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE advisor.advisor_role_qualification IS
  'Per-role governance record (doc 76 DD-2.1 §3(2)) — NOT a second Advisor '
  'identity. Exactly one row per (advisor_id, role); both roles may coexist '
  'independently (doc 76 §2, dual-role eligibility). Status vocabulary is '
  'doc 76 §4 verbatim. No state-transition-validity mechanism is enforced '
  'here — the qualification governance PROCESS (who may transition what, '
  'when) is explicitly deferred by doc 76 §4 to a later Control-Plane WP.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_advisor_role_qualification_advisor_role
  ON advisor.advisor_role_qualification (advisor_id, role);

CREATE INDEX IF NOT EXISTS idx_advisor_role_qualification_advisor ON advisor.advisor_role_qualification (advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_role_qualification_status  ON advisor.advisor_role_qualification (status);

-- ── 3. Row Level Security — doc 76 §7A "Self scope" only ─────────────────────
-- KORA_ADMIN: full access (provisioning/governance). ADVISOR: read own row(s)
-- only, identity-bound via auth.uid() (cryptographically-verified JWT sub,
-- same pattern as migration 052's company_memberships self-read policy).
-- COMPANY_ADMIN, PARTNER, WORKER: NO policy — FORCE ROW LEVEL SECURITY means
-- zero rows visible via the ordinary session path, genuinely fail-closed.
-- Organisation-scoped access (doc 76 §7B, Assignment-gated) is explicitly
-- KORA-WP-031's scope, not modeled here.

ALTER TABLE advisor.advisor_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_identity FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_identity_kora_admin_all" ON advisor.advisor_identity
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_identity_own_select" ON advisor.advisor_identity
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND auth_user_id = auth.uid()
  );

ALTER TABLE advisor.advisor_role_qualification ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_role_qualification FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_role_qualification_kora_admin_all" ON advisor.advisor_role_qualification
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_role_qualification_own_select" ON advisor.advisor_role_qualification
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND advisor_id IN (
      SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
    )
  );

-- ── 4. GRANTs ────────────────────────────────────────────────────────────────
-- service_role: SELECT/INSERT/UPDATE — all writes (identity/qualification
-- creation and lifecycle transitions) happen exclusively through the
-- server-side Advisor Identity service, never a self-service client write.
-- This is a DELIBERATE departure from network.partner_identity's precedent
-- (which grants authenticated INSERT/UPDATE directly): a qualification is a
-- governed capability (doc 76 §4) — an Advisor must never be able to write
-- or mutate their own qualification row merely by holding the ADVISOR
-- session role, which a direct authenticated GRANT would allow regardless
-- of RLS predicates on INSERT. authenticated: SELECT only (self-read via
-- the policies above). No DELETE for anyone, on either table — qualification
-- and identity history is never physically removed (doc 76 §4: "no state
-- transition erases a prior one").

GRANT SELECT, INSERT, UPDATE ON advisor.advisor_identity           TO service_role;
GRANT SELECT, INSERT, UPDATE ON advisor.advisor_role_qualification TO service_role;
GRANT SELECT ON advisor.advisor_identity           TO authenticated;
GRANT SELECT ON advisor.advisor_role_qualification TO authenticated;

-- ── 5. updated_at triggers ────────────────────────────────────────────────────
-- Reuses the existing global set_updated_at() function (migration 001) —
-- no new trigger function invented.

DROP TRIGGER IF EXISTS trg_advisor_identity_updated_at ON advisor.advisor_identity;
CREATE TRIGGER trg_advisor_identity_updated_at
  BEFORE UPDATE ON advisor.advisor_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_advisor_role_qualification_updated_at ON advisor.advisor_role_qualification;
CREATE TRIGGER trg_advisor_role_qualification_updated_at
  BEFORE UPDATE ON advisor.advisor_role_qualification
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- DROP TRIGGER IF EXISTS trg_advisor_role_qualification_updated_at ON advisor.advisor_role_qualification;
-- DROP TRIGGER IF EXISTS trg_advisor_identity_updated_at ON advisor.advisor_identity;
-- REVOKE SELECT ON advisor.advisor_role_qualification FROM authenticated;
-- REVOKE SELECT ON advisor.advisor_identity FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON advisor.advisor_role_qualification FROM service_role;
-- REVOKE SELECT, INSERT, UPDATE ON advisor.advisor_identity FROM service_role;
-- DROP POLICY IF EXISTS "advisor_role_qualification_own_select" ON advisor.advisor_role_qualification;
-- DROP POLICY IF EXISTS "advisor_role_qualification_kora_admin_all" ON advisor.advisor_role_qualification;
-- DROP POLICY IF EXISTS "advisor_identity_own_select" ON advisor.advisor_identity;
-- DROP POLICY IF EXISTS "advisor_identity_kora_admin_all" ON advisor.advisor_identity;
-- DROP INDEX IF EXISTS advisor.idx_advisor_role_qualification_status;
-- DROP INDEX IF EXISTS advisor.idx_advisor_role_qualification_advisor;
-- DROP INDEX IF EXISTS advisor.uq_advisor_role_qualification_advisor_role;
-- DROP TABLE IF EXISTS advisor.advisor_role_qualification;
-- DROP INDEX IF EXISTS advisor.idx_advisor_identity_status;
-- DROP INDEX IF EXISTS advisor.idx_advisor_identity_auth_user;
-- DROP TABLE IF EXISTS advisor.advisor_identity;
-- REVOKE USAGE ON SCHEMA advisor FROM authenticated;
-- REVOKE USAGE ON SCHEMA advisor FROM service_role;
-- DROP SCHEMA IF EXISTS advisor;
-- Rollback is safe at any time: this migration creates one new schema and two
-- new tables, touching nothing else — no existing column, row, policy,
-- table, or schema is altered by this migration or by rolling it back.
