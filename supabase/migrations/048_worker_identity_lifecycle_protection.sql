-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 048: worker_identity lifecycle protection
-- Migration:   048_worker_identity_lifecycle_protection
-- Created:     2026-07-29
-- Sprint:      PILOT-TRUST-05 — WORKER IDENTITY SELF-REACTIVATION FIX
-- Gate:        Gate 2 OPEN — written, applied to LOCAL only in this sprint.
--              NOT applied to staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- ROOT CAUSE (found while building PILOT-TRUST-04's RLS-09 suite, confirmed
-- and reproduced empirically in PILOT-TRUST-05):
--
--   Migration 022 (022_worker_rls_gaps.sql, block B163) added
--   `worker_identity_worker_own_update` to unblock a real, still-load-bearing
--   flow: a WORKER completing onboarding writes their own
--   personal.worker_identity.status from 'invited'/'pending' to 'active'
--   directly via the RLS-governed session client (app/api/worker/onboarding
--   /route.ts, app/api/worker/profile/route.ts PATCH).
--
--   The policy's WITH CHECK correctly re-verifies row ownership
--   (auth_user_id = auth.uid()) — the author's own comment shows this was a
--   deliberate, considered choice to prevent a worker from reassigning their
--   row to a different auth.uid(). WITH CHECK does NOT, and by design
--   cannot, restrict WHICH OTHER COLUMNS change or WHAT VALUES they take —
--   it only re-checks that the resulting row still belongs to the caller.
--
--   Reproduced empirically (local PostgreSQL, direct RLS claims simulation,
--   PILOT-TRUST-05 FASE 3): a WORKER session can, via this single policy:
--     - set their own DISABLED mapping back to 'active' (self-reactivation —
--       defeats the tenant/mapping lifecycle enforcement added in
--       PILOT-TRUST-04's requireWorkerUser() fix for any still-valid,
--       unexpired session token);
--     - set an arbitrary status transition (e.g. active -> disabled);
--     - change tenant_id to move themselves to a different tenant;
--     - change worker_ref (identity linkage);
--     - change created_at (system-managed field, no trigger protected it).
--   auth_user_id changes were already correctly blocked by the existing
--   WITH CHECK. updated_at was already correctly forced to now() by the
--   pre-existing trg_worker_identity_updated_at trigger (set_updated_at()) —
--   neither needed fixing.
--
-- THE FIX
-- A single BEFORE UPDATE FOR EACH ROW trigger, applying ONLY when the
-- calling session's role (kora.kora_role(), JWT-based — not current_role,
-- which is not a reliable signal inside functions; see PILOT-TRUST-03's
-- root cause notes for why) is 'WORKER'. Any other caller (service_role,
-- or any future admin RLS path) passes through unrestricted — lifecycle
-- changes remain fully available through the legitimate service-role admin
-- path, unchanged.
--
-- For a WORKER caller, the trigger:
--   1. Rejects (RAISE EXCEPTION) any change to tenant_id, auth_user_id, or
--      worker_ref — these are never worker-writable, full stop.
--   2. Rejects any change to created_at.
--   3. Rejects any status transition EXCEPT the single legitimate one:
--      OLD.status IN ('invited', 'pending') AND NEW.status = 'active'
--      (onboarding completion — matches exactly what onboarding/route.ts
--      and profile/route.ts already do). This specifically blocks
--      disabled -> active (self-reactivation) and every other transition.
--
-- No RLS policy is removed or narrowed — the existing
-- `worker_identity_worker_own_update` policy (row ownership, unchanged)
-- remains the first gate; this trigger is the second, column/transition-
-- aware gate, matching the mandate's preferred fix (BEFORE UPDATE trigger)
-- over rewriting the two legitimate consumer routes into a new RPC, which
-- would touch more surface for the same guarantee.
--
-- SCOPE — minimal, only this bug:
--   - No GRANT/REVOKE change (already least-privilege).
--   - No change to worker_identity_worker_own_select, no removal of the
--     UPDATE policy, no data modified.
--   - Does not reactivate, disable, or otherwise touch any existing row.
--   - requireWorkerUser tenant status (PILOT-TRUST-04), partner workspace,
--     CSP, KORA Link: out of scope, untouched.
--
-- IDEMPOTENT: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS / CREATE
-- TRIGGER — safe to re-apply.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION personal.enforce_worker_identity_lifecycle_protection()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  -- Non-WORKER callers (service_role admin path, or any future admin RLS
  -- path) are never restricted by this trigger — lifecycle management
  -- remains fully available through authorized server-side paths.
  IF kora.kora_role() IS DISTINCT FROM 'WORKER' THEN
    RETURN NEW;
  END IF;

  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'worker_identity: tenant_id is not worker-writable';
  END IF;

  IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'worker_identity: auth_user_id is not worker-writable';
  END IF;

  IF NEW.worker_ref IS DISTINCT FROM OLD.worker_ref THEN
    RAISE EXCEPTION 'worker_identity: worker_ref is not worker-writable';
  END IF;

  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'worker_identity: created_at is not worker-writable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (OLD.status IN ('invited', 'pending') AND NEW.status = 'active') THEN
      RAISE EXCEPTION 'worker_identity: this status transition is not worker-writable — lifecycle changes require an authorized administrative path';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION personal.enforce_worker_identity_lifecycle_protection() IS
  'PILOT-TRUST-05: restricts WORKER-role UPDATEs on personal.worker_identity '
  '(via worker_identity_worker_own_update, migration 022) to the single '
  'legitimate self-service transition — invited/pending -> active on '
  'onboarding completion. Blocks self-reactivation of a disabled mapping and '
  'any change to tenant_id/auth_user_id/worker_ref/created_at. Non-WORKER '
  'callers (service_role) are unaffected — see migration 048 header.';

DROP TRIGGER IF EXISTS trg_worker_identity_lifecycle_protection ON personal.worker_identity;

CREATE TRIGGER trg_worker_identity_lifecycle_protection
  BEFORE UPDATE ON personal.worker_identity
  FOR EACH ROW
  EXECUTE FUNCTION personal.enforce_worker_identity_lifecycle_protection();

-- ── Reload schema PostgREST ───────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;
