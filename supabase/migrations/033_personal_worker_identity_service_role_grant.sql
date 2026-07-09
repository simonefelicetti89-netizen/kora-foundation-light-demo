-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA Foundation Light — Migration 033
-- Migration:   033_personal_worker_identity_service_role_grant
-- Depends on:  007_worker_provisioning, 027_worker_individual_rls_refactor
-- Gate status: Gate 2 OPEN — no Prisma, no ORM, apply via Supabase SQL Editor
-- ───────────────────────────────────────────────────────────────────────────────
-- Purpose:
--   Fixes Next Worker provisioning. Migration 007 created personal.worker_identity,
--   enabled RLS, and granted table-level privileges to `authenticated` only —
--   service_role was never granted anything on this table (007 pre-dates 002's
--   blanket `GRANT ALL ON ALL TABLES IN SCHEMA personal TO service_role`, so that
--   grant never covered a table that didn't exist yet). Migration 027 explicitly
--   removed KORA_ADMIN's RLS-based policy on this table and moved provisioning to
--   "service-role isolato" (its own words) — but the corresponding service_role
--   GRANT to make that path actually work was never added. The result: any
--   service-role query against personal.worker_identity (via PostgREST, e.g.
--   getSupabaseServiceClient() or a raw Admin/REST call) fails with
--   42501 permission denied for table worker_identity — a Postgres privilege-
--   system error, evaluated before RLS policies ever run. Same root cause and
--   same fix shape as migration 032 (network schema).
--
-- What this migration does NOT do:
--   - Does not create or alter any table.
--   - Does not change, add, or drop any RLS policy.
--   - Does not disable or weaken FORCE ROW LEVEL SECURITY (still active,
--     unaffected by GRANT statements — RLS and privilege grants are two
--     independent layers; this migration only touches the latter).
--   - Does not grant anything to anon — no anon policy exists on this table,
--     and no other schema in this project grants anon anything beyond the
--     base `kora` helper-function schema (001).
--   - Does not add or change the existing `authenticated` grant from 007 —
--     unchanged here.
--   - Does not touch any other `personal.*` table.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. GRANT service_role access to personal.worker_identity ──────────────────
-- SELECT: needed to look up an existing row by auth_user_id before inserting.
-- INSERT: needed to create the row when provisioning a new worker.
-- UPDATE: matches the table-level grant shape already given to `authenticated`
-- in 007, and mirrors the ALLOWED_IDENTITY_UPDATE_FIELDS whitelist enforced in
-- lib/supabase/worker-provisioning-service-key.ts (status/updated_at only —
-- enforced in application code, not by this grant).
-- personal schema USAGE for service_role already exists (migration 002) — only
-- the table-level grant was missing here.

GRANT SELECT, INSERT, UPDATE ON personal.worker_identity TO service_role;


-- ── 2. Reload PostgREST schema cache ───────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
