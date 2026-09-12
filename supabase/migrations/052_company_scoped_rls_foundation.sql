-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 052: Company-Scoped RLS Foundation
-- Migration:   052_company_scoped_rls_foundation
-- Created:     2026-09-12
-- Block:       KORA-WP-010 — Base RLS/Access Foundation (Company-Scoped) +
--              Recusal Negative-Access Test Harness
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Migration 050 (KORA-WP-004) created analytics.company_memberships with RLS
-- ENABLED + FORCED but deliberately only a KORA_ADMIN-all policy — its own
-- header comment states explicitly: "Real membership-keyed RLS (on this table
-- and on others keyed off it) is KORA-WP-010's explicit scope." This
-- migration closes exactly that one deferred piece: a COMPANY_ADMIN self-read
-- policy, identity-bound (not merely tenant-claim-bound), so an authenticated
-- Company user can read their OWN active membership row(s) and nothing else.
--
-- WHY IDENTITY-BOUND, NOT TENANT-CLAIM-BOUND
-- ────────────────────────────────────────────
-- Every existing Company-scoped policy in this repo (e.g.
-- analytics.tenant.company_own_tenant_read, migrations 001/002) is
-- tenant-claim-bound: `kora.kora_role() = 'COMPANY_ADMIN' AND id =
-- kora.tenant_id()` — it trusts the session's kora_tenant_id claim entirely.
-- That pattern is correct for analytics.tenant (the claim IS the fact being
-- read). It is NOT correct here: company_memberships is the table that is
-- SUPPOSED to be the source of truth for whether a membership relationship
-- is real, so gating it on the same claim it exists to verify would be
-- circular and would let an identity see a membership row merely by
-- presenting a tenant claim, with no actual row-level ownership check. This
-- policy instead follows the OTHER existing repo precedent — the
-- identity-bound pattern already used by
-- personal.worker_identity.worker_identity_worker_own_select (migration 007):
-- `auth_user_id = auth.uid()` — auth.uid() reads the cryptographically
-- verified `sub` claim from the session's own JWT, which cannot be forged by
-- changing an app_metadata claim.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Company-scoped only (KORA-WP-010's own explicit boundary — Partner RLS is
-- KORA-WP-051, not touched here). Does not touch personal.* (worker-vs-worker
-- isolation — RLS-05, already implemented and merged prior to this WP; see
-- this WP's own implementation report §18 for the traceability finding). Does
-- not implement Advisor recusal semantics (KORA-WP-031/037 do not exist yet —
-- the recusal-specific negative-access test remains deferred by canonical
-- dependency, per KORA-WP-010's own text). Does not create any new table —
-- analytics.company_memberships already exists (migration 050).
--
-- REUSABLE COMPANY-SCOPED RLS PATTERN (this WP's other deliverable)
-- ───────────────────────────────────────────────────────────────
-- This migration does not change the pattern future I1+ Company-scoped
-- tables should use — that pattern already exists and is proven across 17+
-- migrations: `kora.kora_role() = 'COMPANY_ADMIN' AND tenant_id =
-- kora.tenant_id()` for ordinary Company-owned operational data (the
-- analytics.tenant precedent), or the identity-bound `auth_user_id =
-- auth.uid()` form used here and in migration 007 when the row itself
-- constitutes an identity-ownership fact rather than tenant-owned data. Both
-- are documented as the canonical reusable templates in
-- docs/RLS_COMPANY_SCOPED_PATTERN.md (this WP). No new authorization
-- framework is introduced — Company-scoped RLS was already a mature,
-- repeatedly-applied pattern before this WP; the one genuine gap was this
-- table's own deferred self-read policy, closed below.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. COMPANY_ADMIN self-read policy — identity-bound, active-membership-only ──
--
-- A Company user may read a company_memberships row only if:
--   (a) their session claims COMPANY_ADMIN (kora.kora_role());
--   (b) the row's auth_user_id equals their own, cryptographically-verified
--       identity (auth.uid()) — NOT a tenant claim comparison; presenting a
--       different kora_tenant_id claim has zero effect on which rows this
--       policy returns;
--   (c) the row is currently 'active' — an ended membership must not grant
--       any membership-based read access via this policy once ended.
--
-- This is a SELECT-only policy. Company users never insert/update/delete
-- this table directly — creation/termination remains exclusively through
-- lib/company-membership/membership-service.ts's service-role-only path
-- (migration 050's own design, unchanged by this migration).

CREATE POLICY "company_memberships_company_admin_own_active_select"
  ON analytics.company_memberships
  FOR SELECT
  USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND auth_user_id = auth.uid()
    AND status = 'active'
  );

-- ── 2. GRANT SELECT to `authenticated` ───────────────────────────────────────
-- Found by real local-DB execution (KORA-WP-010 real-DB validation pass,
-- 2026-09-12): without this, the policy above is unreachable — every session
-- using the ordinary `authenticated` Postgres role (the role PostgREST/
-- Supabase clients use) fails with "42501 permission denied for table
-- company_memberships" BEFORE Postgres ever evaluates RLS. This is the exact
-- same two-independent-layers defect class already documented for
-- service_role in this table's own migration 050 (precedent: migrations 032,
-- 033) — GRANT and RLS are independent, and migration 050's own header
-- comment named this precise `authenticated` GRANT as "KORA-WP-010's" job to
-- add, deliberately deferred rather than omitted. Fixed directly here, not as
-- a separate patch migration, because migration 052 has not been applied to
-- staging or production by any prior task — there is no live consumer this
-- could disrupt.
--
-- SELECT only — Company users never insert/update/delete this table directly
-- (unchanged from migration 050's design); no GRANT INSERT/UPDATE/DELETE is
-- added for `authenticated`.

GRANT SELECT ON analytics.company_memberships TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKE below, to refresh PostgREST's cache
-- REVOKE SELECT ON analytics.company_memberships FROM authenticated;
-- DROP POLICY IF EXISTS "company_memberships_company_admin_own_active_select" ON analytics.company_memberships;
-- Rollback is safe at any time: this migration adds exactly one new SELECT
-- policy and one new GRANT, and touches nothing else — no existing column,
-- row, table, or other policy is altered by this migration or by rolling it
-- back. With this policy/grant removed, analytics.company_memberships
-- reverts to its migration-050 state (KORA_ADMIN-only visibility,
-- fail-closed for every other role).
