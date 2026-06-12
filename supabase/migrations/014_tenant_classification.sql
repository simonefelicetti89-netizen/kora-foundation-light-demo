-- =============================================================================
-- KORA Foundation Light — B131: Tenant Classification
-- Migration:   014_tenant_classification
-- Created:     2026-06-12
-- Branch:      feat/b131-tenant-classification
-- Gate:        Gate 2 OPEN — applied via Supabase SQL editor, no Prisma/ORM
-- =============================================================================
--
-- PROBLEM (pre-B131):
--   analytics.tenant has no classification field. LIVE companies, the OP-001
--   synthetic demo tenant, and any future TEST/SANDBOX tenants all appear as
--   identical rows. The only distinction was app-layer string checks like
--   `tenant_code === 'OP-001'` — hardcoded in 10+ files.
--
-- FIX:
--   Add tenant_kind text column with a strict CHECK constraint.
--   Backfill known synthetic tenant (OP-001 / industry_code = SYNTHETIC) → DEMO.
--   All other existing rows default to LIVE.
--
-- CLASSIFICATION SEMANTICS:
--   LIVE     — real pilot or production company; visible in live admin views
--   DEMO     — synthetic/guided demo tenant (e.g. OP-001); not in live views
--   TEST     — developer/QA test environment; not in live views
--   SANDBOX  — isolated experiment tenant; not in live views
--
-- LIFECYCLE vs CLASSIFICATION:
--   tenant_kind = classification (nature, permanent)
--   deleted_at  = soft-delete (lifecycle state, reversible)
--   These are orthogonal. Do not use tenant_kind for archival — use deleted_at.
--   'ARCHIVED' is intentionally excluded from the CHECK constraint.
--
-- RLS:
--   kora_admin_all_tenants (FOR ALL, no filter) — unchanged, admin sees all kinds.
--   company_own_tenant_read (SELECT, own tenant + deleted_at IS NULL) — unchanged.
--   No RLS modification needed: company users access only their own tenant row
--   regardless of tenant_kind.
--
-- =============================================================================

-- ── 1. Add tenant_kind column ─────────────────────────────────────────────────

ALTER TABLE analytics.tenant
  ADD COLUMN IF NOT EXISTS tenant_kind text NOT NULL DEFAULT 'LIVE'
  CHECK (tenant_kind IN ('LIVE', 'DEMO', 'TEST', 'SANDBOX'));

-- ── 2. Backfill — conservative, targeting only known synthetic tenants ─────────
--
-- Criteria:
--   a. tenant_code = 'OP-001'        — canonical synthetic demo pipeline tenant
--   b. industry_code = 'SYNTHETIC'   — operator-flow sets this on creation
--
-- All other rows remain LIVE (the DEFAULT covers retrocompatibility for any
-- existing rows that do not match either criterion).

UPDATE analytics.tenant
  SET tenant_kind = 'DEMO'
  WHERE tenant_code = 'OP-001'
     OR industry_code = 'SYNTHETIC';

-- ── 3. Index for fast filtering ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_kind
  ON analytics.tenant (tenant_kind);

-- ── 4. Column comment ─────────────────────────────────────────────────────────

COMMENT ON COLUMN analytics.tenant.tenant_kind IS
  'Tenant classification: LIVE = real company; DEMO = synthetic/guided demo; TEST = dev/QA; SANDBOX = isolated experiment. Use deleted_at for lifecycle/archival, not this field.';

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
