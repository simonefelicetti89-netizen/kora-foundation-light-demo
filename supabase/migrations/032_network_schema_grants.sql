-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA Foundation Light — Migration 032
-- Migration:   032_network_schema_grants
-- Depends on:  010_partner_profile, 012_partner_identity
-- Gate status: Gate 2 OPEN — no Prisma, no ORM, apply via Supabase SQL Editor
-- ───────────────────────────────────────────────────────────────────────────────
-- Purpose:
--   Fixes PARTNER access on staging. Migrations 010/012 created the `network`
--   schema (network.partner_profile, network.partner_identity), enabled RLS,
--   and granted authenticated table-level privileges — but never granted the
--   schema-level USAGE privilege the 002 migration established as required
--   for every other custom schema (analytics, personal, gov, audit). Without
--   it, PostgREST correctly resolves the schema (once exposed in Supabase's
--   API settings) but Postgres itself rejects any query against it with
--   42501 permission denied for schema network — this is a basic Postgres
--   privilege-system error, evaluated before RLS policies ever run.
--
--   service_role additionally has zero table-level grants on either network
--   table today (010/012 only ever granted authenticated). Both live PARTNER
--   routes (app/partner/workspace/page.tsx, app/api/admin/partners/[id]/
--   invite-user/route.ts) read/write via getSupabaseServiceClient() — i.e.
--   as service_role — so this is the role actually failing right now.
--
-- What this migration does NOT do:
--   - Does not create or alter any table.
--   - Does not change, add, or drop any RLS policy.
--   - Does not disable or weaken FORCE ROW LEVEL SECURITY (still active,
--     unaffected by GRANT statements — RLS and privilege grants are two
--     independent layers; this migration only touches the latter).
--   - Does not grant anything to anon — no anon policy exists on either
--     table, and no other custom schema in this project grants anon
--     anything beyond the base `kora` helper-function schema (001).
--   - Does not add new authenticated table grants — 010/012 already granted
--     authenticated SELECT/INSERT/UPDATE on both tables; only the schema
--     USAGE grant below was missing to make those existing grants usable.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. GRANT USAGE on network schema — the actual missing gate ────────────────
-- Mirrors the 002 pattern for analytics/personal/gov/audit, backfilled here
-- because 010/012 (which created `network`) post-date 002 and never added it.

GRANT USAGE ON SCHEMA network TO authenticated;
GRANT USAGE ON SCHEMA network TO service_role;


-- ── 2. Table-level grants for service_role ─────────────────────────────────────
-- Named explicitly (not "ALL TABLES IN SCHEMA network") — narrower than the
-- 002 precedent, deliberately: network is a smaller, partner-facing schema,
-- and explicit naming means any future table added to it needs its own
-- reviewed grant rather than silently inheriting service_role access.
-- authenticated already has table-level grants from 010/012 — unchanged here.

GRANT ALL ON network.partner_profile  TO service_role;
GRANT ALL ON network.partner_identity TO service_role;


-- ── 3. Reload PostgREST schema cache ───────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
