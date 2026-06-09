-- =============================================================================
-- KORA Foundation Light — B109: Worker Experience MVP
-- Migration:   008_worker_initiatives
-- Created:     2026-06-09
-- Gate:        Gate 2 OPEN — no Prisma, no ORM, SQL via Supabase dashboard only
-- =============================================================================
--
-- PRIVACY DOCTRINE (non-negotiable)
-- ----------------------------------
-- worker_initiative:     Published by KORA_ADMIN per tenant.
--   KORA_ADMIN = ALL; WORKER = SELECT published of own tenant; Company = NO DIRECT POLICY
--   Company aggregate counts served only via service-role app-layer queries.
--
-- worker_participation:  Worker-private participation record.
--   KORA_ADMIN = ALL; WORKER = own rows only; Company = NO POLICY (ever)
--   Company never reads individual participation rows.
--   Aggregate participation counts flow only through service-role app-layer queries
--   with SAFE_AGGREGATION_THRESHOLD enforcement (N>=10).
--
-- private_note:          Worker-only field. NEVER returned in any employer-facing response.
--                        Not logged in audit trail.
-- =============================================================================

-- ── 1. personal.worker_initiative ─────────────────────────────────────────────
-- One row per initiative published by KORA_ADMIN for a tenant.
-- Workers see only published initiatives of their own tenant.

CREATE TABLE IF NOT EXISTS personal.worker_initiative (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  title            text        NOT NULL CHECK (char_length(title) >= 2),
  description      text,
  pillar           text        NOT NULL
                               CHECK (pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY')),
  eligibility_class text       NOT NULL DEFAULT 'eligible'
                               CHECK (eligibility_class IN ('eligible', 'limited')),
  status           text        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'published', 'closed')),
  start_date       date,
  end_date         date,
  mode             text,
  location         text,
  provider         text,
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_initiative_tenant  ON personal.worker_initiative (tenant_id);
CREATE INDEX IF NOT EXISTS idx_worker_initiative_status  ON personal.worker_initiative (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_initiative_pillar  ON personal.worker_initiative (tenant_id, pillar);

ALTER TABLE personal.worker_initiative ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_initiative FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: full access — creates, edits, publishes, closes initiatives.
CREATE POLICY "worker_initiative_kora_admin_all" ON personal.worker_initiative
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: read published initiatives of own tenant only.
-- tenant_id checked via kora.tenant_id() (reads kora_tenant_id from JWT app_metadata).
CREATE POLICY "worker_initiative_worker_published_select" ON personal.worker_initiative
  FOR SELECT USING (
    kora.kora_role() = 'WORKER'
    AND tenant_id = kora.tenant_id()
    AND status = 'published'
  );

-- No COMPANY_ADMIN / COMPANY_VIEWER policy — intentional.
-- Company aggregate flows only through service-role at app layer.

-- ── 2. personal.worker_participation ──────────────────────────────────────────
-- One row per (worker, initiative) pair. Worker-private — never employer-visible.
-- UNIQUE (worker_id, initiative_id) prevents duplicate participation rows.

CREATE TABLE IF NOT EXISTS personal.worker_participation (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  worker_id       uuid        NOT NULL REFERENCES personal.worker_identity (id) ON DELETE CASCADE,
  initiative_id   uuid        NOT NULL REFERENCES personal.worker_initiative (id) ON DELETE CASCADE,
  status          text        NOT NULL DEFAULT 'interested'
                              CHECK (status IN ('interested', 'registered', 'attended', 'cancelled')),
  private_note    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, initiative_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_participation_worker    ON personal.worker_participation (worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_participation_initiative ON personal.worker_participation (initiative_id);
CREATE INDEX IF NOT EXISTS idx_worker_participation_tenant    ON personal.worker_participation (tenant_id, status);

ALTER TABLE personal.worker_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal.worker_participation FORCE ROW LEVEL SECURITY;

-- KORA_ADMIN: full access for operational support and diagnostics.
CREATE POLICY "worker_participation_kora_admin_all" ON personal.worker_participation
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- WORKER: own participation rows only.
-- worker_id resolved via personal.worker_identity lookup (auth.uid() → id).
CREATE POLICY "worker_participation_worker_own_all" ON personal.worker_participation
  FOR ALL USING (
    kora.kora_role() = 'WORKER'
    AND worker_id IN (
      SELECT id FROM personal.worker_identity
      WHERE auth_user_id = auth.uid()
    )
  );

-- No COMPANY_ADMIN / COMPANY_VIEWER policy — intentional.
-- Aggregate participation counts flow only through service-role app-layer queries.

-- ── 3. GRANTS ─────────────────────────────────────────────────────────────────
-- authenticated role needs table-level GRANT for RLS to evaluate at all.
-- The policies above restrict actual row visibility.

GRANT SELECT, INSERT, UPDATE ON personal.worker_initiative     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON personal.worker_participation TO authenticated;

-- ── 4. Updated-at triggers ────────────────────────────────────────────────────

CREATE TRIGGER trg_worker_initiative_updated_at
  BEFORE UPDATE ON personal.worker_initiative
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_worker_participation_updated_at
  BEFORE UPDATE ON personal.worker_participation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Reload PostgREST schema cache ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
