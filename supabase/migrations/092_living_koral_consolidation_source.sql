-- KORA-WP-145 — Living KORAL Canonical Morphology Engine v2 (2/4): consolidation sources + `fuse`.
--
-- Authority: Registry 219 KORA-WP-145; report 182 §10–§13 ("Package B",
-- absorbed into KORA-WP-145 by Founder decision, Registry 219 §AH-6); final
-- Founder K1: one organisation-approved consolidation = a new initiative +
-- the declared consolidation of >= 2 existing initiatives + the coordinated
-- closure of the sources, as one verifiable action. KORA_ADMIN records the
-- relationship; it never decides on its own that a transformation occurred.
-- STAGING ONLY under Gate 2's conditions.
--
-- One Consolidation Material Change (its source_entity_id = the RESULT
-- initiative) links to N >= 2 SOURCE initiatives here. Append-only,
-- tenant-matched, never updated or deleted, read in fixed (created_at, id)
-- order. KORA_ADMIN read; service_role write; no Company/Worker write path.

CREATE TABLE IF NOT EXISTS gov.living_koral_consolidation_source (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  material_change_id  uuid          NOT NULL REFERENCES gov.living_koral_material_change (id),
  source_entity_type  text          NOT NULL CHECK (source_entity_type = 'initiative'),
  source_entity_id    uuid          NOT NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT living_koral_consolidation_source_unique UNIQUE (material_change_id, source_entity_id)
);

COMMENT ON TABLE gov.living_koral_consolidation_source IS
  'KORA-WP-145 — the source lineages of one Consolidation Material Change. '
  'Append-only provenance (report 182 §12). The consolidated result lineage is '
  'the Material Change''s own source_entity_id; every row here is one ended '
  'source. Consumed by the Canonical Morphology Engine v2 replay.';

CREATE INDEX IF NOT EXISTS idx_living_koral_consolidation_source_mc
  ON gov.living_koral_consolidation_source (material_change_id, created_at, id);

-- Same-tenant, Consolidation-only, declared-before-recognition, never self-referencing.
CREATE OR REPLACE FUNCTION gov.enforce_living_koral_consolidation_source_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_mc gov.living_koral_material_change;
BEGIN
  SELECT * INTO v_mc FROM gov.living_koral_material_change WHERE id = NEW.material_change_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: material change % does not exist', NEW.material_change_id;
  END IF;
  IF v_mc.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'kora/tenant-mismatch: a consolidation source must belong to the same tenant as its Material Change';
  END IF;
  IF v_mc.category <> 'Consolidation' THEN
    RAISE EXCEPTION 'kora/invalid-category: consolidation sources may only be attached to a Consolidation Material Change (got %)', v_mc.category;
  END IF;
  IF v_mc.status <> 'CANDIDATE' THEN
    RAISE EXCEPTION 'kora/sources-after-recognition: consolidation sources must be declared while the Material Change is still CANDIDATE';
  END IF;
  IF NEW.source_entity_id = v_mc.source_entity_id THEN
    RAISE EXCEPTION 'kora/self-consolidation: the consolidated result cannot also be one of its own sources';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_living_koral_consolidation_source_insert
  BEFORE INSERT ON gov.living_koral_consolidation_source
  FOR EACH ROW
  EXECUTE FUNCTION gov.enforce_living_koral_consolidation_source_insert();

CREATE OR REPLACE FUNCTION gov.reject_living_koral_consolidation_source_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: gov.living_koral_consolidation_source rows are never updated or deleted — consolidation provenance is append-only (report 182 §12)';
END;
$$;

CREATE TRIGGER trg_living_koral_consolidation_source_no_mutation
  BEFORE UPDATE OR DELETE ON gov.living_koral_consolidation_source
  FOR EACH ROW
  EXECUTE FUNCTION gov.reject_living_koral_consolidation_source_mutation();

ALTER TABLE gov.living_koral_consolidation_source ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.living_koral_consolidation_source FORCE ROW LEVEL SECURITY;

