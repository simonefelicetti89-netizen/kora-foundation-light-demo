-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 080: Review Advisor Assessment
-- Migration:   080_review_advisor_assessment
-- Created:     2026-09-18
-- Block:       KORA-WP-037 — Advisor Review Assessment Issuance
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Doc 76 §10 ("Advisor Review Assessment — 'Sufficiently Independent
-- Review'"), verbatim: "ADVISOR-009 requires sufficiently-independent
-- review, not merely general support — 73/74 covered recusal but did not
-- name the positive artifact. New, non-constitutive concept: Advisor
-- Review Assessment, attached to a specific Review/Evidence context...
-- May contain: evidence-quality observations, sufficiency observations,
-- inconsistencies/gaps, assumptions, a recommendation, confidence/
-- limitations, provenance, author, the author's qualification/eligibility
-- status at time of issuance, conflict/recusal status. Must not be: the
-- Company verdict; the Review's constitutive event... Eligibility to
-- issue an Assessment requires: the relevant active Role Qualification,
-- and no conflict/recusal on that instance."
--
-- WHY A NEW TABLE, NOT analytics.review_advisor_proposal (pre-
-- implementation finding, reported per this WP's own §6 instruction
-- rather than silently decided): review_advisor_proposal (migration 071,
-- KORA-WP-033 convergence) implements a DIFFERENT frozen concept — doc 73
-- §6's SUPPORT-REVIEW, "drafting the expected-vs-observed narrative,
-- proposing a verdict recommendation" — one current, continuously-
-- editable-until-concluded upsert per Review, with NO eligibility/
-- recusal-snapshot field at all. Doc 76 §10's Assessment is explicitly a
-- SIBLING, ADDITIONAL concept (introduced specifically to name "the
-- positive artifact" recusal coverage was missing) whose own defining,
-- unique content — "qualification/eligibility status AT TIME OF
-- ISSUANCE" and "conflict/recusal status" — has no equivalent anywhere in
-- review_advisor_proposal's own schema. The phrase "at time of issuance"
-- itself signals a SERIES of point-in-time issuance events, not one
-- continuously-revised current record — a genuinely different cardinality
-- model, confirming this is not the same object under a different name.
-- No existing canonical object was found that could own this without
-- exactly the "conflate two distinct capabilities" outcome migration
-- 071's own header already warned against for a different pair of
-- objects — a new, minimal, additive table is required.
--
-- APPEND-ONLY, NOT EDITABLE-THEN-IMMUTABLE (a deliberate, disclosed
-- design choice, distinct from review_advisor_proposal's own upsert
-- model): doc 76 §10 describes no draft phase for an Assessment — "Tests:
-- recusal negative-access test — a recused Advisor cannot issue an
-- Assessment" (registry 142, verbatim) frames issuance as a single,
-- binary, atomic act, not a draft-then-finalize flow. A correction is
-- always a NEW issuance (a new row), never an edit of a prior one — the
-- same append-only discipline already established for
-- audit.governance_event (051), gov.workload_event (063). MULTIPLE
-- assessments per Review are therefore expected and legitimate (no
-- UNIQUE(review_id) here, unlike review_advisor_proposal's own UNIQUE) —
-- e.g. a later assessment after new evidence, or after a reassignment.
--
-- ELIGIBILITY ENFORCEMENT — SERVICE LAYER, NOT DUPLICATED HERE (matching
-- this WP-family's own established split, see
-- lib/advisor-assignment/advisor-assignment-service.ts's own
-- evaluateAdvisorAssignmentValidity() — identity/qualification/
-- assignment-active/prerequisite/no-conflict, all five conditions in one
-- reused, unmodified function): the "relevant active Role Qualification,
-- and no conflict/recusal" gate is enforced in
-- lib/advisor-portal/advisor-decision-support-service.ts, before this
-- table is ever written to — never re-implemented in SQL, since it
-- requires a four-table join this schema's own established convention
-- keeps at the service layer throughout. This migration enforces what a
-- DB constraint genuinely can: referential/tenant integrity and the
-- Review-not-concluded window, both below.
--
-- SCOPE BOUNDARY (explicit, per this WP's own Out of Scope and this
-- task's own boundary sections): no Worker reference of any kind, no
-- PIB, no second Review-verdict vocabulary (this table carries no verdict
-- field at all — "a recommendation" per doc 76 §10 lives in the free-text
-- narrative, exactly like review_advisor_proposal's own narrative field,
-- never a structured verdict this table would then duplicate against
-- review_advisor_proposal's own proposed_verdict), no Certification/
-- Validation-side Evidence, no Commitment/Evidence-Plan/Resource-
-- Allocation mutation, no Prime/fee/billing reference, no change to
-- analytics.review, analytics.review_event, or conclude_review()'s own
-- authority.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.review_advisor_assessment ───────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.review_advisor_assessment (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  review_id                       uuid          NOT NULL REFERENCES analytics.review (id) ON DELETE CASCADE,

  -- Provenance of WHO was eligible to issue this and WHICH relationship
  -- authorized it — mirrors audit.governance_event's own actor idiom,
  -- plus the Assignment reference doc 76 §10's own eligibility rule
  -- requires ("the relevant active Role Qualification").
  assignment_id                   uuid          NOT NULL REFERENCES advisor.advisor_assignment (id) ON DELETE CASCADE,
  actor_role                      text          NOT NULL DEFAULT 'ADVISOR' CHECK (actor_role = 'ADVISOR'),
  actor_id                        text          NOT NULL,

  -- doc 76 §10's own content list ("evidence-quality observations,
  -- sufficiency observations, inconsistencies/gaps, assumptions, a
  -- recommendation, confidence/limitations") — one bounded narrative
  -- field, the same shape review_advisor_proposal's own
  -- proposal_narrative already uses for an analogous prose-content list.
  assessment_narrative            text          NOT NULL CHECK (char_length(assessment_narrative) BETWEEN 1 AND 4000),

  -- doc 76 §10's own two uniquely-named fields, verbatim: "the author's
  -- qualification/eligibility status at time of issuance, conflict/
  -- recusal status" — a permanent snapshot, since the live
  -- advisor_role_qualification/advisor_assignment rows may change later
  -- and must never retroactively rewrite this historical fact.
  qualification_status_at_issuance text         NOT NULL
                                    CHECK (qualification_status_at_issuance IN (
                                      'CANDIDATE', 'QUALIFICATION IN PROGRESS', 'QUALIFIED',
                                      'RENEWAL DUE', 'EXPIRED', 'SUSPENDED', 'REVOKED'
                                    )),
  conflict_flag_at_issuance        boolean       NOT NULL,

  issued_at                       timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — append-only by design (see header). No correction/
  -- superseding column: a correction is simply a new row.
);

CREATE INDEX IF NOT EXISTS idx_review_advisor_assessment_tenant     ON analytics.review_advisor_assessment (tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_advisor_assessment_review     ON analytics.review_advisor_assessment (review_id);
CREATE INDEX IF NOT EXISTS idx_review_advisor_assessment_assignment ON analytics.review_advisor_assessment (assignment_id);

-- ── 2. Tenant-match + Review-not-concluded invariant (INSERT only — this ────
-- table is append-only, so no UPDATE path exists to also guard; see §3).

CREATE OR REPLACE FUNCTION analytics.enforce_review_advisor_assessment_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant uuid;
  v_status text;
BEGIN
  SELECT tenant_id, status INTO v_tenant, v_status
    FROM analytics.review WHERE id = NEW.review_id;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'kora/not-found: referenced review not found';
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: review_advisor_assessment.tenant_id must match its review';
  END IF;

  IF v_status = 'concluded' THEN
    RAISE EXCEPTION 'kora/review-concluded: an Advisor Review Assessment cannot be issued once the Review is concluded — it becomes permanent Company historical material at that point (doc 68 §1.5)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_advisor_assessment_invariants
  BEFORE INSERT ON analytics.review_advisor_assessment
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_review_advisor_assessment_invariants();

-- ── 3. Append-only enforcement — unconditional, every role, no exception ────
-- Same discipline as audit.governance_event (051) / gov.workload_event
-- (063): a correction is always a NEW issuance, never a mutation.

CREATE OR REPLACE FUNCTION analytics.reject_review_advisor_assessment_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.review_advisor_assessment rows are never updated or deleted — a correction is always a new Assessment issuance, never a mutation of an existing one.';
END;
$$;

CREATE TRIGGER trg_review_advisor_assessment_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.review_advisor_assessment
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_review_advisor_assessment_mutation();

-- ── 4. RLS — Pattern A, same shape as review_advisor_proposal ───────────────
-- KORA_ADMIN full, COMPANY_ADMIN read-only own-tenant, permanent (not
-- Assignment-status-dependent) — Company historical ownership survives
-- Assignment end structurally, the same guarantee review_advisor_proposal
-- already provides. No Advisor-specific RLS role/claim exists anywhere in
-- this schema (established discipline throughout this WP family) —
-- Advisor access is entirely service-layer-mediated via service_role.

ALTER TABLE analytics.review_advisor_assessment ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.review_advisor_assessment FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_review_advisor_assessment" ON analytics.review_advisor_assessment
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_review_advisor_assessment_read" ON analytics.review_advisor_assessment
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 5. GRANTs — SELECT + INSERT only, no UPDATE/DELETE for any role ─────────
-- The trigger in §3 would reject UPDATE/DELETE anyway; omitting the grant
-- makes the intent explicit one layer earlier (migration 063's own
-- precedent).

GRANT SELECT, INSERT ON analytics.review_advisor_assessment TO service_role;
GRANT SELECT ON analytics.review_advisor_assessment TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the statements below
-- REVOKE SELECT ON analytics.review_advisor_assessment FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.review_advisor_assessment FROM service_role;
-- DROP POLICY IF EXISTS "company_own_review_advisor_assessment_read" ON analytics.review_advisor_assessment;
-- DROP POLICY IF EXISTS "kora_admin_all_review_advisor_assessment" ON analytics.review_advisor_assessment;
-- DROP TRIGGER IF EXISTS trg_review_advisor_assessment_no_mutation ON analytics.review_advisor_assessment;
-- DROP FUNCTION IF EXISTS analytics.reject_review_advisor_assessment_mutation();
-- DROP TRIGGER IF EXISTS trg_review_advisor_assessment_invariants ON analytics.review_advisor_assessment;
-- DROP FUNCTION IF EXISTS analytics.enforce_review_advisor_assessment_invariants();
-- DROP INDEX IF EXISTS analytics.idx_review_advisor_assessment_assignment;
-- DROP INDEX IF EXISTS analytics.idx_review_advisor_assessment_review;
-- DROP INDEX IF EXISTS analytics.idx_review_advisor_assessment_tenant;
-- DROP TABLE IF EXISTS analytics.review_advisor_assessment;
-- Rollback is safe at any time — this table has no downstream dependents
-- (no view, no function outside this file references it).
