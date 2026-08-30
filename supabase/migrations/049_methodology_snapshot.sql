-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 049: Methodology Snapshot
-- Migration:   049_methodology_snapshot
-- Created:     2026-08-30
-- Block:       B-SNAP / CC-015
-- Gate:        Gate 2 OPEN — written, NOT applied to any remote/production DB
--              by this task. Local/test validation only, per D-F/CC-015 protocol.
-- Depends on:  001_live_v1_foundation (analytics.tenant, activation_result,
--              confidence_result, kora_index_result, bti_result, impact_unit)
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Master Plan v2.1 §11: "Immutabile, per ogni risultato persistito." Implements
-- the shared MethodologySnapshot entity (D-F / Option C: versioned snapshot ID
-- as the primary reproducibility authority, not a human-readable version string
-- alone). One row per calculation; every result table references it via a
-- nullable FK — nullable specifically so historical rows require NO rewrite.
--
-- RETROCOMPATIBILITÀ (obbligatoria — D-F historical preservation rule)
-- ──────────────────────────────────────────────────────────────────────
-- methodology_snapshot_id is NULLABLE on every existing result table. Rows
-- persisted before this migration keep methodology_snapshot_id = NULL and
-- keep their existing methodology_version_id / methodology_version /
-- calibration_status columns exactly as originally written — those columns
-- are NOT removed, NOT backfilled, NOT reinterpreted. NULL here means
-- "predates the Methodology Snapshot contract," which is itself a form of
-- AS_ORIGINALLY_CALCULATED provenance — not an error state.
--
-- NORMALIZED, NOT DUPLICATED (Master Plan §11 + CC-015 Phase 7 instruction)
-- ──────────────────────────────────────────────────────────────────────────
-- One shared analytics.methodology_snapshot row per calculation, referenced by
-- FK from every result table for that same calculation — not a separate JSON
-- blob duplicated into each table.
--
-- BTI GAP CLOSED (CC-015 Phase 8 / D-F §3 collision #4)
-- ──────────────────────────────────────────────────────────────────────────
-- analytics.bti_result previously had NO methodology/calibration stamp of its
-- own. It now gets methodology_snapshot_id like every other result table —
-- referencing the SAME snapshot as its sibling kora_index_result row for that
-- calculation, not a BTI-specific methodology version (Phase 8 explicitly
-- forbids inventing one).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.methodology_snapshot ───────────────────────────────────────────

CREATE TABLE analytics.methodology_snapshot (
  id                            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Master Plan §11 required fields, exact names.
  methodology_version           text          NOT NULL,  -- e.g. "1.0" — separate from the "KORA Index v1.0" product label (D-F)
  taxonomy_version              text          NOT NULL,  -- action taxonomy (9 families / 79 actions) version
  need_taxonomy_version         text          NULL,      -- NULL: no Need Taxonomy in effect (Needs domain not built) — same nullable-for-"not yet applicable" convention as NeedObservation.related_program_definition_id / ProgramBrief.resulting_program_definition_id, not a fabricated version
  bc_calibration_version        text          NOT NULL,  -- CC-009 BC config's own calibration provenance label
  contribution_config_version   text          NOT NULL,  -- real version from getContributionConfigV2(), not fabricated
  factor_statuses               jsonb         NOT NULL,  -- { NM/BC/CQ/EV/CF/AGF/DF/EXF/SF: 'canonical'|'provisional'|'proxy'|'fallback'|'not_active' } per Master Plan §10
  pipeline_version               text          NOT NULL,  -- KORA_PIPELINE_VERSION ('KoraPipeline_v2.0')
  config_hash                    text          NOT NULL,  -- deterministic sha256 over the methodology-config subset that drives the calculation
  calculation_timestamp          timestamptz   NOT NULL,

  -- Historical/restatement provenance (D-F historical preservation rule).
  provenance                     text          NOT NULL DEFAULT 'AS_ORIGINALLY_CALCULATED'
    CONSTRAINT methodology_snapshot_provenance_check
    CHECK (provenance IN ('AS_ORIGINALLY_CALCULATED', 'RESTATED_UNDER_METHODOLOGY')),
  restated_from_snapshot_id      uuid          REFERENCES analytics.methodology_snapshot (id),
    -- NOT NULL only when provenance = 'RESTATED_UNDER_METHODOLOGY'; enforced below.

  created_at                     timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE analytics.methodology_snapshot
  ADD CONSTRAINT methodology_snapshot_restatement_requires_source
  CHECK (
    (provenance = 'AS_ORIGINALLY_CALCULATED' AND restated_from_snapshot_id IS NULL)
    OR
    (provenance = 'RESTATED_UNDER_METHODOLOGY' AND restated_from_snapshot_id IS NOT NULL)
  );

-- Snapshots are immutable once written — no UPDATE path is exposed to any
-- application role. A correction is a new row with provenance =
-- 'RESTATED_UNDER_METHODOLOGY' and restated_from_snapshot_id pointing at the
-- row it supersedes. This mirrors the same append-only discipline already
-- used for kora_index_result.is_current (never rewrite, always supersede).

CREATE INDEX idx_methodology_snapshot_config_hash ON analytics.methodology_snapshot (config_hash);

ALTER TABLE analytics.methodology_snapshot ENABLE ROW LEVEL SECURITY;

-- No tenant_id on this table by design — a snapshot describes the METHODOLOGY
-- state, not tenant data, and the same snapshot can legitimately be reused
-- across tenants computed under the same config_hash. Readable by any
-- authenticated role; only KORA_ADMIN (via service_role in application code)
-- ever inserts.

CREATE POLICY "authenticated_read_methodology_snapshot" ON analytics.methodology_snapshot
  FOR SELECT USING (true);

GRANT SELECT ON analytics.methodology_snapshot TO authenticated;

-- ── 1b. TRUE immutability — DB-level trigger, not just a naming convention ─────
-- "Immutabile" (Master Plan §11) is enforced here as a hard constraint, not
-- application discipline: service_role bypasses RLS (BYPASSRLS) but does NOT
-- bypass triggers, so this rejects UPDATE/DELETE unconditionally for every
-- role, including application code using the service-role client. A
-- correction is always a NEW row (provenance = RESTATED_UNDER_METHODOLOGY,
-- restated_from_snapshot_id set) — never a mutation of an existing one.

CREATE OR REPLACE FUNCTION analytics.reject_methodology_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.methodology_snapshot rows cannot be updated or deleted — a correction must be a NEW row with provenance = RESTATED_UNDER_METHODOLOGY referencing the row it supersedes.';
END;
$$;

CREATE TRIGGER trg_methodology_snapshot_immutable
  BEFORE UPDATE OR DELETE ON analytics.methodology_snapshot
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_methodology_snapshot_mutation();

-- ── 2. Nullable FK on every existing result table ───────────────────────────────
-- All ADD COLUMN statements are NULLABLE and idempotent (IF NOT EXISTS) —
-- existing rows require no backfill, no rewrite, per the historical
-- preservation rule above.

ALTER TABLE analytics.activation_result
  ADD COLUMN IF NOT EXISTS methodology_snapshot_id uuid NULL
    REFERENCES analytics.methodology_snapshot (id);

ALTER TABLE analytics.confidence_result
  ADD COLUMN IF NOT EXISTS methodology_snapshot_id uuid NULL
    REFERENCES analytics.methodology_snapshot (id);

ALTER TABLE analytics.kora_index_result
  ADD COLUMN IF NOT EXISTS methodology_snapshot_id uuid NULL
    REFERENCES analytics.methodology_snapshot (id);

ALTER TABLE analytics.bti_result
  ADD COLUMN IF NOT EXISTS methodology_snapshot_id uuid NULL
    REFERENCES analytics.methodology_snapshot (id);

ALTER TABLE analytics.impact_unit
  ADD COLUMN IF NOT EXISTS methodology_snapshot_id uuid NULL
    REFERENCES analytics.methodology_snapshot (id);

CREATE INDEX IF NOT EXISTS idx_activation_result_snapshot  ON analytics.activation_result  (methodology_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_confidence_result_snapshot  ON analytics.confidence_result  (methodology_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_kora_index_result_snapshot  ON analytics.kora_index_result  (methodology_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_bti_result_snapshot         ON analytics.bti_result         (methodology_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_impact_unit_snapshot        ON analytics.impact_unit        (methodology_snapshot_id);

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP INDEX IF EXISTS analytics.idx_impact_unit_snapshot;
-- DROP INDEX IF EXISTS analytics.idx_bti_result_snapshot;
-- DROP INDEX IF EXISTS analytics.idx_kora_index_result_snapshot;
-- DROP INDEX IF EXISTS analytics.idx_confidence_result_snapshot;
-- DROP INDEX IF EXISTS analytics.idx_activation_result_snapshot;
-- ALTER TABLE analytics.impact_unit        DROP COLUMN IF EXISTS methodology_snapshot_id;
-- ALTER TABLE analytics.bti_result         DROP COLUMN IF EXISTS methodology_snapshot_id;
-- ALTER TABLE analytics.kora_index_result  DROP COLUMN IF EXISTS methodology_snapshot_id;
-- ALTER TABLE analytics.confidence_result  DROP COLUMN IF EXISTS methodology_snapshot_id;
-- ALTER TABLE analytics.activation_result  DROP COLUMN IF EXISTS methodology_snapshot_id;
-- DROP TRIGGER IF EXISTS trg_methodology_snapshot_immutable ON analytics.methodology_snapshot;
-- DROP FUNCTION IF EXISTS analytics.reject_methodology_snapshot_mutation();
-- DROP TABLE IF EXISTS analytics.methodology_snapshot;
-- Rollback is safe at any time: every column this migration adds is nullable
-- and additive; no existing column, row, or value is altered by this migration
-- or by rolling it back.
