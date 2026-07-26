-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   035_kora_link_rls
-- Feature:     KL-17 — KORA Link v1 — Row Level Security Policies
-- Author:      KORA Foundation Light · 2026-07-01
-- Amended:     KORA-LINK-S3A — static draft hardening (service_role grants,
--              REVOKE ALL FROM PUBLIC consistency, obsolete stub cleanup) · 2026-07-12
-- Amended:     KORA-LINK-S3B — corrected stale aggregate-view wording
--              (v_tenant_batch_stats never built, superseded by 036's
--              fn_company_link_status_aggregate RPC), updated TODO-RLS-04/05
--              status; comment-only, no schema/logic change · 2026-07-12
-- Amended:     KORA-LINK-SECURITY-FOUNDATION-08 — comment-only: the
--              FUNCTION SPEC B historical signature and TODO-RLS-04 note
--              below are updated to reflect 036's KORA-LINK-S08 changes
--              (fn_activate_link_for_worker signature, aggregate threshold).
--              This file's own tables/policies are unchanged — Gate 4 status
--              (worker self-select, company-facing SELECT) is exactly as open
--              as before this pass · 2026-07-16
-- Amended:     KORA-LINK-DPO-DECISIONS-09 — comment-only: table/column
--              renames (link_consents → link_activation_acknowledgements)
--              and, in a follow-on terminology cleanup pass, the
--              p_consent_version → p_activation_notice_version parameter
--              rename reflected in the FUNCTION SPEC B prose and TODO-DPO-04
--              note below. This file's own tables/policies/grants are
--              unchanged — Gate 4 status is exactly as open as before ·
--              2026-07-16 / 2026-07-24
-- Depends on:  034_kora_link_schema.sql (KL-19, 2026-07-04: PROPOSED_GATE2_TECHNICALLY_REVIEWED;
--              KORA-LINK-DPO-DECISIONS-09: the 4 genuine Gate 3/DPO blockers ratified — see 034 header)
-- Gate:        This file (035) — Gate 4 (RLS, privilege, lifecycle, concurrency)
--              VALIDATED LIVE against staging on 2026-07-26
--              (KORA-LINK-RLS-LIVE-VALIDATION-11, see
--              docs/KORA_LINK_GATE_4_FINAL_REPORT.md — C1-C10, 400 behavioral
--              assertions + 30 local concurrency iterations + 3 live races +
--              1 rollback-recovery test, all PASS: 9 tables, 22 active
--              policies, RLS ENABLE+FORCE on 9/9). Promoted to
--              supabase/migrations/ by KORA-LINK-MIGRATION-FORMALIZATION-12.
--              The worker-self-select policy and company-facing SELECT policy
--              remain exactly as commented-out/spec-only as before this
--              promotion — their absence was validated as the intended
--              current-scope behavior, not an oversight; adding either is a
--              future, separately-gated change, not part of this promotion.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: CANONICAL_APPLIED
-- ─────────────────────────────────────────────────────────────────────────────
-- This migration is promoted and canonical. It was already live on staging
-- (haqf****jl) before this promotion — KORA-LINK-MIGRATION-FORMALIZATION-12
-- reconciles supabase/migrations/ and the remote migration history
-- (`supabase migration repair --status applied 035`) with that already-applied
-- state; it does not re-run this DDL. KL-19 (2026-07-04) reviewed and closed
-- 034's own engineering TODOs. This file's own RLS design (policies, grants,
-- SECURITY DEFINER function stubs) was validated behaviorally and live by
-- KORA-LINK-RLS-LIVE-VALIDATION-11 — see docs/KORA_LINK_GATE_4_FINAL_REPORT.md
-- for full evidence, including the C7 (KORA_ADMIN), C8 (service_role), and C9
-- (safe-aggregation-threshold) scenarios that directly exercise the policies
-- and grants defined below. Remaining open items, tracked independently of
-- this promotion:
--   (1) Gate 3 overall closure (DPIA prudential recommendation, worker
--       self-service deactivation RPC) — see docs/KORA_LINK_DPO_DECISIONS_09.md
--   (2) Worker self-select and company-facing SELECT policies remain
--       intentionally out of scope (commented out / absent) — not required by
--       any validated behavior, not part of this promotion
--
-- DEPENDENCY ON 034
-- ─────────────────────────────────────────────────────────────────────────────
-- Requires 034_kora_link_schema.sql to be applied first.
-- 034 must have created:
--   kora_link.link_batches, kora_link.links, kora_link.link_assignments,
--   kora_link.link_activation_acknowledgements (renamed from link_consents,
--   KORA-LINK-DPO-DECISIONS-09), kora_link.link_events, kora_link.revocations,
--   kora_link.link_replacements, kora_link.audit_log, kora_link.link_delivery_records
-- (9 tables — partner_scans and public_lookup_attempts NOT present)
--
-- DEPENDS ON EXISTING SCHEMA FUNCTIONS (from applied migrations)
-- ─────────────────────────────────────────────────────────────────────────────
--   kora.kora_role()   → migration 003 (reads JWT app_metadata.kora_role)
--   kora.tenant_id()   → migration 006 (reads JWT app_metadata.kora_tenant_id)
--   auth.uid()         → Supabase built-in
--
-- These functions are already in production. This file does NOT redefine them.
-- kora_link.is_kora_admin() defined below delegates directly to kora.kora_role().
--
-- ROLE MODEL (KORA repo convention — see kora.kora_role())
-- ─────────────────────────────────────────────────────────────────────────────
--   'KORA_ADMIN'     → internal KORA operations staff
--   'COMPANY_ADMIN'  → company HR admin / employer role
--   'COMPANY_VIEWER' → read-only company viewer
--   'WORKER'         → individual worker
--   'ADVISOR'        → external advisor role
--   'PARTNER'        → partner (future; not used in 035 v1)
--   anon             → unauthenticated (Supabase anon role)
--
-- PRIVACY DESIGN PRINCIPLES (constitutional)
-- ─────────────────────────────────────────────────────────────────────────────
-- [P-1] No direct SELECT on kora_link.links by any non-KORA_ADMIN role.
--       Public lookup uses future SECURITY DEFINER fn_public_lookup_link.
-- [P-2] No access to kora_link.link_assignments by COMPANY_ADMIN or WORKER directly.
--       Worker activation uses future SECURITY DEFINER fn_activate_link_for_worker.
-- [P-3] Company visibility = aggregate counts only (future view — not in this file).
-- [P-4] audit_log is INSERT-only for authenticated paths; no UPDATE, no DELETE.
--       kora_link.audit_log INSERT goes via server-side (Edge Function or SECDEF).
-- [P-5] anon role: GRANT USAGE on schema only. No table access.
-- [P-6] link_events, revocations, link_replacements: append-only (no UPDATE, DELETE).
-- [P-7] kora_link.link_delivery_records: KORA_ADMIN only; DPO approval pending.
-- [P-8] service_role bypasses RLS — must NEVER be used on the public /link/[token] route.
--
-- FUTURE SECURITY DEFINER FUNCTIONS (TODO spec — not created in this migration)
-- ─────────────────────────────────────────────────────────────────────────────
-- See §TODO_SECURITY_DEFINER at the bottom of this file for stub specs.
--   fn_public_lookup_link(p_token_digest text)
--   fn_activate_link_for_worker(p_token_digest text, p_worker_id uuid, p_consent_version text)
--   fn_revoke_link(p_link_id uuid, p_reason text)
--   fn_replace_link(p_old_link_id uuid, p_new_token_digest text, p_reason text)
--   fn_company_link_status_aggregate(p_tenant_id uuid)
--
-- ROLLBACK (manual — requires CTO approval)
-- ─────────────────────────────────────────────────────────────────────────────
-- Run in order:
--   DROP FUNCTION IF EXISTS kora_link.is_kora_admin() CASCADE;
--   ALTER TABLE kora_link.link_batches       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.links              DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.link_assignments   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.link_activation_acknowledgements DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.link_events        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.revocations        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.link_replacements  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.audit_log          DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE kora_link.link_delivery_records DISABLE ROW LEVEL SECURITY;
--   REVOKE USAGE ON SCHEMA kora_link FROM authenticated, anon;
-- Dropping policies individually: DROP POLICY IF EXISTS "..." ON kora_link.<table>;
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  RAISE NOTICE
    '035_kora_link_rls: CANONICAL_APPLIED. Gate 4 validated live against '
    'staging by KORA-LINK-RLS-LIVE-VALIDATION-11 — see '
    'docs/KORA_LINK_GATE_4_FINAL_REPORT.md. Gate 3 overall (DPIA, worker '
    'self-service deactivation) remains open independently of this apply.';
