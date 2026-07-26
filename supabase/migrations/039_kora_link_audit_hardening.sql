-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   039_kora_link_audit_hardening
-- Feature:     KORA-LINK-HARDENING-AUTOMATION-13A — audit hardening for
--              fn_revoke_link and fn_replace_link
-- Depends on:  036_kora_link_rpc_functions.sql (CANONICAL_APPLIED — see
--              docs/KORA_LINK_MIGRATION_FORMALIZATION_12_REPORT.md)
-- Author:      KORA Foundation Light · 2026-07-26
-- Gate status: Gate 2 CLOSED (KL-19) · Gate 4 (RLS/behavioral) validated live
--              for the functions this migration touches, prior to this change
--              (KORA-LINK-RLS-LIVE-VALIDATION-11,
--              docs/KORA_LINK_GATE_4_FINAL_REPORT.md). This migration is
--              created canonical per KORA-LINK-HARDENING-AUTOMATION-13A but is
--              NOT yet applied to any database (local or staging) as of this
--              commit — local ephemeral validation only. Staging application
--              and migration-history reconciliation are a separate,
--              explicitly authorized step, following the same pattern already
--              used for 032–036 (KORA-LINK-MIGRATION-FORMALIZATION-12).
-- ───────────────────────────────────────────────────────────────────────────────
-- Purpose:
--   Closes Gate 4 finding 5/6 (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10,
--   §14 action D): fn_revoke_link and fn_replace_link performed no writes to
--   kora_link.audit_log — neither on success nor on a denied (non-KORA_ADMIN)
--   attempt — unlike fn_activate_link_for_worker, which already writes
--   audit_log on its success and tenant-mismatch paths (036, KORA-LINK-
--   SECURITY-FOUNDATION-08). A caller with service_role access but without a
--   KORA_ADMIN claim could previously attempt an admin revoke/replace and
--   leave zero trace anywhere (not audit_log, not even kora_link.link_events).
--
--   This migration adds exactly two new kora_link.audit_log INSERT points to
--   each of the two functions:
--     1. On success (LINK_REVOKED / LINK_REPLACED, result='ok'), in the same
--        transaction as the rest of the operation — mirrors the pattern
--        already validated for fn_activate_link_for_worker's
--        ACTIVATION_COMPLETED write.
--     2. On the role-check denial only (ADMIN_ACTION_DENIED, result=
--        'forbidden') — the highest forensic-value gap per Gate 4 finding 6.
--        actor_type is recorded as 'system' (the caller is by definition not
--        KORA_ADMIN at this point, and audit_log.actor_type's CHECK
--        constraint has no 'partner'/'unknown' value — 'system' is the
--        existing catch-all for non-specific-actor security/anomaly events,
--        consistent with the table's own RETENTION POLICY comment grouping
--        ADMIN_OVERRIDE-class events under "Security/anomaly events"). The
--        caller's actual declared role (or its absence) is still recorded,
--        non-sensitively, in metadata.declared_role.
--
--   No audit write is added for any other branch (invalid_input, not_found,
--   already_terminal, new_link_not_found, new_link_unavailable) nor for any
--   EXCEPTION branch (lock_not_available/concurrent_request, unique_violation/
--   already_replaced, OTHERS/internal) — deliberate scope limit, see
--   /tmp/KORA_LINK_HARDENING_AUTOMATION_13_PLAN.md §3.C: an INSERT executed
--   from inside an already-failing EXCEPTION branch would itself risk failing
--   or logging a necessarily generic, potentially misleading event; internal
--   errors already have infrastructure-level (Postgres/Supabase) logging.
--
-- What this migration does NOT do:
--   - Does not create, alter, or drop any table, column, index, or constraint.
--   - Does not create, alter, or drop any RLS policy.
--   - Does not change any GRANT/REVOKE — CREATE OR REPLACE FUNCTION preserves
--     the existing ACL on a function; the REVOKE ALL FROM PUBLIC / GRANT
--     EXECUTE TO authenticated, service_role statements already applied in
--     036 remain in effect unchanged and are intentionally NOT repeated here.
--   - Does not change either function's signature, LANGUAGE, SECURITY
--     DEFINER, or search_path.
--   - Does not change the authorization check (is_kora_admin()), the tenant/
--     lifecycle/state-machine logic, the response shape (jsonb keys/values
--     returned to the caller for every branch), or the idempotency behavior
--     already validated in Gate 4 — every non-audit line of both functions is
--     byte-identical to 036.
--   - Does not write any token, token_digest (full or prefix — not applicable,
--     these functions operate on link_id, never on a token/token_digest
--     input), email, worker name, or other personal data into audit_log.
--   - Does not touch fn_activate_link_for_worker, fn_public_lookup_link,
--     fn_is_valid_token_digest, or fn_company_link_status_aggregate.
--
-- Rollback:
--   See supabase/rollback/039_rollback_039_if_needed.sql. Rollback is a plain
--   CREATE OR REPLACE FUNCTION restoring the exact pre-13A bodies from 036
--   (which remains the unmodified historical record of those bodies) — no
--   table/policy/grant state to undo, since none was changed.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. fn_revoke_link — add audit_log writes (success + forbidden denial) ────