CREATE POLICY "living_koral_consolidation_source_kora_admin_read" ON gov.living_koral_consolidation_source
  FOR SELECT USING (kora.kora_role() = 'KORA_ADMIN');

GRANT SELECT, INSERT ON gov.living_koral_consolidation_source TO service_role;
GRANT SELECT ON gov.living_koral_consolidation_source TO authenticated;

-- ── Recording RPC: copies the area snapshot; accepts `fuse` with >= 2 sources ──
-- Same signature as migrations 082/087 (CREATE OR REPLACE), so every caller
-- and grant is unchanged. Only differences: `fuse` is a legal operation (and
-- requires >= 2 recorded sources), and affected_area is copied verbatim from
-- the Material Change onto the immutable ledger row.
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
  v_sources integer;
BEGIN
  IF p_operation NOT IN ('add_element', 'remove_element', 'increase_extent', 'decrease_extent', 'reorient', 'stabilize', 'fuse') THEN
    RAISE EXCEPTION 'kora/invalid-operation: % is not a live Morphogenesis Engine operation', p_operation;
  END IF;

  IF p_morphogenesis_engine_version IS NULL OR p_morphogenesis_engine_version = '' THEN
    RAISE EXCEPTION 'kora/invalid-engine-version: morphogenesis_engine_version is required';
  END IF;

  SELECT * INTO v_mc FROM gov.living_koral_material_change WHERE id = p_material_change_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: material change % does not exist', p_material_change_id;
  END IF;

  IF v_mc.status <> 'RECOGNIZED' THEN
    RAISE EXCEPTION 'kora/not-recognized: material change % has status % — only RECOGNIZED rows may drive Morphogenesis', p_material_change_id, v_mc.status;
  END IF;

  IF p_operation = 'fuse' THEN
    IF v_mc.category <> 'Consolidation' THEN
      RAISE EXCEPTION 'kora/invalid-operation: fuse is the Consolidation operation only (got %)', v_mc.category;
    END IF;
    SELECT count(*) INTO v_sources FROM gov.living_koral_consolidation_source s WHERE s.material_change_id = v_mc.id;
    IF v_sources < 2 THEN
      RAISE EXCEPTION 'kora/insufficient-sources: a Consolidation needs at least two recorded source lineages (found %)', v_sources;
    END IF;
  END IF;

  INSERT INTO analytics.living_koral_state (tenant_id, revision, regions)
  VALUES (v_mc.tenant_id, 0, '{}'::jsonb)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT s.* INTO v_state FROM analytics.living_koral_state s WHERE s.tenant_id = v_mc.tenant_id FOR UPDATE;

  INSERT INTO gov.living_koral_transformation_ledger (
    tenant_id, material_change_id, category, affected_domain, affected_area,
    taxonomy_config_version, morphogenesis_engine_version, operation,
    resulting_state_revision, occurred_at, recognized_at, actor_id
  )
  VALUES (
    v_mc.tenant_id, v_mc.id, v_mc.category, v_mc.affected_domain, v_mc.affected_area,
    v_mc.taxonomy_config_version, p_morphogenesis_engine_version, p_operation,
    v_state.revision + 1, v_mc.occurred_at, v_mc.recognized_at,
    'living-koral-morphogenesis-engine-v1'
  )
  ON CONFLICT (material_change_id) DO NOTHING
  RETURNING * INTO v_ledger;

  IF NOT FOUND THEN
    SELECT * INTO v_ledger FROM gov.living_koral_transformation_ledger WHERE material_change_id = p_material_change_id;
    RETURN QUERY SELECT false, v_ledger.id, v_ledger.tenant_id, v_ledger.category, v_ledger.resulting_state_revision;
    RETURN;
  END IF;

  -- `regions` is the KORA-WP-113 abstract element count. Only presence moves
  -- it; every other operation (fuse included) leaves it unchanged. The
  -- revision always advances.
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
