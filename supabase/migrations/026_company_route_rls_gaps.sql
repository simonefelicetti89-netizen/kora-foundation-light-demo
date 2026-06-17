-- supabase/migrations/026_company_route_rls_gaps.sql
-- B168 — Chiusura gap RLS per route company data-submissions.
--
-- GAP-1: analytics.source_batch INSERT — mancava policy COMPANY_ADMIN + GRANT INSERT
-- GAP-2: analytics.source_batch UPDATE — mancava policy COMPANY_ADMIN + GRANT UPDATE (own drafts only)
-- GAP-3: audit.audit_log INSERT — esisteva solo policy KORA_ADMIN; aggiunta gemella COMPANY_ADMIN
--
-- GATE 2 OPEN: questo file è SCRITTO ma NON applicato al DB.
-- Applicare SOLO dopo Gate 2 (CTO review) insieme agli altri file di migrazione.
--
-- Fonte di autorità: CLAUDE.md §9 (Gate 2), doc 12 (Technical Data Model).

-- ── GAP-1: analytics.source_batch INSERT ─────────────────────────────────────
-- Permette a COMPANY_ADMIN di creare nuove submission (source_type='company_submission').
-- Limitato al proprio tenant (kora.tenant_id() da JWT, mig 006).

GRANT INSERT ON analytics.source_batch TO authenticated;

CREATE POLICY analytics_source_batch_company_insert
  ON analytics.source_batch
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'kora_role' IN ('COMPANY_ADMIN')
    AND tenant_id = kora.tenant_id()
    AND source_type = 'company_submission'
  );

-- ── GAP-2: analytics.source_batch UPDATE ─────────────────────────────────────
-- Permette a COMPANY_ADMIN di modificare SOLO:
--   - proprie righe (tenant_id = kora.tenant_id())
--   - source_type = 'company_submission' (non batch admin/intake)
--   - stato attuale IN ('submission_draft', 'submission_pending') — blocca stati downstream
--     (approved, processing, reviewed, rejected sono gestiti SOLO da KORA_ADMIN)
-- WITH CHECK: vincola anche lo stato *risultante* IN ('submission_draft', 'submission_pending')
--   per impedire escalation a stati downstream via UPDATE diretto (Correzione 1).
-- GRANT UPDATE limitato a colonne specifiche — difesa in profondità.

GRANT UPDATE (batch_status, payload_sample, row_count, updated_at)
  ON analytics.source_batch TO authenticated;

CREATE POLICY analytics_source_batch_company_update
  ON analytics.source_batch
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'kora_role' IN ('COMPANY_ADMIN')
    AND tenant_id = kora.tenant_id()
    AND source_type = 'company_submission'
    AND batch_status IN ('submission_draft', 'submission_pending')
  )
  WITH CHECK (
    tenant_id = kora.tenant_id()
    AND source_type = 'company_submission'
    AND batch_status IN ('submission_draft', 'submission_pending')
  );

-- ── GAP-3: audit.audit_log INSERT (append-only) ───────────────────────────────
-- Permette a COMPANY_ADMIN di scrivere audit log relativi alle proprie azioni.
-- Vincoli obbligatori:
--   - tenant_id = kora.tenant_id(): l'azienda scrive solo nel proprio schema audit
--   - actor_id = auth.uid(): l'azienda non può scrivere audit a nome di altri utenti
--     (Correzione 2: difesa in profondità — combo "actor giusto + tenant sbagliato" fallisce)
-- NESSUN GRANT UPDATE/DELETE: audit log è append-only by design.
-- La policy esistente per KORA_ADMIN (mig 021) rimane invariata.

GRANT INSERT ON audit.audit_log TO authenticated;

CREATE POLICY audit_log_company_insert
  ON audit.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'kora_role' IN ('COMPANY_ADMIN')
    AND tenant_id = kora.tenant_id()
    AND actor_id = auth.uid()
  );
