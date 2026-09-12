-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 050: Company Memberships
-- Migration:   050_company_memberships
-- Created:     2026-09-12
-- Block:       KORA-WP-004 — Company Membership Table
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Constitutional rule (PFFD-01, doc 66; `78` §5): AUTHENTICATION ≠ COMPANY
-- MEMBERSHIP ≠ EMPLOYER INTELLIGENCE. Today the COMPANY_ADMIN role and its
-- tenant scope live only as claims on the authenticated session itself
-- (app_metadata.kora_role / kora_tenant_id, set directly on auth.users by
-- app/api/admin/live-company/route.ts). This migration adds the first
-- explicit, physically separate Company Membership record — the
-- organisational relationship fact — distinct from the underlying
-- authenticated identity it references.
--
-- EXPAND ONLY (KORA-WP-004 scope)
-- ────────────────────────────────
-- This is purely additive. It does NOT touch analytics.tenant, auth.users,
-- personal.worker_identity, or any existing role-check/session-claim path.
-- app_metadata.kora_role/kora_tenant_id remain the live authorization source
-- until a later, separately-authorized cutover (Master Plan `102`,
-- KORA-WP-004: "old role-check paths kept until cutover, contracted later
-- once validated"). Full membership-keyed RLS (a COMPANY_ADMIN self-read
-- policy on this table, and RLS on other tables keyed off it) is explicitly
-- KORA-WP-010's scope, not this migration's.
--
-- SCOPE BOUNDARY — NOT WORKER MEMBERSHIP
-- ────────────────────────────────────────
-- This table is exclusively the Company-Admin-side organisational
-- relationship. It does not model, replace, or touch Worker↔Company
-- association (personal.worker_identity, unmodified, out of scope here —
-- COMPANY-003/COMPANY-004 are explicitly KEEP/unmodified per `102`) or
-- Partner Membership (KORA-WP-051, explicitly out of scope).
--
-- LIFECYCLE — MINIMAL, NOT INVENTED BEYOND THE FROZEN INVARIANT
-- ─────────────────────────────────────────────────────────────
-- Exactly two states: 'active' and 'ended'. No 'invited'/'pending'/'disabled'
-- states are added here — KORA-WP-004 does not implement an invitation or
-- activation workflow (that remains on the existing app_metadata-based path
-- until a later, separately-authorized WP). The two states that exist are
-- the minimum necessary to prove the constitutional invariant this WP is
-- required to demonstrate ("Test B/C-equivalent (`82`) passes for Company" —
-- a membership can end while the underlying identity persists untouched).
--
-- REASSOCIATION INVARIANT
-- ───────────────────────
-- Ending a membership never deletes the row (soft lifecycle via `status`/
-- `ended_at`, never a DELETE) and never touches auth.users or any other
-- identity-owned data. A later, new membership for the same auth_user_id
-- (same person, a new employer) is simply a new row — the partial unique
-- index below only forbids two simultaneously-ACTIVE memberships for the
-- SAME identity+tenant pair; it does not forbid memberships across
-- DIFFERENT tenants, and does not impose a "one Company at a time" global
-- rule (not supported by any frozen source cited by this WP).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.company_memberships ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.company_memberships (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- No REFERENCES auth.users(id) — mirrors personal.worker_identity.auth_user_id
  -- exactly (the closest existing analog: a NOT NULL identity-anchor column,
  -- not an incidental actor reference like the ON DELETE SET NULL columns in
  -- migrations 025/034).
  auth_user_id  uuid          NOT NULL,

  -- Single valid value today (COMPANY_ADMIN is the only Company-side role in
  -- ACTIVE_KORA_ROLES). Present as a column, not hardcoded away, so the table
  -- genuinely represents "a role-carrying membership" — but constrained to
  -- today's one real value; no new role vocabulary is invented here.
  role          text          NOT NULL DEFAULT 'COMPANY_ADMIN'
                              CHECK (role = 'COMPANY_ADMIN'),

  status        text          NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'ended')),
  ended_at      timestamptz,

  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),

  -- Structural integrity only (not a business-policy invention): ended_at is
  -- set if and only if the membership has actually ended.
  CONSTRAINT company_memberships_ended_at_consistency
    CHECK ((status = 'ended') = (ended_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_tenant     ON analytics.company_memberships (tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_auth_user  ON analytics.company_memberships (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_status     ON analytics.company_memberships (tenant_id, status);

-- Prevents two simultaneously-active memberships for the SAME identity at
-- the SAME Company — ordinary referential integrity for this table's own
-- concern, not a "one Company at a time" global policy (which would require
-- a cross-tenant uniqueness rule this index deliberately does not add).
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_memberships_active_identity_tenant
  ON analytics.company_memberships (auth_user_id, tenant_id)
  WHERE status = 'active';

-- ── 2. RLS — defensive, fail-closed until KORA-WP-010 ───────────────────────────
-- Enabled + forced with only the same universal KORA_ADMIN-all policy every
-- other table in this schema already carries (analytics.tenant,
-- personal.worker_identity, personal.worker_profile_private) — an
-- operational/diagnostic escape hatch, not a membership authorization
-- decision. No COMPANY_ADMIN, WORKER, PARTNER, or ADVISOR policy is added:
-- with RLS enabled and forced and no other policy present, every one of
-- those roles gets zero rows from this table via the ordinary session
-- client, by construction — genuinely fail-closed, not merely undocumented.
-- Real membership-keyed RLS (on this table and on others keyed off it) is
-- KORA-WP-010's explicit scope.

ALTER TABLE analytics.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.company_memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY "company_memberships_kora_admin_all" ON analytics.company_memberships
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 3. GRANT service_role access ─────────────────────────────────────────────
-- Found by real local-DB execution (KORA-WP-004 real-DB validation pass,
-- 2026-09-12): without this, getSupabaseServiceClient() queries against this
-- table fail with "42501 permission denied for table company_memberships" —
-- a Postgres privilege-system error evaluated BEFORE RLS ever runs. RLS and
-- GRANT are two independent layers; migration 002's schema-level
-- `GRANT USAGE ON SCHEMA analytics ... TO service_role` only makes the
-- schema visible, and its per-table `GRANT SELECT ... TO authenticated`
-- lines only ever covered the tables that already existed when 002 ran —
-- exactly the same root cause already documented and fixed for a different
-- table by migrations 032/033 (network schema, personal.worker_identity).
-- No blanket `GRANT ALL ON ALL TABLES IN SCHEMA analytics` exists in this
-- project (confirmed by inspection) — every table needs its own explicit
-- grant. Fixed directly here, not as a separate patch migration, because
-- migration 050 has not been applied to staging or production by any prior
-- task — there is no live consumer this could disrupt.
--
-- No GRANT to `authenticated` is added: unlike analytics.tenant (which has
-- explicit COMPANY_ADMIN/WORKER self-read RLS policies designed for it),
-- this table intentionally has no non-admin policy yet (§2 above) — adding
-- an `authenticated` grant now would be premature, since KORA-WP-010 is the
-- WP that decides what, if anything, an ordinary session role may read here.
-- service_role already has BYPASSRLS at the role level, so RLS policies do
-- not constrain it — only the missing GRANT did.

GRANT SELECT, INSERT, UPDATE ON analytics.company_memberships TO service_role;

-- ── 4. Reload PostgREST schema cache ─────────────────────────────────────────
-- Matches migration 033's own closing step — makes the new grant/table
-- visible to PostgREST-backed clients (getSupabaseServiceClient() et al.)
-- without requiring a service restart.

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKE below, to refresh PostgREST's cache
-- REVOKE SELECT, INSERT, UPDATE ON analytics.company_memberships FROM service_role;
-- DROP POLICY IF EXISTS "company_memberships_kora_admin_all" ON analytics.company_memberships;
-- DROP INDEX IF EXISTS analytics.uq_company_memberships_active_identity_tenant;
-- DROP INDEX IF EXISTS analytics.idx_company_memberships_status;
-- DROP INDEX IF EXISTS analytics.idx_company_memberships_auth_user;
-- DROP INDEX IF EXISTS analytics.idx_company_memberships_tenant;
-- DROP TABLE IF EXISTS analytics.company_memberships;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else — no existing column, row, policy, or table is
-- altered by this migration or by rolling it back.
