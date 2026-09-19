-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 087: Living KORAL Morphogenesis — Extent / Direction / Stability
-- Migration:   087_living_koral_morphogenesis_extent_direction_stability
-- Created:     2026-09-19
-- Block:       KORAL Morphology Package A (Extent / Direction / Stability) —
--              authorized by Founder task "AUTHORIZE IMPLEMENTATION — KORAL
--              MORPHOLOGY PACKAGE A", per the design fixed in
--              .kora-audit/output/182_KORA_MORPHOLOGY_V1_FINAL_FOUNDER_DECISIONS_AND_IMPLEMENTATION_SPLIT.md
--              §6/§7 and .kora-audit/output/183_KORA_MORPHOLOGY_PACKAGE_A_EXTENT_DIRECTION_STABILITY_IMPLEMENTATION_REPORT.md.
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO — exactly one narrow, additive schema change: widen the deterministic
-- `operation` vocabulary gov.living_koral_transformation_ledger and its own
-- writer RPC (gov.record_living_koral_transformation) accept, from the two
-- KORA-WP-113 v1 live operations (add_element/remove_element) to six, adding
-- increase_extent / decrease_extent / reorient / stabilize — the deterministic
-- Morphogenesis mapping for the Strengthening / Weakening / Reorientation /
-- Stabilization Material Change categories (report 182 §3/§4/§5). Consolidation
-- remains dormant (no `fuse` operation here — Package B's own, later, separate
-- scope, report 182 §10).
--
-- MECHANICALLY CONFIRMED BEFORE WRITING (report 183 §4, re-inspected migrations
-- 081/082 directly, not from memory):
--   - gov.living_koral_material_change.source_entity_id is already a single
--     uuid column — Strengthening/Weakening/Reorientation/Stabilization each
--     reference exactly ONE existing entity (the same one Emergence/
--     Disappearance already reference). NO CHANGE to that table is needed —
--     the existing single-source shape already fits all four new categories.
--   - analytics.living_koral_state.regions (jsonb) stores ONLY an abstract
--     per-domain element counter (Level B aggregate, report 178 §0.4) — the
--     Level A per-lineage substrate the KORAL Mark (KORA-WP-117) actually
--     reads is reconstructed by replaying THIS ledger, joined to
--     gov.living_koral_material_change.source_entity_id
--     (reconstructEditionLineage(), unchanged, application-level only — no
--     migration needed for that join). `regions`'s own column SHAPE is
--     therefore unchanged by this migration; only ITS RUNTIME VALUE for the
--     four new operations is deliberately left untouched (v_delta = 0 for
--     them, below) — they change extent/direction/stability, never presence/
--     count.
--   - `analytics.living_koral_state.revision` (the Continuity Contract's own
--     monotonic counter) MUST still advance for the four new operations too,
--     because KORA-WP-117's own `resulting_state_revision`/boundaryRevision
--     mechanism depends on it to bound Edition replay — the RPC below still
--     locks and updates that row (revision + updated_from_ledger_id) for
--     every operation, new or old; only `regions` is conditionally skipped.
--
-- Two changes, both narrow and additive, no destructive change to any
-- existing row or column:
--   1. Widen the `operation` CHECK constraint on
--      gov.living_koral_transformation_ledger.
--   2. CREATE OR REPLACE gov.record_living_koral_transformation() — same
--      function, not a new one (matching this schema's own established
--      idiom for narrow additive logic changes, e.g. migration 086's own
--      widening pattern) — widening its own independent guard clause
--      (defense in depth, unchanged in kind) and its own v_delta computation
--      (now 0, not an incorrect -1, for any operation that is not
--      add_element/remove_element — see report 183 §4 for the exact bug this
--      also corrects in the TypeScript-side pure replay function,
--      replayLivingKoralStateFromLedger(), fixed in the same task, no DB
--      change required for that half).
--
-- NOT IN THIS MIGRATION: Consolidation / `fuse` (Package B, later); any
-- change to gov.living_koral_material_change; any change to
-- analytics.living_koral_state's own column shape; any RLS/GRANT change (the
-- existing KORA_ADMIN-only RLS and service_role-only EXECUTE grant already
-- cover the widened function unchanged).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Widen the operation CHECK constraint ──────────────────────────────────

ALTER TABLE gov.living_koral_transformation_ledger
  DROP CONSTRAINT IF EXISTS living_koral_transformation_ledger_operation_check;

ALTER TABLE gov.living_koral_transformation_ledger
  ADD CONSTRAINT living_koral_transformation_ledger_operation_check
  CHECK (operation IN ('add_element', 'remove_element', 'increase_extent', 'decrease_extent', 'reorient', 'stabilize'));

COMMENT ON COLUMN gov.living_koral_transformation_ledger.operation IS
  'KORA-WP-113 v1: add_element/remove_element (Emergence/Disappearance). '
  'Widened by migration 087 (KORAL Morphology Package A): increase_extent/ '
  'decrease_extent (Strengthening/Weakening), reorient (Reorientation), '
  'stabilize (Stabilization) — each a deterministic, single-lineage, '
  'structural (never visual) operation, per '
  '.kora-audit/output/182_KORA_MORPHOLOGY_V1_FINAL_FOUNDER_DECISIONS_AND_IMPLEMENTATION_SPLIT.md. '
  'Consolidation/fuse remains unmapped (Package B, later, separate migration).';

-- ── 2. Widen gov.record_living_koral_transformation() — same function ───────

