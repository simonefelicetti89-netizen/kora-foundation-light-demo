-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  EMERGENCY ROLLBACK ONLY — READ BEFORE APPLYING                            ║
-- ║                                                                              ║
-- ║  This file ROLLS BACK migration 039 (039_kora_link_audit_hardening.sql).  ║
-- ║  It is NOT part of the normal apply sequence.                              ║
-- ║                                                                              ║
-- ║  DO NOT APPLY THIS FILE UNLESS:                                            ║
-- ║    1. Migration 039 has been applied and caused confirmed breakage.         ║
-- ║    2. A forward fix (040+) is not viable.                                  ║
-- ║    3. Rollback has been explicitly approved by the technical owner.        ║
-- ║    4. The target environment is confirmed (staging vs. production —       ║
-- ║       production has never received KORA Link migrations at all).         ║
-- ║                                                                              ║
-- ║  WHAT THIS RESTORES:                                                       ║
-- ║    fn_revoke_link and fn_replace_link revert to their pre-13A bodies       ║
-- ║    (identical to 036_kora_link_rpc_functions.sql, which remains the        ║
-- ║    unmodified historical record). This REMOVES the two audit_log writes    ║
-- ║    added by 039 (LINK_REVOKED / LINK_REPLACED on success,                  ║
-- ║    ADMIN_ACTION_DENIED on role-check denial) — Gate 4 finding 5/6          ║
-- ║    (docs/KORA_LINK_GATE_4_FINAL_REPORT.md §10) reopens.                    ║
-- ║                                                                              ║
-- ║  WHAT THIS DOES NOT TOUCH (039 never changed these, nothing to restore):   ║
-- ║    - kora_link.audit_log table schema, constraints, indexes.               ║
-- ║    - Any RLS policy on any kora_link table.                                ║
-- ║    - Any GRANT/REVOKE on any kora_link function or table.                  ║
-- ║    - Function signatures, SECURITY DEFINER, search_path, response shape.   ║
-- ║                                                                              ║
-- ║  APPLY COMMAND (never via supabase migration up):                          ║
-- ║    supabase db query --linked --file                                        ║
-- ║    supabase/rollback/039_rollback_039_if_needed.sql                        ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ── 1. Restore fn_revoke_link to its pre-13A (036) body ──────────────────────

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
  IF NOT kora_link.is_kora_admin() THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');
  END IF;

  IF p_link_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  IF p_reason IS NULL OR p_reason NOT IN (
    'lost','stolen','worker_request','company_request',
    'security','turnover','replacement','expired','other'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'invalid_input');
  END IF;

  SELECT l.status, l.tenant_id
  INTO v_link_status, v_tenant_id
  FROM kora_link.links l
  WHERE l.id = p_link_id
  FOR UPDATE NOWAIT
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'not_found');
  END IF;

  IF v_link_status IN ('revoked', 'replaced', 'orphaned') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_terminal');
  END IF;

  UPDATE kora_link.link_assignments
  SET status            = 'revoked',
      ended_at          = now(),
      revocation_reason = p_reason
  WHERE link_id = p_link_id
    AND status  = 'active'
  RETURNING worker_id INTO v_worker_id;

  INSERT INTO kora_link.revocations (
    link_id, tenant_id, worker_id, reason,
    revoked_by_actor_type, revoked_by_actor_id, revoked_at
  ) VALUES (
    p_link_id, v_tenant_id, v_worker_id, p_reason,
    'kora_admin', auth.uid(), now()
  );

  UPDATE kora_link.links
  SET status     = 'revoked',
      revoked_at = now()
  WHERE id = p_link_id;

  INSERT INTO kora_link.link_events (
    link_id, tenant_id, worker_id, event_type,
    actor_type, actor_id, result, metadata
  ) VALUES (
    p_link_id, v_tenant_id, v_worker_id, 'revoked',
    'kora_admin', auth.uid(), 'ok',
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

COMMENT ON FUNCTION kora_link.fn_revoke_link(uuid, text) IS
  'KL-18 — Admin token revocation. KORA_ADMIN only (role check inside). '
  'Updates link status, ends active assignment, inserts revocation + event. '
  'All writes append-only except status field updates on links/assignments. '
  'SECURITY DEFINER. search_path explicit.';


-- ── 2. Restore fn_replace_link to its pre-13A (036) body ─────────────────────

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
  IF NOT kora_link.is_kora_admin() THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'forbidden');
  END IF;

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

  IF v_old_status IN ('revoked', 'replaced', 'orphaned') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_terminal');
  END IF;

  IF v_new_status IN ('active', 'revoked', 'replaced', 'orphaned', 'expired') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'new_link_unavailable');
  END IF;

  UPDATE kora_link.link_assignments
  SET status            = 'replaced',
      ended_at          = now(),
      revocation_reason = 'replacement'
  WHERE link_id = p_old_link_id
    AND status  = 'active'
  RETURNING worker_id INTO v_worker_id;

  INSERT INTO kora_link.link_replacements (
    old_link_id, new_link_id, tenant_id, worker_id,
    reason, created_by_actor_type, created_by_actor_id
  ) VALUES (
    p_old_link_id, p_new_link_id, v_tenant_id, v_worker_id,
    p_reason, 'kora_admin', auth.uid()
  );

  UPDATE kora_link.links
  SET status     = 'replaced',
      revoked_at = now()
  WHERE id = p_old_link_id;

  UPDATE kora_link.links
  SET tenant_id = v_tenant_id
  WHERE id       = p_new_link_id
    AND tenant_id IS NULL;

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

  RETURN jsonb_build_object('success', true, 'new_link_id', p_new_link_id);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'concurrent_request');
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'already_replaced');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'internal');
END;
$$;

COMMENT ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) IS
  'KL-18 — Admin token replacement chain. KORA_ADMIN only. '
  'Uses kora_link.link_replacements as SOLE chain source (A-08/D-08). '
  'No replaced_by_link_id column on links (removed in KL-16). '
  'Returns new_link_id in success response; no PII returned. '
  'SECURITY DEFINER. search_path explicit.';

-- ── 3. POST-APPLY VERIFICATION ────────────────────────────────────────────────
/*
-- Confirm neither function references audit_log anymore:
SELECT proname FROM pg_proc
WHERE pronamespace = 'kora_link'::regnamespace
  AND proname IN ('fn_revoke_link', 'fn_replace_link')
  AND prosrc ILIKE '%audit_log%';
-- Expected: 0 rows.
*/

COMMIT;
