-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 060: Advisor Document/Note Five-Class Taxonomy
-- Migration:   060_advisor_content_taxonomy
-- Created:     2026-09-13
-- Block:       KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Implements doc 73 (DD2 Advisor Canonical Operating Model) §14 "Documents,
-- Notes, Communications (Q14)" — the exact five canonical classes, verbatim
-- meaning preserved (machine-safe tokens below, never renamed/merged/
-- reordered — see this migration's own CHECK constraint for the full quote
-- of each class's canonical description):
--
--   1. Organisation-shareable note — "visible to the Company... it concerns"
--   2. KORA-internal operational note — "the Advisor's own working notes,
--      never shown to the Company/Partner"
--   3. Audit/provenance record — "immutable, governance-significant events...
--      consistent with the existing audit-log pattern (ADMIN-017/
--      audit.audit_log)"
--   4. Confidential document/reference — "accessible to the Advisor for a
--      specific purpose... not automatically further-shareable; access is
--      purpose-bound and assignment-scoped"
--   5. Communication/call follow-up — "the record of what was discussed and
--      agreed, potentially straddling Classes 1 and 2 depending on what is
--      shared vs. kept internal"
--
-- "Class 1 is shareable; Classes 2–4 remain internal" — doc 73 §14, verbatim.
-- This is NOT a linear sensitivity ladder (Step 6 of this WP's own
-- authorization) — each class encodes a distinct PURPOSE, not a rank. No
-- numeric ordering, no generic OTHER/UNKNOWN value, no sixth class.
--
-- CLASS 5's OWN DUAL VISIBILITY — THE ONE CLASS THAT IS NOT FIXED
-- ───────────────────────────────────────────────────────────────
-- Doc 73 §14 says Class 5 "potentially straddl[es] Classes 1 and 2 depending
-- on what is shared vs. kept internal" — meaning a Communication/call
-- follow-up record's visibility is a property of the SPECIFIC record, not
-- fixed by its class alone. `shared` (boolean, required only for Class 5)
-- carries this: shared=true behaves like Class 1 (Company-visible),
-- shared=false behaves like Class 2 (never Company-visible). Defaults to
-- the SAFER value on ambiguity — but this migration requires an explicit
-- value at creation time (NOT NULL when class=5), never a silent default,
-- consistent with KORA's "minimum necessary access" governing rule (doc 73
-- §14's own phrase).
--
-- CLASS 3 — WHO SEES IT (a disclosed, narrow interpretation)
-- ────────────────────────────────────────────────────────────
-- Doc 73 §14 says Class 3 is "consistent with the existing audit-log pattern
-- (ADMIN-017/audit.audit_log)" — every existing audit surface in this
-- codebase (audit.audit_log, audit.governance_event) is KORA_ADMIN/service-
-- readable only, never Company- or even Advisor-facing through an ordinary
-- read path. This migration applies that same existing pattern literally:
-- Class 3 records are KORA_ADMIN-only (create AND read) — neither the
-- Company nor even the authoring Advisor's own self-read policy includes
-- Class 3. Created only by KORA_ADMIN (a governance-authored record, not an
-- Advisor's own note — doc 73's own worked example, "recorded Certification
-- audit result on [date]," is an administrative/governance act, not
-- Advisor-authored content).
--
-- CLASS 4 "PURPOSE-BOUND" — WHAT IS ACTUALLY ENFORCEABLE TODAY (disclosed)
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 73 §14 gives an illustrative example ("e.g. Partner certification
-- documentation") but no finite, frozen purpose vocabulary and no ABAC
-- mechanism. This migration persists `purpose` as a required, factual text
-- field (accountability: what the stated purpose was) — it does NOT build a
-- policy engine that mechanically verifies a given access matches the
-- stated purpose, since no such engine or vocabulary is frozen anywhere.
-- "Assignment-scoped" (the other half of doc 73's phrase) IS structurally
-- enforced, identically to every other class, via the same `assignment_id`
-- FK + RLS.
--
-- HISTORICAL ACCESS AFTER ASSIGNMENT ENDS — RESOLVED BY EXISTING PRECEDENT,
-- NOT INVENTED
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 73 §14 is silent on this specific question, but migration 058's own
-- `advisor_contact_message` policies (KORA-WP-033, real-DB validated twice
-- already) already resolved the identical question for Advisor-domain
-- content: NEITHER the Company nor the Advisor self-read policy filters by
-- `advisor_assignment.status = 'active'` — content remains visible
-- regardless of the Assignment's current status, consistent with doc 73
-- §14's own worked example of Assignment history itself ("leaves the full
-- history reconstructible"). This migration applies that exact,
-- already-established precedent unchanged, rather than inventing a new
-- retention rule.
--
-- NO DOMAIN OBJECT INVENTED, NO STORAGE PROVIDER (this WP's own Out of
-- Scope: "document storage-provider selection")
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 73 §14: "Any of the five classes may reference a Commitment, Evidence
-- Plan Lineage, Review, or Case." None of those objects exist in code truth
-- yet (KORA-WP-007/020/021/024 all ABSENT from the completed set) — no
-- speculative FK to a non-existent table is created. No file/blob column
-- (no URL, no bucket, no checksum, no MIME type, no file size) — this
-- migration persists the canonical text/reference primitive only, per this
-- WP's own explicit Out of Scope boundary.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS advisor.advisor_content_record (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  assignment_id    uuid          NOT NULL REFERENCES advisor.advisor_assignment (id) ON DELETE CASCADE,

  -- Doc 73 §14's five canonical classes, verbatim meaning, machine-safe
  -- tokens. Never renamed, merged, reordered, or given a sixth value.
  class            text          NOT NULL
                                 CHECK (class IN (
                                   'ORGANISATION_SHAREABLE_NOTE',  -- Class 1
                                   'ADVISOR_INTERNAL_NOTE',        -- Class 2
                                   'AUDIT_PROVENANCE_RECORD',      -- Class 3
                                   'CONFIDENTIAL_REFERENCE',       -- Class 4
                                   'COMMUNICATION_FOLLOWUP'        -- Class 5
                                 )),

  body             text          NOT NULL
                                 CHECK (char_length(body) BETWEEN 1 AND 4000),

  -- Class 5 only — see this migration's own header on Class 5's dual
  -- visibility. NULL for every other class (meaningless there, since their
  -- visibility is fixed by class alone).
  shared           boolean       NULL,

  -- Class 4 only — the stated purpose (accountability record, not an
  -- enforced ABAC check — see this migration's own header).
  purpose          text          NULL,

  created_by_role  text          NOT NULL
                                 CHECK (created_by_role IN ('ADVISOR', 'KORA_ADMIN')),

  created_at       timestamptz   NOT NULL DEFAULT now(),
  -- No updated_at, no UPDATE grant anywhere below — every class is
  -- append-only by design (doc 73 §14: "a shared Class-1 note, once sent,
  -- is not silently rewritten — corrections are new, dated entries").

  CONSTRAINT advisor_content_shared_only_for_class_5
    CHECK ((class = 'COMMUNICATION_FOLLOWUP') = (shared IS NOT NULL)),

  CONSTRAINT advisor_content_purpose_only_for_class_4
    CHECK ((class = 'CONFIDENTIAL_REFERENCE') = (purpose IS NOT NULL)),

  -- Class 3 is a governance-authored record (KORA_ADMIN); every other class
  -- is Advisor-authored support content — doc 73 §6's own "Company decides,
  -- Advisor supports" pattern, applied here as "Advisor drafts content,
  -- KORA governs the audit trail."
  CONSTRAINT advisor_content_creator_matches_class
    CHECK (
      (class = 'AUDIT_PROVENANCE_RECORD' AND created_by_role = 'KORA_ADMIN')
      OR (class <> 'AUDIT_PROVENANCE_RECORD' AND created_by_role = 'ADVISOR')
    )
);

COMMENT ON TABLE advisor.advisor_content_record IS
  'Advisor Document/Note Five-Class Taxonomy (doc 73 DD-2 §14). No file/blob '
  'storage — text/reference primitive only (storage-provider selection is '
  'this WP''s own explicit Out of Scope). Append-only: no UPDATE, no DELETE '
  'grant exists anywhere. See this migration''s own header for the exact '
  'canonical meaning of each class token and the disclosed interpretations '
  'for Class 3 visibility, Class 4 purpose enforcement, and historical '
  'access after Assignment end.';

CREATE INDEX IF NOT EXISTS idx_advisor_content_record_assignment ON advisor.advisor_content_record (assignment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_advisor_content_record_class      ON advisor.advisor_content_record (class);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Same proven-safe reference pattern as advisor_contact_message (migration
-- 058, real-DB validated twice, zero recursion): a raw subquery against
-- advisor_assignment/advisor_identity is safe here for the identical
-- structural reason — neither of those tables' policies reference
-- advisor_content_record back.
--
-- Class-aware, not a single blanket "assigned Advisor reads everything"
-- policy (Step 30's own explicit warning): Advisor read excludes Class 3
-- entirely (KORA_ADMIN-only, see header). Company read is restricted to
-- Class 1 and shared (shared=true) Class 5 only — never Classes 2/3/4, and
-- never an unshared Class 5.

ALTER TABLE advisor.advisor_content_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_content_record FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_content_record_kora_admin_all" ON advisor.advisor_content_record
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_content_record_advisor_own_select" ON advisor.advisor_content_record
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND class <> 'AUDIT_PROVENANCE_RECORD'
    AND assignment_id IN (
      SELECT aa.id FROM advisor.advisor_assignment aa
      JOIN advisor.advisor_identity ai ON ai.id = aa.advisor_id
      WHERE ai.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "advisor_content_record_company_own_select" ON advisor.advisor_content_record
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND (
      class = 'ORGANISATION_SHAREABLE_NOTE'
      OR (class = 'COMMUNICATION_FOLLOWUP' AND shared = true)
    )
    AND assignment_id IN (
      SELECT id FROM advisor.advisor_assignment WHERE company_id = kora.tenant_id()
    )
  );

-- ── GRANTs ───────────────────────────────────────────────────────────────────
-- Append-only for everyone, including service_role: no UPDATE, no DELETE
-- grant exists on this table at all — a "correction" is a new row, never an
-- edit (doc 73 §14, verbatim, see header).

GRANT SELECT, INSERT ON advisor.advisor_content_record TO service_role;
GRANT SELECT ON advisor.advisor_content_record TO authenticated;

-- ── Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON advisor.advisor_content_record FROM authenticated;
-- REVOKE SELECT, INSERT ON advisor.advisor_content_record FROM service_role;
-- DROP POLICY IF EXISTS "advisor_content_record_company_own_select" ON advisor.advisor_content_record;
-- DROP POLICY IF EXISTS "advisor_content_record_advisor_own_select" ON advisor.advisor_content_record;
-- DROP POLICY IF EXISTS "advisor_content_record_kora_admin_all" ON advisor.advisor_content_record;
-- DROP INDEX IF EXISTS advisor.idx_advisor_content_record_class;
-- DROP INDEX IF EXISTS advisor.idx_advisor_content_record_assignment;
-- DROP TABLE IF EXISTS advisor.advisor_content_record;
-- Rollback is safe at any time: this migration creates one new table,
-- touching no existing column, row, policy, table, or schema — migrations
-- 001–059 remain exactly as they were.