END;
$$;


-- ── 0. Schema access ──────────────────────────────────────────────────────────
--
-- GRANT USAGE allows roles to reference objects in the schema.
-- Table-level GRANTs follow per-table; USAGE alone gives no row access.
-- anon gets USAGE so it can invoke future SECURITY DEFINER functions
-- but has no direct table SELECT — enforced by deny-by-default RLS + no grants.

GRANT USAGE ON SCHEMA kora_link TO authenticated, anon;


-- ── 0b. service_role grants (KORA-LINK-S3A) ────────────────────────────────────
--
-- service_role bypasses RLS entirely (a Postgres role attribute), but that
-- does NOT imply it holds ordinary table/schema privileges — those are a
-- separate, independent privilege layer. Migrations 032 (network schema) and
-- 033 (personal.worker_identity) both had to retroactively fix the identical
-- gap: a new schema/table created without an explicit service_role grant
-- fails every service_role query with `42501 permission denied`, evaluated
-- before RLS ever runs. This section closes that same gap here, before it is
-- ever discovered against a real database.
--
-- Explicit, named grants only — no `GRANT ALL ON ALL TABLES IN SCHEMA`, per
-- 032's own deliberate precedent (a future table added to kora_link needs its
-- own reviewed grant, not silent inheritance). Verb sets mirror exactly what
-- `authenticated` already receives per table below — service_role gets no
-- more capability than the RLS-gated KORA_ADMIN path already has; it simply
-- bypasses the RLS check itself, the standard service_role model already used
-- by server-side/admin tooling elsewhere in this repo. No DELETE grant on any
-- table — mirrors the `REVOKE DELETE ... FROM PUBLIC` pattern applied
-- per-table below.

