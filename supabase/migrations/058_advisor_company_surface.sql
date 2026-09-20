-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 058: Advisor Company Surface — RLS Gaps + Contact Message
-- Migration:   058_advisor_company_surface
-- Created:     2026-09-13
-- Block:       KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal
--              Pilot Slice
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Two additive changes, neither touching 001–057's own migration files
-- (RLS-gap pattern, same convention as migration 022 "worker_rls_gaps"):
--
-- (1) Organisation-scoped Company read policies on `advisor.advisor_identity`
--     and `advisor.advisor_assignment` (migrations 056/057) — explicitly
--     deferred by both of those migrations' own headers to "KORA-WP-033's
--     scope, not modeled here" (doc 76 §7B "Organisation Assignment scope").
--     Also a corrected Advisor-facing `analytics.tenant` read policy scoped
--     to the real multi-Company Assignment model (the pre-existing
--     `company_own_tenant_read`/`advisor_tenant_uef_read` policies from
--     migration 001 predate the Assignment primitive entirely and cannot
--     express "one Advisor, several Companies, only the ones with an active
--     Assignment" — this migration adds a policy that can, without touching
--     the old ones).
--
-- (2) `advisor.advisor_contact_message` — the minimum "non-calendar
--     contact/message surface" file 102 names in KORA-WP-033's own UI field.
--     Booking/calendar (doc 73 §11) is explicitly `KORA-WP-035`'s scope,
--     never anticipated here (Errata 3, doc 98 §5: "booking removed from
--     033's scope entirely; owned exclusively by 035"). A flat, append-only,
--     assignment-scoped message log — no threading UI, no attachments, no
--     read receipts, no external email/chat integration: the minimum
--     canonical mechanism, not a chat platform (this WP's own Step 49
--     discipline).
--
-- WHY COMPANY-SIDE RLS DID NOT EXIST BEFORE THIS MIGRATION
-- ───────────────────────────────────────────────────────────
-- Migration 056's own header: "Organisation-scoped access (doc 76 §7B,
-- Assignment-gated) is explicitly KORA-WP-031's scope, not modeled here."
-- Migration 057's own header: "Organisation-scoped Company visibility (doc
-- 76 §7B) is explicitly deferred to KORA-WP-033." This migration is that
-- deferred work, now that a genuine Assignment primitive exists to gate it.
--
-- SCOPE DISCIPLINE — WHAT THIS MIGRATION DOES NOT DO
-- ─────────────────────────────────────────────────────
-- No booking/call/calendar table (KORA-WP-035). No five-class document
-- taxonomy (KORA-WP-036). No Case/Task table (KORA-WP-034, reuses
-- KORA-WP-007's `operational_cases`, not built yet — irrelevant here). No
-- Commitment/Evidence Plan Lineage/Review table (KORA-WP-020/021/024, not
-- built yet) — this migration does not fabricate those objects merely to
-- give an Advisor "something to draft." The canonical Action Matrix itself
-- (doc 73 §6: VIEW/COMMENT/PROPOSE/DRAFT/EDIT-DRAFT/REQUEST-CHANGE/
-- SUPPORT-REVIEW allowed, constitutive actions COMMIT/APPROVE/CONCLUDE
-- structurally denied) is implemented as a pure, DB-free TypeScript
-- authorization primitive (lib/advisor-portal/advisor-action-matrix.ts) —
-- no table is needed for a structural denial, and none is added here.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 0. advisor.company_has_active_advisor() — SECURITY DEFINER RLS-recursion
--       break ─────────────────────────────────────────────────────────────────
-- REAL-DB FINDING (this WP's own validation, disclosed in report 121): a
-- naive Company-side policy on advisor_identity that subqueries
-- advisor_assignment — combined with migration 057's own pre-existing
-- ADVISOR self-read policy on advisor_assignment, which subqueries
-- advisor_identity — creates a two-table RLS policy cycle. Postgres detects
-- this unconditionally at query-rewrite time ("infinite recursion detected
-- in policy for relation advisor_identity"), for EVERY role, not only
-- COMPANY_ADMIN — it would have broken the ADVISOR's own pre-existing
-- self-read path too. Standard, minimal fix: the cross-table lookup runs
-- inside a SECURITY DEFINER function (owned by the migration-applying
-- superuser, which bypasses RLS internally) instead of a raw RLS-to-RLS
-- subquery — this breaks the policy-expansion cycle without touching
-- migration 057's own policies at all. `SET search_path` pinned per
-- Postgres's own SECURITY DEFINER hardening guidance (no writable search
-- path is trusted).

CREATE OR REPLACE FUNCTION advisor.company_has_active_advisor(p_advisor_id uuid, p_company_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, advisor
AS $$
  SELECT EXISTS (
    SELECT 1 FROM advisor.advisor_assignment
    WHERE advisor_id = p_advisor_id AND company_id = p_company_id AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION advisor.company_has_active_advisor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION advisor.company_has_active_advisor(uuid, uuid) TO authenticated;

-- ── 1. advisor.advisor_identity — Company-side read policy ────────────────────
-- Company may read ONLY the identity of an Advisor with a currently ACTIVE
-- assignment to that Company — never every Advisor, never an ended
-- assignment's Advisor. Additive to migration 056's existing KORA_ADMIN/
-- ADVISOR-self policies (neither touched).

CREATE POLICY "advisor_identity_company_own_select" ON advisor.advisor_identity
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND advisor.company_has_active_advisor(id, kora.tenant_id())
  );

-- ── 2. advisor.advisor_assignment — Company-side read policy ──────────────────
-- Company may read ONLY its own active assignment row(s) — never another
-- Company's, never a different Company's ended history. Additive to
-- migration 057's existing KORA_ADMIN/ADVISOR-self policies (neither touched).

CREATE POLICY "advisor_assignment_company_own_select" ON advisor.advisor_assignment
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND company_id = kora.tenant_id()
    AND status = 'active'
  );

-- ── 3. analytics.tenant — corrected Advisor-facing read policy ────────────────
-- The pre-existing `advisor_tenant_uef_read` (migration 001) and the
-- ADVISOR clause inside `company_own_tenant_read` (migration 001) both
-- predate the Assignment primitive and rely on a single-tenant `kora.
-- tenant_id()` JWT claim an ADVISOR session never carries (one Advisor can
-- serve MANY Companies — doc 73 §3). Neither is removed or modified — this
-- adds a new, additive, correctly-scoped policy alongside them: an Advisor
-- may read the name of every Company they hold a currently ACTIVE
-- Assignment to, and nothing else.

CREATE POLICY "analytics_tenant_advisor_assignment_read" ON analytics.tenant
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND id IN (
      SELECT company_id FROM advisor.advisor_assignment
      WHERE status = 'active'
        AND advisor_id IN (
          SELECT id FROM advisor.advisor_identity WHERE auth_user_id = auth.uid()
        )
    )
  );

-- ── 4. advisor.advisor_contact_message ─────────────────────────────────────────
-- The minimum "non-calendar contact/message surface" (file 102, KORA-WP-033
-- UI field). One flat, append-only log per Assignment — no edit, no delete,
-- no threading beyond chronological order (doc 92/79's own audit-discipline
-- convention: "correction = new version, never an edit," applied here as
-- "a message is never edited, only a new one is sent").

CREATE TABLE IF NOT EXISTS advisor.advisor_contact_message (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  assignment_id  uuid          NOT NULL REFERENCES advisor.advisor_assignment (id) ON DELETE CASCADE,

  -- Who sent it — the two, and only two, canonical parties to an Assignment
  -- (doc 76 §3(3): the Company side and the Advisor side of one Assignment).
  sender_role    text          NOT NULL
                               CHECK (sender_role IN ('COMPANY_ADMIN', 'ADVISOR')),

  body           text          NOT NULL
                               CHECK (char_length(body) BETWEEN 1 AND 4000),

  created_at     timestamptz   NOT NULL DEFAULT now()
  -- No updated_at, no DELETE grant anywhere below — append-only by design,
  -- matching audit.audit_log / audit.governance_event's own convention.
);

COMMENT ON TABLE advisor.advisor_contact_message IS
  'The minimum non-calendar contact/message surface (file 102, KORA-WP-033 UI '
  'field) — a flat, append-only, Assignment-scoped message log. Never a chat '
  'platform, never booking (KORA-WP-035), never email relay. Messages are '
  'never edited or deleted; a correction is a new message.';

CREATE INDEX IF NOT EXISTS idx_advisor_contact_message_assignment ON advisor.advisor_contact_message (assignment_id, created_at);

-- ── 5. RLS on advisor_contact_message ──────────────────────────────────────────
-- KORA_ADMIN: full access. ADVISOR: read/send only on their OWN assignment
-- (advisor_id resolves to their own identity). COMPANY_ADMIN: read/send only
-- on their OWN Company's assignment. No cross-Assignment visibility for
-- either side. Same deliberate departure from a broad authenticated-write
-- grant as migrations 056/057: all writes happen exclusively through the
-- server-side service (see Step 20 of this WP's own authorization — every
-- mutating function checks the caller's role itself, since this WP builds
-- no admin-capability-guarded route the way WP-032 could rely on).

ALTER TABLE advisor.advisor_contact_message ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_contact_message FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_contact_message_kora_admin_all" ON advisor.advisor_contact_message
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_contact_message_advisor_own_select" ON advisor.advisor_contact_message
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND assignment_id IN (
      SELECT aa.id FROM advisor.advisor_assignment aa
      JOIN advisor.advisor_identity ai ON ai.id = aa.advisor_id
      WHERE ai.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "advisor_contact_message_company_own_select" ON advisor.advisor_contact_message
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND assignment_id IN (
      SELECT id FROM advisor.advisor_assignment WHERE company_id = kora.tenant_id()
    )
  );

-- ── 6. GRANTs ────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON advisor.advisor_contact_message TO service_role;
GRANT SELECT ON advisor.advisor_contact_message TO authenticated;

-- ── 7. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON advisor.advisor_contact_message FROM authenticated;
-- REVOKE SELECT, INSERT ON advisor.advisor_contact_message FROM service_role;
-- DROP POLICY IF EXISTS "advisor_contact_message_company_own_select" ON advisor.advisor_contact_message;
-- DROP POLICY IF EXISTS "advisor_contact_message_advisor_own_select" ON advisor.advisor_contact_message;
-- DROP POLICY IF EXISTS "advisor_contact_message_kora_admin_all" ON advisor.advisor_contact_message;
-- DROP INDEX IF EXISTS advisor.idx_advisor_contact_message_assignment;
-- DROP TABLE IF EXISTS advisor.advisor_contact_message;
-- DROP POLICY IF EXISTS "analytics_tenant_advisor_assignment_read" ON analytics.tenant;
-- DROP POLICY IF EXISTS "advisor_assignment_company_own_select" ON advisor.advisor_assignment;
-- DROP POLICY IF EXISTS "advisor_identity_company_own_select" ON advisor.advisor_identity;
-- REVOKE EXECUTE ON FUNCTION advisor.company_has_active_advisor(uuid, uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS advisor.company_has_active_advisor(uuid, uuid);
-- Rollback is safe at any time: this migration creates one new table, one
-- new SECURITY DEFINER helper function, and four new policies, touching no
-- existing column, row, or table shape — migrations 001/056/057 remain
-- exactly as they were.
