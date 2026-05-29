-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA Foundation Light — Migration 002
-- Migration:   002_grants_and_softdelete
-- Created:     2026-05-29
-- Depends on:  001_live_v1_foundation
-- Gate status: Gate 2 (CTO review) required before production provisioning
-- ───────────────────────────────────────────────────────────────────────────────
-- Purpose:
--   Closes Gate 2 blocker B1 — explicit GRANT statements missing from 001.
--   Adds soft-delete filter to analytics.tenant company read policy.
--   Hardens personal schema with FORCE ROW LEVEL SECURITY.
--
-- What this migration does NOT do:
--   - Does not grant authenticated access to personal.uploaded_record
--   - Does not add INSERT/UPDATE/DELETE grants to authenticated
--   - Does not touch engine, formulas, seed, UI, routes, or scoring provider
--   - Does not modify audit_log append-only guarantee
--   - Does not create new tables or indexes
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. GRANT USAGE on custom schemas for authenticated ────────────────────────
-- Required for RLS policies to resolve table references.
-- 001 granted kora only; these four were missing.

GRANT USAGE ON SCHEMA analytics TO authenticated;
GRANT USAGE ON SCHEMA personal  TO authenticated;
GRANT USAGE ON SCHEMA gov       TO authenticated;
GRANT USAGE ON SCHEMA audit     TO authenticated;


-- ── 2. GRANT SELECT on readable tables for authenticated ──────────────────────
-- One-way grant: SELECT only. INSERT/UPDATE/DELETE always via service_role server-side.
-- Rows visible to each user are controlled by the RLS policies in 001.

-- analytics schema — all tables have RLS policies for company/advisor roles
GRANT SELECT ON analytics.tenant                TO authenticated;
GRANT SELECT ON analytics.source_batch          TO authenticated;
GRANT SELECT ON analytics.uef_record            TO authenticated;  -- ADVISOR + KORA_ADMIN via RLS
GRANT SELECT ON analytics.activation_result     TO authenticated;
GRANT SELECT ON analytics.confidence_result     TO authenticated;
GRANT SELECT ON analytics.bti_result            TO authenticated;
GRANT SELECT ON analytics.kora_index_result     TO authenticated;
GRANT SELECT ON analytics.decision_pack_version TO authenticated;

-- personal schema — workforce_baseline only
-- uploaded_record: intentionally excluded — no authenticated grant, ever.
-- Access to uploaded_record is KORA_ADMIN only, always via service_role.
GRANT SELECT ON personal.workforce_baseline TO authenticated;

-- gov schema
GRANT SELECT ON gov.budget_governance TO authenticated;

-- audit schema — SELECT granted; RLS restricts rows to kora_role = 'KORA_ADMIN'
GRANT SELECT ON audit.audit_log TO authenticated;


-- ── 3. GRANT USAGE and ALL TABLES for service_role on custom schemas ──────────
-- service_role bypasses RLS via BYPASSRLS privilege (Supabase default).
-- Explicit grants needed for custom schemas to allow server-side operations:
-- scoring persistence, audit log writes, admin batch operations.

GRANT USAGE ON SCHEMA analytics, personal, gov, audit, kora TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA analytics TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA analytics TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA personal  TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA personal  TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA gov       TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA gov       TO service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA audit     TO service_role;
-- audit has no sequences (uuid PKs via gen_random_uuid, no serial columns)

GRANT EXECUTE ON FUNCTION kora.tenant_id(), kora.kora_role() TO service_role;


-- ── 4. Soft-delete filter on analytics.tenant company read policy ─────────────
-- analytics.tenant is the only table with a deleted_at column (soft delete).
-- Company roles must not see soft-deleted tenants.
-- KORA_ADMIN policy (kora_admin_all_tenants, FOR ALL) is unchanged — admin
-- retains visibility over soft-deleted records for audit and recovery purposes.

DROP POLICY IF EXISTS "company_own_tenant_read" ON analytics.tenant;

CREATE POLICY "company_own_tenant_read" ON analytics.tenant
  FOR SELECT USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER', 'ADVISOR')
    AND id = kora.tenant_id()
    AND deleted_at IS NULL
  );


-- ── 5. FORCE ROW LEVEL SECURITY on personal schema ───────────────────────────
-- Applies RLS even to the table owner (postgres role).
-- service_role is not affected — it holds the BYPASSRLS privilege in Supabase
-- and continues to have full access for server-side operations.
-- This hardens the personal schema against accidental superuser-level queries
-- that would otherwise bypass the privacy boundary.

ALTER TABLE personal.uploaded_record    FORCE ROW LEVEL SECURITY;
ALTER TABLE personal.workforce_baseline FORCE ROW LEVEL SECURITY;
