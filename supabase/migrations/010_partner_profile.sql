-- supabase/migrations/010_partner_profile.sql
-- B116: Partner Map Foundation — network schema + partner_profile table.
--
-- Creates network.partner_profile for the KORA partner catalog.
-- KORA_ADMIN manages partners via /admin/partners.
-- Workers read only published partners via /worker/opportunities (app-layer filter).
-- Company roles have no access to partner interaction data (app-layer enforced).
--
-- Privacy model:
--   - No worker interaction tracking in this migration (no click/view/favorite tables).
--   - No per-tenant visibility table — all published partners are visible to all workers.
--   - App layer always enforces role check before returning partner data.
--
-- Apply via Supabase SQL Editor.
-- Run AFTER migrations 007, 008, 009.

-- ── Schema ─────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS network;

-- ── partner_profile ───────────────────────────────────────────────────────────

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

-- RLS: all app access uses the service role key (bypasses RLS).
-- RLS is enabled as belt-and-suspenders — actual enforcement is at the app layer.
ALTER TABLE network.partner_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE network.partner_profile FORCE ROW LEVEL SECURITY;

-- Signal PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
