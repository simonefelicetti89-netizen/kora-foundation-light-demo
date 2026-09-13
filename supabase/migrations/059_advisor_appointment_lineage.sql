-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 059: Advisor Calendar & Call/Appointment Lineage
-- Migration:   059_advisor_appointment_lineage
-- Created:     2026-09-13
-- Block:       KORA-WP-035 — Advisor Calendar & Call/Appointment Lineage
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Implements doc 76 (DD-2.1) §11 "Call/Appointment Lineage" and §12 "Shared
-- vs. Internal Call Context", on top of the already-built Assignment
-- foundation (migration 057) and Company Advisor surface (migration 058).
-- Booking ownership is explicit and exclusive to this package (doc 98 §5,
-- Errata 3) — confirmed distinct from the pre-existing, unrelated
-- `commons.booking` / `services/commons/BookingService.ts` (migration 025,
-- Worker-booking-a-cross-company-KORA-Space-initiative — a different actor,
-- a different target, a different schema, gated by KORA-WP-050's own
-- "Booking selected" Scope Trigger, not activated and not touched here).
--
-- LINEAGE MECHANISM — DOC 76'S OWN FOUR INVARIANTS, MECHANISM-AGNOSTIC
-- ─────────────────────────────────────────────────────────────────────
-- Doc 76 §11, verbatim: "the original scheduled occurrence remains
-- historically reconstructible; cancellation/no-show/completion are never
-- silently overwritten; rescheduling preserves the relationship to the
-- prior booking; booking context stays bounded to the relevant
-- organisation. Whether this is implemented as a versioned appointment,
-- linked appointment instances, or another equivalent design is explicitly
-- Master Plan scope, not settled here." This migration chooses **linked
-- appointment instances**: rescheduling never UPDATEs `starts_at`/`ends_at`
-- in place — it INSERTs a new row with `rescheduled_from_id` pointing
-- backward to the row it replaces, and marks the old row `status =
-- 'rescheduled'` (terminal, never further mutated). The original row is
-- never deleted, never silently overwritten — a chain is reconstructible by
-- following `rescheduled_from_id` backward or querying forward by it.
--
-- STATUS VOCABULARY — DOC 73 §13, VERBATIM
-- ───────────────────────────────────────────
-- "requested → confirmed → completed | rescheduled | cancelled | no-show."
-- All six values are present in the CHECK constraint from day one (same
-- "stable reference shape for future consumers" discipline already used for
-- migration 055's Need Hypothesis vocabulary) — but this WP's own service
-- layer wires only the transitions its Acceptance actually requires: create
-- (→ requested), confirm (→ confirmed), reschedule (→ rescheduled on the
-- old row + a new requested row), cancel (→ cancelled). `completed`/
-- `no-show` marking is NOT wired by any service function in this WP
-- (disclosed narrowing, report 122 §13) — the vocabulary is frozen and
-- present; the post-call marking workflow is not part of this Acceptance
-- and is not fabricated here.
--
-- SHARED VS. INTERNAL CALL CONTEXT (doc 76 §12) — ONLY THE SHARED HALF BUILT
-- ─────────────────────────────────────────────────────────────────────────
-- Doc 76 §12: "Shared agenda/purpose (visible to both Advisor and
-- organisation)" vs. "Internal work context (potential links to an internal
-- Case, internal note, governance escalation... never automatically visible
-- to the Company/Partner)... visibility follows the five-class document/
-- note taxonomy (73 §14)". The five-class taxonomy is KORA-WP-036, ABSENT
-- in code truth. This migration therefore persists ONLY the Shared
-- half — `subject` (Company-visible, plain text) — and creates NO internal-
-- context column, link, or field of any kind. This is not an oversight: an
-- internal-context field with no taxonomy-governed visibility mechanism
-- would itself be the privacy leak WP-035's own Acceptance forbids ("no
-- internal Case detail leaks to the Company-visible agenda") — the safest
-- and only correct choice today is to persist nothing that would need that
-- mechanism. Doc 73 §13's optional "linked context (which Commitment/
-- Program/Review/Case the call concerns)" is likewise omitted in full: none
-- of those objects exist in code truth yet (KORA-WP-020/021/024/007 all
-- ABSENT) — no speculative FK to a non-existent table is created.
--
-- BOOKING DIRECTION (doc 73 §13 + WP-035's own Acceptance, verbatim: "the
-- Company can book the assigned Advisor")
-- ─────────────────────────────────────────────────────────────────────────
-- Creation is Company-initiated only ("A Call is created by a Company/
-- Partner-initiated booking" — Partner side out of scope, Partner delivery
-- not triggered). Confirmation is Advisor-only (the Advisor accepts the
-- proposed time). Reschedule/cancel: doc 73 §13 names these as "state
-- transitions on the same Call record" without restricting the initiating
-- party — both the Company and the Advisor, as the two established parties
-- to the Assignment (KORA-WP-033's own symmetric contact-message design,
-- report 121 §18), may reschedule or cancel an appointment they are a party
-- to. Reason required on both — mirrors migration 057's own
-- reason-required-when-ended discipline exactly.
--
-- VALID ASSIGNMENT REQUIRED TO BOOK (Steps 5/6/27 of this WP's own
-- authorization) — same principle already established for KORA-WP-033's
-- contact messages (report 121 §11): an Assignment existing is not
-- sufficient to grant operational authority. Booking requires the full
-- KORA-WP-031 validity predicate to hold, enforced in the service layer
-- (lib/advisor-portal/advisor-appointment-service.ts), not merely
-- `status = 'active'` at the DB layer.
--
-- NO DOUBLE-BOOKING PREVENTION (Step 16, explicitly disclosed boundary) —
-- neither doc 73 §13 nor doc 76 §11 requires overlap prevention, and
-- WP-035's own registry classifies this package Size M / Uncertainty LOW —
-- not the shape of a scheduling-conflict engine. Not built here; a future
-- WP may add it if a real pilot need surfaces one.
--
-- NO VIDEO-CALL PROVIDER, NO EXTERNAL CALENDAR SYNC (WP-035's own Out of
-- Scope: "video-call provider integration (deferred)") — no meeting-URL
-- column, no OAuth, no external availability lookup, no ICS sync.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS advisor.advisor_appointment (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  assignment_id         uuid          NOT NULL REFERENCES advisor.advisor_assignment (id) ON DELETE CASCADE,

  starts_at             timestamptz   NOT NULL,
  ends_at               timestamptz   NOT NULL,

  -- Shared agenda/purpose only (doc 76 §12) — no internal-context field
  -- exists anywhere on this table. See this migration's own header.
  subject               text          NOT NULL
                                      CHECK (char_length(subject) BETWEEN 1 AND 200),

  -- doc 73 §13's six-value vocabulary, verbatim. Not every value has a
  -- wired service transition in this WP — see header.
  status                text          NOT NULL DEFAULT 'requested'
                                      CHECK (status IN ('requested', 'confirmed', 'completed', 'rescheduled', 'cancelled', 'no-show')),

  -- Set only at INSERT time, by the reschedule operation — never updated
  -- afterward, which structurally prevents a lineage cycle (a chain can
  -- only grow forward through new rows, never be rewritten backward).
  rescheduled_from_id   uuid          NULL REFERENCES advisor.advisor_appointment (id) ON DELETE SET NULL,

  -- Required when the transition is cancel or reschedule (both are
  -- meaningful state changes with history implications) — mirrors
  -- migration 057's advisor_assignment.reason discipline exactly.
  reason                text          NULL,

  created_by_role       text          NOT NULL
                                      CHECK (created_by_role IN ('COMPANY_ADMIN', 'ADVISOR')),

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT advisor_appointment_no_impossible_range
    CHECK (ends_at > starts_at),

  CONSTRAINT advisor_appointment_reason_required_when_terminal_transition
    CHECK (status NOT IN ('cancelled', 'rescheduled') OR reason IS NOT NULL),

  CONSTRAINT advisor_appointment_no_self_lineage
    CHECK (rescheduled_from_id IS NULL OR rescheduled_from_id <> id)
);

COMMENT ON TABLE advisor.advisor_appointment IS
  'Call/Appointment Lineage (doc 76 DD-2.1 §11) — "linked appointment '
  'instances" design. Rescheduling never mutates starts_at/ends_at in '
  'place: it inserts a new row referencing the old one via '
  'rescheduled_from_id and marks the old row status=''rescheduled'' '
  '(terminal). History is never deleted. No internal-context field exists '
  '(doc 76 §12 — the five-class taxonomy that would govern its visibility, '
  'KORA-WP-036, does not exist yet).';

-- One direct replacement per appointment (Step 8) — a partial unique index
-- so multiple NULLs (appointments that were never rescheduled) are allowed,
-- but a given appointment can be the "from" of at most one replacement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_advisor_appointment_one_reschedule_target
  ON advisor.advisor_appointment (rescheduled_from_id)
  WHERE rescheduled_from_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advisor_appointment_assignment ON advisor.advisor_appointment (assignment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_advisor_appointment_status ON advisor.advisor_appointment (status);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Same proven-safe pattern as advisor_contact_message (migration 058, real-
-- DB validated on both local and staging with zero recursion): a raw
-- subquery against advisor_assignment/advisor_identity is safe here because
-- neither of those tables' own policies reference advisor_appointment back
-- — the reference graph terminates, it never cycles.

ALTER TABLE advisor.advisor_appointment ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor.advisor_appointment FORCE ROW LEVEL SECURITY;

CREATE POLICY "advisor_appointment_kora_admin_all" ON advisor.advisor_appointment
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_appointment_advisor_own_select" ON advisor.advisor_appointment
  FOR SELECT USING (
    kora.kora_role() = 'ADVISOR'
    AND assignment_id IN (
      SELECT aa.id FROM advisor.advisor_assignment aa
      JOIN advisor.advisor_identity ai ON ai.id = aa.advisor_id
      WHERE ai.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "advisor_appointment_company_own_select" ON advisor.advisor_appointment
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND assignment_id IN (
      SELECT id FROM advisor.advisor_assignment WHERE company_id = kora.tenant_id()
    )
  );

-- ── GRANTs ───────────────────────────────────────────────────────────────────
-- Same deliberate departure from a broad authenticated-write grant as every
-- other Advisor-domain table: all writes happen exclusively through the
-- server-side service. No DELETE for anyone — history is never physically
-- removed.

GRANT SELECT, INSERT, UPDATE ON advisor.advisor_appointment TO service_role;
GRANT SELECT ON advisor.advisor_appointment TO authenticated;

-- ── updated_at trigger ─────────────────────────────────────────────────────
-- Reuses the existing global set_updated_at() function (migration 001).

DROP TRIGGER IF EXISTS trg_advisor_appointment_updated_at ON advisor.advisor_appointment;
CREATE TRIGGER trg_advisor_appointment_updated_at
  BEFORE UPDATE ON advisor.advisor_appointment
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- DROP TRIGGER IF EXISTS trg_advisor_appointment_updated_at ON advisor.advisor_appointment;
-- REVOKE SELECT ON advisor.advisor_appointment FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON advisor.advisor_appointment FROM service_role;
-- DROP POLICY IF EXISTS "advisor_appointment_company_own_select" ON advisor.advisor_appointment;
-- DROP POLICY IF EXISTS "advisor_appointment_advisor_own_select" ON advisor.advisor_appointment;
-- DROP POLICY IF EXISTS "advisor_appointment_kora_admin_all" ON advisor.advisor_appointment;
-- DROP INDEX IF EXISTS advisor.idx_advisor_appointment_status;
-- DROP INDEX IF EXISTS advisor.idx_advisor_appointment_assignment;
-- DROP INDEX IF EXISTS advisor.uq_advisor_appointment_one_reschedule_target;
-- DROP TABLE IF EXISTS advisor.advisor_appointment;
-- Rollback is safe at any time: this migration creates one new table,
-- touching no existing column, row, policy, table, or schema — migrations
-- 001–058 remain exactly as they were.
