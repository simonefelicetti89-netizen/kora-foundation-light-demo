-- migration: 013_kora_commons.sql
-- B128: KORA Commons Foundation — Shared Space Moderato Azienda-Worker.
--
-- Design principles:
--   - Tenant-scoped: ogni post appartiene a un tenant
--   - Moderation-first: KORA_ADMIN approva prima che i worker vedano
--   - Privacy-safe: WORKER vede solo published, nessun tracking individuale
--   - COMPANY_ADMIN crea bozze/pending_review, non pubblica direttamente
--   - KORA_ADMIN ha accesso completo per moderazione e diagnostica
--   - PARTNER: nessuna policy — escluso da B128
--   - anon: nessuna policy
--   - Nessun commento, nessuna reaction, nessun read receipt in v0

-- ── 1. commons schema ─────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS commons;

-- ── 2. commons.post ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commons.post (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES analytics.tenant(id) ON DELETE CASCADE,
  author_user_id uuid        NULL,
  author_role    text        NOT NULL
                             CHECK (author_role IN ('KORA_ADMIN', 'COMPANY_ADMIN')),
  title          text        NOT NULL,
  body           text        NOT NULL,
  category       text        NOT NULL
                             CHECK (category IN ('announcement', 'initiative_update', 'opportunity', 'event', 'request', 'resource')),
  status         text        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'pending_review', 'published', 'archived', 'rejected')),
  pillar         text        NULL
                             CHECK (pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY')),
  published_at   timestamptz NULL,
  reviewed_by    uuid        NULL,
  reviewed_at    timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE commons.post IS
  'KORA Commons tenant-scoped posts. '
  'Moderation-first: COMPANY_ADMIN creates draft/pending_review, KORA_ADMIN publishes. '
  'WORKER sees only published posts. No comments, no reactions, no read receipts in v0.';

COMMENT ON COLUMN commons.post.author_role IS
  'Role that created this post. Either KORA_ADMIN or COMPANY_ADMIN. '
  'WORKER cannot create posts in B128.';

COMMENT ON COLUMN commons.post.status IS
  'draft = saved, not submitted. '
  'pending_review = submitted for KORA approval. '
  'published = approved and visible to workers. '
  'archived = no longer visible to workers. '
  'rejected = declined by KORA_ADMIN.';

COMMENT ON COLUMN commons.post.tenant_id IS
  'Tenant scope — post is only visible within this tenant. '
  'Company cannot see other tenants. Worker cannot see other tenants.';

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_commons_post_tenant_status
  ON commons.post (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_commons_post_category
  ON commons.post (category);

CREATE INDEX IF NOT EXISTS idx_commons_post_pillar
  ON commons.post (pillar);

CREATE INDEX IF NOT EXISTS idx_commons_post_created_at
  ON commons.post (created_at DESC);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE commons.post ENABLE ROW LEVEL SECURITY;
ALTER TABLE commons.post FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commons_post_kora_admin_all"             ON commons.post;
DROP POLICY IF EXISTS "commons_post_company_admin_select"        ON commons.post;
DROP POLICY IF EXISTS "commons_post_company_admin_insert"        ON commons.post;
DROP POLICY IF EXISTS "commons_post_company_admin_update"        ON commons.post;
DROP POLICY IF EXISTS "commons_post_worker_published_select"     ON commons.post;

-- KORA_ADMIN: accesso completo — moderazione, approvazione, diagnostica, creazione diretta
CREATE POLICY "commons_post_kora_admin_all"
  ON commons.post
  FOR ALL
  USING (kora.kora_role() = 'KORA_ADMIN');

-- COMPANY_ADMIN: SELECT propri post del tenant (tutti gli stati)
CREATE POLICY "commons_post_company_admin_select"
  ON commons.post
  FOR SELECT
  USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
  );

-- COMPANY_ADMIN: INSERT solo nel proprio tenant, status draft o pending_review
CREATE POLICY "commons_post_company_admin_insert"
  ON commons.post
  FOR INSERT
  WITH CHECK (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
    AND status IN ('draft', 'pending_review')
    AND author_role = 'COMPANY_ADMIN'
  );

-- COMPANY_ADMIN: UPDATE solo se status è draft o pending_review (non può cambiare status a published)
CREATE POLICY "commons_post_company_admin_update"
  ON commons.post
  FOR UPDATE
  USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
    AND status IN ('draft', 'pending_review')
    AND author_role = 'COMPANY_ADMIN'
  );

-- WORKER: SELECT solo published del proprio tenant
CREATE POLICY "commons_post_worker_published_select"
  ON commons.post
  FOR SELECT
  USING (
    kora.kora_role() = 'WORKER'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'kora_tenant_id')::uuid
    AND status = 'published'
  );

-- PARTNER: nessuna policy (escluso da B128)
-- COMPANY_VIEWER: nessuna policy (escluso da B128 — viewer non crea contenuti)
-- anon: nessuna policy
-- FORCE ROW LEVEL SECURITY garantisce zero righe senza policy matching.

-- ── 5. Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON commons.post TO authenticated;
-- nessun grant a anon

-- ── 6. Trigger updated_at ─────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_commons_post_updated_at ON commons.post;

CREATE TRIGGER trg_commons_post_updated_at
  BEFORE UPDATE ON commons.post
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
