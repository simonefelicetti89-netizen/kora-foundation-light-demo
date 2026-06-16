-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 022: Worker RLS gap closure
-- Migration:   022_worker_rls_gaps
-- Created:     2026-06-16
-- Block:       B163 — Migrazione route worker al session-client, hardening RLS
-- Gate:        Gate 2 OPEN — written, NOT applied
--              Applicabile insieme a 020/021 al pilot.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Chiude i due gap RLS identificati in B163 Fase 1 che bloccavano la migrazione
-- di alcune route worker da getSupabaseServiceClient a getSupabaseServerClient.
--
-- GAP A — personal.worker_identity UPDATE per WORKER
--   Mancava la policy FOR UPDATE per ruolo WORKER.
--   Bloccava: onboarding POST (status 'invited' → 'active') e profile PATCH
--   (status update on onboarding completion).
--   La policy SELECT esistente (worker_identity_worker_own_select, mig 007)
--   permetteva solo la lettura. La nuova policy usa la stessa condizione:
--   auth_user_id = auth.uid() — il worker aggiorna solo la propria riga.
--   WITH CHECK uguale al USING: non permette di cambiare auth_user_id
--   (impedisce di riassegnare la riga a un altro utente).
--
-- GAP C — analytics.tenant SELECT per WORKER
--   Mancava qualsiasi policy per ruolo WORKER su analytics.tenant.
--   Bloccava: dynamic-cv GET (legge company_name per il CV).
--   La policy limita la visibilità al solo record del proprio tenant
--   (id = kora.tenant_id() — letto dal JWT app_metadata).
--   Company e KORA_ADMIN non sono toccati: le loro policy esistenti restano.
--
-- IDEMPOTENTE: usa IF NOT EXISTS / DROP POLICY IF EXISTS dove applicabile.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Gap A: personal.worker_identity — UPDATE policy per WORKER ────────────────
-- Condizione identica alla SELECT esistente (mig 007 riga 46):
--   kora.kora_role() = 'WORKER' AND auth_user_id = auth.uid()
-- WITH CHECK uguale al USING: il worker non può cambiare auth_user_id (
-- evita che un UPDATE sposti la riga sotto un altro auth.uid()).

DROP POLICY IF EXISTS "worker_identity_worker_own_update" ON personal.worker_identity;

CREATE POLICY "worker_identity_worker_own_update" ON personal.worker_identity
  FOR UPDATE
  USING  (kora.kora_role() = 'WORKER' AND auth_user_id = auth.uid())
  WITH CHECK (kora.kora_role() = 'WORKER' AND auth_user_id = auth.uid());

-- ── Gap C: analytics.tenant — SELECT policy per WORKER ───────────────────────
-- Visibilità limitata al solo record del tenant del worker chiamante.
-- kora.tenant_id() legge kora_tenant_id da JWT app_metadata (mig 003/004).
-- Company e KORA_ADMIN non toccati: "kora_admin_all_tenants" e
-- "company_own_tenant_read" (mig 001) restano invariate.

DROP POLICY IF EXISTS "analytics_tenant_worker_own_read" ON analytics.tenant;

CREATE POLICY "analytics_tenant_worker_own_read" ON analytics.tenant
  FOR SELECT
  USING (kora.kora_role() = 'WORKER' AND id = kora.tenant_id());

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
