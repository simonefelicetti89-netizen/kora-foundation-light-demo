-- 028_audit_log_enrichment.sql
-- B168 Phase 4 — Arricchimento schema audit.audit_log.
--
-- Aggiunge i campi mancanti rispetto alla spec Phase 4:
--   - environment (demo/live/future): contestualizza ogni evento nel sistema
--   - ip_hash (text): hash SHA-256 dell'IP — la colonna ip_address (inet) raw
--     rimane per backward compat; ip_hash viene scritta invece di ip_address
--     nei nuovi accessi
--   - user_agent_hash (text): hash SHA-256 dello user-agent
--
-- RLS: aggiunge la policy per audit_reader sub-role separato da KORA_ADMIN standard.
-- La read policy corrente "kora_admin_read_audit" (mig 001) permette a TUTTI i
-- KORA_ADMIN di leggere l'audit log — Phase 4 la restringe al solo audit_reader sub-role.
--
-- Gate 2 OPEN — SCRITTO, NON APPLICATO.
-- NON applicare a nessun DB prima della chiusura di Gate 2 (CTO review).
--
-- IDEMPOTENT: this migration can be applied multiple times safely.
-- ADD COLUMN IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, CREATE ROLE via DO $$,
-- CREATE POLICY via DO $$ guard (B168.6 P4.0.4).

BEGIN;

-- ── Aggiungi i campi mancanti ────────────────────────────────────────────────

ALTER TABLE audit.audit_log
  ADD COLUMN IF NOT EXISTS environment      text
    CHECK (environment IN ('demo', 'live', 'future')),
  ADD COLUMN IF NOT EXISTS ip_hash          text,
  ADD COLUMN IF NOT EXISTS user_agent_hash  text;

-- ── Commenti sui nuovi campi ─────────────────────────────────────────────────
COMMENT ON COLUMN audit.audit_log.environment     IS 'Ambiente operativo al momento dell''evento: demo | live | future';
COMMENT ON COLUMN audit.audit_log.ip_hash         IS 'SHA-256(ip_address) — hash one-way per analisi senza conservare IP raw';
COMMENT ON COLUMN audit.audit_log.user_agent_hash IS 'SHA-256(user_agent) — hash one-way per fingerprint senza conservare UA raw';

-- ── Indice su environment per query di audit contestualizzate ────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_environment ON audit.audit_log (environment);

-- ── Sub-role audit_reader ────────────────────────────────────────────────────
-- Separato da KORA_ADMIN standard per principio del minimo privilegio.
-- Solo gli operatori con audit_reader possono leggere l'audit log.
-- La policy esistente "kora_admin_read_audit" (mig 001) rimane — verrà deprecata
-- quando audit_reader sarà provisionato. Nel frattempo entrambe coesistono.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'audit_reader'
  ) THEN
    CREATE ROLE audit_reader;
  END IF;
END $$;

-- Policy SELECT per audit_reader — complementare a kora_admin_read_audit.
-- Quando audit_reader è assegnato agli operatori che necessitano di audit access,
-- la policy kora_admin_read_audit può essere rimossa per il principio PoLP.
-- B168.6 P4.0.4: DO $$ guard per idempotenza (CREATE POLICY non supporta IF NOT EXISTS).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'audit'
      AND tablename  = 'audit_log'
      AND policyname = 'audit_reader_select'
  ) THEN
    CREATE POLICY "audit_reader_select" ON audit.audit_log
      FOR SELECT
      USING (pg_has_role(current_user, 'audit_reader', 'USAGE'));
  END IF;
END $$;

COMMIT;