CREATE OR REPLACE FUNCTION kora_link.fn_revoke_link(
  p_link_id  uuid,
  p_reason   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
DECLARE
  v_link_status  text;
  v_tenant_id    uuid;
  v_worker_id    uuid;
BEGIN
  -- ── Role check ────────────────────────────────────────────────────────────
  IF NOT kora_link.is_kora_admin() THEN
    -- KORA-LINK-HARDENING-AUTOMATION-13A: audit the denied attempt. No link_id/
    -- tenant_id (not yet looked up — nothing to enumerate), no token/digest
    -- (not applicable to this function). actor_type='system': the caller is
    -- not KORA_ADMIN by definition here, and no other CHECK-allowed value
    -- fits; the real declared role (or its absence) goes in metadata only.
    INSERT INTO kora_link.audit_log (
      link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
    ) VALUES (
      NULL, NULL, 'system', auth.uid(), 'ADMIN_ACTION_DENIED', 'forbidden',
      NULL,
      jsonb_build_object(
        'event_category', 'admin_action_denied',
        'action', 'revoke',
        'declared_role', COALESCE(kora.kora_role(), 'none')
      )
    );
    RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');
  END IF;

  -- ── Input validation ──────────────────────────────────────────────────────
  IF p_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN (
    'lost','stolen','worker_request','company_request',
    'security','turnover','replacement','expired','other'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  -- ── Token lookup ─────────────────────────────────────────────────────────
  SELECT l.status, l.tenant_id
  INTO v_link_status, v_tenant_id
  FROM kora_link.links l
  WHERE l.id = p_link_id
  FOR UPDATE NOWAIT
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'not_found');
  END IF;

  -- Already in terminal state
  IF v_link_status IN ('revoked', 'replaced', 'orphaned') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_terminal');
  END IF;

  -- ── End active assignment ─────────────────────────────────────────────────
  UPDATE kora_link.link_assignments
  SET status            = 'revoked',
      ended_at          = now(),
      revocation_reason = p_reason
  WHERE link_id = p_link_id
    AND status  = 'active'
  RETURNING worker_id INTO v_worker_id;

  -- ── Revocation record (append-only) ──────────────────────────────────────
  INSERT INTO kora_link.revocations (
    link_id, tenant_id, worker_id, reason,
    revoked_by_actor_type, revoked_by_actor_id, revoked_at
  ) VALUES (
    p_link_id, v_tenant_id, v_worker_id, p_reason,
    'kora_admin', auth.uid(), now()
  );

  -- ── Link status transition ────────────────────────────────────────────────
  UPDATE kora_link.links
  SET status     = 'revoked',
      revoked_at = now()
  WHERE id = p_link_id;

  -- ── Event log (append-only) ───────────────────────────────────────────────
  INSERT INTO kora_link.link_events (
    link_id, tenant_id, worker_id, event_type,
    actor_type, actor_id, result, metadata
  ) VALUES (
    p_link_id, v_tenant_id, v_worker_id, 'revoked',
    'kora_admin', auth.uid(), 'ok',
    jsonb_build_object('event_category', 'revocation', 'reason', p_reason)
  );

  -- ── Audit log (KORA-LINK-HARDENING-AUTOMATION-13A) ────────────────────────
  -- Same transaction as the writes above: if this INSERT fails, the whole
  -- function falls through to EXCEPTION WHEN OTHERS and every write in this
  -- call (assignment update, revocations insert, link status update, event
  -- log) rolls back with it — no separate transaction-management code is
  -- needed, this is the existing PL/pgSQL block/EXCEPTION semantics already
  -- relied upon by fn_activate_link_for_worker's own audit write.
  INSERT INTO kora_link.audit_log (
    link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
  ) VALUES (
    p_link_id, v_tenant_id, 'kora_admin', auth.uid(), 'LINK_REVOKED', 'ok',
    NULL,
    jsonb_build_object('event_category', 'revocation', 'reason', p_reason)
  );

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'concurrent_request');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'internal');
END;
$$;

