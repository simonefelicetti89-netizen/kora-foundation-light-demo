-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 046: commons schema — missing USAGE grant for authenticated
-- Migration:   046_commons_schema_usage_grant
-- Created:     2026-07-27
-- Sprint:      PILOT-TRUST-01 — adversarial review of commit b517284 (FASE 4/5)
-- Gate:        Gate 2 OPEN — written, NOT applied to staging/production.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Closes a real, pre-existing grant gap found during the adversarial review of
-- PILOT-TRUST-01: migration 013 (013_kora_commons.sql) correctly grants
-- table-level privileges on commons.post / commons.booking /
-- commons.contribution_event to `authenticated` (SELECT/INSERT/UPDATE as
-- appropriate), but never issues `GRANT USAGE ON SCHEMA commons TO
-- authenticated`. Postgres requires BOTH schema-level USAGE and the
-- table-level privilege for a non-owner role to reach a table in a
-- non-default schema — without USAGE, every one of those table grants was
-- silently inert. Confirmed empirically (local Postgres, `SET ROLE
-- authenticated`): `SELECT count(*) FROM commons.post` fails with
-- "permission denied for schema commons" before this migration, and succeeds
-- (respecting RLS normally) after.
--
-- WHY THIS WAS NEVER NOTICED
-- Every commons-reading page in this app used getSupabaseServiceClient()
-- until PILOT-TRUST-01 FASE 5 migrated app/company/commons/page.tsx (and,
-- pre-existing, app/worker/commons/page.tsx already used the session client —
-- see docs referencing it as the "model page" for the FASE 5 migration
-- pattern) onto the RLS-respecting session client. service-role bypasses
-- GRANT/schema-USAGE checks entirely (it connects as a superuser-equivalent
-- role), so this gap was invisible until a real `authenticated`-role
-- connection actually tried to reach commons.* directly.
--
-- Also plausible: staging may have this GRANT applied out-of-band (matching
-- the exact same class of drift already documented for local PostgREST
-- schema exposure in supabase/config.toml, PILOT-TRUST-01 FASE 7/8) — this
-- migration makes it canonical either way, idempotent if already present.
--
-- THE FIX
-- A single schema-level GRANT, matching the exact pattern already used for
-- analytics/personal/network in their own migrations (001, 007, 032).
--
-- IDEMPOTENTE: GRANT is naturally idempotent in Postgres (no error if already granted).
-- ═══════════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA commons TO authenticated;

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