GRANT USAGE ON SCHEMA kora_link TO service_role;

GRANT SELECT, INSERT, UPDATE ON kora_link.link_batches          TO service_role;
GRANT SELECT, INSERT, UPDATE ON kora_link.links                 TO service_role;
GRANT SELECT, INSERT, UPDATE ON kora_link.link_assignments      TO service_role;
GRANT SELECT, INSERT         ON kora_link.link_activation_acknowledgements TO service_role;
GRANT SELECT, INSERT         ON kora_link.link_events           TO service_role;
GRANT SELECT, INSERT         ON kora_link.revocations           TO service_role;
GRANT SELECT, INSERT         ON kora_link.link_replacements     TO service_role;
GRANT SELECT, INSERT         ON kora_link.audit_log             TO service_role;
GRANT SELECT, INSERT, UPDATE ON kora_link.link_delivery_records TO service_role;


-- ── 1. Helper function ────────────────────────────────────────────────────────
--
-- kora_link.is_kora_admin()
-- Thin wrapper delegating to the canonical kora.kora_role() function (migration 003).
-- Used in all policies below to avoid repeating the string literal.
-- STABLE + SECURITY INVOKER (default) — no privilege elevation.
-- Does NOT redefine kora.kora_role() or kora.tenant_id().

CREATE OR REPLACE FUNCTION kora_link.is_kora_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT kora.kora_role() = 'KORA_ADMIN'
$$;

-- KORA-LINK-S3A: REVOKE ALL FROM PUBLIC before the selective GRANT below,
-- for consistency with every SECURITY DEFINER function in 036 (which already
-- follows this pattern, itself inherited from migration 031's hardening
-- fix). Low severity here specifically — SECURITY INVOKER means no privilege
-- elevation even if PUBLIC could call it — but the file should not have one
-- function that skips its own otherwise-consistent convention.
REVOKE ALL ON FUNCTION kora_link.is_kora_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.is_kora_admin() TO authenticated;

COMMENT ON FUNCTION kora_link.is_kora_admin() IS
  'KL-17 helper — delegates to kora.kora_role() (mig 003). '
  'Returns true only for KORA_ADMIN JWT claims. '
  'STABLE SECURITY INVOKER — no privilege elevation.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. kora_link.link_batches
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Visibility: KORA_ADMIN full access.
-- Company: future aggregate view (not in this file). No direct table access.
-- Worker/anon: no access.

ALTER TABLE kora_link.link_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_batches FORCE ROW LEVEL SECURITY;

-- GRANTs: authenticated only (anon has no path to batch data).
-- service_role bypasses RLS and is handled separately by the app.
GRANT SELECT, INSERT, UPDATE ON kora_link.link_batches TO authenticated;
REVOKE DELETE ON kora_link.link_batches FROM PUBLIC;

DROP POLICY IF EXISTS "kl_batches_admin_select" ON kora_link.link_batches;
CREATE POLICY "kl_batches_admin_select"
  ON kora_link.link_batches
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_batches_admin_insert" ON kora_link.link_batches;
CREATE POLICY "kl_batches_admin_insert"
  ON kora_link.link_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_batches_admin_update" ON kora_link.link_batches;
CREATE POLICY "kl_batches_admin_update"
  ON kora_link.link_batches
  FOR UPDATE
  TO authenticated
  USING (kora_link.is_kora_admin())
  WITH CHECK (kora_link.is_kora_admin());

-- PRIVACY NOTE (updated by KORA-LINK-S3B, 2026-07-12): the "future view"
-- sketched below and in 034's RLS TODO §K was never created and is not
-- planned. Company aggregate visibility is already implemented as the
-- SECURITY DEFINER RPC kora_link.fn_company_link_status_aggregate(uuid) in
-- 036_kora_link_rpc_functions.sql — tenant-scoped, (status, count) only. No
-- direct company table SELECT policy exists here or is planned. The
-- aggregate-count suppression threshold ([TODO-RPC-04] in 036) remains an
-- open CTO/DPO decision, not resolved by this note.
-- HISTORICAL sketch, kept for design-rationale record only — do not create:
-- Create view kora_link.v_tenant_batch_stats for COMPANY_ADMIN in a follow-on
-- migration once aggregate column set is agreed with CTO (see 034 RLS TODO §K).


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. kora_link.links
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- This is the most sensitive operational table.
-- Contains token_digest — the HMAC-SHA256 of the NFC token.
-- No authenticated role may SELECT this table directly except KORA_ADMIN.
-- Public route (/link/[token]): must use future SECURITY DEFINER fn_public_lookup_link.
-- Worker/Company: no direct access, ever.

