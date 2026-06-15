-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 017: Worker Pseudonym Map
-- Migration:   017_worker_pseudonym_map
-- Created:     2026-06-15
-- Block:       B160 — Worker Grado 1
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Risolve il gap pseudonym↔identity identificato nella B160 Phase 1.
-- Lega un worker autenticato (personal.worker_identity) al suo pseudonym_id
-- usato nella pipeline IU (analytics.uef_record e analytics.impact_unit).
--
-- La catena completa è:
--   JWT auth.uid()
--     → personal.worker_identity WHERE auth_user_id = auth.uid()
--     → personal.worker_pseudonym_map WHERE worker_identity_id = worker_identity.id
--     → pseudonym_id (input per query IU della pipeline)
--     → analytics.uef_record WHERE pseudonym_id = ?  (future per-worker UEF records)
--
-- PRIVACY GUARANTEE — NON NEGOZIABILE (decisione founder B160)
-- ─────────────────────────────────────────────────────────────
-- Questa tabella è l'oggetto più sensibile nello schema.
-- Il legame pseudonym→identità deve essere accessibile SOLO al worker stesso.
-- L'azienda NON deve MAI leggere questa tabella — farlo de-anonimizzerebbe i worker.
--
-- Enforcement a livello DB:
--   - FORCE ROW LEVEL SECURITY: anche i superuser vengono bloccati in sessioni autenticate
--   - Nessuna policy per COMPANY_ADMIN o COMPANY_VIEWER (0 righe visibili per costruzione)
--   - GRANT solo su authenticated — nessun path anonimo
--
-- 1:1 con worker_identity (UNIQUE su worker_identity_id):
--   Un worker ha un solo pseudonym_id nella prima fase pilot.
--   Estensione multi-tenant del pseudonym_id è post-Pilot+.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personal.worker_pseudonym_map (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_identity_id uuid        NOT NULL UNIQUE
                                 REFERENCES personal.worker_identity (id) ON DELETE CASCADE,
  pseudonym_id       text        NOT NULL UNIQUE,
  linked_at          timestamptz NOT NULL DEFAULT now(),
  linked_by          text        NOT NULL
                                 CHECK (linked_by IN ('company_provisioning', 'kora_admin', 'worker_self'))
);

-- Index per lookup pipeline: pseudonym_id → worker_identity_id
CREATE INDEX IF NOT EXISTS idx_worker_pseudonym_map_pseudonym
  ON personal.worker_pseudonym_map (pseudonym_id);

ALTER TABLE personal.worker_pseudonym_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_pseudonym_map FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: accesso completo per provisioning e diagnostica.
CREATE POLICY "worker_pseudonym_map_kora_admin_all" ON personal.worker_pseudonym_map
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: solo la propria riga — il worker conosce il proprio pseudonym_id.
-- Risolto via subquery su worker_identity (pattern canonico da mig 007/008).
CREATE POLICY "worker_pseudonym_map_worker_own_select" ON personal.worker_pseudonym_map
  FOR SELECT USING (
    kora.kora_role() = 'WORKER'
    AND worker_identity_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );

-- Nessuna policy per COMPANY_ADMIN / COMPANY_VIEWER — intenzionale e non negoziabile.
-- Qualunque tentativo di aggiungere una policy company qui è una violazione privacy.

GRANT SELECT, INSERT ON personal.worker_pseudonym_map TO authenticated;

NOTIFY pgrst, 'reload schema';
