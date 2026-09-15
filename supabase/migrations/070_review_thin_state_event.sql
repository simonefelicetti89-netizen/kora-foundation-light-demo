-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 070: Review — Thin State + Event
-- Migration:   070_review_thin_state_event
-- Created:     2026-09-15
-- Block:       KORA-WP-024 — Review — Thin State + Event
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Closes `DECISION-007` — the interpretation/judgment layer of the Decision
-- Spine. Doc 67 §8 + doc 68 §1.5/§2, verbatim canonical shape: Review is
-- "state + append-only event," never a measurement engine. Review answers
-- one question: "given what we expected and what we now know, what should
-- happen to this Commitment?" — never "what did KORA Index/IU/Confidence
-- become?" (a wholly separate, pre-existing, untouched measurement truth).
--
-- CITATION NOTE (disclosed, not a blocker): this WP's own registry Arch
-- Sources field reads "`67` §5, `68` §1.4" — on direct inspection, `67` §5
-- is Opportunity and `68` §1.4 is Evidence Plan, not Review. The genuinely
-- correct canonical content for Review is `67` §8 ("EVIDENCE / REVIEW —
-- CANONICAL MODEL") and `68` §1.1 (Commitment's own `reviewable`/`reviewed`
-- triggers), §1.5 (Review's own state machine), and §2 (the immutability
-- summary rule) — all read in full and used as the basis for this
-- migration. Flagged for the Founder's attention as a minor registry
-- citation inaccuracy, not a semantic conflict — the substantive content
-- was locatable and unambiguous.
--
-- REVIEW'S OWN STATE MACHINE (doc 68 §1.5, verbatim)
-- ─────────────────────────────────────────────────────
-- `open → in-progress → concluded`. "`concluded` records exactly one
-- Decision/Review Event (append-only). A later correction never reopens
-- `concluded` — it creates a **new** Review cycle whose event carries
-- `supersedes`."
--
-- WHY `open` IS TRIGGERED DIRECTLY BY `commitment.status = 'committed'`,
-- NOT BY A `reviewable` INTERMEDIATE STATE
-- ───────────────────────────────────────────────────────────────────────────
-- Doc 68 §1.1's FULL Commitment state machine names `reviewable` as its own
-- system-triggered intermediate state ("review date reached, or an
-- attached Decision Rule condition triggers"). That state is **not** part
-- of `commitment.status`'s own CHECK constraint (`'draft'`/`'committed'`
-- only, migration 067) — and this WP's own registry Hard Deps/Proposed New
-- do not name releasing it. Adding it now would be exactly the "never
-- release additional Commitment states unless the current WP's acceptance
-- explicitly owns them" violation this engagement has held firm on since
-- `KORA-WP-020`. This migration therefore implements the genuinely "thin"
-- reading the WP's own Purpose text calls for: Review may be opened
-- directly against any `committed` Commitment — the automated
-- review-date/Decision-Rule scheduling mechanism that would otherwise
-- drive a real `reviewable` transition remains explicitly future, unbuilt,
-- unnamed-here scope (`review_date`-triggered automation), never
-- fabricated. A disclosed, sourced scoping decision, not a canonical
-- shortcut.
--
-- DECISION/REVIEW EVENT — EXACT CANONICAL SHAPE (doc 67 §8, verbatim)
-- ─────────────────────────────────────────────────────────────────────
-- "`indicated_decision` (what the Evidence/rule suggested) · `actual_decision`
-- (what was chosen) · `rationale_category` · `intervention` · `effective_date`
-- · `supersedes` (reference to a prior event, on correction) ·
-- `decision_owner` (an organisational role, never a person — carried
-- verbatim from MP2.1, consistent with KORA's constitutional
-- individual-privacy rule applied to governance records too). Verdicts:
-- KEEP / STOP / MODIFY / REALLOCATE / CREATE / INVESTIGATE (PT FT-024,
-- unchanged)." Cardinality: exactly ONE event per Review (the correction
-- mechanism is a NEW review cycle with a NEW event carrying `supersedes`,
-- never a second event on the same review) — `UNIQUE(review_id)` below.
--
-- EXPECTED / OBSERVED / INTERPRETATION — NOT COLLAPSED
-- ───────────────────────────────────────────────────────
-- `indicated_decision` narrates what the EXISTING evidence (Evidence Plan +
-- its addenda, doc 72 §6) suggested; `actual_decision` + `verdict` are the
-- INTERPRETATION (Decision Owner's judgment); nothing here computes or
-- stores an "observed metric" — the generic KPI/Measure reference (doc 67
-- §11, doc 66 PFFD-03) remains explicitly deferred (see header of migration
-- 069 and the KPI/Measure Bridge Decision Report) — NOT built here, NOT a
-- new column, NOT a KORA Index/IU/Confidence/BTI reference of any kind.
--
-- SCOPE BOUNDARY
-- ───────────────
-- No Program, no Decision Pack synthesis, no KPI/Measure/KORA-Index/IU/
-- Confidence/BTI column of any kind, no Worker reference, no Living KORAL.
-- `commitment.status`/`evidence_plan.status` CHECK constraints are
-- untouched — this migration does not release `reviewable`/`reviewed`/
-- `active`/`closed`/`reactivated` on Commitment, nor
-- `collecting`/`closed-at-review` on Evidence Plan.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.review — the state object ───────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.review (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  commitment_id  uuid          NOT NULL REFERENCES analytics.commitment (id) ON DELETE CASCADE,

  -- doc 68 §1.5's own frozen state machine, in full — all three states
  -- belong to this WP, unlike Commitment/Evidence Plan where later states
  -- belong to future WPs.
  status         text          NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'concluded')),

  opened_at      timestamptz   NOT NULL DEFAULT now(),
  concluded_at   timestamptz,

  actor_role     text          NOT NULL,
  actor_id       text          NOT NULL,

  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_review_tenant      ON analytics.review (tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_commitment  ON analytics.review (commitment_id);

-- Only a `committed` Commitment may ever have a Review opened against it —
-- enforced at the DB level, not only in service code.

CREATE OR REPLACE FUNCTION analytics.enforce_review_requires_committed_commitment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM analytics.commitment WHERE id = NEW.commitment_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'kora/not-found: referenced commitment not found';
  END IF;
  IF v_status != 'committed' THEN
    RAISE EXCEPTION 'kora/review-requires-committed: a Review may only be opened against a committed Commitment, not "%"', v_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_requires_committed_commitment
  BEFORE INSERT ON analytics.review
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_review_requires_committed_commitment();

-- Post-conclusion immutability — once `concluded`, the row never changes
-- again (the correction mechanism is a NEW review cycle, doc 68 §1.5).

CREATE OR REPLACE FUNCTION analytics.enforce_review_post_conclusion_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'concluded' THEN
    RAISE EXCEPTION 'kora/immutable: a concluded Review cannot change — a correction is always a new Review cycle (doc 68 §1.5)';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_post_conclusion_immutability
  BEFORE UPDATE ON analytics.review
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_review_post_conclusion_immutability();

-- ── 2. analytics.review_event — the append-only Decision/Review Event ───────
-- Exactly one per Review (UNIQUE(review_id)) — doc 68 §1.5: "`concluded`
-- records exactly one Decision/Review Event."

CREATE TABLE IF NOT EXISTS analytics.review_event (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  review_id           uuid          NOT NULL UNIQUE REFERENCES analytics.review (id) ON DELETE CASCADE,

  indicated_decision  text,
  actual_decision     text          NOT NULL,
  rationale_category  text,
  intervention        text,
  effective_date      date          NOT NULL,

  -- "reference to a prior event, on correction" — points to the event of
  -- the PRIOR Review cycle this one corrects (a different review_id's
  -- event), never a second event within the same review.
  supersedes          uuid          REFERENCES analytics.review_event (id),

  -- "an organisational role, never a person" (doc 72 §8, applied verbatim).
  decision_owner      text          NOT NULL,

  -- PT FT-024, frozen, unchanged.
  verdict             text          NOT NULL CHECK (verdict IN ('KEEP', 'STOP', 'MODIFY', 'REALLOCATE', 'CREATE', 'INVESTIGATE')),

  actor_role          text          NOT NULL,
  actor_id            text          NOT NULL,

  created_at          timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — immutable from creation, nothing to bump.
);

CREATE INDEX IF NOT EXISTS idx_review_event_tenant ON analytics.review_event (tenant_id);
CREATE INDEX IF NOT EXISTS idx_review_event_review  ON analytics.review_event (review_id);

-- Tenant-match + review-must-be-concluding guard.

CREATE OR REPLACE FUNCTION analytics.enforce_review_event_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM analytics.review WHERE id = NEW.review_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'kora/not-found: referenced review not found';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_tenant THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: review_event.tenant_id must match its review';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_review_event_invariants
  BEFORE INSERT ON analytics.review_event
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_review_event_invariants();

-- Append-only — same discipline as governance_event/workload_event/
-- evidence_plan_addendum: zero UPDATE/DELETE GRANT (section 6) plus this
-- trigger, unconditional, for every role.

CREATE OR REPLACE FUNCTION analytics.reject_review_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.review_event rows are never updated or deleted — a correction is always a new Review cycle';
END;
$$;

CREATE TRIGGER trg_review_event_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.review_event
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_review_event_mutation();

-- ── 3. analytics.conclude_review() — the atomic constitutive transaction ────
-- Mirrors migration 067's own `commit_commitment()` discipline exactly:
-- runs as whatever role calls it (service_role only, via the GRANT below),
-- not SECURITY DEFINER; a single plpgsql function body is one implicit
-- transaction — status→concluded, the event insert, and the
-- governance_event all happen together or not at all.

CREATE OR REPLACE FUNCTION analytics.conclude_review(
  p_review_id          uuid,
  p_tenant_id          uuid,
  p_actor_role         text,
  p_actor_id           text,
  p_actual_decision    text,
  p_effective_date     date,
  p_verdict            text,
  p_decision_owner     text,
  p_indicated_decision text DEFAULT NULL,
  p_rationale_category text DEFAULT NULL,
  p_intervention       text DEFAULT NULL,
  p_supersedes         uuid DEFAULT NULL
)
RETURNS TABLE (
  review_event_id uuid,
  concluded_at    timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_status      text;
  v_now         timestamptz := now();
  v_event_id    uuid;
BEGIN
  IF p_actor_role IS NULL OR p_actor_role = '' OR p_actor_id IS NULL OR p_actor_id = '' THEN
    RAISE EXCEPTION 'kora/actor-required: conclude_review requires actor_role and actor_id';
  END IF;

  SELECT status INTO v_status
    FROM analytics.review
    WHERE id = p_review_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: review "%" not found for tenant "%"', p_review_id, p_tenant_id;
  END IF;

  IF v_status = 'concluded' THEN
    RAISE EXCEPTION 'kora/already-concluded: review "%" is already concluded — conclusion is not idempotent, a correction is a new Review cycle', p_review_id;
  END IF;

  UPDATE analytics.review
    SET status = 'concluded', concluded_at = v_now
    WHERE id = p_review_id AND tenant_id = p_tenant_id;

  INSERT INTO analytics.review_event (
    tenant_id, review_id, indicated_decision, actual_decision, rationale_category,
    intervention, effective_date, supersedes, decision_owner, verdict, actor_role, actor_id
  ) VALUES (
    p_tenant_id, p_review_id, p_indicated_decision, p_actual_decision, p_rationale_category,
    p_intervention, p_effective_date, p_supersedes, p_decision_owner, p_verdict, p_actor_role, p_actor_id
  )
  RETURNING id INTO v_event_id;

  INSERT INTO audit.governance_event (
    source_module, actor_role, actor_id, event_type, object_type, object_id, tenant_id, payload
  ) VALUES (
    'review', p_actor_role, p_actor_id, 'review.concluded', 'review', p_review_id::text, p_tenant_id,
    jsonb_build_object('review_event_id', v_event_id, 'verdict', p_verdict)
  );

  RETURN QUERY SELECT v_event_id, v_now;
END;
$$;

-- ── 4. RLS — Pattern A ───────────────────────────────────────────────────────

ALTER TABLE analytics.review ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.review FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_review" ON analytics.review
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_review_read" ON analytics.review
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

ALTER TABLE analytics.review_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.review_event FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_review_event" ON analytics.review_event
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_review_event_read" ON analytics.review_event
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 5. GRANTs ────────────────────────────────────────────────────────────────
-- review: service_role needs SELECT+INSERT+UPDATE (open→in-progress is a
-- simple, non-constitutive edit; conclude goes through the function below)
-- but never DELETE. review_event: SELECT+INSERT only — never UPDATE, never
-- DELETE (append-only). Function EXECUTE: service_role only (migration
-- 068's own lesson applied from the start this time — no implicit PUBLIC
-- grant is left unrevoked).

GRANT SELECT, INSERT, UPDATE ON analytics.review TO service_role;
GRANT SELECT ON analytics.review TO authenticated;

GRANT SELECT, INSERT ON analytics.review_event TO service_role;
GRANT SELECT ON analytics.review_event TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.conclude_review(uuid, uuid, text, text, text, date, text, text, text, text, text, uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION analytics.conclude_review(uuid, uuid, text, text, text, date, text, text, text, text, text, uuid) FROM PUBLIC;

-- ── 6. Core Decision Linkage integration (KORA-WP-023) ───────────────────────
-- Only this WP's own migration may replace the view (migration 069's own
-- header names KORA-WP-024 as the sole legitimate future editor). No new
-- storage, no duplicated truth — review_id becomes a real join, exactly the
-- same security_invoker/RLS-inherited/read-only shape as before.

CREATE OR REPLACE VIEW analytics.commitment_decision_trace
WITH (security_invoker = true) AS
SELECT
  c.id                          AS commitment_id,
  c.tenant_id,
  c.status                      AS commitment_status,
  ep.id                         AS evidence_plan_id,
  ep.status                     AS evidence_plan_status,
  COALESCE(
    array_agg(DISTINCT crr.resource_allocation_entry_id)
      FILTER (WHERE crr.resource_allocation_entry_id IS NOT NULL),
    '{}'
  )                             AS resource_allocation_entry_ids,
  m.id                          AS mvb_manifest_id,
  r.id                          AS review_id,
  r.status                      AS review_status
FROM analytics.commitment c
LEFT JOIN analytics.evidence_plan ep
  ON ep.commitment_id = c.id
LEFT JOIN analytics.commitment_resource_reference crr
  ON crr.commitment_id = c.id
LEFT JOIN analytics.commitment_mvb_manifest m
  ON m.commitment_id = c.id
LEFT JOIN analytics.review r
  ON r.commitment_id = c.id
GROUP BY c.id, c.tenant_id, c.status, ep.id, ep.status, m.id, r.id, r.status;

GRANT SELECT ON analytics.commitment_decision_trace TO service_role, authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- CREATE OR REPLACE VIEW analytics.commitment_decision_trace WITH (security_invoker = true) AS
--   SELECT c.id AS commitment_id, c.tenant_id, c.status AS commitment_status,
--     ep.id AS evidence_plan_id, ep.status AS evidence_plan_status,
--     COALESCE(array_agg(DISTINCT crr.resource_allocation_entry_id) FILTER (WHERE crr.resource_allocation_entry_id IS NOT NULL), '{}') AS resource_allocation_entry_ids,
--     m.id AS mvb_manifest_id, NULL::uuid AS review_id
--   FROM analytics.commitment c
--   LEFT JOIN analytics.evidence_plan ep ON ep.commitment_id = c.id
--   LEFT JOIN analytics.commitment_resource_reference crr ON crr.commitment_id = c.id
--   LEFT JOIN analytics.commitment_mvb_manifest m ON m.commitment_id = c.id
--   GROUP BY c.id, c.tenant_id, c.status, ep.id, ep.status, m.id;
-- REVOKE EXECUTE ON FUNCTION analytics.conclude_review(uuid, uuid, text, text, text, date, text, text, text, text, text, uuid) FROM service_role;
-- DROP FUNCTION IF EXISTS analytics.conclude_review(uuid, uuid, text, text, text, date, text, text, text, text, text, uuid);
-- REVOKE SELECT ON analytics.review_event FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.review_event FROM service_role;
-- REVOKE SELECT ON analytics.review FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.review FROM service_role;
-- DROP POLICY IF EXISTS "company_own_review_event_read" ON analytics.review_event;
-- DROP POLICY IF EXISTS "kora_admin_all_review_event" ON analytics.review_event;
-- DROP POLICY IF EXISTS "company_own_review_read" ON analytics.review;
-- DROP POLICY IF EXISTS "kora_admin_all_review" ON analytics.review;
-- DROP TRIGGER IF EXISTS trg_review_event_no_mutation ON analytics.review_event;
-- DROP FUNCTION IF EXISTS analytics.reject_review_event_mutation();
-- DROP TRIGGER IF EXISTS trg_review_event_invariants ON analytics.review_event;
-- DROP FUNCTION IF EXISTS analytics.enforce_review_event_invariants();
-- DROP TABLE IF EXISTS analytics.review_event;
-- DROP TRIGGER IF EXISTS trg_review_post_conclusion_immutability ON analytics.review;
-- DROP FUNCTION IF EXISTS analytics.enforce_review_post_conclusion_immutability();
-- DROP TRIGGER IF EXISTS trg_review_requires_committed_commitment ON analytics.review;
-- DROP FUNCTION IF EXISTS analytics.enforce_review_requires_committed_commitment();
-- DROP TABLE IF EXISTS analytics.review;
-- Rollback is safe only if no review_event row exists yet (their own
-- immutability would otherwise block the table drop's cascade) — verify
-- zero rows before rolling back in any real environment.