ALTER TABLE kora_link.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.links FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON kora_link.links TO authenticated;
REVOKE DELETE ON kora_link.links FROM PUBLIC;

DROP POLICY IF EXISTS "kl_links_admin_select" ON kora_link.links;
CREATE POLICY "kl_links_admin_select"
  ON kora_link.links
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_links_admin_insert" ON kora_link.links;
CREATE POLICY "kl_links_admin_insert"
  ON kora_link.links
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_links_admin_update" ON kora_link.links;
CREATE POLICY "kl_links_admin_update"
  ON kora_link.links
  FOR UPDATE
  TO authenticated
  USING (kora_link.is_kora_admin())
  WITH CHECK (kora_link.is_kora_admin());

-- IMPORTANT: anon has no GRANT on kora_link.links — no row access even if RLS is bypassed.
-- The public /link/[token] route MUST use fn_public_lookup_link (SECURITY DEFINER).
-- That function is a TODO/spec in this file; it must be created and tested before
-- the public route goes live.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. kora_link.link_assignments
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- CONSTITUTIONAL INVARIANT: Company roles MUST NEVER access this table.
-- This table maps token_digest → worker. Any company access is a privacy violation.
-- Worker self-service: future fn_activate_link_for_worker (SECURITY DEFINER).
-- No direct table INSERT/SELECT for authenticated non-KORA_ADMIN.

ALTER TABLE kora_link.link_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_assignments FORCE ROW LEVEL SECURITY;

-- Minimal grant: authenticated SELECT/INSERT/UPDATE — RLS reduces to KORA_ADMIN only.
-- No UPDATE/DELETE for workers or company — enforced by policy absence.
GRANT SELECT, INSERT, UPDATE ON kora_link.link_assignments TO authenticated;
REVOKE DELETE ON kora_link.link_assignments FROM PUBLIC;
REVOKE UPDATE ON kora_link.link_assignments FROM PUBLIC;

DROP POLICY IF EXISTS "kl_assignments_admin_select" ON kora_link.link_assignments;
CREATE POLICY "kl_assignments_admin_select"
  ON kora_link.link_assignments
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_assignments_admin_insert" ON kora_link.link_assignments;
CREATE POLICY "kl_assignments_admin_insert"
  ON kora_link.link_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_assignments_admin_update" ON kora_link.link_assignments;
CREATE POLICY "kl_assignments_admin_update"
  ON kora_link.link_assignments
  FOR UPDATE
  TO authenticated
  USING (kora_link.is_kora_admin())
  WITH CHECK (kora_link.is_kora_admin());

-- FUTURE POLICY (add when fn_activate_link_for_worker is created and tested):
-- Worker SELECT self-only — BLOCKED until activation function is ready.
-- Do NOT add this policy until fn_activate_link_for_worker is deployed:
--
-- CREATE POLICY "kl_assignments_worker_self_select"
--   ON kora_link.link_assignments
--   FOR SELECT
--   TO authenticated
--   USING (
--     kora.kora_role() = 'WORKER'
--     AND worker_id = (
--       SELECT id FROM personal.worker_identity WHERE auth_user_id = auth.uid() LIMIT 1
--     )
--   );
--
-- This future policy requires cross-schema join to personal.worker_identity.
-- Review with CTO before enabling: verify RLS on personal.worker_identity allows it.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. kora_link.link_activation_acknowledgements
-- ═══════════════════════════════════════════════════════════════════════════════
-- [RENAMED — KORA-LINK-DPO-DECISIONS-09] Formerly kora_link.link_consents.
-- Terminology alignment only (see 034 §4): this records a voluntary
-- activation-notice acknowledgement, not GDPR Art. 6(1)(a) consent.
--
-- Acknowledgement records created only via activation function.
-- KORA_ADMIN: SELECT (for governance and DPO audit).
-- Worker direct INSERT: NOT allowed in v1 — must go via fn_activate_link_for_worker.
-- No UPDATE, no DELETE from any authenticated path.

ALTER TABLE kora_link.link_activation_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_activation_acknowledgements FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON kora_link.link_activation_acknowledgements TO authenticated;
REVOKE UPDATE, DELETE ON kora_link.link_activation_acknowledgements FROM PUBLIC;

DROP POLICY IF EXISTS "kl_activation_acks_admin_select" ON kora_link.link_activation_acknowledgements;
CREATE POLICY "kl_activation_acks_admin_select"
  ON kora_link.link_activation_acknowledgements
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_activation_acks_admin_insert" ON kora_link.link_activation_acknowledgements;
CREATE POLICY "kl_activation_acks_admin_insert"
  ON kora_link.link_activation_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

