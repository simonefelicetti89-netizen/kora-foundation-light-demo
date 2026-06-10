-- =============================================================================
-- KORA Foundation Light — B104: Worker Provisioning Live Foundation
-- Migration:   007_worker_provisioning
-- Created:     2026-06-08
-- Gate:        Gate 2 OPEN — no Prisma, no ORM, SQL via Supabase dashboard only
-- =============================================================================
--
-- PRIVACY DOCTRINE (non-negotiable)
-- ----------------------------------
-- worker_identity:       KORA_ADMIN = ALL; WORKER = own row only; Company = NO POLICY
-- worker_profile_private: KORA_ADMIN = ALL; WORKER = own row only; Company = NO POLICY
--
-- Company aggregate counts are served only via service-role app-layer queries.
-- No employer role ever reads individual worker rows — RLS enforces this at DB layer.
-- =============================================================================

-- ── 1. personal.worker_identity ──────────────────────────────────────────────
-- One row per invited/active worker. Links Supabase auth.users to a KORA tenant.
-- auth_user_id is set on invite acceptance (Supabase sends the user id immediately).
-- worker_ref is an opaque pseudonym — never a real name or email.

CREATE TABLE IF NOT EXISTS personal.worker_identity (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  auth_user_id  uuid        NOT NULL UNIQUE,
  worker_ref    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'invited'
                            CHECK (status IN ('invited', 'active', 'pending', 'disabled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_identity_tenant   ON personal.worker_identity (tenant_id);
CREATE INDEX IF NOT EXISTS idx_worker_identity_auth     ON personal.worker_identity (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_worker_identity_status   ON personal.worker_identity (tenant_id, status);

ALTER TABLE personal.worker_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_identity FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: full access for provisioning and diagnostics.
CREATE POLICY "worker_identity_kora_admin_all" ON personal.worker_identity
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: read own row only — cannot see other workers' identity rows.
CREATE POLICY "worker_identity_worker_own_select" ON personal.worker_identity
  FOR SELECT USING (
    kora.kora_role() = 'WORKER'
    AND auth_user_id = auth.uid()
  );

-- No company policy — intentional. Company roles get 0 rows from this table.

-- ── 2. personal.worker_profile_private ────────────────────────────────────────
-- Worker-private profile data. 1:1 with worker_identity.
-- Company roles have ZERO visibility into this table — no RLS policy, no GRANT workaround.
-- Aggregate counts flow only through service-role app-layer queries.

CREATE TABLE IF NOT EXISTS personal.worker_profile_private (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id      uuid        NOT NULL UNIQUE REFERENCES personal.worker_identity (id) ON DELETE CASCADE,
  display_name   text,
  preferred_lang text        NOT NULL DEFAULT 'it',
  onboarding_done boolean    NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE personal.worker_profile_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_profile_private FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: full access for operational support.
CREATE POLICY "worker_profile_kora_admin_all" ON personal.worker_profile_private
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: own row only — resolved via worker_identity lookup.
CREATE POLICY "worker_profile_worker_own_all" ON personal.worker_profile_private
  FOR ALL USING (
    kora.kora_role() = 'WORKER'
    AND worker_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );

-- No company policy — intentional.

-- ── 3. GRANTS ────────────────────────────────────────────────────────────────
-- authenticated role must have table-level GRANT for RLS to evaluate at all.
-- The policies above still restrict row visibility.

GRANT SELECT, INSERT, UPDATE ON personal.worker_identity TO authenticated;
GRANT SELECT, INSERT, UPDATE ON personal.worker_profile_private TO authenticated;

-- ── 4. Updated-at triggers ────────────────────────────────────────────────────

CREATE TRIGGER trg_worker_identity_updated_at
  BEFORE UPDATE ON personal.worker_identity
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_worker_profile_private_updated_at
  BEFORE UPDATE ON personal.worker_profile_private
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
