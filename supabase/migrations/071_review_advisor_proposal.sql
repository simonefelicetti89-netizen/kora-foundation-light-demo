-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 071: Review Advisor Proposal
-- Migration:   071_review_advisor_proposal
-- Created:     2026-09-15
-- Block:       KORA-WP-033 CONVERGENCE — Final Review-Proposal Remediation
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Closes the one design gap the prior WP-033 convergence remediation
-- (commit e3f98a2, this repository's own history) deliberately left
-- unresolved rather than invent unreviewed schema: doc 73 §6's
-- SUPPORT-REVIEW capability — "drafting the expected-vs-observed
-- narrative, proposing a verdict recommendation."
--
-- FOUNDER DESIGN DECISION (this task, resolving the prior open question):
-- REVIEW -> ADVISOR REVIEW PROPOSAL -> FINAL REVIEW EVENT are three
-- distinct concepts. The proposal is consultative, persistent,
-- Company-contextual, Advisor-authored, non-constitutive. The final
-- Review Event (analytics.review_event, migration 070) remains
-- Company/Decision-Owner-controlled, constitutive, the canonical
-- conclusion — completely untouched by this migration.
--
-- WHY A NEW TABLE, NOT AN EXISTING OBJECT (pre-implementation finding,
-- reported per this task's own §18 instruction rather than silently
-- decided): analytics.review (migration 070) is Review's own thin STATE
-- object — mixing Advisor-authored consultative content onto it would
-- conflate Review state with Advisor narrative, exactly what this task's
-- own §5 forbids. analytics.review_event (migration 070) is the FINAL,
-- Decision-Owner-authored, append-only, exactly-one-per-Review event —
-- reusing it for a non-final, Advisor-authored, editable proposal would
-- either violate its own append-only/immutable-from-creation discipline
-- or silently blur "what was proposed" with "what was decided," the
-- single invariant this whole remediation exists to protect. No existing
-- canonical object in the repository was found that could own this
-- without exactly that distortion — a new, minimal, additive table is
-- required, confirmed rather than assumed.
--
-- ONE CURRENT PROPOSAL PER REVIEW: UNIQUE(review_id) below. No revision
-- history, no comment thread, no multi-proposal comparison, no generic
-- approval workflow — explicit Founder scope boundary, not an oversight.
-- Create and update are the same upsert operation at the service layer.
--
-- EDITABLE WINDOW: only while the linked Review is not yet 'concluded' —
-- enforced by the trigger below (DB-level, defense in depth) in addition
-- to the service layer's own pre-write check. Once concluded, the row
-- becomes permanent Company historical material: no UPDATE can succeed
-- against it (the trigger blocks it unconditionally at that point), and
-- there is no DELETE grant on this table at all, structurally — the same
-- "no GRANT = no path" discipline migration 065 already established for
-- analytics.commitment's own "no cancellation state invented."
--
-- PROVENANCE: reuses the exact actor_role/actor_id idiom every sibling
-- table in this schema already uses (commitment, evidence_plan, review) —
-- never a new mechanism. actor_role is CHECK-pinned to the single legal
-- value 'ADVISOR' — this object structurally cannot be authored by
-- anyone else, including COMPANY_ADMIN. Company may read (RLS SELECT
-- policy below) but can never write here — falsifying Advisor provenance
-- via Company edit is the one thing this migration exists to prevent.
--
-- SCOPE BOUNDARY: no Worker reference of any kind, no PIB, no second
-- verdict vocabulary (proposed_verdict reuses analytics.review_event's
-- own CHECK list verbatim), no accept/reject/approval lifecycle, no
-- revision history, no free-form consulting-notes field unrelated to the
-- Review, no Commitment-lifecycle mutation, no change to
-- analytics.review or analytics.review_event, no change to
-- conclude_review()'s own authority or privilege grants.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.review_advisor_proposal ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.review_advisor_proposal (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- "One current Advisor proposal per Review" — UNIQUE, not a foreign key
  -- with duplicates allowed. No review may ever carry two proposal rows.
  review_id           uuid          NOT NULL UNIQUE REFERENCES analytics.review (id) ON DELETE CASCADE,

  -- doc 73 §6 SUPPORT-REVIEW, verbatim: "drafting the expected-vs-observed
  -- narrative, proposing a verdict recommendation." Both nullable —
  -- progressively filled, same "Unknown/not yet entered" discipline
  -- already established for Commitment/Evidence Plan (migrations
  -- 065/066) — an Advisor may begin the narrative before settling on a
  -- verdict recommendation.
  proposal_narrative  text,
  proposed_verdict    text          CHECK (proposed_verdict IS NULL OR proposed_verdict IN ('KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE')),

  -- Truthful provenance — the exact idiom commitment/evidence_plan/review
  -- already use. Structurally pinned: this object has exactly one legal
  -- author role, unlike its siblings (which accept COMPANY_ADMIN or
  -- ADVISOR) — Company never writes this object at all.
  actor_role          text          NOT NULL DEFAULT 'ADVISOR' CHECK (actor_role = 'ADVISOR'),
  actor_id            text          NOT NULL,

  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_advisor_proposal_tenant ON analytics.review_advisor_proposal (tenant_id);
-- review_id already has an implicit unique index via the UNIQUE constraint above.

-- Tenant-match + editable-window invariant — both checked together, same
-- combined-trigger shape as analytics.review_event's own
-- enforce_review_event_invariants(), extended here with the
-- concluded-Review immutability rule this table specifically needs.

CREATE OR REPLACE FUNCTION analytics.enforce_review_advisor_proposal_invariants()
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
    RAISE EXCEPTION 'kora/tenant-mismatch: review_advisor_proposal.tenant_id must match its review';
  END IF;

  IF v_status = 'concluded' THEN
    RAISE EXCEPTION 'kora/review-concluded: an Advisor Review Proposal cannot be created or edited once the Review is concluded — it becomes permanent Company historical material (a correction is always a new Review cycle, doc 68 §1.5)';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_advisor_proposal_invariants
  BEFORE INSERT OR UPDATE ON analytics.review_advisor_proposal
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_review_advisor_proposal_invariants();

-- ── 2. RLS — Pattern A ───────────────────────────────────────────────────────
-- Same shape as analytics.review/review_event: KORA_ADMIN full,
-- COMPANY_ADMIN read-only own-tenant. No Advisor-specific RLS role/claim
-- exists anywhere in this schema (the established discipline throughout
-- this WP family: Advisor access is entirely service-layer-mediated,
-- through the trusted service_role connection plus an independent
-- Assignment-validity check performed in application code — never a raw
-- Postgres role/policy for "ADVISOR"). Company read access is
-- permanent — it does NOT depend on any Advisor Assignment's own status,
-- satisfying this task's own historical-ownership requirement structurally,
-- not merely by service-layer convention.

ALTER TABLE analytics.review_advisor_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.review_advisor_proposal FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_review_advisor_proposal" ON analytics.review_advisor_proposal
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_review_advisor_proposal_read" ON analytics.review_advisor_proposal
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 3. GRANTs ────────────────────────────────────────────────────────────────
-- SELECT+INSERT+UPDATE only — no DELETE grant exists, anywhere, for any
-- role, structurally preventing deletion (the "Do NOT delete the proposal
-- when Assignment ends" requirement enforced at the DB layer, not merely
-- by service-layer restraint). No new function/RPC is introduced by this
-- migration — every write goes through the plain
-- .schema('analytics').from('review_advisor_proposal') path, service-role
-- mediated, so there is no EXECUTE privilege to audit here (the migration
-- 068 PUBLIC-EXECUTE lesson applies only where a function/RPC exists).

GRANT SELECT, INSERT, UPDATE ON analytics.review_advisor_proposal TO service_role;
GRANT SELECT ON analytics.review_advisor_proposal TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the statements below
-- REVOKE SELECT ON analytics.review_advisor_proposal FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.review_advisor_proposal FROM service_role;
-- DROP POLICY IF EXISTS "company_own_review_advisor_proposal_read" ON analytics.review_advisor_proposal;
-- DROP POLICY IF EXISTS "kora_admin_all_review_advisor_proposal" ON analytics.review_advisor_proposal;
-- DROP TRIGGER IF EXISTS trg_review_advisor_proposal_invariants ON analytics.review_advisor_proposal;
-- DROP FUNCTION IF EXISTS analytics.enforce_review_advisor_proposal_invariants();
-- DROP TABLE IF EXISTS analytics.review_advisor_proposal;
-- Rollback is safe at any time — this table has no downstream dependents
-- (no view, no function outside this file references it).