-- APPEND-ONLY ENFORCEMENT
-- No UPDATE policy: existing acknowledgement records cannot be modified by any role.
-- Deactivation is modeled as a new row (future v2 event-sourced design) or a status
-- update via SECURITY DEFINER fn_revoke_link (which also updates link_assignments).
-- Direct UPDATE is NOT allowed from any authenticated path in v1.
--
-- FUTURE (when fn_activate_link_for_worker is deployed):
-- Worker INSERT via activation function will bypass direct table insert.
-- fn_activate_link_for_worker is SECURITY DEFINER — it owns the INSERT on this table.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. kora_link.link_events
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Operational event log. Append-only.
-- KORA_ADMIN: SELECT + INSERT (for manual admin events and monitoring).
-- Others: no access.
-- No UPDATE, no DELETE.

ALTER TABLE kora_link.link_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_events FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON kora_link.link_events TO authenticated;
REVOKE UPDATE, DELETE ON kora_link.link_events FROM PUBLIC;

DROP POLICY IF EXISTS "kl_events_admin_select" ON kora_link.link_events;
CREATE POLICY "kl_events_admin_select"
  ON kora_link.link_events
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_events_admin_insert" ON kora_link.link_events;
CREATE POLICY "kl_events_admin_insert"
  ON kora_link.link_events
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

-- NOTE: Worker/Company aggregate event counts (e.g., scan count for a batch)
-- are a future view — not in this file. Do not add a worker SELECT policy
-- until the aggregate view is designed and approved by CTO.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. kora_link.revocations
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Immutable audit trail of revocation events.
-- KORA_ADMIN: SELECT + INSERT.
-- No UPDATE, no DELETE.
-- Worker-initiated revocations go via fn_revoke_link (future SECURITY DEFINER).

ALTER TABLE kora_link.revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.revocations FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON kora_link.revocations TO authenticated;
REVOKE UPDATE, DELETE ON kora_link.revocations FROM PUBLIC;

DROP POLICY IF EXISTS "kl_revocations_admin_select" ON kora_link.revocations;
CREATE POLICY "kl_revocations_admin_select"
  ON kora_link.revocations
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_revocations_admin_insert" ON kora_link.revocations;
CREATE POLICY "kl_revocations_admin_insert"
  ON kora_link.revocations
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. kora_link.link_replacements
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Replacement chain log. Append-only.
-- KORA_ADMIN: SELECT + INSERT.
-- No UPDATE, no DELETE.
-- Replacement operations go via fn_replace_link (future SECURITY DEFINER).

ALTER TABLE kora_link.link_replacements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_replacements FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON kora_link.link_replacements TO authenticated;
REVOKE UPDATE, DELETE ON kora_link.link_replacements FROM PUBLIC;

DROP POLICY IF EXISTS "kl_replacements_admin_select" ON kora_link.link_replacements;
CREATE POLICY "kl_replacements_admin_select"
  ON kora_link.link_replacements
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_replacements_admin_insert" ON kora_link.link_replacements;
CREATE POLICY "kl_replacements_admin_insert"
  ON kora_link.link_replacements
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. kora_link.audit_log
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Privacy-safe audit trail. INSERT-only via trusted server path.
-- KORA_ADMIN: SELECT (for governance and break-glass review).
-- INSERT: via server-side only (Edge Function or future SECURITY DEFINER).
--   No direct client INSERT in v1 (only KORA_ADMIN admin tooling path).
-- No UPDATE, no DELETE — enforced by REVOKE and policy absence.
-- DPO: read access via break-glass function (documented, audited) — future.

ALTER TABLE kora_link.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.audit_log FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON kora_link.audit_log TO authenticated;
REVOKE UPDATE, DELETE ON kora_link.audit_log FROM PUBLIC;

DROP POLICY IF EXISTS "kl_audit_admin_select" ON kora_link.audit_log;
CREATE POLICY "kl_audit_admin_select"
  ON kora_link.audit_log
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

-- INSERT restricted to KORA_ADMIN in v1 (for direct admin tooling).
-- Server-side audit writes (from Edge Functions or SECURITY DEFINER functions)
-- will use service_role, which bypasses RLS.
-- This policy ensures no authenticated client role can INSERT directly.
DROP POLICY IF EXISTS "kl_audit_admin_insert" ON kora_link.audit_log;
CREATE POLICY "kl_audit_admin_insert"
  ON kora_link.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

-- APPEND-ONLY GUARANTEE: no UPDATE or DELETE policy exists on this table.
-- service_role (server-side) CAN write via BYPASSRLS — this is the intended
-- path for automated audit writes from Edge Functions.
-- Direct client UPDATE/DELETE: impossible (no policy + REVOKE above).


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. kora_link.link_delivery_records
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Optional pilot logistics table. KORA_ADMIN only.
-- delivery_channel is a restricted enum, ratified by KORA-LINK-DPO-DECISIONS-09
-- (replaces the former free-text delivered_to_label — see 034 §9).
-- No worker, no company direct access.

ALTER TABLE kora_link.link_delivery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE kora_link.link_delivery_records FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON kora_link.link_delivery_records TO authenticated;
REVOKE DELETE ON kora_link.link_delivery_records FROM PUBLIC;

