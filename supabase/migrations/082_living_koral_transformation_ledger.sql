-- KORA-WP-113 — Transformation Ledger + Morphogenesis Engine v1 + Continuity
-- Contract v1.
--
-- Canonical authority: Registry 142 (`142_...md:273`), doc 129 Parts 8-10,
-- 19-25, 32 (`129_KORA_LIVING_KORAL_STAGE_0_MATERIAL_CHANGE_CHANGE_PROTOCOL_
-- DESIGN.md`), doc 132 Parts 7-10 (`132_KORA_LIVING_KORAL_MASTER_PLAN_
-- INSERTION_DESIGN.md`), pre-check 170
-- (`.kora-audit/output/170_KORA_WP_113_CANONICAL_PRE_CHECK.md`).
--
-- Hard Dep: KORA-WP-112 only. Consumes gov.living_koral_material_change
-- rows whose status = 'RECOGNIZED' — never CANDIDATE, never SUPERSEDED as
-- a fresh causal event (pre-check 170 §6).
--
-- Two tables, mirroring the established analytics.kora_ready_attainment +
-- analytics.current_readiness_health precedent (migration 079, KORA-WP-027)
-- structurally, narrowed per Registry 142's own explicit RLS deferral
-- (pre-check 170 §13):
--
--   gov.living_koral_transformation_ledger  — append-only historical truth,
--     one row per RECOGNIZED Material Change (UNIQUE on material_change_id
--     is the exactly-once/idempotency gate — same pattern WP-112 used for
--     candidate dedup, here applied to transformation dedup).
--
--   analytics.living_koral_state            — exactly one row per tenant,
--     mutable current-state projection, safe to rebuild from the ledger,
--     never the source of truth itself.
--
-- Both KORA_ADMIN-only for now — Company read is explicitly deferred to
-- KORA-WP-114 (Registry 142's own text: "Company read (via KORA-WP-114)"),
-- Advisor read is not part of WP-113 or WP-114 at all (introduced only by
-- KORA-WP-116, Assignment-scoped, a later, separate WP). Not prematurely
-- granted here.
--
-- Morphogenesis v1 is a structural-state mechanism, never a renderer: no
-- geometry, no color, no shape, no image/SVG generation, no visual weight
-- field. `regions` stores only an abstract per-domain element counter — see
-- the RPC function below and doc 132 Part 10's canonical-state/renderer
-- separation.
--
-- Only two deterministic operations exist in V1 because only two Material
-- Change categories have a live producer (WP-112's initiative-adapter.ts:
-- Emergence, Disappearance — both `scope: 'local'`, both `morphology`-only,
-- confirmed against lib/living-koral-config/v1.ts's own taxonomy config,
-- pre-check 170 §9). The five remaining taxonomy categories (Strengthening,
-- Weakening, Consolidation, Reorientation, Stabilization) are legal
-- `category` values on the ledger's own CHECK (matching WP-112's own
-- category CHECK, since a future domain adapter could in principle produce
-- one) but have NO deterministic `operation` mapping in this migration or
-- in lib/living-koral-morphogenesis-config/v1.ts — the RPC function below
-- structurally REJECTS any operation value outside the two live ones,
-- keeping unsupported live production impossible rather than silently
-- inventing a mapping (pre-check 170 §13, this task's own §13). No active
-- Consolidation (or other interpretive-category) producer exists anywhere
-- in the codebase — dormant until a future WP builds one.
--
-- SCOPE BOUNDARY: no Living KORAL UI, no Portrait rendering, no Edition, no
-- KORAL Mark, no Review, no Expression Mode, no Commons integration, no
-- Public KORAL — all KORA-WP-114+'s own scope, untouched here.
--
-- Inherited, disclosed, NOT solved: this is the 5th confirmed instance of
-- the append-only/tenant-retirement/GDPR-erasure architectural gap in this
-- codebase (after analytics.kora_ready_attainment WP-027,
-- analytics.review_advisor_assessment WP-043, audit.governance_event
-- WP-045, gov.living_koral_material_change WP-112) — not opportunistically
-- fixed here.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. gov.living_koral_transformation_ledger — append-only historical truth ──

CREATE TABLE IF NOT EXISTS gov.living_koral_transformation_ledger (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Exactly-once gate (§ header) — one ledger row per RECOGNIZED Material
  -- Change, ever. Never denormalized further than this single reference —
  -- provenance to the underlying source object (personal.worker_initiative,
  -- etc.) is recovered by joining through this row, never duplicated here.
  material_change_id          uuid          NOT NULL UNIQUE
                                             REFERENCES gov.living_koral_material_change (id),

  -- Copied at write time from the referenced (immutable-once-RECOGNIZED)
  -- Material Change row — same 7-way CHECK as WP-112's own table; a
  -- structural safety net, not a second source of truth (the service layer
  -- always reads the real taxonomy from lib/living-koral-config/v1.ts).
  category                    text          NOT NULL
                                             CHECK (category IN ('Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization')),

  -- Pinned to 'initiative' only, matching WP-112's own V1 domain pin.
  -- Widened additively when a future domain adapter exists.
  affected_domain              text          NOT NULL CHECK (affected_domain = 'initiative'),

  -- Change-Protocol version (WP-111 taxonomy config) that recognized the
  -- source Material Change — carried forward, not re-derived.
  taxonomy_config_version      text          NOT NULL,

  -- Morphogenesis Engine version that computed THIS row's own `operation`
  -- (doc 129 Part 25 — mandatory so a later engine version can never
  -- silently reinterpret what an earlier version actually produced).
  morphogenesis_engine_version text          NOT NULL,

  -- The deterministic, structural (never visual) transformation output —
  -- see header. Only the two live-producible operations are legal; a
  -- dormant-category input is structurally rejected by the RPC function
  -- below before ever reaching this column.
  operation                    text          NOT NULL CHECK (operation IN ('add_element', 'remove_element')),

  -- Which revision of analytics.living_koral_state this entry produced —
  -- the continuity/current-state revision linkage (this task's own §1).
  resulting_state_revision     integer       NOT NULL CHECK (resulting_state_revision > 0),

  occurred_at                  timestamptz   NOT NULL,
  recognized_at                timestamptz   NOT NULL,

  -- System-generated only — hard constraint, not just convention (this
  -- task's own §8: "no manual path may let any role force a morphology").
  actor_role                   text          NOT NULL DEFAULT 'SYSTEM' CHECK (actor_role = 'SYSTEM'),
  actor_id                     text          NOT NULL,

  created_at                   timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE gov.living_koral_transformation_ledger IS
  'KORA-WP-113 — immutable, append-only historical record of recognized '
  'Living KORAL transformations. Never updated, never deleted (see trigger '
  'below). One row per RECOGNIZED gov.living_koral_material_change row, '
  'ever (UNIQUE material_change_id). Consumed by KORA-WP-114+ for display — '
  'this migration builds no UI, no renderer, no Edition.';

CREATE INDEX IF NOT EXISTS idx_living_koral_transformation_ledger_tenant
  ON gov.living_koral_transformation_ledger (tenant_id, recognized_at);

-- Never updated, never deleted — this is the 5th confirmed instance of the
-- append-only pattern in this codebase (see header). Disclosed, not solved.

CREATE OR REPLACE FUNCTION gov.reject_living_koral_transformation_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: gov.living_koral_transformation_ledger rows are never updated or deleted — the Transformation Ledger is Living KORAL''s own append-only historical truth (doc 132 Part 8)';
END;
$$;

CREATE TRIGGER trg_living_koral_transformation_ledger_no_mutation
  BEFORE UPDATE OR DELETE ON gov.living_koral_transformation_ledger
  FOR EACH ROW
  EXECUTE FUNCTION gov.reject_living_koral_transformation_ledger_mutation();

-- ── 2. analytics.living_koral_state — mutable current-state projection ─────
-- Exactly one row per tenant — the UNIQUE constraint is the real, DB-level
-- invariant, matching analytics.current_readiness_health's own established
-- shape (migration 079). Safe to rebuild from the ledger at any time; never
-- itself the source of truth (Registry 142's own Acceptance: "never changes
-- absent a ledger entry").

CREATE TABLE IF NOT EXISTS analytics.living_koral_state (
  id                           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    uuid          NOT NULL UNIQUE REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Continuity Contract v1's own revision counter — the Company's stable
  -- Living KORAL identity persists across every increment; only this
  -- integer and `regions` below ever change in place.
  revision                     integer       NOT NULL DEFAULT 0 CHECK (revision >= 0),

  -- Abstract, structural, per-`affected_domain` current morphology.
  -- Deliberately minimal (this task's own §7: "only the minimum canonical
  -- information required"): a single element counter per region, keyed by
  -- affected_domain, e.g. {"initiative": {"element_count": 3}}. No
  -- geometry, no color, no shape — see doc 132 Part 10.
  regions                      jsonb         NOT NULL DEFAULT '{}'::jsonb,

  -- The Morphogenesis Engine version that produced the CURRENT revision —
  -- current-state's own version marker (distinct from, and updated
  -- alongside, each ledger row's own frozen `morphogenesis_engine_version`).
  morphogenesis_engine_version text,

  -- Which ledger entry produced the current revision — the mechanism that
  -- guarantees state can never silently drift from ledger history (this
  -- task's own §1/§7). NULL only for the tenant's pre-transformation
  -- genesis row (revision = 0, the Continuity Contract's own persistent
  -- seed — doc 129 Part 22 — created once, before any recognized change).
  updated_from_ledger_id       uuid          REFERENCES gov.living_koral_transformation_ledger (id),

  created_at                   timestamptz   NOT NULL DEFAULT now(),
  updated_at                   timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT living_koral_state_genesis_consistency
    CHECK ((revision = 0) = (updated_from_ledger_id IS NULL))
);

COMMENT ON TABLE analytics.living_koral_state IS
  'KORA-WP-113 — current, materialized Living KORAL state per tenant. A '
  'derived projection of gov.living_koral_transformation_ledger, safe to '
  'rebuild from it at any time; never itself the source of truth. Exactly '
  'one row per tenant, mutated only through gov.record_living_koral_'
  'transformation() — never a direct INSERT/UPDATE from any human-facing '
  'code path.';

CREATE TRIGGER trg_living_koral_state_updated_at
  BEFORE UPDATE ON analytics.living_koral_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. gov.record_living_koral_transformation() — the ONLY atomic write path ──
-- Single-function transaction boundary (this task's own §5): re-validates
-- RECOGNIZED status server-side (never trusts a caller-supplied category or
-- status); locks the tenant's current-state row FIRST (INSERT-if-missing
-- then SELECT ... FOR UPDATE) so concurrent calls for the SAME tenant fully
-- serialize (no lost update, this task's own §6); performs the ledger's own
-- idempotent INSERT ... ON CONFLICT (material_change_id) DO NOTHING WHILE
-- HOLDING that lock, so a genuine retry/duplicate invocation is detected
-- before any state mutation is attempted, never after; only on a genuine
-- first-time success does it advance analytics.living_koral_state, in the
-- same implicit transaction — ledger and state can never diverge from a
-- partial write (this task's own §5.5, §14.H).
--
-- Ordering: Company-local only (this task's own §6) — the per-tenant row
-- lock is the entire ordering mechanism; no cross-tenant ordering exists or
-- is implied. For V1's only two live operations (add_element/
-- remove_element on a single integer counter), application order and
-- canonical `recognized_at` replay order always agree because integer
-- addition is commutative — this is a V1-specific simplification, not a
-- general claim; a future interpretive-category operation may need a
-- stricter ordering discipline at that time, out of this migration's scope.

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
  IF p_operation NOT IN ('add_element', 'remove_element') THEN
    RAISE EXCEPTION 'kora/invalid-operation: % is not a KORA-WP-113 v1 deterministic operation — only add_element/remove_element are live; every other taxonomy category is dormant (no producer exists)', p_operation;
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
  v_delta := CASE WHEN p_operation = 'add_element' THEN 1 ELSE -1 END;
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

-- ── 4. RLS — KORA_ADMIN-only on both tables (§ header — Company/Advisor ────
-- read deliberately NOT granted here, deferred to KORA-WP-114/116) ─────────

ALTER TABLE gov.living_koral_transformation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.living_koral_transformation_ledger FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_transformation_ledger_kora_admin_all" ON gov.living_koral_transformation_ledger
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

ALTER TABLE analytics.living_koral_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.living_koral_state FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_state_kora_admin_all" ON analytics.living_koral_state
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 5. GRANTs — least privilege (this task's own §8) ────────────────────────
-- No DELETE anywhere (both tables are append-only or system-managed-only).
-- `authenticated` gets SELECT only on both — matching WP-112's own exact
-- precedent (migration 081: gov.living_koral_material_change grants
-- `authenticated` SELECT too) — RLS's KORA_ADMIN-only policy is the real
-- per-row gate; a real KORA_ADMIN session reads through the `authenticated`
-- PostgREST role (its own JWT claims, not service_role), so this grant is
-- required for that access path to exist at all, not merely for a future
-- UI. No `authenticated` INSERT/UPDATE grant on either table, and no
-- `authenticated` EXECUTE on the RPC — every write is system-generated
-- only, through service_role exclusively.

GRANT SELECT, INSERT, UPDATE ON gov.living_koral_transformation_ledger TO service_role;
GRANT SELECT ON gov.living_koral_transformation_ledger TO authenticated;

GRANT SELECT, INSERT, UPDATE ON analytics.living_koral_state TO service_role;
GRANT SELECT ON analytics.living_koral_state TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON analytics.living_koral_state FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.living_koral_state FROM service_role;
-- REVOKE SELECT ON gov.living_koral_transformation_ledger FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON gov.living_koral_transformation_ledger FROM service_role;
-- DROP POLICY IF EXISTS "living_koral_state_kora_admin_all" ON analytics.living_koral_state;
-- DROP POLICY IF EXISTS "living_koral_transformation_ledger_kora_admin_all" ON gov.living_koral_transformation_ledger;
-- REVOKE ALL ON FUNCTION gov.record_living_koral_transformation(uuid, text, text) FROM service_role;
-- DROP FUNCTION IF EXISTS gov.record_living_koral_transformation(uuid, text, text);
-- DROP TRIGGER IF EXISTS trg_living_koral_state_updated_at ON analytics.living_koral_state;
-- DROP TABLE IF EXISTS analytics.living_koral_state;
-- DROP TRIGGER IF EXISTS trg_living_koral_transformation_ledger_no_mutation ON gov.living_koral_transformation_ledger;
-- DROP FUNCTION IF EXISTS gov.reject_living_koral_transformation_ledger_mutation();
-- DROP TABLE IF EXISTS gov.living_koral_transformation_ledger;
