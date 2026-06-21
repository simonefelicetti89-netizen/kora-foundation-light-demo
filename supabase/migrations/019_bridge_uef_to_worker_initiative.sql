-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 019: Bridge — UEF record → worker_initiative (company_sourced)
-- Migration:   019_bridge_uef_to_worker_initiative
-- Created:     2026-06-15
-- Block:       B160 — Worker Grado 1
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Funzione SECURITY DEFINER che trasforma un UEF record approvato in un'iniziativa
-- nel catalogo worker (personal.worker_initiative, source_kind='company_sourced').
-- L'iniziativa diventa visibile ai worker invitati del tenant DOPO che KORA_ADMIN
-- la pubblica manualmente (status 'draft' → 'published').
--
-- FILTRO DI PUBBLICABILITÀ (non negoziabile)
-- ─────────────────────────────────────────────
-- Solo i UEF record che superano TUTTI i seguenti criteri possono diventare iniziative:
--   1. eligibility IN ('eligible', 'limited')    → non blocked/excluded
--   2. primary_pillar IS NOT NULL                → pillar classificato
--   3. char_length(raw_name) >= 2               → nome leggibile dall'upload aziendale
--   4. approved_for_impact_units = true          → approvato per computazione IU
--
-- IDEMPOTENZA
-- ──────────────
-- ON CONFLICT su uq_worker_initiative_uef_bridge (mig 016):
--   UNIQUE (tenant_id, source_uef_record_id) WHERE source_uef_record_id IS NOT NULL
-- → Se il UEF record viene riprocessato dopo una review, title/pillar si aggiornano.
-- → status resta invariato (KORA_ADMIN pubblica separatamente).
-- → Chiamate multiple con lo stesso p_uef_record_id sono safe.
--
-- RETURN
-- ──────
-- worker_initiative.id se l'upsert è riuscito, NULL se il record non supera il filtro.
--
-- SECURITY
-- ─────────
-- SECURITY DEFINER — eseguita come owner (postgres = superuser = BYPASSRLS).
-- search_path fisso: previene search_path injection.
-- Legge analytics.uef_record (bypassa RLS), scrive personal.worker_initiative.
-- Solo KORA_ADMIN può invocarla (via GRANT EXECUTE su authenticated + RLS del contesto).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION personal.fn_publish_company_initiative_from_uef(
  p_uef_record_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = personal, analytics, kora, public
AS $$
DECLARE
  v_uef           analytics.uef_record%ROWTYPE;
  v_initiative_id uuid;
BEGIN
  -- 0. KORA_ADMIN guard — SECURITY DEFINER bypasses RLS; guard must be explicit here.
  --    auth.jwt() is still available inside SECURITY DEFINER functions.
  IF kora.kora_role() <> 'KORA_ADMIN' THEN
    RAISE EXCEPTION 'kora/unauthorized: KORA_ADMIN required to publish company initiatives';
  END IF;

  -- 1. Carica il UEF record
  SELECT * INTO v_uef
  FROM analytics.uef_record
  WHERE id = p_uef_record_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Filtro di pubblicabilità
  IF v_uef.eligibility NOT IN ('eligible', 'limited') THEN
    RETURN NULL;
  END IF;

  IF v_uef.primary_pillar IS NULL THEN
    RETURN NULL;
  END IF;

  IF char_length(v_uef.raw_name) < 2 THEN
    RETURN NULL;
  END IF;

  IF NOT v_uef.approved_for_impact_units THEN
    RETURN NULL;
  END IF;

  -- 3. Upsert idempotente
  --    ON CONFLICT referenzia l'indice parziale uq_worker_initiative_uef_bridge (mig 016):
  --    UNIQUE (tenant_id, source_uef_record_id) WHERE source_uef_record_id IS NOT NULL
  --    title e pillar si aggiornano se il UEF record è stato riclassificato.
  --    status non viene toccato — KORA_ADMIN pubblica separatamente.
  INSERT INTO personal.worker_initiative (
    tenant_id,
    title,
    pillar,
    eligibility_class,
    status,
    source_kind,
    source_uef_record_id
  ) VALUES (
    v_uef.tenant_id,
    v_uef.raw_name,
    v_uef.primary_pillar,
    CASE WHEN v_uef.eligibility = 'limited' THEN 'limited' ELSE 'eligible' END,
    'draft',
    'company_sourced',
    p_uef_record_id
  )
  ON CONFLICT (tenant_id, source_uef_record_id)
    WHERE source_uef_record_id IS NOT NULL
  DO UPDATE SET
    title             = EXCLUDED.title,
    pillar            = EXCLUDED.pillar,
    eligibility_class = EXCLUDED.eligibility_class,
    updated_at        = now()
  RETURNING id INTO v_initiative_id;

  RETURN v_initiative_id;
END;
$$;

-- KORA_ADMIN invoca questa funzione via app layer (RLS del contesto garantisce il ruolo).
GRANT EXECUTE ON FUNCTION personal.fn_publish_company_initiative_from_uef(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
