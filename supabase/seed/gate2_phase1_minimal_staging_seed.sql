-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Gate 2 Phase 1 Minimal Synthetic Seed
-- File: gate2_phase1_minimal_staging_seed.sql
-- Created: 2026-06-21
-- ───────────────────────────────────────────────────────────────────────────────
-- ⚠️  STAGING ONLY — DO NOT RUN ON PRODUCTION ⚠️
-- ───────────────────────────────────────────────────────────────────────────────
-- Target:       kora-staging project — ref haqflkurpmeaxpikozjl — ONLY
-- Data:         SYNTHETIC DATA ONLY — no real personal, worker, or company data
-- Emails:       All addresses use @staging.kora.internal — internal staging domain
-- Auth users:   Synthetic auth_user_id UUIDs only — no real Supabase auth users
--               created in this file. Auth users must be created separately via
--               Supabase Auth Admin API or Dashboard before smoke-testing login flows.
-- Rollback:     See ROLLBACK BLOCK at end of file.
-- Idempotent:   Uses ON CONFLICT DO NOTHING / deterministic IDs — safe to re-run.
-- Schema:       DML only — no DDL, no policy changes, no grant changes, no RLS changes.
-- ───────────────────────────────────────────────────────────────────────────────
-- Synthetic dataset:
--   Tenant:     STAGE-001 / KORA Staging Synthetic Company
--   Company admin email: company-admin@staging.kora.internal
--   Workers:    worker-a@staging.kora.internal (Worker A)
--               worker-b@staging.kora.internal (Worker B)
--               worker-c@staging.kora.internal (Worker C)
-- ───────────────────────────────────────────────────────────────────────────────
-- Insert order:
--   1. analytics.tenant
--   2. personal.workforce_baseline
--   3. personal.worker_identity         (service-role path — bypasses RLS)
--   4. personal.worker_pseudonym_map
--   5. personal.worker_profile_private
--   6. commons.post                     (LIFE initiative: Staging Yoga Session)
--   7. commons.booking                  (Worker A: attended, Worker B: approved)
--   8. personal.worker_pib              (one pillar each for A, B, C)
-- ───────────────────────────────────────────────────────────────────────────────
-- Gate 2 OPEN — staging only, pre-empirical calibration.
-- Migration 027 NOT applied. Migration 029 NOT applied.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  RAISE NOTICE 'gate2_phase1_minimal_staging_seed: STAGING SYNTHETIC DATA ONLY. '
    'DO NOT RUN ON PRODUCTION. Target: haqflkurpmeaxpikozjl.';
END;
$$;

-- ── 1. analytics.tenant ──────────────────────────────────────────────────────
-- UNIQUE constraint: tenant_code
-- Required non-null (no default): tenant_code, company_name
-- tenant_kind CHECK IN ('LIVE','DEMO','TEST','SANDBOX') → use 'TEST' for staging

INSERT INTO analytics.tenant (
  id,
  tenant_code,
  company_name,
  country_code,
  tenant_kind,
  onboarding_status,
  data_readiness_status,
  decision_pack_status,
  methodology_version_id,
  is_active,
  production_ready
) VALUES (
  'aaaaaaaa-0001-0001-0001-000000000001',
  'STAGE-001',
  'KORA Staging Synthetic Company',
  'IT',
  'TEST',
  'pending',
  'incomplete',
  'not_ready',
  'KORA Methodology v0.1',
  true,
  false
)
ON CONFLICT (tenant_code) DO NOTHING;

-- ── 2. personal.workforce_baseline ────────────────────────────────────────────
-- UNIQUE constraint: (tenant_id, reporting_period)
-- Required non-null (no default): tenant_id, reporting_period (text), total_workers

INSERT INTO personal.workforce_baseline (
  id,
  tenant_id,
  reporting_period,
  total_workers,
  segment_breakdown,
  privacy_threshold_applied,
  minimum_group_size,
  created_by
) VALUES (
  'cccccccc-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  '2026-H1',
  3,
  '{}',
  true,
  10,
  'gate2-staging-seed'
)
ON CONFLICT (tenant_id, reporting_period) DO NOTHING;