DROP POLICY IF EXISTS "kl_delivery_admin_select" ON kora_link.link_delivery_records;
CREATE POLICY "kl_delivery_admin_select"
  ON kora_link.link_delivery_records
  FOR SELECT
  TO authenticated
  USING (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_delivery_admin_insert" ON kora_link.link_delivery_records;
CREATE POLICY "kl_delivery_admin_insert"
  ON kora_link.link_delivery_records
  FOR INSERT
  TO authenticated
  WITH CHECK (kora_link.is_kora_admin());

DROP POLICY IF EXISTS "kl_delivery_admin_update" ON kora_link.link_delivery_records;
CREATE POLICY "kl_delivery_admin_update"
  ON kora_link.link_delivery_records
  FOR UPDATE
  TO authenticated
  USING (kora_link.is_kora_admin())
  WITH CHECK (kora_link.is_kora_admin());

-- DPO GATE NOTE [RESOLVED — KORA-LINK-DPO-DECISIONS-09]: delivery_channel is
-- a restricted enum (hr_admin | office_reception | site_admin | other) — the
-- non-identifying property is now enforced structurally, not by a
-- pre-production DPO content review of free text.


-- ═══════════════════════════════════════════════════════════════════════════════
-- TODO_SECURITY_DEFINER — Spec for future SECURITY DEFINER functions
-- NOT created in this migration. Spec only — for CTO and engineering review.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- KL-19 NOTE (2026-07-04): these functions are NOT hypothetical anymore — they
-- are already implemented in supabase/proposed/036_kora_link_rpc_functions.sql.
-- The function names below were renamed at KL-19 (from fn_kora_link_public_lookup/
-- fn_kora_link_activate/fn_kora_link_revoke/fn_kora_link_replace/
-- fn_kora_link_company_batch_stats) to match 036's actual implemented names
-- (fn_public_lookup_link/fn_activate_link_for_worker/fn_revoke_link/
-- fn_replace_link/fn_company_link_status_aggregate) — 036 dropped the redundant
-- "kora_link_" prefix since the functions already live in the kora_link schema.
-- This spec section is kept as the original design rationale/privacy-constraint
-- record; treat 036 as the authoritative current implementation where the two
-- differ on anything beyond naming. The STUB blocks below are historical and
-- superseded by 036 — do not uncomment them.
--
-- These functions must be created in a follow-on migration (036 or a dedicated
-- 035b) AFTER the following conditions are met:
--   (1) CTO approves the function signatures and privacy design below
--   (2) DPO approves the data returned by public_lookup and activate
--   (3) Gate 2 and Gate 3 are closed
--   (4) Functions are deployed and smoke-tested on staging before production apply
--
-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION SPEC A: fn_public_lookup_link
-- ────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Used by the public route /link/[token] to look up a token without
--   exposing the raw kora_link.links table to any Postgres role.
-- CALLER: Next.js API route (server-side, NOT client-side) via service_role OR
--   as SECURITY DEFINER invoked by the anon/authenticated role.
-- INPUTS:
--   p_token_digest text — the computed HMAC-SHA256 of the scanned token
-- OUTPUTS:
--   link_id uuid
--   status text
--   pre_activation_expires_at timestamptz
--   tenant_id uuid  (needed by activation flow — never returned to client)
-- PRIVACY CONSTRAINTS:
--   MUST NOT return: worker_id, auth_user_id, token_digest, batch_id
--   MUST check: pre_activation_expires_at > now() OR status IN ('active','activation_pending')
--   MUST NOT use: service_role in client-facing Edge Functions
-- IMPLEMENTATION NOTES:
--   D-07: single HMAC lookup — no key_version branching in v1
--   D-04: TTL checked inside function: reject if status='generated' AND expired
--   Rate limiting: Upstash handles upstream; function does NOT implement DB rate limit
--
-- KORA-LINK-S3A: historical placeholder SQL removed/superseded by
-- 036_kora_link_rpc_functions.sql (fn_public_lookup_link) — do not
-- implement here. The purpose/inputs/outputs/privacy-constraint prose
-- above remains the original design-rationale record; 036 is authoritative
-- for the actual implementation.
--
-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION SPEC B: fn_activate_link_for_worker
-- ────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Atomically create link_assignments + link_activation_acknowledgements
--   (renamed from link_consents, KORA-LINK-DPO-DECISIONS-09) after worker
--   authenticates and explicitly acknowledges the KORA Link activation notice.
-- CALLER: Next.js API route (authenticated worker session, server-side only)
-- INPUTS (KORA-LINK-S08 — updated, no p_worker_id; KORA-LINK-DPO-DECISIONS-09
-- terminology cleanup — parameter renamed from p_consent_version; see below):
--   p_token_digest              text  — computed HMAC-SHA256 of the scanned token
--   p_activation_notice_version text  — DPO-ratified activation notice version string
-- OUTPUTS:
--   jsonb: { success: bool, link_id: uuid, error_code: text|null }
-- PRIVACY CONSTRAINTS:
--   MUST validate: authenticated worker's auth.uid() → worker_identity → tenant match
--   MUST validate: token's tenant_id = worker's tenant_id (cross-tenant guard)
--   MUST validate: p_activation_notice_version is a known DPO-ratified string
--   MUST NOT: return token_digest, batch_id, or assignment_id to client
--   MUST atomically: INSERT link_assignments + link_activation_acknowledgements + UPDATE links.status
-- IMPLEMENTATION NOTES:
--   worker_id resolved inside function from auth.uid() → personal.worker_identity
--   Cross-schema SELECT does not require any new GRANT: the function owner
--   (postgres, superuser, BYPASSRLS — same mechanism as migration 015) reads
--   personal.worker_identity regardless of its FORCE ROW LEVEL SECURITY.
--   Uses SELECT ... FOR UPDATE NOWAIT on the links row to prevent races.
--
-- KORA-LINK-S3A: historical placeholder SQL removed/superseded by
-- 036_kora_link_rpc_functions.sql (fn_activate_link_for_worker) — do not
-- implement here. The purpose/inputs/outputs/privacy-constraint prose
-- above remains the original design-rationale record; 036 is authoritative
-- for the actual implementation.
--
-- KORA-LINK-S08: 036's fn_activate_link_for_worker signature is now
-- (p_token_digest text, p_activation_notice_version text — renamed from
-- p_consent_version by the KORA-LINK-DPO-DECISIONS-09 terminology cleanup
-- pass) — the p_worker_id parameter this spec originally sketched is
-- REMOVED, not merely validated. The
-- "cross-schema JOIN in SECURITY DEFINER requires confirming RLS on personal
-- schema allows it" concern this spec previously raised is resolved by the
-- SECURITY DEFINER/superuser-owner mechanism noted above (already proven
-- live by migration 020 and by migration 015 §SECURITY MECHANISM) — no RLS
-- policy change on personal.worker_identity was needed or made.
--
-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION SPEC C: fn_revoke_link
-- ────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Revoke a link (worker-initiated or admin-initiated).
--   Updates links.status = 'revoked', ends link_assignments, inserts into revocations.
-- CALLER: Next.js API route (admin or worker session, server-side)
-- INPUTS: p_link_id uuid, p_reason text, p_details text (nullable)
-- OUTPUTS: jsonb { success: bool, error_code: text|null }
-- PRIVACY: Admin path validates KORA_ADMIN role. Worker path validates worker owns link.
--
-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION SPEC D: fn_replace_link
-- ────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Replace old token with new token. Updates old link status = 'replaced',
--   inserts link_replacements record, creates new links row if not pre-provisioned.
-- CALLER: Admin API route (server-side, KORA_ADMIN only)
-- INPUTS: p_old_link_id uuid, p_new_token_digest text, p_reason text
-- OUTPUTS: jsonb { success: bool, new_link_id: uuid|null, error_code: text|null }
--
-- ────────────────────────────────────────────────────────────────────────────
-- FUNCTION SPEC E: fn_company_link_status_aggregate
-- ────────────────────────────────────────────────────────────────────────────
-- PURPOSE: Aggregate-safe stats for a company's link batch.
--   Company NEVER sees individual links; only counts by status.
-- CALLER: Next.js company route (authenticated COMPANY_ADMIN session)
-- INPUTS: p_tenant_id uuid (validated against JWT kora.tenant_id())
-- OUTPUTS (KORA-LINK-S08 — updated): TABLE (status text, count bigint,
--   suppressed boolean) — no link_id, no token_digest. count is NULL and
--   suppressed is true for any bucket below safe_aggregation_threshold (10).
-- PRIVACY: Validates tenant_id = kora.tenant_id() from JWT before query.
--   Applies safe_aggregation_threshold = 10 per bucket (KORA-LINK-S08).
--
-- ────────────────────────────────────────────────────────────────────────────
-- OPEN QUESTIONS FOR CTO REVIEW (RLS 035)
-- ────────────────────────────────────────────────────────────────────────────
-- [TODO-RLS-01] Worker self-SELECT on link_assignments: approve policy spec above
--               (requires cross-schema join to personal.worker_identity)?
-- [TODO-RLS-02] Approve fn_public_lookup_link return type and TTL logic.
-- [TODO-RLS-03] Approve fn_activate_link_for_worker concurrency model (SERIALIZABLE vs FOR UPDATE).
--               KORA-LINK-S08 note: 036 uses SELECT ... FOR UPDATE NOWAIT
--               (fail-fast, not SERIALIZABLE) — unchanged by this sprint,
--               still awaiting explicit CTO sign-off on this choice.
-- [RESOLVED KORA-LINK-S08] TODO-RLS-04: the chip-count suppression threshold
--               question (mirrors [TODO-RPC-04] in 036) is resolved as an
--               engineering application of the already-canonical
--               safe_aggregation_threshold = 10 (lib/constants/kora.ts,
--               CLAUDE.md §13, migration 015 [G2] precedent) — not a new
--               policy decision requiring fresh CTO/DPO sign-off, since the
--               threshold value itself is already constitutional. Human CTO
--               ratification of this specific application still recommended
--               but this is no longer an open engineering gap.
-- [TODO-RLS-05] UPDATED by KORA-LINK-S3B (2026-07-12): KORA-LINK-S3A added the
--               explicit `GRANT SELECT, INSERT ON kora_link.audit_log TO
--               service_role;` this item asked for (see §0b above). The
--               mechanical grant now exists. KORA-LINK-S08 update: 036's
--               fn_activate_link_for_worker now writes to audit_log directly
--               as part of its own SECURITY DEFINER transaction (not via a
--               separate app-layer service_role INSERT) — answering this
--               item's question for that one function. fn_revoke_link,
--               fn_replace_link, and fn_public_lookup_link do NOT yet write
--               to audit_log (link_events covers their KORA_ADMIN-visible
--               trail) — extending audit_log writes to those functions
--               remains open, tracked as a residual gap in
--               docs/KORA_LINK_SECURITY_FOUNDATION_08.md. Gate 4 is not
--               closed by this update.
-- [TODO-RLS-06] DPO break-glass read on audit_log: design and approve access procedure.
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-DPO-04: fn_activate_link_for_worker
--               activation_notice_version (renamed from consent_version)
--               validation list — canonical value ratified:
--               'kora-link-activation-notice-v1.0'. See 036
--               c_valid_activation_notice_version and
--               docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 4.


NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-APPLY VERIFICATION QUERIES (run manually after apply — DO NOT automate)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. Confirm RLS enabled on all 9 kora_link tables:
--    SELECT tablename, rowsecurity
--    FROM pg_tables
--    WHERE schemaname = 'kora_link'
--    ORDER BY tablename;
--    Expected: 9 rows, all rowsecurity = true.
--
-- 2. Confirm policy count per table:
--    SELECT tablename, COUNT(*) AS policy_count
--    FROM pg_policies
--    WHERE schemaname = 'kora_link'
--    GROUP BY tablename
--    ORDER BY tablename;
--    Expected:
--      audit_log            → 2 (admin_select, admin_insert)
--      link_activation_acknowledgements → 2 (admin_select, admin_insert)
--      link_assignments     → 3 (admin_select, admin_insert, admin_update)
--      link_batches         → 3 (admin_select, admin_insert, admin_update)
--      link_delivery_records → 3 (admin_select, admin_insert, admin_update)
--      link_events          → 2 (admin_select, admin_insert)
--      link_replacements    → 2 (admin_select, admin_insert)
--      links                → 3 (admin_select, admin_insert, admin_update)
--      revocations          → 2 (admin_select, admin_insert)
--    Total: 22 policies
--
-- 3. Confirm is_kora_admin() function exists:
--    SELECT routine_name FROM information_schema.routines
--    WHERE routine_schema = 'kora_link' AND routine_name = 'is_kora_admin';
--    Expected: 1 row.
--
-- 4. Confirm no UPDATE policy on append-only tables:
--    SELECT tablename, cmd
--    FROM pg_policies
--    WHERE schemaname = 'kora_link'
--      AND tablename IN ('audit_log','link_events','revocations','link_replacements','link_activation_acknowledgements')
--      AND cmd = 'UPDATE';
--    Expected: 0 rows.
--
-- 5. Confirm no DELETE policy on any kora_link table:
--    SELECT tablename, cmd
--    FROM pg_policies
--    WHERE schemaname = 'kora_link' AND cmd = 'DELETE';
--    Expected: 0 rows.
--
-- 6. Confirm schema USAGE granted to authenticated, anon, and service_role:
--    SELECT grantee, privilege_type
--    FROM information_schema.role_usage_grants
--    WHERE object_schema = 'kora_link'
--    ORDER BY grantee;
--    Expected: authenticated USAGE, anon USAGE, service_role USAGE.
--
-- 6b. Confirm service_role table grants exist on all 9 tables (KORA-LINK-S3A):
--    SELECT table_name, privilege_type
--    FROM information_schema.role_table_grants
--    WHERE table_schema = 'kora_link' AND grantee = 'service_role'
--    ORDER BY table_name, privilege_type;
--    Expected: 9 tables present, each with SELECT/INSERT (+ UPDATE on
--    link_batches, links, link_assignments, link_delivery_records) —
--    matching the same verb set already granted to authenticated per table.
--
-- 7. Confirm no SECURITY DEFINER functions (TODO/spec only in KL-17):
--    SELECT routine_name
--    FROM information_schema.routines
--    WHERE routine_schema = 'kora_link'
--      AND routine_definition NOT ILIKE '%security invoker%'
--      AND specific_name NOT LIKE 'is_kora_admin%';
--    Expected: 0 rows (only is_kora_admin exists, which is SECURITY INVOKER).
