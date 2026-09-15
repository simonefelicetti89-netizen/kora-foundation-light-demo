-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 067: Commit Activation Transaction + MVB Manifest (Layer C)
-- Migration:   067_commit_activation_transaction
-- Created:     2026-09-15
-- Block:       KORA-WP-022 — Commit Activation Transaction + MVB Manifest (Layer C)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- The ONLY package implementing `Commitment → committed` (doc 95 §6, Layer C
-- of the three-layer split). Atomically, in one Postgres transaction
-- (`analytics.commit_commitment`, section 3 below):
--   1. Commitment: draft → committed
--   2. Evidence Plan primary: draft → frozen-at-commit
--   3. Resource Allocation reference validated (≥1 required, doc 67 §6:
--      "one-or-more Resource Allocation entries") and its baseline totalled
--      into the MVB manifest — no ledger mutation, no allocate/commit/spend
--      call, purely a read + snapshot
--   4. MVB manifest written (section 2)
--   5. governance_event emitted
-- If any step fails, the whole transaction rolls back — Postgres transaction
-- semantics inside one plpgsql function body make partial commit
-- structurally impossible, not merely discouraged.
--
-- LOCK 9 — MANDATORY (doc 95 §6)
-- ─────────────────────────────────
-- "Commitment must never be committable without an active ex-ante Evidence
-- Plan." Enforced inside `commit_commitment()`: no linked Evidence Plan, or
-- one not in `'draft'` (its own correct pre-commit state) → `RAISE
-- EXCEPTION`, nothing is written.
--
-- MVB MANIFEST — EXACT CANONICAL SHAPE (doc 95 §8, verbatim, resolved from
-- doc 71 §14's own deferral)
-- ─────────────────────────────────────────────────────────────────────────
-- "Chosen mechanism: a hybrid Version-Reference Manifest + Thin Scalar
-- Snapshot... (a) a manifest records the exact current version-identifiers
-- of the relevant Investment Map entries, Need Hypothesis/Supported-Need
-- records, and Evidence-sufficiency state referenced by that Commitment;
-- (b) a thin immutable scalar snapshot captures only the small set of
-- decision-relevant scalar values (baseline totals, evidence-sufficiency
-- flags, Hypothesis-vs-Supported status)... reconstructible, append-only,
-- not excessively duplicative (full records are never copied, only
-- references + a handful of scalars)."
--
-- Mapped to what actually exists in Code Truth today (doc 67 §2: Investment
-- has no standalone object — "composed view over Resource Allocation"):
--   - "Investment Map entries" version-reference   → the exact set of
--     `commitment_resource_reference` rows already linked pre-commit
--     (section 1 below makes them permanently immutable at the moment of
--     commit — the manifest does not duplicate them into a second list)
--   - "baseline totals" scalar                      → SUM of each linked
--     entry's `remaining_amount` AT THE MOMENT OF COMMIT (captured because
--     `remaining_amount` is exactly the field that legitimately drifts
--     later via further Resource Allocation transitions — doc 72 Lock 1)
--   - "evidence-sufficiency flags" scalar            → whether the Evidence
--     Plan's own `known_missing_at_decision` field was populated at commit
--     time
--   - "Need Hypothesis/Supported-Need... Hypothesis-vs-Supported status"    →
--     **no structural link exists yet** — Commitment's own frozen FT-019
--     field set (migration 065) has no `need_hypothesis_id`; only a nullable
--     `opportunity_id`, itself CHECK-pinned NULL until `KORA-WP-019`. This
--     column is therefore present (the canonical shape names it) but
--     CHECK-pinned NULL — the same "structurally absent until the owning
--     future WP exists" discipline as `commitment.evidence_plan_id` was
--     before this WP, `opportunity_id`, and `program_id`. Future owner:
--     `KORA-WP-019`/`KORA-WP-023`, never fabricated here.
--
-- POST-COMMIT IMMUTABILITY (doc 67 §3)
-- ───────────────────────────────────────
-- "Immutable once committed — a correction is always a new version, the old
-- one retained." The versioned-amendment MECHANISM is a future WP's own
-- scope (not named in KORA-WP-022's own registry entry) — this migration
-- implements only the immutability half: once `status = 'committed'`, the
-- governance fields (the full FT-019 set + `evidence_plan_id`) can never
-- change again, enforced by a trigger that fires for every role, including
-- one that bypasses grants. `commitment_resource_reference` rows also
-- freeze the instant their parent Commitment commits (no further link/
-- unlink), for the same reason.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Releases exactly `commitment.status` (draft→committed, two values only)
-- and `evidence_plan.status` (draft→frozen-at-commit, two values only) — no
-- other future state (`active`,`reviewable`,`reviewed`,`closed`,
-- `reactivated`, or Evidence Plan's own `collecting`/`closed-at-review`) is
-- physically reachable; those remain owned by later, unnamed-here WPs. No
-- Core Decision Linkage (`KORA-WP-023`), no Review (`KORA-WP-024`), no
-- Decision Pack synthesis (`KORA-WP-025`), no Program (`KORA-WP-026`/`060`),
-- no KORA Index/IU/Confidence/generic-KPI reference (open Master Plan
-- item, non-blocking for this WP per the architecture reconciliation), no
-- Living KORAL. Authorization: exactly as `KORA-WP-020`/`021` — the SQL
-- function itself trusts the caller's own supplied actor_role/actor_id for
-- provenance only (same convention as every other Lane-B primitive in this
-- schema); the real `actorRole === 'COMPANY_ADMIN'` gate lives in the
-- TypeScript service layer (`lib/commitment/commit-activation-service.ts`),
-- identical to `assertDecisionOwner()` in `commitment-service.ts`/
-- `evidence-plan-service.ts` — Advisor constitutive authority remains "NO,
-- NEVER" (doc 73 §6).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Release commitment.status and evidence_plan.status ───────────────────
-- Exactly two values each — the only legal transition this WP owns.

ALTER TABLE analytics.commitment DROP CONSTRAINT commitment_status_check;
ALTER TABLE analytics.commitment ADD CONSTRAINT commitment_status_check
  CHECK (status IN ('draft', 'committed'));

ALTER TABLE analytics.evidence_plan DROP CONSTRAINT evidence_plan_status_check;
ALTER TABLE analytics.evidence_plan ADD CONSTRAINT evidence_plan_status_check
  CHECK (status IN ('draft', 'frozen-at-commit'));

-- ── 2. Post-commit immutability — Commitment ─────────────────────────────────
-- Fires for every UPDATE, every role, including one that bypasses grants.
-- The one-time draft→committed transition itself is NOT blocked (this check
-- only activates once OLD.status is already 'committed').

CREATE OR REPLACE FUNCTION analytics.enforce_commitment_post_commit_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'committed' THEN
    IF NEW.status IS DISTINCT FROM OLD.status
      OR NEW.problem_objective IS DISTINCT FROM OLD.problem_objective
      OR NEW.population IS DISTINCT FROM OLD.population
      OR NEW.options_considered IS DISTINCT FROM OLD.options_considered
      OR NEW.proposed_choice IS DISTINCT FROM OLD.proposed_choice
      OR NEW.rationale IS DISTINCT FROM OLD.rationale
      OR NEW.evidence_available_missing IS DISTINCT FROM OLD.evidence_available_missing
      OR NEW.expected_outcome IS DISTINCT FROM OLD.expected_outcome
      OR NEW.capacity_delivery_context IS DISTINCT FROM OLD.capacity_delivery_context
      OR NEW.amount IS DISTINCT FROM OLD.amount
      OR NEW.horizon IS DISTINCT FROM OLD.horizon
      OR NEW.review_date IS DISTINCT FROM OLD.review_date
      OR NEW.owner_role IS DISTINCT FROM OLD.owner_role
      OR NEW.evidence_plan_id IS DISTINCT FROM OLD.evidence_plan_id
    THEN
      RAISE EXCEPTION 'kora/immutable: a committed Commitment''s governance fields cannot change — a correction is always a new version (versioned-amendment mechanism not yet implemented, doc 67 §3)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commitment_post_commit_immutability
  BEFORE UPDATE ON analytics.commitment
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_commitment_post_commit_immutability();

-- ── 3. Post-commit lock — commitment_resource_reference ─────────────────────
-- No reference may be added or removed once the parent Commitment is
-- committed — the exact set linked at commit time is what the MVB manifest
-- baseline totals were computed from and must remain queryable unchanged.

CREATE OR REPLACE FUNCTION analytics.enforce_commitment_resource_reference_commit_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM analytics.commitment WHERE id = COALESCE(NEW.commitment_id, OLD.commitment_id);
  IF v_status = 'committed' THEN
    RAISE EXCEPTION 'kora/immutable: cannot add or remove a Resource Allocation reference once its Commitment is committed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_commitment_resource_reference_commit_lock
  BEFORE INSERT OR DELETE ON analytics.commitment_resource_reference
  FOR EACH ROW
  EXECUTE FUNCTION analytics.enforce_commitment_resource_reference_commit_lock();

-- ── 4. analytics.commitment_mvb_manifest ─────────────────────────────────────
-- One row per Commitment (1:1), written once, immutable from creation.

CREATE TABLE IF NOT EXISTS analytics.commitment_mvb_manifest (
  id                                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                         uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  commitment_id                     uuid          NOT NULL UNIQUE REFERENCES analytics.commitment (id) ON DELETE CASCADE,

  -- "baseline totals" — SUM of linked Resource Allocation entries'
  -- remaining_amount at the moment of commit.
  resource_allocation_total_amount numeric(14,2) NOT NULL CHECK (resource_allocation_total_amount >= 0),
  resource_allocation_entry_count  integer        NOT NULL CHECK (resource_allocation_entry_count > 0),

  -- "evidence-sufficiency flags" — whether the Evidence Plan's own
  -- known-at-decision-time gap field was populated.
  evidence_known_missing_at_commit boolean        NOT NULL,

  -- "Hypothesis-vs-Supported status" — no structural link exists from
  -- Commitment to any Need Hypothesis record yet (see header). Present per
  -- the canonical MVB shape, CHECK-pinned NULL until KORA-WP-019/023 create
  -- the real reference this would snapshot.
  need_hypothesis_status_snapshot  text          CHECK (need_hypothesis_status_snapshot IS NULL),

  committed_at                      timestamptz   NOT NULL,
  actor_role                        text          NOT NULL,
  actor_id                          text          NOT NULL,
  created_at                        timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — immutable from creation, nothing to bump.
);

CREATE INDEX IF NOT EXISTS idx_commitment_mvb_manifest_tenant ON analytics.commitment_mvb_manifest (tenant_id);

-- Append-only — matches governance_event/workload_event/evidence_plan_addendum's
-- own dual-layer discipline: zero UPDATE/DELETE GRANT (section 6) plus this
-- trigger, unconditional, for every role.

CREATE OR REPLACE FUNCTION analytics.reject_commitment_mvb_manifest_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.commitment_mvb_manifest rows are never updated or deleted — the manifest is written once, at commit, forever';
END;
$$;

CREATE TRIGGER trg_commitment_mvb_manifest_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.commitment_mvb_manifest
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_commitment_mvb_manifest_mutation();

-- ── 5. analytics.commit_commitment() — the atomic transaction itself ────────
-- Runs as whatever role calls it (service_role only, per the GRANT below) —
-- not SECURITY DEFINER, since service_role already holds every GRANT this
-- function needs on every table it touches. A single Postgres function body
-- is one implicit transaction: any RAISE EXCEPTION rolls back everything
-- done so far in the same call — no partial committed state is reachable.
-- `SELECT ... FOR UPDATE` on the Commitment row serializes concurrent commit
-- attempts against the same row (the second waits, then sees
-- status='committed' and is rejected — no duplicate constitutive artifact).

CREATE OR REPLACE FUNCTION analytics.commit_commitment(
  p_commitment_id uuid,
  p_tenant_id     uuid,
  p_actor_role    text,
  p_actor_id      text
)
RETURNS TABLE (
  manifest_id  uuid,
  committed_at timestamptz
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_commitment_status   text;
  v_evidence_plan_id    uuid;
  v_evidence_plan_status text;
  v_known_missing       text;
  v_total_amount        numeric(14,2);
  v_entry_count         integer;
  v_now                 timestamptz := now();
  v_manifest_id         uuid;
BEGIN
  IF p_actor_role IS NULL OR p_actor_role = '' OR p_actor_id IS NULL OR p_actor_id = '' THEN
    RAISE EXCEPTION 'kora/actor-required: commit_commitment requires actor_role and actor_id';
  END IF;

  -- Lock the Commitment row for the duration of this transaction —
  -- serializes concurrent commit attempts.
  SELECT status INTO v_commitment_status
    FROM analytics.commitment
    WHERE id = p_commitment_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: commitment "%" not found for tenant "%"', p_commitment_id, p_tenant_id;
  END IF;

  IF v_commitment_status != 'draft' THEN
    RAISE EXCEPTION 'kora/already-committed: commitment "%" is already "%", not draft — commit is not idempotent, this is rejected', p_commitment_id, v_commitment_status;
  END IF;

  -- Lock 9 (doc 95 §6): an active ex-ante Evidence Plan is mandatory.
  SELECT id, status, known_missing_at_decision
    INTO v_evidence_plan_id, v_evidence_plan_status, v_known_missing
    FROM analytics.evidence_plan
    WHERE commitment_id = p_commitment_id AND tenant_id = p_tenant_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/lock-9: commitment "%" has no Evidence Plan — a Commitment must never become committed without an active ex-ante Evidence Plan (doc 95 §6, Lock 9)', p_commitment_id;
  END IF;

  IF v_evidence_plan_status != 'draft' THEN
    RAISE EXCEPTION 'kora/lock-9: commitment "%" Evidence Plan is "%", not draft — not eligible for freeze-at-commit', p_commitment_id, v_evidence_plan_status;
  END IF;

  -- doc 67 §6: "one-or-more Resource Allocation entries" — at least one
  -- reference is required to ground the Commitment's claimed amount.
  SELECT count(*), coalesce(sum(ra.remaining_amount), 0)
    INTO v_entry_count, v_total_amount
    FROM analytics.commitment_resource_reference cr
    JOIN analytics.resource_allocation ra ON ra.id = cr.resource_allocation_entry_id
    WHERE cr.commitment_id = p_commitment_id AND cr.tenant_id = p_tenant_id;

  IF v_entry_count = 0 THEN
    RAISE EXCEPTION 'kora/no-resource-allocation: commitment "%" has no linked Resource Allocation entry — one-or-more is required to commit (doc 67 §6)', p_commitment_id;
  END IF;

  -- Step 1: Commitment draft → committed.
  UPDATE analytics.commitment
    SET status = 'committed'
    WHERE id = p_commitment_id AND tenant_id = p_tenant_id;

  -- Step 2: Evidence Plan primary draft → frozen-at-commit.
  UPDATE analytics.evidence_plan
    SET status = 'frozen-at-commit'
    WHERE id = v_evidence_plan_id AND tenant_id = p_tenant_id;

  -- Step 3/4: MVB manifest — the version-reference half is the now-frozen
  -- commitment_resource_reference rows themselves (not duplicated here);
  -- the thin scalar snapshot is written below.
  INSERT INTO analytics.commitment_mvb_manifest (
    tenant_id, commitment_id, resource_allocation_total_amount,
    resource_allocation_entry_count, evidence_known_missing_at_commit,
    committed_at, actor_role, actor_id
  ) VALUES (
    p_tenant_id, p_commitment_id, v_total_amount, v_entry_count,
    (v_known_missing IS NOT NULL AND v_known_missing != ''),
    v_now, p_actor_role, p_actor_id
  )
  RETURNING id INTO v_manifest_id;

  -- Step 5: governance_event, in the same transaction — never a separate
  -- best-effort call after the fact.
  INSERT INTO audit.governance_event (
    source_module, actor_role, actor_id, event_type, object_type, object_id, tenant_id, payload
  ) VALUES (
    'commitment', p_actor_role, p_actor_id, 'commitment.committed', 'commitment', p_commitment_id::text, p_tenant_id,
    jsonb_build_object('evidence_plan_id', v_evidence_plan_id, 'manifest_id', v_manifest_id)
  );

  RETURN QUERY SELECT v_manifest_id, v_now;
END;
$$;

-- ── 6. GRANTs ────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON analytics.commitment_mvb_manifest TO service_role;
GRANT SELECT ON analytics.commitment_mvb_manifest TO authenticated;

GRANT EXECUTE ON FUNCTION analytics.commit_commitment(uuid, uuid, text, text) TO service_role;

-- RLS — Pattern A, identical shape to every other table in this family.

ALTER TABLE analytics.commitment_mvb_manifest ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.commitment_mvb_manifest FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_commitment_mvb_manifest" ON analytics.commitment_mvb_manifest
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_commitment_mvb_manifest_read" ON analytics.commitment_mvb_manifest
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE EXECUTE ON FUNCTION analytics.commit_commitment(uuid, uuid, text, text) FROM service_role;
-- DROP FUNCTION IF EXISTS analytics.commit_commitment(uuid, uuid, text, text);
-- DROP POLICY IF EXISTS "company_own_commitment_mvb_manifest_read" ON analytics.commitment_mvb_manifest;
-- DROP POLICY IF EXISTS "kora_admin_all_commitment_mvb_manifest" ON analytics.commitment_mvb_manifest;
-- REVOKE SELECT ON analytics.commitment_mvb_manifest FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.commitment_mvb_manifest FROM service_role;
-- DROP TRIGGER IF EXISTS trg_commitment_mvb_manifest_no_mutation ON analytics.commitment_mvb_manifest;
-- DROP FUNCTION IF EXISTS analytics.reject_commitment_mvb_manifest_mutation();
-- DROP TABLE IF EXISTS analytics.commitment_mvb_manifest;
-- DROP TRIGGER IF EXISTS trg_commitment_resource_reference_commit_lock ON analytics.commitment_resource_reference;
-- DROP FUNCTION IF EXISTS analytics.enforce_commitment_resource_reference_commit_lock();
-- DROP TRIGGER IF EXISTS trg_commitment_post_commit_immutability ON analytics.commitment;
-- DROP FUNCTION IF EXISTS analytics.enforce_commitment_post_commit_immutability();
-- ALTER TABLE analytics.evidence_plan DROP CONSTRAINT evidence_plan_status_check;
-- ALTER TABLE analytics.evidence_plan ADD CONSTRAINT evidence_plan_status_check CHECK (status = 'draft');
-- ALTER TABLE analytics.commitment DROP CONSTRAINT commitment_status_check;
-- ALTER TABLE analytics.commitment ADD CONSTRAINT commitment_status_check CHECK (status = 'draft');
-- Rollback is safe only if no row has actually reached status='committed' yet
-- (rolling back the CHECK relaxation while a committed row exists would
-- immediately violate the restored CHECK) — verify zero committed rows
-- before rolling back in any real environment.