-- ── 3. personal.worker_identity ───────────────────────────────────────────────
-- UNIQUE constraint: auth_user_id (no FK to auth.users — synthetic UUIDs are safe)
-- Required non-null (no default): tenant_id, auth_user_id, worker_ref
-- worker_ref is an opaque pseudonym — never a real name or email (per mig 007)
-- status CHECK IN ('invited','active','pending','disabled') → use 'active'
-- Auth users (company-admin + workers) must be created separately via
-- Supabase Auth Admin API before JWT-based smoke tests can run.

INSERT INTO personal.worker_identity (
  id,
  tenant_id,
  auth_user_id,
  worker_ref,
  status
) VALUES
  (
    'bbbbbbbb-000a-000a-000a-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'a1000000-a000-a000-a000-000000000001',  -- synthetic; real auth_user_id set at real provisioning
    'W-STAGE-A',
    'active'
  ),
  (
    'bbbbbbbb-000b-000b-000b-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'b2000000-b000-b000-b000-000000000002',
    'W-STAGE-B',
    'active'
  ),
  (
    'bbbbbbbb-000c-000c-000c-000000000003',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'c3000000-c000-c000-c000-000000000003',
    'W-STAGE-C',
    'active'
  )
ON CONFLICT (auth_user_id) DO NOTHING;

-- ── 4. personal.worker_pseudonym_map ──────────────────────────────────────────
-- UNIQUE constraint: worker_identity_id (one pseudonym per worker)
-- UNIQUE constraint: pseudonym_id (globally unique)
-- Required non-null (no default): worker_identity_id, pseudonym_id, linked_by

INSERT INTO personal.worker_pseudonym_map (
  id,
  worker_identity_id,
  pseudonym_id,
  linked_by
) VALUES
  (
    'f1111111-000a-000a-000a-000000000001',
    'bbbbbbbb-000a-000a-000a-000000000001',
    'PSE-STAGE-A-001',
    'kora_admin'
  ),
  (
    'f2222222-000b-000b-000b-000000000002',
    'bbbbbbbb-000b-000b-000b-000000000002',
    'PSE-STAGE-B-002',
    'kora_admin'
  ),
  (
    'f3333333-000c-000c-000c-000000000003',
    'bbbbbbbb-000c-000c-000c-000000000003',
    'PSE-STAGE-C-003',
    'kora_admin'
  )
ON CONFLICT (worker_identity_id) DO NOTHING;

-- ── 5. personal.worker_profile_private ────────────────────────────────────────
-- Required non-null (no default): worker_id (FK to worker_identity.id)
-- Defaults: preferred_lang='it', onboarding_done=false, onboarding_status='pending'
-- UNIQUE: worker_id (1:1 with worker_identity)

INSERT INTO personal.worker_profile_private (
  id,
  worker_id,
  display_name,
  preferred_lang,
  onboarding_done,
  onboarding_status
) VALUES
  (
    'e1111111-000a-000a-000a-000000000001',
    'bbbbbbbb-000a-000a-000a-000000000001',
    'Worker A (Staging)',
    'it',
    false,
    'pending'
  ),
  (
    'e2222222-000b-000b-000b-000000000002',
    'bbbbbbbb-000b-000b-000b-000000000002',
    'Worker B (Staging)',
    'it',
    false,
    'pending'
  ),
  (
    'e3333333-000c-000c-000c-000000000003',
    'bbbbbbbb-000c-000c-000c-000000000003',
    'Worker C (Staging)',
    'it',
    false,
    'pending'
  )
ON CONFLICT (worker_id) DO NOTHING;

