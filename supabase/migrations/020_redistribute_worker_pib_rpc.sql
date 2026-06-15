-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 020: Redistribuzione PIB worker — funzione atomica
-- Migration:   020_redistribute_worker_pib_rpc
-- Created:     2026-06-15
-- Block:       B161 — Worker Grado 1: calcolo IU + aggancio PIB/CV reale
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Funzione SECURITY DEFINER per la ridistribuzione atomica delle righe worker_pib
-- su più pillar (Opzione C, Livello Ridistribuzione — worker-owned).
--
-- ATOMICITÀ — Modifica 2 (non negoziabile)
-- ─────────────────────────────────────────────────────────────────────────────
-- La sostituzione delle righe è eseguita in una singola transazione PL/pgSQL.
-- DELETE + INSERT avvengono insieme: se INSERT fallisce, il ROLLBACK automatico
-- preserva le righe originali. Il worker NON può perdere il suo PIB per un
-- INSERT parzialmente fallito.
--
-- SICUREZZA
-- ────────────────────────────────────────────────────────────────────────────
-- La funzione:
--   1. Risolve worker_identity_id da auth.uid() (mai dal client).
--   2. Filtra DELETE/INSERT per il worker autenticato — isolamento DB, non applicativo.
--   3. Le nuove righe (p_rows jsonb) sono calcolate server-side in TypeScript
--      (WorkerIUComputationService.applyPillarRedistribution) e validate PRIMA
--      di chiamare questa funzione. La funzione è la sola responsabile dell'atomicità,
--      non della validazione.
--
-- La validazione (somma=1.0, pillar validi, frazioni in [0,1]) avviene in
-- WorkerIUComputationService.validateRedistribution() — pura TypeScript, testata.
--
-- SCHEMA PostgREST
-- ─────────────────────────────────────────────────────────────────────────────
-- La funzione è creata nello schema public per essere raggiungibile via RPC
-- PostgREST (`supabase.rpc('fn_redistribute_worker_pib', ...)`).
-- SET search_path fisso previene search_path injection.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_redistribute_worker_pib(
  p_source_uef_record_id uuid,
  p_rows                 jsonb  -- array di {pillar, iu_value, verification_status,
                                --           is_exportable, source_kind,
                                --           source_participation_id}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = personal, analytics, kora, public
AS $$
DECLARE
  v_worker_identity_id uuid;
  v_row                jsonb;
BEGIN
  -- 1. Risolve worker_identity_id da auth.uid() — MAI dal client.
  SELECT id INTO v_worker_identity_id
  FROM personal.worker_identity
  WHERE auth_user_id = auth.uid();

  IF v_worker_identity_id IS NULL THEN
    RAISE EXCEPTION 'Worker identity non trovata per auth.uid() = %', auth.uid();
  END IF;

  -- 2. DELETE atomico — rimuove le righe esistenti per (worker, uef_record).
  --    Se il seguente INSERT fallisce, questo DELETE è annullato automaticamente.
  DELETE FROM personal.worker_pib
  WHERE worker_identity_id    = v_worker_identity_id
    AND source_uef_record_id  = p_source_uef_record_id;

  -- 3. INSERT atomico — inserisce le nuove righe ridistribuite.
  --    I valori arrivano pre-calcolati da WorkerIUComputationService (TypeScript).
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    INSERT INTO personal.worker_pib (
      worker_identity_id,
      reporting_period,
      pillar,
      iu_value,
      verification_status,
      is_exportable,
      source_kind,
      source_uef_record_id,
      source_participation_id,
      -- TEMPO 2: sempre NULL — nessuna logica generativa in questo blocco
      generative_index,
      generative_circle1,
      generative_circle2,
      generative_circle3
    ) VALUES (
      v_worker_identity_id,
      v_row->>'reporting_period',
      v_row->>'pillar',
      (v_row->>'iu_value')::numeric,
      v_row->>'verification_status',
      (v_row->>'is_exportable')::boolean,
      v_row->>'source_kind',
      p_source_uef_record_id,
      (v_row->>'source_participation_id')::uuid,
      NULL, NULL, NULL, NULL
    );
  END LOOP;

END;
$$;

-- KORA_ADMIN e WORKER possono invocare questa funzione.
-- L'isolamento è garantito dalla risoluzione worker_identity_id via auth.uid() (step 1).
GRANT EXECUTE ON FUNCTION public.fn_redistribute_worker_pib(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
