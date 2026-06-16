-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 023: Canale nominativo per iniziative company-sourced
-- Migration:   023_uploaded_record_attendee
-- Created:     2026-06-16
-- Block:       B164 — Canale nominativo + trigger di attribuzione d'ufficio
-- Gate:        Gate 2 OPEN — written, NOT applied
--              Applicabile con 016–022 al pilot.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Tabella per il binario nominativo companion: file opzionale che la company
-- carica accanto al CSV iniziative quando ha la lista presenze nominativa.
-- Abilita l'attribuzione d'ufficio (company_sourced) del PIB worker — Stage 11
-- dell'algoritmo KORA — per iniziative formate che hanno un attestato nominativo.
--
-- PROMESSA PRIVACY (non derogabile)
-- ───────────────────────────────────
--   I nomi grezzi NON entrano mai in questa tabella.
--   L'interprete pseudonymizza PRIMA dell'INSERT: raw_hash e pseudonym_id
--   sono derivati via HMAC(KORA_PSEUDONYM_SECRET, …). Il testo nome+cognome
--   non transita mai oltre il boundary applicativo. Nessuna colonna "nome" o
--   "cognome" esiste in questa tabella.
--
--   KORA usa i dati nominativi esclusivamente per costruire il PIB individuale
--   del lavoratore, che resta privato e mai visibile al datore di lavoro
--   a livello individuale.
--
-- LINK AL UEF RECORD (scelta architetturale)
-- ────────────────────────────────────────────
--   source_uef_record_id → analytics.uef_record (non personal.uploaded_record)
--   Motivazione: il trigger di attribuzione in persistKoraComputationResult ha
--   solo i uef_record_id (dall'array iuResults). Il link diretto al UEF record
--   evita un JOIN intermedio attraverso uploaded_record → batch → uef_record,
--   impossibile senza FK inversa su analytics.uef_record.
--   Pattern coerente con mig 016 (worker_initiative.source_uef_record_id).
--
-- IDEMPOTENZA
-- ────────────
--   UNIQUE (source_uef_record_id, raw_hash):
--     stessa persona sullo stesso UEF record → conflitto → silenzioso (ON CONFLICT DO NOTHING).
--     Il raw_hash identifica l'individuo SENZA esporre il nome.
--
-- RLS
-- ────
--   KORA_ADMIN: accesso completo (pipeline, diagnostica, provisioning)
--   WORKER:     SELECT solo sulle proprie righe (via worker_identity_id → auth.uid())
--   COMPANY:    nessuna policy — intenzionale e non negoziabile
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal.uploaded_record_attendee (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Tenant scope ─────────────────────────────────────────────────────────────
  tenant_id             uuid          NOT NULL
                                      REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- ── Link al UEF record (source of truth per il trigger di attribuzione) ──────
  -- FK diretta: il trigger legge uploaded_record_attendee WHERE source_uef_record_id
  -- corrisponde ai record appena computati. ON DELETE CASCADE: se il UEF record viene
  -- eliminato, le attendee rows orfane vengono rimosse.
  source_uef_record_id  uuid          NOT NULL
                                      REFERENCES analytics.uef_record (id) ON DELETE CASCADE,

  -- ── Dati pseudonymizzati — nessun nome grezzo ─────────────────────────────────
  -- pseudonym_id: HMAC(secret, uef_record_id + '|' + nome.lower + '|' + cognome.lower)
  --   → diverso per ogni iniziativa (privacy cross-evento), mai ricollegabile al nome.
  -- raw_hash: HMAC(secret, nome.lower + '|' + cognome.lower)
  --   → identifica il worker per dedup intra-evento, senza esporre il nome.
  pseudonym_id          text          NOT NULL,
  raw_hash              text          NOT NULL,

  -- ── Matching worker ───────────────────────────────────────────────────────────
  -- Nullable: null quando il worker non è ancora provisionato in KORA (status='pending').
  -- Popolato dall'interprete quando worker_identity è trovata tramite worker_ref o email.
  worker_identity_id    uuid          REFERENCES personal.worker_identity (id) ON DELETE SET NULL,

  -- 'matched'  → worker_identity_id valorizzato, PIB attribuito d'ufficio
  -- 'pending'  → worker non provisionato, riga conservata per riconciliazione futura
  status                text          NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('matched', 'pending')),

  -- ── Governance ───────────────────────────────────────────────────────────────
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),

  -- ── Idempotenza: stessa persona sullo stesso UEF record → un solo record ──────
  UNIQUE (source_uef_record_id, raw_hash)
);

-- Indice sull'uef record per il trigger di attribuzione (query hot path)
CREATE INDEX IF NOT EXISTS idx_attendee_uef_record
  ON personal.uploaded_record_attendee (source_uef_record_id);

-- Indice per accesso worker alle proprie righe
CREATE INDEX IF NOT EXISTS idx_attendee_worker_identity
  ON personal.uploaded_record_attendee (worker_identity_id)
  WHERE worker_identity_id IS NOT NULL;

-- Indice per query pending (riconciliazione batch futura)
CREATE INDEX IF NOT EXISTS idx_attendee_pending
  ON personal.uploaded_record_attendee (tenant_id, status)
  WHERE status = 'pending';

ALTER TABLE personal.uploaded_record_attendee ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.uploaded_record_attendee FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: accesso completo per pipeline, diagnostica e riconciliazione pending.
CREATE POLICY "attendee_kora_admin_all" ON personal.uploaded_record_attendee
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: SELECT solo sulle proprie righe, risolto via worker_identity.
-- Il worker può vedere che è in lista per un'iniziativa, non chi altro c'è.
CREATE POLICY "attendee_worker_own_select" ON personal.uploaded_record_attendee
  FOR SELECT
  USING (
    kora.kora_role() = 'WORKER'
    AND worker_identity_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );

-- Nessuna policy COMPANY_ADMIN / COMPANY_VIEWER — intenzionale e non negoziabile.
-- L'azienda fornisce la lista ma non può rileggere i dati individuali da KORA.

GRANT SELECT, INSERT, UPDATE ON personal.uploaded_record_attendee TO authenticated;

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