-- ── 6. commons.post ───────────────────────────────────────────────────────────
-- Required non-null (no default): tenant_id (FK to analytics.tenant.id),
--   author_role CHECK IN ('KORA_ADMIN','COMPANY_ADMIN'),
--   title, body,
--   category CHECK IN ('announcement','initiative_update','opportunity','event','request','resource')
-- status CHECK IN ('draft','pending_review','published','archived','rejected') → 'published'
-- pillar CHECK IN ('LIFE','GROWTH','CONNECTION','IMPACT','LEGACY')
-- Note: contribution_event is for cross-company events only — not used here.
-- Internal LIFE event attendance is tracked via booking.status='attended'.

INSERT INTO commons.post (
  id,
  tenant_id,
  author_role,
  title,
  body,
  category,
  status,
  pillar,
  published_at
) VALUES (
  'dddddddd-0001-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',
  'KORA_ADMIN',
  'Staging Yoga Session',
  '[STAGING SYNTHETIC] Sessione yoga sintetica per validazione Gate 2. Non contiene dati reali.',
  'event',
  'published',
  'LIFE',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- ── 7. commons.booking ────────────────────────────────────────────────────────
-- Required non-null (no default): post_id (FK to commons.post.id),
--   worker_identity_id (FK to personal.worker_identity.id),
--   worker_tenant_id (UUID — denormalized, same as worker's tenant),
--   post_tenant_id (UUID — denormalized, same as post's tenant)
-- status CHECK IN ('pending','approved','rejected','cancelled','attended')
-- UNIQUE constraint: (post_id, worker_identity_id)
-- Worker A: status='attended' — booked and attended the LIFE event
-- Worker B: status='approved' — booked but not yet attended
-- Worker C: NO booking (intentional — tests "no booking" path)

INSERT INTO commons.booking (
  id,
  post_id,
  worker_identity_id,
  worker_tenant_id,
  post_tenant_id,
  status
) VALUES
  (
    'eeeeeeee-000a-000a-000a-000000000001',
    'dddddddd-0001-0001-0001-000000000001',
    'bbbbbbbb-000a-000a-000a-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'attended'
  ),
  (
    'eeeeeeee-000b-000b-000b-000000000002',
    'dddddddd-0001-0001-0001-000000000001',
    'bbbbbbbb-000b-000b-000b-000000000002',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'aaaaaaaa-0001-0001-0001-000000000001',
    'approved'
  )
ON CONFLICT (post_id, worker_identity_id) DO NOTHING;

-- ── 8. personal.worker_pib ────────────────────────────────────────────────────
-- Required non-null (no default): worker_identity_id (FK to worker_identity.id),
--   reporting_period (text), pillar, iu_value, verification_status, source_kind
-- pillar CHECK IN ('LIFE','GROWTH','CONNECTION','IMPACT','LEGACY')
-- verification_status CHECK IN ('verified','self_declared') → use 'self_declared'
-- source_kind CHECK IN ('company_sourced','partner_sourced','worker_declared') → default 'company_sourced'
-- NOTE: no tenant_id column on worker_pib — tenant is derived via worker_identity.tenant_id

INSERT INTO personal.worker_pib (
  id,
  worker_identity_id,
  reporting_period,
  pillar,
  iu_value,
  verification_status,
  source_kind,
  is_exportable
) VALUES
  (
    '1a000000-0001-0001-000a-000000000001',
    'bbbbbbbb-000a-000a-000a-000000000001',
    '2026-H1',
    'LIFE',
    12.5,
    'self_declared',
    'company_sourced',
    false
  ),
  (
    '1b000000-0001-0001-000b-000000000002',
    'bbbbbbbb-000b-000b-000b-000000000002',
    '2026-H1',
    'GROWTH',
    8.0,
    'self_declared',
    'company_sourced',
    false
  ),
  (
    '1c000000-0001-0001-000c-000000000003',
    'bbbbbbbb-000c-000c-000c-000000000003',
    '2026-H1',
    'CONNECTION',
    3.2,
    'self_declared',
    'company_sourced',
    false
  )
ON CONFLICT (id) DO NOTHING;

-- ── Post-insert verification queries (run manually to confirm seed) ─────────────
-- DO NOT use these as a migration — these are sanity checks only.
--
-- SELECT id, tenant_code, company_name, tenant_kind, production_ready
-- FROM analytics.tenant WHERE tenant_code = 'STAGE-001';
-- Expected: 1 row, tenant_kind='TEST', production_ready=false
--
-- SELECT total_workers FROM personal.workforce_baseline
-- WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
-- Expected: 1 row, total_workers = 3
--
-- SELECT id, worker_ref, status FROM personal.worker_identity
-- WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
-- ORDER BY worker_ref;
-- Expected: 3 rows (W-STAGE-A, W-STAGE-B, W-STAGE-C)
--
-- SELECT pseudonym_id FROM personal.worker_pseudonym_map
-- WHERE worker_identity_id IN (
--   'bbbbbbbb-000a-000a-000a-000000000001',
--   'bbbbbbbb-000b-000b-000b-000000000002',
--   'bbbbbbbb-000c-000c-000c-000000000003'
-- );
-- Expected: 3 rows (PSE-STAGE-A-001, PSE-STAGE-B-002, PSE-STAGE-C-003)
--
-- SELECT id, title, status, pillar FROM commons.post
-- WHERE id = 'dddddddd-0001-0001-0001-000000000001';
-- Expected: 1 row, status='published', pillar='LIFE'
--
-- SELECT id, worker_identity_id, status FROM commons.booking
-- WHERE post_id = 'dddddddd-0001-0001-0001-000000000001'
-- ORDER BY id;
-- Expected: 2 rows (Worker A: attended, Worker B: approved)
--
-- SELECT wi.worker_ref, p.pillar, p.iu_value FROM personal.worker_pib p
-- JOIN personal.worker_identity wi ON wi.id = p.worker_identity_id
-- WHERE wi.tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
-- ORDER BY wi.worker_ref;
-- Expected: 3 rows (W-STAGE-A/LIFE/12.5, W-STAGE-B/GROWTH/8.0, W-STAGE-C/CONNECTION/3.2)

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK / CLEANUP BLOCK
-- Run ONLY to remove synthetic STAGE-001 seed data.
-- Targets ONLY records with tenant_id='aaaaaaaa-0001-0001-0001-000000000001'
-- or directly linked to those records. Does NOT touch any other tenant data.
-- Run in reverse insert order.
-- Auth users created via Supabase Auth Admin API must be deleted separately
-- via Dashboard or Auth Admin API — not via SQL.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- BEGIN;
--
-- DELETE FROM personal.worker_pib
--   WHERE worker_identity_id IN (
--     'bbbbbbbb-000a-000a-000a-000000000001',
--     'bbbbbbbb-000b-000b-000b-000000000002',
--     'bbbbbbbb-000c-000c-000c-000000000003'
--   );
--
-- DELETE FROM commons.booking
--   WHERE post_tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
--
-- DELETE FROM commons.post
--   WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
--
-- DELETE FROM personal.worker_profile_private
--   WHERE worker_id IN (
--     'bbbbbbbb-000a-000a-000a-000000000001',
--     'bbbbbbbb-000b-000b-000b-000000000002',
--     'bbbbbbbb-000c-000c-000c-000000000003'
--   );
--
-- DELETE FROM personal.worker_pseudonym_map
--   WHERE worker_identity_id IN (
--     'bbbbbbbb-000a-000a-000a-000000000001',
--     'bbbbbbbb-000b-000b-000b-000000000002',
--     'bbbbbbbb-000c-000c-000c-000000000003'
--   );
--
-- DELETE FROM personal.worker_identity
--   WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
--
-- DELETE FROM personal.workforce_baseline
--   WHERE tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001';
--
-- DELETE FROM analytics.tenant
--   WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';
--
-- COMMIT;
