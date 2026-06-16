-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 021: Tenant Pilot+ flag
-- Migration:   021_tenant_pilot_ready
-- Created:     2026-06-16
-- Block:       B162 — Accensione branch Pilot+
-- Gate:        Gate 2 OPEN — written, NOT applied
-- ───────────────────────────────────────────────────────────────────────────────
-- PURPOSE
-- ───────
-- Aggiunge production_ready boolean a analytics.tenant per abilitare
-- la promozione esplicita a Pilot+.
--
-- Pilot+ significa: pipeline reale applicata (mig 016-019), worker pseudonymization
-- attiva, per-worker UEF records disponibili. NON è un flag automatico.
-- La transizione è SEMPRE esplicita via KORA_ADMIN (route /api/admin/tenants/[id]/promote-to-pilot).
--
-- DEFAULT false garantisce che nessun tenant esistente diventi Pilot+ per effetto
-- della sola applicazione di questa migrazione.
--
-- COLONNE
-- ───────
--   production_ready    boolean NOT NULL DEFAULT false
--     → flag principale Pilot+. Controllato da WorkerSpaceCapabilityService.
--
--   production_ready_at timestamptz NULL
--     → timestamp della prima promozione (popolato solo quando production_ready → true).
--       Preservato nelle chiamate idempotenti successive alla promozione.
--
--   production_ready_by text NULL
--     → auth.users.id dell'admin che ha effettuato la promozione.
--       Traccia l'attore anche senza leggere audit_log.
--
-- INDICE
-- ──────
-- Indice parziale su production_ready = true: query "trova tenant Pilot+" sono
-- rare e lavorano su un subset piccolo — nessun bisogno di scansionare tutti i tenant.
--
-- RLS ANALYTICS.TENANT
-- ─────────────────────
-- La policy esistente "kora_admin_all_tenants" (FOR ALL) già copre UPDATE
-- con getSupabaseServerClient (sessione KORA_ADMIN). Nessuna policy nuova necessaria
-- per analytics.tenant.
--
-- AUDIT_LOG INSERT POLICY
-- ────────────────────────
-- audit.audit_log ha solo SELECT policy per authenticated (mig 001 riga 516).
-- INSERT è service-role only by design.
-- La route promote-to-pilot usa getSupabaseServerClient (non service client),
-- quindi aggiunge qui la policy INSERT per KORA_ADMIN in modo che l'audit write
-- avvenga nello stesso client — senza introdurre service-role bypass nella route.
-- Questa policy non indebolisce il modello: KORA_ADMIN ha già SELECT completo
-- sul log; UPDATE/DELETE rimangono revocati (mig 001 riga 524).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Colonne Pilot+ su analytics.tenant ─────────────────────────────────────

ALTER TABLE analytics.tenant
  ADD COLUMN IF NOT EXISTS production_ready    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS production_ready_at timestamptz          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS production_ready_by text                 DEFAULT NULL;

-- ── 2. Indice parziale — query "trova tenant Pilot+" ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_pilot
  ON analytics.tenant (id)
  WHERE production_ready = true;

-- ── 3. Commenti ───────────────────────────────────────────────────────────────

COMMENT ON COLUMN analytics.tenant.production_ready IS
  'Pilot+ gate: true = tenant promosso alla pipeline reale (mig 016-019 applicate, '
  'worker pseudonymization attiva). Settato SOLO da KORA_ADMIN via '
  '/api/admin/tenants/[id]/promote-to-pilot. DEFAULT false: nessun tenant '
  'diventa Pilot+ automaticamente.';

COMMENT ON COLUMN analytics.tenant.production_ready_at IS
  'Timestamp (UTC) della prima promozione a Pilot+. NULL se production_ready = false. '
  'Immutabile dopo la prima promozione (non sovrascritto nelle chiamate idempotenti).';

COMMENT ON COLUMN analytics.tenant.production_ready_by IS
  'auth.users.id dell''admin che ha effettuato la promozione. NULL se production_ready = false.';

-- ── 4. Policy INSERT su audit.audit_log per KORA_ADMIN ───────────────────────
-- Consente alla route promote-to-pilot di scrivere l'audit event
-- via getSupabaseServerClient (sessione KORA_ADMIN) senza service-role bypass.
-- UPDATE e DELETE su audit_log restano revocati (mig 001 riga 524).

CREATE POLICY "kora_admin_insert_audit" ON audit.audit_log
  FOR INSERT
  WITH CHECK (kora.kora_role() = 'KORA_ADMIN');

-- ── 5. Reload schema PostgREST ────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
