-- KORA-WP-145 — Living KORAL Canonical Morphology Engine v2 (3/4): Edition crystallisation.
--
-- Authority: Registry 219 KORA-WP-145 ("nullable Edition morphology-engine-
-- version and canonical-state-hash columns"); spec §15. STAGING ONLY.
--
-- An Edition stays what migration 085 made it: a Company-chosen, immutable
-- reference to one frozen ledger point. Morphology Engine v2 adds two facts
-- about that SAME frozen point: which engine version derives its canonical
-- morphology state, and the SHA-256 of that rebuilt state. Together they let
-- any later rebuild prove it is byte-identical; a mismatch is an integrity
-- alarm, never a silent re-render. A renderer change (KORA-WP-146) can never
-- touch either value.
--
-- Write path: computed server-side by the engine (the fold runs in the
-- application), recorded through ONE service-role-only SECURITY DEFINER
-- function, SET-ONCE: NULL -> value, never changed afterwards. A Company
-- session cannot forge either value. Editions without these values are v1
-- Editions and keep their v1 reconstruction exactly (constitution 14).

ALTER TABLE analytics.living_koral_edition
  ADD COLUMN IF NOT EXISTS morphology_engine_version text NULL
    CONSTRAINT living_koral_edition_morphology_engine_version_check
    CHECK (morphology_engine_version IS NULL OR morphology_engine_version IN ('koral-morphology-v2')),
  ADD COLUMN IF NOT EXISTS morphology_state_hash text NULL
    CONSTRAINT living_koral_edition_morphology_state_hash_check
    CHECK (morphology_state_hash IS NULL OR morphology_state_hash ~ '^[0-9a-f]{64}$');

ALTER TABLE analytics.living_koral_edition
  DROP CONSTRAINT IF EXISTS living_koral_edition_morphology_pair_check;
ALTER TABLE analytics.living_koral_edition
  ADD CONSTRAINT living_koral_edition_morphology_pair_check
  CHECK ((morphology_engine_version IS NULL) = (morphology_state_hash IS NULL));

COMMENT ON COLUMN analytics.living_koral_edition.morphology_engine_version IS
  'KORA-WP-145: the Canonical Morphology Engine version that derives this Edition''s '
  'canonical morphology state. NULL = v1 Edition (reconstructed by the v1 path, unchanged). Set once.';
COMMENT ON COLUMN analytics.living_koral_edition.morphology_state_hash IS
  'KORA-WP-145: SHA-256 (hex) of the canonical JSON of the state rebuilt at '
  'resulting_state_revision under morphology_engine_version. Set once.';

-- Append-only, with ONE narrow exception: the two morphology columns may go
-- from NULL to a value exactly once, with every other column unchanged.
CREATE OR REPLACE FUNCTION analytics.reject_living_koral_edition_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND OLD.morphology_engine_version IS NULL AND OLD.morphology_state_hash IS NULL
    AND NEW.morphology_engine_version IS NOT NULL AND NEW.morphology_state_hash IS NOT NULL
    AND (OLD.id, OLD.tenant_id, OLD.name, OLD.ledger_id, OLD.category, OLD.affected_domain,
         OLD.taxonomy_config_version, OLD.morphogenesis_engine_version, OLD.resulting_state_revision,
         OLD.occurred_at, OLD.recognized_at, OLD.source_label, OLD.actor_role, OLD.actor_id, OLD.created_at)
        IS NOT DISTINCT FROM
        (NEW.id, NEW.tenant_id, NEW.name, NEW.ledger_id, NEW.category, NEW.affected_domain,
         NEW.taxonomy_config_version, NEW.morphogenesis_engine_version, NEW.resulting_state_revision,
         NEW.occurred_at, NEW.recognized_at, NEW.source_label, NEW.actor_role, NEW.actor_id, NEW.created_at)
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'kora/immutable: analytics.living_koral_edition rows are never updated or deleted — a KORAL Edition is Living KORAL''s own permanent, Company-chosen historical record (doc 129 Part 26); only its Morphology Engine v2 crystallisation may be recorded, once';
END;
$$;

CREATE OR REPLACE FUNCTION analytics.fn_record_living_koral_edition_morphology(
  p_tenant_id          uuid,
  p_edition_id         uuid,
  p_boundary_revision  integer,
  p_engine_version     text,
  p_state_hash         text
)
RETURNS TABLE (
  recorded                   boolean,
  morphology_engine_version  text,
  morphology_state_hash      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, gov, public
AS $$
#variable_conflict use_column
DECLARE
  v_edition analytics.living_koral_edition;
BEGIN
  IF p_engine_version IS DISTINCT FROM 'koral-morphology-v2' THEN
    RAISE EXCEPTION 'kora/invalid-engine-version: % is not a supported Canonical Morphology Engine version', p_engine_version;
  END IF;
  IF p_state_hash IS NULL OR p_state_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'kora/invalid-state-hash: a SHA-256 hex digest is required';
  END IF;

  SELECT * INTO v_edition
  FROM analytics.living_koral_edition e
  WHERE e.id = p_edition_id AND e.tenant_id = p_tenant_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'kora/not-found: no such Edition for this tenant';
  END IF;
  IF v_edition.resulting_state_revision IS DISTINCT FROM p_boundary_revision THEN
    RAISE EXCEPTION 'kora/boundary-mismatch: the morphology was computed at a different ledger revision than the Edition freezes';
  END IF;

  IF v_edition.morphology_engine_version IS NOT NULL THEN
    RETURN QUERY SELECT false, v_edition.morphology_engine_version, v_edition.morphology_state_hash;
    RETURN;
  END IF;

  UPDATE analytics.living_koral_edition e
  SET morphology_engine_version = p_engine_version,
      morphology_state_hash = p_state_hash
  WHERE e.id = p_edition_id AND e.tenant_id = p_tenant_id;

  RETURN QUERY SELECT true, p_engine_version, p_state_hash;
END;
$$;

REVOKE EXECUTE ON FUNCTION analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION analytics.fn_record_living_koral_edition_morphology(uuid, uuid, integer, text, text) TO service_role;

NOTIFY pgrst, 'reload schema';