CREATE OR REPLACE FUNCTION gov.record_living_koral_transformation(
  p_material_change_id           uuid,
  p_operation                    text,
  p_morphogenesis_engine_version text
)
RETURNS TABLE (
  created                   boolean,
  ledger_id                 uuid,
  tenant_id                 uuid,
  category                  text,
  resulting_state_revision  integer
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_mc      gov.living_koral_material_change;
  v_state   analytics.living_koral_state;
  v_ledger  gov.living_koral_transformation_ledger;
  v_delta   integer;
  v_new_count integer;
BEGIN
  -- Widened by migration 087 (report 183 §4) — the four new Package-A
  -- operations join the original two. Consolidation's own future `fuse`
  -- operation is deliberately NOT in this list (Package B, later,
  -- report 182 §10) — still structurally rejected here, unchanged in kind.
  IF p_operation NOT IN ('add_element', 'remove_element', 'increase_extent', 'decrease_extent', 'reorient', 'stabilize') THEN
    RAISE EXCEPTION 'kora/invalid-operation: % is not a live KORA-WP-113/Package-A deterministic operation', p_operation;
  END IF;

  IF p_morphogenesis_engine_version IS NULL OR p_morphogenesis_engine_version = '' THEN
    RAISE EXCEPTION 'kora/invalid-engine-version: morphogenesis_engine_version is required';
  END IF;

  SELECT * INTO v_mc FROM gov.living_koral_material_change WHERE id = p_material_change_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: material change % does not exist', p_material_change_id;
  END IF;

  -- Only RECOGNIZED may drive Morphogenesis — CANDIDATE and SUPERSEDED are
  -- both structurally rejected here (this task's own §2, negative test M).
  IF v_mc.status <> 'RECOGNIZED' THEN
    RAISE EXCEPTION 'kora/not-recognized: material change % has status % — only RECOGNIZED rows may drive Morphogenesis', p_material_change_id, v_mc.status;
  END IF;

  -- Lock (or create-then-lock) the tenant's current-state row FIRST — this
  -- single row lock is the entire concurrency-serialization mechanism.
  INSERT INTO analytics.living_koral_state (tenant_id, revision, regions)
  VALUES (v_mc.tenant_id, 0, '{}'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT s.* INTO v_state FROM analytics.living_koral_state s WHERE s.tenant_id = v_mc.tenant_id FOR UPDATE;

  -- Idempotent ledger insert, evaluated WHILE HOLDING the state lock — a
  -- genuine retry/duplicate invocation is caught here, before any state
  -- mutation, never after.
  INSERT INTO gov.living_koral_transformation_ledger (
    tenant_id, material_change_id, category, affected_domain,
    taxonomy_config_version, morphogenesis_engine_version, operation,
    resulting_state_revision, occurred_at, recognized_at, actor_id
  )
  VALUES (
    v_mc.tenant_id, v_mc.id, v_mc.category, v_mc.affected_domain,
    v_mc.taxonomy_config_version, p_morphogenesis_engine_version, p_operation,
    v_state.revision + 1, v_mc.occurred_at, v_mc.recognized_at,
    'living-koral-morphogenesis-engine-v1'
  )
  ON CONFLICT (material_change_id) DO NOTHING
  RETURNING * INTO v_ledger;

  IF NOT FOUND THEN
    -- Already processed by an earlier, already-committed call — safe,
    -- idempotent no-op. State is NOT touched a second time.
    SELECT * INTO v_ledger FROM gov.living_koral_transformation_ledger WHERE material_change_id = p_material_change_id;
    RETURN QUERY SELECT false, v_ledger.id, v_ledger.tenant_id, v_ledger.category, v_ledger.resulting_state_revision;
    RETURN;
  END IF;

  -- Genuine first-time success — advance current state, in the same
  -- transaction as the ledger insert above (atomicity: this task's own
  -- §5.5/§14.H — a failure anywhere in this function rolls back both).
  --
  -- v_delta widened by migration 087 (report 183 §4 — corrects the same
  -- binary-assumption bug fixed on the TypeScript side in
  -- replayLivingKoralStateFromLedger()): only add_element/remove_element
  -- ever change the abstract per-domain element counter. The four Package-A
  -- operations (increase_extent/decrease_extent/reorient/stabilize) change
  -- extent/direction/stability, never presence/count — v_delta = 0 for them,
  -- leaving `regions`'s own element_count value unchanged (the UPDATE below
  -- still runs, still advances revision/updated_from_ledger_id, matching
  -- this migration's own header finding that revision must still advance
  -- for every operation).
  v_delta := CASE
    WHEN p_operation = 'add_element' THEN 1
    WHEN p_operation = 'remove_element' THEN -1
    ELSE 0
  END;
  v_new_count := GREATEST(0, COALESCE((v_state.regions -> v_mc.affected_domain ->> 'element_count')::int, 0) + v_delta);

  UPDATE analytics.living_koral_state s
  SET revision = v_state.revision + 1,
      regions = v_state.regions || jsonb_build_object(v_mc.affected_domain, jsonb_build_object('element_count', v_new_count)),
      morphogenesis_engine_version = p_morphogenesis_engine_version,
      updated_from_ledger_id = v_ledger.id
  WHERE s.tenant_id = v_mc.tenant_id;

  RETURN QUERY SELECT true, v_ledger.id, v_ledger.tenant_id, v_ledger.category, v_ledger.resulting_state_revision;
END;
$$;

REVOKE ALL ON FUNCTION gov.record_living_koral_transformation(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gov.record_living_koral_transformation(uuid, text, text) TO service_role;
