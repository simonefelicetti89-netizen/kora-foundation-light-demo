-- KORA-WP-145 — Living KORAL Canonical Morphology Engine v2 (4/4): Founder M1 historical-area backfill.
--
-- Founder M1 (approved, conditional): a one-time, STAGING-ONLY backfill of
-- the morphology area of pre-WP-145 Material Changes from the initiative's
-- CURRENT pillar — acceptable only because (a) data are synthetic/staging and
-- (b) no customer v2 Edition exists. (b) is enforced below: the migration
-- refuses to run if any Edition already carries a v2 crystallisation. (a) is
-- the standing rule for every migration under Registry 219 (Section AE:
-- staging-only until Gates 3 and 5 close) and must be re-checked by whoever
-- applies this file.
--
-- The ledger and Material Change rows are NEVER rewritten: the backfilled
-- area lives in its own append-only table, keyed by Material Change id, and
-- the engine reads COALESCE(ledger.affected_area, backfill.affected_area).
-- v1 Editions are unaffected (the v1 replay never reads an area). The basis
-- of every row is recorded, so the backfill stays distinguishable forever
-- from an area observed at transition time.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM analytics.living_koral_edition WHERE morphology_engine_version IS NOT NULL) THEN
    RAISE EXCEPTION 'kora/m1-precondition-failed: a Morphology Engine v2 Edition already exists — the Founder M1 one-time backfill may only run before any v2 Edition';
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS gov.living_koral_morphology_area_backfill (
  material_change_id  uuid          PRIMARY KEY REFERENCES gov.living_koral_material_change (id),
  tenant_id           uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  affected_area       text          NOT NULL CHECK (affected_area IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY')),
  basis               text          NOT NULL DEFAULT 'founder-m1-current-initiative-pillar' CHECK (basis = 'founder-m1-current-initiative-pillar'),
  created_at          timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE gov.living_koral_morphology_area_backfill IS
  'KORA-WP-145 / Founder M1 — one-time staging backfill of the morphology area '
  'for Material Changes recorded before migration 091, taken from the '
  'initiative''s pillar at backfill time. Append-only. Never used for a row '
  'that carries its own observed affected_area.';

CREATE OR REPLACE FUNCTION gov.reject_living_koral_morphology_area_backfill_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: gov.living_koral_morphology_area_backfill rows are never updated or deleted';
END;
$$;

CREATE TRIGGER trg_living_koral_morphology_area_backfill_no_mutation
  BEFORE UPDATE OR DELETE ON gov.living_koral_morphology_area_backfill
  FOR EACH ROW
  EXECUTE FUNCTION gov.reject_living_koral_morphology_area_backfill_mutation();

ALTER TABLE gov.living_koral_morphology_area_backfill ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.living_koral_morphology_area_backfill FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_morphology_area_backfill_kora_admin_read" ON gov.living_koral_morphology_area_backfill
  FOR SELECT USING (kora.kora_role() = 'KORA_ADMIN');

GRANT SELECT ON gov.living_koral_morphology_area_backfill TO service_role;
GRANT SELECT ON gov.living_koral_morphology_area_backfill TO authenticated;

INSERT INTO gov.living_koral_morphology_area_backfill (material_change_id, tenant_id, affected_area)
SELECT mc.id, mc.tenant_id, wi.pillar
FROM gov.living_koral_material_change mc
JOIN personal.worker_initiative wi
  ON wi.id = mc.source_entity_id AND wi.tenant_id = mc.tenant_id
WHERE mc.affected_area IS NULL
  AND mc.source_entity_type = 'initiative'
  AND wi.pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY')
ON CONFLICT (material_change_id) DO NOTHING;
