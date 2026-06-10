-- =============================================================================
-- KORA Foundation Light — B116: Partner Map Foundation
-- Migration:   010_partner_profile
-- Schemas:     network (new)
-- Gate:        Gate 2 OPEN — no Prisma, no ORM, apply via Supabase SQL Editor
-- =============================================================================
--
-- PRIVACY DOCTRINE (network.partner_profile)
-- -------------------------------------------
-- KORA_ADMIN = ALL (full catalog management)
-- WORKER     = SELECT WHERE status = 'published' (read-only, published only)
-- Company    = NO POLICY (intentional — company roles never read partner data directly)
-- anon       = NO POLICY (no public access)
--
-- App layer enforces role check before any partner data is returned.
-- No worker interaction tracking in this migration (no click/view/favorite tables).
-- All published partners are visible to all authenticated workers globally
-- (no per-tenant visibility table in Foundation Light).
-- =============================================================================
--
-- IDEMPOTENT: safe to re-run. Uses IF NOT EXISTS and DROP POLICY IF EXISTS.
-- Run AFTER migrations 007, 008, 009.
-- =============================================================================

-- ── 1. Schema ─────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS network;

-- ── 2. partner_profile ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS network.partner_profile (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  pillar        text        NOT NULL
                            CHECK (pillar IN ('LIFE','GROWTH','CONNECTION','IMPACT','LEGACY')),
  category      text,
  website_url   text,
  city          text,
  country       text        NOT NULL DEFAULT 'IT',
  delivery_mode text        NOT NULL DEFAULT 'online'
                            CHECK (delivery_mode IN ('online','onsite','hybrid')),
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_profile_status ON network.partner_profile (status);
CREATE INDEX IF NOT EXISTS idx_partner_profile_pillar ON network.partner_profile (pillar);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE network.partner_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE network.partner_profile FORCE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "network_partner_kora_admin_all"               ON network.partner_profile;
DROP POLICY IF EXISTS "network_partner_worker_published_select"      ON network.partner_profile;

-- KORA_ADMIN: full access for catalog management and diagnostics.
CREATE POLICY "network_partner_kora_admin_all" ON network.partner_profile
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: read published partners only — cannot see draft or archived.
CREATE POLICY "network_partner_worker_published_select" ON network.partner_profile
  FOR SELECT USING (
    kora.kora_role() = 'WORKER'
    AND status = 'published'
  );

-- No company policy — intentional.
-- Company roles (COMPANY_ADMIN, COMPANY_VIEWER) have zero visibility into this table.
-- Aggregate partner intelligence (if ever built) must go through a separate,
-- company-aggregate-only route — never directly from partner_profile.

-- ── 4. Grants ─────────────────────────────────────────────────────────────────
-- authenticated role must have table-level GRANT for RLS to evaluate at all.
-- The policies above still restrict row visibility per role.

GRANT SELECT, INSERT, UPDATE ON network.partner_profile TO authenticated;

-- ── 5. Updated-at trigger ─────────────────────────────────────────────────────
-- set_updated_at() is created in migration 001_live_v1_foundation.sql.

DROP TRIGGER IF EXISTS trg_partner_profile_updated_at ON network.partner_profile;

CREATE TRIGGER trg_partner_profile_updated_at
  BEFORE UPDATE ON network.partner_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
