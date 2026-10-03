-- KORA-WP-145 — Living KORAL Canonical Morphology Engine v2 (1/4): morphology area.
--
-- Authority: Registry 219 KORA-WP-145 (Data/Migration Impact) + the final
-- Founder record, design/program/reference-surfaces/living-koral/
-- KORA_LIVING_KORAL_MINIMUM_ENGINE_EXTENSION_SPEC.md §0.6. STAGING ONLY under
-- Gate 2's conditions; production remains blocked by Gates 3 and 5.
--
-- R2-alpha (Founder, final): an organisational AREA is morphologically
-- present while at least one present initiative exists in it. Areas are the
-- five canonical KORA pillars (CLAUDE.md §4). The pillar of an initiative is
-- mutable, so the area is SNAPSHOTTED at observation time onto the Material
-- Change, and copied onto the immutable ledger row by the recording RPC
-- (migration 092). For a Reorientation it is the destination area.
--
-- Additive only: two nullable columns. Every existing row keeps NULL —
-- the ledger is append-only and is never rewritten; the one-time Founder M1
-- staging backfill lives in its own table (migration 094). v1 Editions are
-- unaffected: the v1 replay never reads this column.

-- ── 1. Material Change: area snapshot ────────────────────────────────────────
ALTER TABLE gov.living_koral_material_change
  ADD COLUMN IF NOT EXISTS affected_area text NULL
    CONSTRAINT living_koral_material_change_affected_area_check
    CHECK (affected_area IS NULL OR affected_area IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'));

COMMENT ON COLUMN gov.living_koral_material_change.affected_area IS
  'KORA-WP-145: morphology area (KORA pillar) snapshotted from the real source '
  'row when the transition was observed; for Reorientation, the destination '
  'area. NULL on pre-WP-145 rows (see migration 094 backfill). Immutable once '
  'written (update-invariant trigger below).';

-- The area is evidentiary: once written it can never change (same rule as
-- every other evidentiary column of this table, migration 081).
CREATE OR REPLACE FUNCTION gov.enforce_living_koral_material_change_update_invariants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.category IS DISTINCT FROM OLD.category
    OR NEW.affected_domain IS DISTINCT FROM OLD.affected_domain
    OR NEW.affected_area IS DISTINCT FROM OLD.affected_area
    OR NEW.source_entity_type IS DISTINCT FROM OLD.source_entity_type
    OR NEW.source_entity_id IS DISTINCT FROM OLD.source_entity_id
    OR NEW.occurred_at IS DISTINCT FROM OLD.occurred_at
    OR NEW.provenance IS DISTINCT FROM OLD.provenance
    OR NEW.taxonomy_config_version IS DISTINCT FROM OLD.taxonomy_config_version
    OR NEW.actor_role IS DISTINCT FROM OLD.actor_role
    OR NEW.actor_id IS DISTINCT FROM OLD.actor_id
  THEN
    RAISE EXCEPTION 'kora/immutable: living_koral_material_change evidentiary fields cannot change once set — a correction is always a new, superseding record (doc 129 Part 10), never a mutation of this one';
  END IF;

  IF OLD.status = 'CANDIDATE' AND NEW.status = 'RECOGNIZED' THEN
    NULL; -- the one legal forward promotion
  ELSIF OLD.status = 'RECOGNIZED' AND NEW.status = 'SUPERSEDED' THEN
    IF NEW.superseded_by_id IS NULL THEN
      RAISE EXCEPTION 'kora/supersession-requires-reference: a SUPERSEDED row must reference the event that supersedes it';
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'kora/invalid-transition: only CANDIDATE->RECOGNIZED and RECOGNIZED->SUPERSEDED are permitted — never a backward transition';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ── 2. Transformation Ledger: area copy + the `fuse` operation ───────────────
ALTER TABLE gov.living_koral_transformation_ledger
  ADD COLUMN IF NOT EXISTS affected_area text NULL
    CONSTRAINT living_koral_transformation_ledger_affected_area_check
    CHECK (affected_area IS NULL OR affected_area IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'));

COMMENT ON COLUMN gov.living_koral_transformation_ledger.affected_area IS
  'KORA-WP-145: copy of gov.living_koral_material_change.affected_area, written '
  'once by gov.record_living_koral_transformation(). NULL on pre-WP-145 rows; '
  'the ledger is never rewritten (migration 094 holds their staging backfill).';

ALTER TABLE gov.living_koral_transformation_ledger
  DROP CONSTRAINT IF EXISTS living_koral_transformation_ledger_operation_check;

ALTER TABLE gov.living_koral_transformation_ledger
  ADD CONSTRAINT living_koral_transformation_ledger_operation_check
  CHECK (operation IN ('add_element', 'remove_element', 'increase_extent', 'decrease_extent', 'reorient', 'stabilize', 'fuse'));

COMMENT ON COLUMN gov.living_koral_transformation_ledger.operation IS
  'KORA-WP-113 v1: add_element/remove_element. Migration 087 (Package A): '
  'increase_extent/decrease_extent/reorient/stabilize. Migration 091 '
  '(KORA-WP-145): fuse (Consolidation, multi-source — sources in '
  'gov.living_koral_consolidation_source, migration 092). Structural, never visual.';
