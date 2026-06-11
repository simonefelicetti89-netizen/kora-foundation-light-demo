-- migration: 012_partner_identity.sql
-- B127: Partner Workspace Foundation.
--
-- Creates network.partner_identity — maps Supabase auth users with kora_role=PARTNER
-- to a specific network.partner_profile record.
--
-- Design principles:
--   - auth_user_id (Supabase auth.users.id) → partner_profile.id
--   - KORA_ADMIN provisions all partner users (no self-signup)
--   - PARTNER sees only their own row (own auth_user_id)
--   - COMPANY roles: NO policy — company cannot access partner identity
--   - WORKER: NO policy — workers cannot access partner identity
--   - anon: NO policy
--   - kora_partner_id in app_metadata must match a row in this table

-- ── 1. network schema (should already exist from 010) ─────────────────────────

CREATE SCHEMA IF NOT EXISTS network;

-- ── 2. network.partner_identity ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS network.partner_identity (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid        NOT NULL REFERENCES network.partner_profile(id) ON DELETE CASCADE,
  auth_user_id  uuid        NOT NULL UNIQUE,
  email         text        NOT NULL,
  status        text        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('invited', 'active', 'disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE network.partner_identity IS
  'Maps Supabase auth users (kora_role=PARTNER) to network.partner_profile. '
  'Provisioned by KORA_ADMIN only — no self-signup. '
  'Company, worker, and anon have no policy on this table.';

COMMENT ON COLUMN network.partner_identity.auth_user_id IS
  'Supabase auth.users.id for this partner user. Must match app_metadata.kora_partner_id.';

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_identity_partner_id
  ON network.partner_identity (partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_identity_auth_user_id
  ON network.partner_identity (auth_user_id);

CREATE INDEX IF NOT EXISTS idx_partner_identity_status
  ON network.partner_identity (status);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE network.partner_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE network.partner_identity FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_identity_kora_admin_all"    ON network.partner_identity;
DROP POLICY IF EXISTS "partner_identity_partner_own_select" ON network.partner_identity;

-- KORA_ADMIN: full access for provisioning and diagnostics.
CREATE POLICY "partner_identity_kora_admin_all" ON network.partner_identity
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- PARTNER: read own row only (own auth_user_id from JWT sub claim).
-- auth.uid() = Supabase's built-in function returning the current user UUID.
CREATE POLICY "partner_identity_partner_own_select" ON network.partner_identity
  FOR SELECT
  USING (
    kora.kora_role() = 'PARTNER'
    AND auth_user_id = auth.uid()
  );

-- COMPANY (COMPANY_ADMIN, COMPANY_VIEWER): NO policy.
-- WORKER: NO policy.
-- anon: NO policy.
-- FORCE ROW LEVEL SECURITY ensures zero rows visible without a matching policy.

-- ── 5. Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON network.partner_identity TO authenticated;

-- ── 6. Updated_at trigger ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_partner_identity_updated_at ON network.partner_identity;

CREATE TRIGGER trg_partner_identity_updated_at
  BEFORE UPDATE ON network.partner_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