-- ACL unchanged — REVOKE ALL FROM PUBLIC / GRANT EXECUTE TO authenticated,
-- service_role already applied in 036 and preserved by CREATE OR REPLACE.

COMMENT ON FUNCTION kora_link.fn_revoke_link(uuid, text) IS
  'KL-18 — Admin token revocation. KORA_ADMIN only (role check inside). '
  'Updates link status, ends active assignment, inserts revocation + event. '
  'All writes append-only except status field updates on links/assignments. '
  'KORA-LINK-HARDENING-AUTOMATION-13A: writes kora_link.audit_log on success '
  '(LINK_REVOKED) and on role-check denial (ADMIN_ACTION_DENIED) — not on '
  'any other branch. SECURITY DEFINER. search_path explicit.';


-- ── 2. fn_replace_link — add audit_log writes (success + forbidden denial) ──

CREATE OR REPLACE FUNCTION kora_link.fn_replace_link(
  p_old_link_id  uuid,
  p_new_link_id  uuid,
  p_reason       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
DECLARE
  v_old_status   text;
  v_new_status   text;
  v_tenant_id    uuid;
  v_worker_id    uuid;
BEGIN
  -- ── Role check ────────────────────────────────────────────────────────────
  IF NOT kora_link.is_kora_admin() THEN
    -- KORA-LINK-HARDENING-AUTOMATION-13A: see fn_revoke_link above for the
    -- identical rationale (no link_id/tenant_id, no token/digest,
    -- actor_type='system', declared role only in metadata).
    INSERT INTO kora_link.audit_log (
      link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
    ) VALUES (
      NULL, NULL, 'system', auth.uid(), 'ADMIN_ACTION_DENIED', 'forbidden',
      NULL,
      jsonb_build_object(
        'event_category', 'admin_action_denied',
        'action', 'replace',
        'declared_role', COALESCE(kora.kora_role(), 'none')
      )
    );
    RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');
  END IF;

  -- ── Input validation ──────────────────────────────────────────────────────
  IF p_old_link_id IS NULL OR p_new_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  IF p_old_link_id = p_new_link_id THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN (
    'lost','stolen','worker_request','company_request',
    'security','turnover','replacement','expired','other'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  -- ── Lock both rows ────────────────────────────────────────────────────────
  SELECT l.status, l.tenant_id
  INTO v_old_status, v_tenant_id
  FROM kora_link.links l
  WHERE l.id = p_old_link_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'not_found');
  END IF;

  SELECT l.status INTO v_new_status
  FROM kora_link.links l
  WHERE l.id = p_new_link_id
  FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'new_link_not_found');
  END IF;

  -- Old token must be replaceable
  IF v_old_status IN ('revoked', 'replaced', 'orphaned') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_terminal');
  END IF;

  -- New token must not already be active or in terminal state
  IF v_new_status IN ('active', 'revoked', 'replaced', 'orphaned', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'new_link_unavailable');
  END IF;

  -- ── End active assignment on old token ────────────────────────────────────
  UPDATE kora_link.link_assignments
  SET status            = 'replaced',
      ended_at          = now(),
      revocation_reason = 'replacement'
  WHERE link_id = p_old_link_id
    AND status  = 'active'
  RETURNING worker_id INTO v_worker_id;

  -- ── Replacement chain record ──────────────────────────────────────────────
  -- link_replacements is the SOLE source of replacement chain (A-08/D-08).
  -- No replaced_by_link_id column on kora_link.links.
  INSERT INTO kora_link.link_replacements (
    old_link_id, new_link_id, tenant_id, worker_id,
    reason, created_by_actor_type, created_by_actor_id
  ) VALUES (
    p_old_link_id, p_new_link_id, v_tenant_id, v_worker_id,
    p_reason, 'kora_admin', auth.uid()
  );

  -- ── Old link status transition ────────────────────────────────────────────
  UPDATE kora_link.links
  SET status     = 'replaced',
      revoked_at = now()
  WHERE id = p_old_link_id;

  -- ── New link inherits tenant ──────────────────────────────────────────────
  -- If new link has no tenant yet, inherit from old link
  UPDATE kora_link.links
  SET tenant_id = v_tenant_id
  WHERE id       = p_new_link_id
    AND tenant_id IS NULL;

  -- ── Event log for old token ───────────────────────────────────────────────
  INSERT INTO kora_link.link_events (
    link_id, tenant_id, worker_id, event_type,
    actor_type, actor_id, result, metadata
  ) VALUES (
    p_old_link_id, v_tenant_id, v_worker_id, 'replaced',
    'kora_admin', auth.uid(), 'ok',
    jsonb_build_object(
      'event_category', 'replacement',
      'reason', p_reason,
      'new_link_id', p_new_link_id::text
    )
  );

  -- ── Event log for new token ───────────────────────────────────────────────
  INSERT INTO kora_link.link_events (
    link_id, tenant_id, worker_id, event_type,
    actor_type, actor_id, result, metadata
  ) VALUES (
    p_new_link_id, v_tenant_id, v_worker_id, 'assigned_to_tenant',
    'kora_admin', auth.uid(), 'ok',
    jsonb_build_object(
      'event_category', 'replacement',
      'reason', p_reason,
      'old_link_id', p_old_link_id::text
    )
  );

  -- ── Audit log (KORA-LINK-HARDENING-AUTOMATION-13A) ────────────────────────
  -- Same atomicity guarantee as fn_revoke_link above: a failure here rolls
  -- back this entire call via the existing EXCEPTION WHEN OTHERS branch.
  INSERT INTO kora_link.audit_log (
    link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
  ) VALUES (
    p_old_link_id, v_tenant_id, 'kora_admin', auth.uid(), 'LINK_REPLACED', 'ok',
    NULL,
    jsonb_build_object(
      'event_category', 'replacement',
      'reason', p_reason,
      'new_link_id', p_new_link_id::text
    )
  );

  RETURN jsonb_build_object('success', true, 'new_link_id', p_new_link_id);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'concurrent_request');
  WHEN unique_violation THEN
    -- uq_replacement_old_link: this token was already replaced in another transaction
    RETURN jsonb_build_object('success', false, 'error_code', 'already_replaced');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'internal');
END;
$$;

-- ACL unchanged — REVOKE ALL FROM PUBLIC / GRANT EXECUTE TO authenticated,
-- service_role already applied in 036 and preserved by CREATE OR REPLACE.

COMMENT ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) IS
  'KL-18 — Admin token replacement chain. KORA_ADMIN only. '
  'Uses kora_link.link_replacements as SOLE chain source (A-08/D-08). '
  'No replaced_by_link_id column on links (removed in KL-16). '
  'Returns new_link_id in success response; no PII returned. '
  'KORA-LINK-HARDENING-AUTOMATION-13A: writes kora_link.audit_log on success '
  '(LINK_REPLACED) and on role-check denial (ADMIN_ACTION_DENIED) — not on '
  'any other branch. SECURITY DEFINER. search_path explicit.';


-- ── 3. PostgREST reload ───────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
