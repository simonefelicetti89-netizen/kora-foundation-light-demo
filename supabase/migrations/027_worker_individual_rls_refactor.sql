-- 027_worker_individual_rls_refactor.sql
-- B168 Phase 3 — Privacy Guard Granularization: rimozione kora_admin_all da tabelle personal.*.
--
-- Principio: worker-individual data è off-limits per TUTTI i ruoli applicativi eccetto WORKER (own).
-- - personal.worker_pib: solo SECURITY DEFINER per aggregazione company-level
-- - personal.worker_identity: provisioning via service-role isolato (non via app role)
-- - personal.worker_pseudonym_map: zero accessi applicativi — solo SECURITY DEFINER
-- - personal.worker_profile_private: worker own-read; nessun admin
-- - analytics.impact_unit: solo WORKER (own) + company aggregate via funzioni
--
-- Riferimento: docs/access-matrix.md — matrice autoritativa
-- Implementazione app: canAccess('KORA_ADMIN', 'worker_individual_pib', *) → DENY
--
-- Gate 2 OPEN — SCRITTO, NON APPLICATO.
-- NON applicare a nessun DB (production o staging) prima della chiusura di Gate 2 (CTO review).
-- Applicare SOLO dopo: conferma Gate 2 + verifica provisioning service-role isolato.

BEGIN;

-- ── personal.worker_identity ────────────────────────────────────────────────
-- Accesso admin rimosso. Il provisioning worker (onboarding, invito) deve usare
-- il path service-role isolato (pattern: lib/supabase/auth-admin-update-user.ts).
DROP POLICY IF EXISTS worker_identity_kora_admin_all ON personal.worker_identity;

-- ── personal.worker_pib ─────────────────────────────────────────────────────
-- PIB individuale mai accessibile via app role — solo SECURITY DEFINER aggregation.
-- Rimozione completa accesso admin.
DROP POLICY IF EXISTS worker_pib_kora_admin_all ON personal.worker_pib;

-- ── personal.worker_pseudonym_map ───────────────────────────────────────────
-- Tabella più sensibile: zero accessi applicativi. Solo funzioni SECURITY DEFINER.
-- Il link pseudonym→identity viene inserito solo da system procedures al momento
-- del provisioning — non tramite INSERT diretti da ruolo admin.
DROP POLICY IF EXISTS worker_pseudonym_map_kora_admin_all ON personal.worker_pseudonym_map;

-- ── personal.worker_profile_private ─────────────────────────────────────────
-- Profilo privato: solo worker su propri dati.
DROP POLICY IF EXISTS worker_profile_kora_admin_all ON personal.worker_profile_private;

-- ── analytics.impact_unit — narrowed ────────────────────────────────────────
-- Le policy kora_admin_impact_unit_read e kora_admin_impact_unit_insert
-- permettevano accesso diretto a IU individuali. Rimosse.
-- Company-aggregate IU remains accessible via SECURITY DEFINER aggregate functions.
DROP POLICY IF EXISTS kora_admin_impact_unit_read   ON analytics.impact_unit;
DROP POLICY IF EXISTS kora_admin_impact_unit_insert ON analytics.impact_unit;

-- ── Nota: analytics.uef_record ──────────────────────────────────────────────
-- kora_admin_all_uef non viene rimossa in questa migrazione — tensione architetturale:
-- la stessa policy copre sia UEF individuali (da restringere) sia pipeline monitoring
-- (necessario per KORA_ADMIN). La granularizzazione di questa policy richiede
-- separazione tramite SECURITY DEFINER views — da fare in migrazione successiva.

-- ── Nota: Operazioni di provisioning ────────────────────────────────────────
-- Con questa migrazione, le operazioni di provisioning worker che usavano RLS
-- admin devono transitare al path service-role isolato:
--   lib/supabase/worker-provisioning-service-key.ts (da creare)
-- Pattern identico a lib/supabase/auth-admin-update-user.ts (B163) e
--   lib/supabase/storage-service-key.ts (B168-P3).

COMMIT;
