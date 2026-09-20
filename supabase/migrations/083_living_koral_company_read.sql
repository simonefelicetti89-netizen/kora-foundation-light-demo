-- KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
-- Founder adjudication, .kora-audit/output/172_KORA_WP_114_CANONICAL_
-- PRE_CHECK.md §31).
--
-- Canonical authority: Registry 142 (`142_...md:275`), pre-check 172
-- (`.kora-audit/output/172_...md`), this WP's own Founder-authorized
-- implementation task.
--
-- POLICY-ONLY MIGRATION — no new table, no new column, no materialized
-- view, no new state model, no grant widening beyond what these two
-- policies themselves require (this WP's own explicit §6 instruction).
--
-- Adds exactly two additive RLS policies, mirroring migration 079's own
-- `company_own_..._read` precedent verbatim (analytics.kora_ready_
-- attainment / analytics.current_readiness_health, KORA-WP-027):
--   - gov.living_koral_transformation_ledger  — COMPANY_ADMIN, own tenant, SELECT only
--   - analytics.living_koral_state            — COMPANY_ADMIN, own tenant, SELECT only
--
-- Additive to the existing KORA_ADMIN `FOR ALL` policy on each table
-- (migration 082) — RLS policies are OR'd, so the existing KORA_ADMIN/
-- service_role/WORKER/ADVISOR boundaries are not narrowed, removed, or
-- reinterpreted by this migration. No new GRANT statement is required:
-- `authenticated` already has table-level SELECT on both tables (migration
-- 082's own grants) — required for any authenticated-role RLS-gated read
-- path (KORA_ADMIN's, and now COMPANY_ADMIN's) to exist at all; RLS's own
-- policies remain the real, per-row authorization gate.
--
-- Company writes: NOT granted (no INSERT/UPDATE/DELETE policy or grant
-- added for COMPANY_ADMIN on either table — the Company Hub is 100%
-- read-only, this WP's own §7/§13 instruction). Worker/Advisor access:
-- NOT granted (no WORKER/ADVISOR policy added on either table — Advisor
-- read is a later, separate WP-116 concern, Assignment-scoped; Worker is
-- never a reader in the 111-119 chain at all).
--
-- gov.living_koral_material_change and personal.worker_initiative are
-- deliberately NOT touched by this migration — a genuine, disclosed
-- implementation-time finding (see lib/living-koral-company-view/types.ts's
-- own header comment and the WP-114 completion report §16): resolving the
-- *specific* real source object (e.g. an initiative's own title) would
-- require RLS on one or both of those tables, which this WP's own explicit
-- Founder-given migration scope ("policy on: gov.living_koral_
-- transformation_ledger, analytics.living_koral_state" only) does not
-- authorize. The Company Hub therefore surfaces real, accurate DOMAIN-
-- level provenance (category + affected domain + real timestamps, already
-- present on the Ledger row) rather than expanding RLS scope unilaterally
-- or reaching for a service-role bypass (explicitly forbidden for a
-- tenant self-service surface, lib/supabase/server.ts's own doc comment).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "company_own_living_koral_transformation_ledger_read" ON gov.living_koral_transformation_ledger
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

CREATE POLICY "company_own_living_koral_state_read" ON analytics.living_koral_state
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the DROPs below
-- DROP POLICY IF EXISTS "company_own_living_koral_state_read" ON analytics.living_koral_state;
-- DROP POLICY IF EXISTS "company_own_living_koral_transformation_ledger_read" ON gov.living_koral_transformation_ledger;
