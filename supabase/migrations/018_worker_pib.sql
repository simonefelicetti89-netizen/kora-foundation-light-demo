-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 018: Worker PIB
-- Migration:   018_worker_pib
-- Created:     2026-06-15
-- Block:       B160 — Worker Grado 1
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Tabella PIB per-worker: Stage 11 dell'algoritmo KORA — Personal Impact Balance.
-- Una riga per (worker × evento sorgente × pillar).
--
-- DUE DIMENSIONI TEMPORALI INDIPENDENTI — non fondere mai
-- ─────────────────────────────────────────────────────────
--   TEMPO 1 (al momento dell'attività):
--     iu_value  — IU base ereditato dal record di programma, modulato dall'evidenza
--                 individuale. STABILE: non aggiornato retroattivamente.
--
--   TEMPO 2 (al maturare del percorso worker):
--     generative_* — popolate in seguito, quando c'è storia cross-periodo.
--                    NULL al Tempo 1. Dimensione parallela indipendente.
--                    NON sommate a iu_value. NON modificano iu_value retroattivamente.
--
-- NODO A — is_exportable
-- ──────────────────────
--   false per 'self_declared'     → PIB visibile al worker, non esportabile
--   true  per 'verified'          → PIB visibile e esportabile (incl. company_sourced
--                                   con raw_name leggibile da uef_record)
--
-- SOURCE TRACING — solo audit interno, mai worker-facing
-- ───────────────────────────────────────────────────────
--   source_uef_record_id    → per PIB derivati da UEF records (company_sourced)
--   source_participation_id → per PIB derivati da partecipazioni (partner/worker_declared)
--   source_kind governa la visibilità aggregata lato azienda (future logic)
--
-- IDEMPOTENZA — DUE INDICI PARZIALI
-- ────────────────────────────────────
--   [U1] PIB da UEF record (company_sourced):
--        UNIQUE (worker_identity_id, source_uef_record_id, pillar)
--        WHERE source_uef_record_id IS NOT NULL
--
--   [U2] PIB da partecipazione (partner/worker_declared):
--        UNIQUE (worker_identity_id, source_participation_id, pillar)
--        WHERE source_participation_id IS NOT NULL
--
--   Entrambi parziali: NULL esclude dalla target del conflitto.
--   Le righe con entrambe le FK NULL sono teoricamente possibili (inserimento diretto
--   da KORA_ADMIN) e non confliggono tra loro.
--
-- PRIVACY GUARANTEE — NON NEGOZIABILE
-- ─────────────────────────────────────
--   Il PIB è proprietà del worker. L'azienda NON deve MAI vedere righe individuali.
--   Nessuna policy company su questa tabella.
--   source_uef_record_id e source_participation_id: campi di audit interno, non
--   restituiti nelle API worker-facing.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal.worker_pib (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Identità worker ──────────────────────────────────────────────────────────
  worker_identity_id   uuid          NOT NULL
                                     REFERENCES personal.worker_identity (id) ON DELETE CASCADE,

  -- ── Periodo e pillar ─────────────────────────────────────────────────────────
  reporting_period     text          NOT NULL,
  pillar               text          NOT NULL
                                     CHECK (pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY')),

  -- ── TEMPO 1: IU base — stabile, mai aggiornato retroattivamente ──────────────
  iu_value             numeric(10,4) NOT NULL DEFAULT 0.0,
  verification_status  text          NOT NULL
                                     CHECK (verification_status IN ('verified', 'self_declared')),
  is_exportable        boolean       NOT NULL DEFAULT false,

  -- ── Source tracing — audit interno, mai restituito in API worker-facing ──────
  source_kind          text          NOT NULL DEFAULT 'company_sourced'
                                     CHECK (source_kind IN ('company_sourced', 'partner_sourced', 'worker_declared')),
  source_uef_record_id    uuid       REFERENCES analytics.uef_record (id) ON DELETE SET NULL,
  source_participation_id uuid       REFERENCES personal.worker_participation (id) ON DELETE SET NULL,

  -- ── TEMPO 2: Dimensioni generative — predisposte, NULL fino a storia cross-periodo
  -- Dimensione parallela indipendente. NON sommate a iu_value. NON modificano iu_value.
  generative_index     numeric(10,4),
  generative_circle1   numeric(10,4),
  generative_circle2   numeric(10,4),
  generative_circle3   numeric(10,4),

  -- ── Governance ───────────────────────────────────────────────────────────────
  computed_at          timestamptz   NOT NULL DEFAULT now()
);

-- Indici di accesso
CREATE INDEX IF NOT EXISTS idx_worker_pib_worker
  ON personal.worker_pib (worker_identity_id);

CREATE INDEX IF NOT EXISTS idx_worker_pib_period
  ON personal.worker_pib (worker_identity_id, reporting_period);

CREATE INDEX IF NOT EXISTS idx_worker_pib_pillar
  ON personal.worker_pib (worker_identity_id, pillar);

CREATE INDEX IF NOT EXISTS idx_worker_pib_source_uef
  ON personal.worker_pib (source_uef_record_id)
  WHERE source_uef_record_id IS NOT NULL;

-- [U1] Idempotenza per PIB da UEF record (company_sourced)
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_pib_uef_pillar
  ON personal.worker_pib (worker_identity_id, source_uef_record_id, pillar)
  WHERE source_uef_record_id IS NOT NULL;

-- [U2] Idempotenza per PIB da partecipazione (partner / worker_declared)
CREATE UNIQUE INDEX IF NOT EXISTS uq_worker_pib_participation_pillar
  ON personal.worker_pib (worker_identity_id, source_participation_id, pillar)
  WHERE source_participation_id IS NOT NULL;

ALTER TABLE personal.worker_pib ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_pib FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: accesso completo per provisioning, diagnostica e computazione IU.
CREATE POLICY "worker_pib_kora_admin_all" ON personal.worker_pib
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: solo le proprie righe — risolto via subquery worker_identity (pattern canonico).
CREATE POLICY "worker_pib_worker_own_all" ON personal.worker_pib
  FOR ALL USING (
    kora.kora_role() = 'WORKER'
    AND worker_identity_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );

-- Nessuna policy per COMPANY_ADMIN / COMPANY_VIEWER — intenzionale e non negoziabile.
-- Il PIB individuale è worker-owned. L'azienda vede solo aggregati company-level.

GRANT SELECT, INSERT, UPDATE ON personal.worker_pib TO authenticated;

NOTIFY pgrst, 'reload schema';
