-- migration: 011_worker_cv_share.sql
-- B126: Dynamic Impact CV Export & Controlled Sharing Foundation.
--
-- Creates personal.worker_cv_share — worker-controlled share tokens for the
-- Dynamic Impact CV. Design principles:
--   - Token stored as SHA-256 hash only — raw token shown once to worker, never persisted
--   - Worker creates and revokes their own share links
--   - No employer access — no company RLS policy created
--   - KORA_ADMIN has no UI path to create share links for real workers
--   - Default expiry: 30 days from creation
--   - Public share view uses server-side lookup via service role only
--   - access_count and last_accessed_at are updated on each valid view

-- ── 1. personal.worker_cv_share ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS personal.worker_cv_share (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES analytics.tenant(id) ON DELETE CASCADE,
  worker_id         uuid        NOT NULL REFERENCES personal.worker_identity(id) ON DELETE CASCADE,
  token_hash        text        NOT NULL UNIQUE,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'revoked', 'expired')),
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  last_accessed_at  timestamptz,
  access_count      integer     NOT NULL DEFAULT 0
);

COMMENT ON TABLE personal.worker_cv_share IS
  'Worker-controlled share tokens for Dynamic Impact CV. '
  'token_hash is SHA-256 of the raw token — raw token never stored. '
  'Company has no RLS policy on this table.';

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_worker_cv_share_worker_status
  ON personal.worker_cv_share (worker_id, status);

CREATE INDEX IF NOT EXISTS idx_worker_cv_share_token_hash
  ON personal.worker_cv_share (token_hash);

CREATE INDEX IF NOT EXISTS idx_worker_cv_share_expires_at
  ON personal.worker_cv_share (expires_at);

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE personal.worker_cv_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_cv_share FORCE ROW LEVEL SECURITY;

-- Canonical claim helpers (mig 004):
--   kora.kora_role()  — role checks; replaces raw (auth.jwt() -> 'app_metadata' ->> 'kora_role')
--   kora.tenant_id()  — tenant scoping; not used in this table (no tenant_id column here)
--
-- Worker-identity scoping (kora_worker_id):
--   worker_id = (auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid is intentionally retained.
--   kora_worker_id is set at provisioning time by /api/admin/workers/provision via auth-admin-update-user.
--   No canonical helper kora.worker_id() exists today — mig 004/006 define kora_role and tenant_id only.
--
--   ★ GATE 2 CTO DESIGN QUESTION:
--   Should KORA introduce a canonical kora.worker_id() helper for worker-scoped identity policies,
--   or is a direct (auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid read acceptable
--   where worker identity itself is the primary access key?
--   This is the only migration that reads kora_worker_id. Decision impacts future personal-schema tables.

-- KORA_ADMIN: read-only access for diagnostics (no create/update via UI).
-- KORA_ADMIN does NOT have a UI path to generate share links for real workers.
CREATE POLICY "worker_cv_share_kora_admin_read" ON personal.worker_cv_share
  FOR SELECT
  USING (
    kora.kora_role() = 'KORA_ADMIN'
  );

-- WORKER: full access to own rows only (own worker_id).
CREATE POLICY "worker_cv_share_worker_own_all" ON personal.worker_cv_share
  FOR ALL
  USING (
    kora.kora_role() = 'WORKER'
    -- kora_worker_id: raw read intentionally retained — no canonical helper exists (see note above).
    AND worker_id = (auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid
  )
  WITH CHECK (
    kora.kora_role() = 'WORKER'
    -- kora_worker_id: raw read intentionally retained — no canonical helper exists (see note above).
    AND worker_id = (auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid
  );

-- COMPANY roles: NO policy — company cannot access this table at all.
-- Public/anon: NO policy — public share route uses server-side service role lookup only.

-- ── 4. Grants ─────────────────────────────────────────────────────────────────

-- authenticated covers both WORKER and KORA_ADMIN sessions.
-- Service role (used by public share API) bypasses RLS by design.
GRANT SELECT, INSERT, UPDATE ON personal.worker_cv_share TO authenticated;

-- ── 5. Updated_at trigger ─────────────────────────────────────────────────────

CREATE TRIGGER trg_worker_cv_share_updated_at
  BEFORE UPDATE ON personal.worker_cv_share
  FOR EACH ROW
  EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- Note: updated_at column intentionally omitted — status/revoked_at/last_accessed_at
-- serve as the audit trail. The trigger is added for forward-compatibility if
-- updated_at is added in a future migration.
-- To avoid trigger error on missing column, drop it:
DROP TRIGGER IF EXISTS trg_worker_cv_share_updated_at ON personal.worker_cv_share;
