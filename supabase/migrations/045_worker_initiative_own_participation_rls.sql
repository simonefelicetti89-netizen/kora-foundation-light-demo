-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 045: personal.worker_initiative — own-participation RLS gap
-- Migration:   045_worker_initiative_own_participation_rls
-- Created:     2026-07-26
-- Sprint:      PILOT-TRUST-01 — FASE 5 (service-role removal from user-facing pages)
-- Gate:        Gate 2 OPEN — written, NOT applied to staging/production.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Closes an RLS gap discovered while migrating app/worker/workspace/page.tsx and
-- app/worker/dynamic-cv/print/page.tsx off getSupabaseServiceClient() onto the
-- ordinary RLS-respecting session client (same pattern already established by
-- migration 022 for personal.worker_identity/analytics.tenant — see that
-- file's header for the precedent this follows).
--
-- THE GAP
-- The only existing SELECT policy on personal.worker_initiative
-- ("worker_initiative_worker_published_select", migration 008) restricts
-- WORKER visibility to `status = 'published'`. That is correct for the
-- "current/open initiatives" catalog listing, but three read paths embed
-- `worker_initiative` through `worker_participation` to show a worker's own
-- PAST activity (participation history, activation-profile pillar counters,
-- printed Dynamic CV experiences). Once an initiative a worker previously
-- took part in transitions to `status = 'closed'` (a normal lifecycle
-- transition), the plain session client would silently drop that initiative's
-- title/pillar from the embedded join — a real functional regression, not
-- just a privilege question, since the service-role client never hit this
-- restriction.
--
-- THE FIX
-- An ADDITIVE SELECT policy (Postgres RLS policies for the same command are
-- OR'd together — this does not narrow or replace the existing published-only
-- policy, it only adds one more allowed path): a WORKER may also read a
-- personal.worker_initiative row, regardless of its current status, if that
-- row is referenced by one of their OWN personal.worker_participation rows.
-- Ownership of the participation row is proven the same way migration 007/008
-- already do it: personal.worker_identity.auth_user_id = auth.uid().
--
-- Company/KORA_ADMIN policies on this table are untouched.
--
-- IDEMPOTENTE: DROP POLICY IF EXISTS before CREATE POLICY.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "worker_initiative_worker_own_participation_select" ON personal.worker_initiative;

CREATE POLICY "worker_initiative_worker_own_participation_select" ON personal.worker_initiative
  FOR SELECT USING (
    kora.kora_role() = 'WORKER'
    AND tenant_id = kora.tenant_id()
    AND id IN (
      SELECT wp.initiative_id
      FROM personal.worker_participation wp
      WHERE wp.worker_id IN (
        SELECT wi.id FROM personal.worker_identity wi WHERE wi.auth_user_id = auth.uid()
      )
    )
  );

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
