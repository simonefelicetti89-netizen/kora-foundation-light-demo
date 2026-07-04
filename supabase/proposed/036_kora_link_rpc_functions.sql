-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   036_kora_link_rpc_functions
-- Feature:     KL-18 — KORA Link v1 — Server-side RPC / SECURITY DEFINER functions
-- Author:      KORA Foundation Light · 2026-07-01
-- Depends on:  034_kora_link_schema.sql (KL-19, 2026-07-04: PROPOSED_GATE2_TECHNICALLY_REVIEWED
--              — engineering TODOs resolved, 3 Gate 3/DPO blockers remain; see 034 header)
--              035_kora_link_rls.sql    (PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING — still open, Gate 4)
-- Gate:        This file (036) itself: Gate 2 OPEN + Gate 3 OPEN, NOT reviewed, NOT applied.
--              034's own engineering review closed at KL-19 — that does NOT extend to 036.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING
-- ─────────────────────────────────────────────────────────────────────────────
-- This file is a DESIGN DRAFT. Internal Engineering provisional — NOT CTO-approved.
-- KL-19 (2026-07-04) reviewed and closed 034's own engineering TODOs — it did NOT
-- review or change the RPC functions in this file (the function bodies below are
-- unchanged; only 035's spec-comment names were reconciled to match these already-
-- implemented names — see 035 header).
-- Do not apply until:
--   (1) 034 formally approved by CTO (Gate 2 — engineering substance closed at KL-19,
--       human CTO ratification still pending)
--   (2) 035 RLS applied and smoke-tested on staging
--   (3) DPO review of consent model and public lookup response (Gate 3)
--   (4) All GRANT decisions confirmed by CTO (especially anon access to public lookup)
--   (5) Integration tests written and passing on staging
--
-- DO NOT run `supabase db push`.
-- DO NOT run `supabase migration up`.
-- DO NOT copy to supabase/migrations/ without CTO + DPO sign-off.
-- DO NOT apply to staging or production.
-- DO NOT call these functions from runtime routes until all gates are closed.
--
-- FUNCTIONS DEFINED IN THIS FILE
-- ─────────────────────────────────────────────────────────────────────────────
--   fn_is_valid_token_digest(text)           — validation helper (IMMUTABLE, INVOKER)
--   fn_public_lookup_link(text)              — public route lookup (SECURITY DEFINER)
--   fn_activate_link_for_worker(text,uuid,text) — worker activation (SECURITY DEFINER)
--   fn_revoke_link(uuid, text)               — admin revocation (SECURITY DEFINER)
--   fn_replace_link(uuid, uuid, text)        — admin replacement (SECURITY DEFINER)
--   fn_company_link_status_aggregate(uuid)   — company aggregate view (SECURITY DEFINER)
--
-- SECURITY DEFINER RULES FOLLOWED
-- ─────────────────────────────────────────────────────────────────────────────
--   1. Every SECURITY DEFINER function sets an explicit search_path.
--   2. REVOKE ALL ... FROM PUBLIC before selective GRANT.
--   3. Functions NEVER return token_digest, worker_id (to public callers), or PII.
--   4. Error paths always return 'unavailable'/'error' — no information leakage.
--   5. fn_public_lookup_link: same response for "not found" and "unusable token"
--      to prevent token enumeration.
--   6. All write operations are append-only (no DELETE, no UPDATE except status fields).
--
-- DEPENDENCY MAP
-- ─────────────────────────────────────────────────────────────────────────────
--   fn_is_valid_token_digest   — standalone, no deps
--   fn_public_lookup_link      → kora_link.links (SELECT via SECDEF)
--   fn_activate_link_for_worker → kora_link.links (SELECT + UPDATE via SECDEF)
--                               → kora_link.link_assignments (INSERT via SECDEF)
--                               → kora_link.link_consents (INSERT via SECDEF)
--                               → kora_link.link_events (INSERT via SECDEF)
--   fn_revoke_link             → kora_link.links (UPDATE via SECDEF)
--                               → kora_link.link_assignments (UPDATE via SECDEF)
--                               → kora_link.revocations (INSERT via SECDEF)
--                               → kora_link.link_events (INSERT via SECDEF)
--                               → kora_link.is_kora_admin() (role check)
--   fn_replace_link            → kora_link.links (UPDATE via SECDEF)
--                               → kora_link.link_assignments (UPDATE via SECDEF)
--                               → kora_link.link_replacements (INSERT via SECDEF)
--                               → kora_link.link_events (INSERT via SECDEF)
--                               → kora_link.is_kora_admin() (role check)
--   fn_company_link_status_aggregate → kora_link.links (SELECT via SECDEF)
--                               → kora.tenant_id() (JWT tenant validation)
--                               → kora.kora_role() (role validation)
--
-- ROLLBACK (manual — requires CTO approval)
-- ─────────────────────────────────────────────────────────────────────────────
--   DROP FUNCTION IF EXISTS kora_link.fn_is_valid_token_digest(text) CASCADE;
--   DROP FUNCTION IF EXISTS kora_link.fn_public_lookup_link(text) CASCADE;
--   DROP FUNCTION IF EXISTS kora_link.fn_activate_link_for_worker(text, uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS kora_link.fn_revoke_link(uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS kora_link.fn_replace_link(uuid, uuid, text) CASCADE;
--   DROP FUNCTION IF EXISTS kora_link.fn_company_link_status_aggregate(uuid) CASCADE;
--
-- OPEN QUESTIONS FOR CTO (carried from KL-17 TODO-RLS-01→06)
-- ─────────────────────────────────────────────────────────────────────────────
-- [TODO-RPC-01] fn_public_lookup_link: grant to anon?
--   Current draft: GRANT to anon (public route needs unauthenticated access).
--   Alternative: call via service_role from Next.js API route (bypasses RLS entirely).
--   CTO should confirm: (a) anon GRANT or (b) service_role-only path in production.
--
-- [TODO-RPC-02] fn_activate_link_for_worker: cross-schema validation.
--   p_worker_id is accepted as a parameter. In production, the caller (server-side route)
--   must verify p_worker_id = auth.uid() → personal.worker_identity cross-schema join.
--   Cross-schema JOIN in SECURITY DEFINER requires confirming RLS on personal schema allows it.
--   CTO + Gate 3: confirm the cross-schema validation path.
--
-- [TODO-RPC-03] fn_activate_link_for_worker: consent_version whitelist.
--   p_consent_version is validated against a hardcoded constant below.
--   In production, the valid version list must be approved by DPO (Gate 3).
--
-- [TODO-RPC-04] fn_company_link_status_aggregate: privacy threshold.
--   Should aggregate counts be suppressed if < N chips? (safe_aggregation_threshold)
--   Current draft: no minimum threshold (all counts returned for COMPANY_ADMIN).
--   CTO + DPO: decide whether threshold applies to chip counts.
--
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  RAISE NOTICE
    '036_kora_link_rpc_functions: PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING. '
    'APPLY ONLY after: Gate 2 CTO sign-off + Gate 3 DPO review + '
    '034 applied + 035 applied and tested on staging. '
    'DO NOT call these functions from runtime routes before all gates are closed.';
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 0. Validation helper — fn_is_valid_token_digest
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Validates that a token digest is exactly 64 lowercase hex characters.
-- IMMUTABLE: result depends only on input — safe for inline query use.
-- SECURITY INVOKER (default): no privilege elevation. Used by all functions below.

CREATE OR REPLACE FUNCTION kora_link.fn_is_valid_token_digest(p_digest text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_digest IS NOT NULL
     AND length(p_digest) = 64
     AND p_digest ~ '^[0-9a-f]{64}$'
$$;

REVOKE ALL ON FUNCTION kora_link.fn_is_valid_token_digest(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_is_valid_token_digest(text) TO authenticated, anon;

COMMENT ON FUNCTION kora_link.fn_is_valid_token_digest(text) IS
  'KL-18 — Validates token_digest is 64-char lowercase hex. '
  'IMMUTABLE SECURITY INVOKER. Used by all kora_link RPC functions.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. fn_public_lookup_link — public route token lookup
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Called by the Next.js /link/[token] route to resolve a scanned NFC chip.
-- Returns minimum public-safe status — never returns PII, worker_id, or tenant_id.
--
-- CALLER
-- Next.js API route (server-side). Caller computes token_digest before calling:
--   token_digest = HMAC-SHA256(scanned_token_value, KORA_LINK_TOKEN_SECRET)
-- The raw token value is NEVER passed to this function — only the digest.
--
-- PRIVACY GUARANTEES
--   - Never returns: link_id, worker_id, tenant_id, batch_id, token_digest, metadata
--   - "not found" and "unusable" return identical response (no enumeration)
--   - Error paths always return 'unavailable' / 'service_unavailable'
--
-- RETURN VALUES
--   status = 'ready'       — chip is functional (activation flow or quick access)
--   status = 'unavailable' — chip is not usable (revoked, expired, suspended, etc.)
--   reason = 'link_ready'          — chip can proceed
--   reason = 'link_not_available'  — chip cannot be used
--   reason = 'service_unavailable' — unexpected error (input validation failure, exception)
--
-- DESIGN NOTE: 'active' chips return 'ready'.
-- Rationale: an active chip is usable for the "quick access" flow (worker scans their
-- own chip to reach their KORA profile). Returning 'unavailable' would break quick access.
-- The response does NOT reveal the worker's identity — only that the chip is functional.
-- [TODO-RPC-01] CTO: confirm anon GRANT or switch to service_role-only path.

CREATE OR REPLACE FUNCTION kora_link.fn_public_lookup_link(
  p_token_digest text
)
RETURNS TABLE (
  status  text,
  reason  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
DECLARE
  v_link_status                text;
  v_pre_activation_expires_at  timestamptz;
BEGIN
  -- Input validation: must be 64-char hex lowercase
  IF NOT kora_link.fn_is_valid_token_digest(p_token_digest) THEN
    RETURN QUERY SELECT 'unavailable'::text, 'service_unavailable'::text;
    RETURN;
  END IF;

  -- Lookup — select only the fields needed for the decision; never SELECT *
  SELECT l.status, l.pre_activation_expires_at
  INTO v_link_status, v_pre_activation_expires_at
  FROM kora_link.links l
  WHERE l.token_digest = p_token_digest
  LIMIT 1;

  -- Token not found: same response as unusable (prevents enumeration)
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'unavailable'::text, 'link_not_available'::text;
    RETURN;
  END IF;

  -- Permanently unusable states
  IF v_link_status IN ('revoked', 'suspended', 'replaced', 'orphaned') THEN
    RETURN QUERY SELECT 'unavailable'::text, 'link_not_available'::text;
    RETURN;
  END IF;

  -- Expired: token was not activated within TTL
  -- Only applies to pre-activation states — active chips are not subject to TTL
  IF v_link_status IN ('generated', 'assigned_to_tenant', 'delivered', 'activation_pending') THEN
    IF v_pre_activation_expires_at IS NOT NULL
       AND v_pre_activation_expires_at <= now() THEN
      RETURN QUERY SELECT 'unavailable'::text, 'link_not_available'::text;
      RETURN;
    END IF;
  END IF;

  -- Explicitly expired status
  IF v_link_status = 'expired' THEN
    RETURN QUERY SELECT 'unavailable'::text, 'link_not_available'::text;
    RETURN;
  END IF;

  -- Usable states: active (quick access) or pre-activation (activation flow)
  -- 'generated', 'assigned_to_tenant': chip exists but not yet delivered — ready for admin ops
  -- 'delivered', 'activation_pending': chip in worker's hands — ready for activation flow
  -- 'active': chip already activated — ready for quick access flow
  RETURN QUERY SELECT 'ready'::text, 'link_ready'::text;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 'unavailable'::text, 'service_unavailable'::text;
END;
$$;

REVOKE ALL ON FUNCTION kora_link.fn_public_lookup_link(text) FROM PUBLIC;
-- [TODO-RPC-01] GRANT to anon confirmed by CTO? Current: granted for public route.
-- Alternative: remove anon grant and call exclusively via service_role from Next.js server.
GRANT EXECUTE ON FUNCTION kora_link.fn_public_lookup_link(text) TO anon, authenticated;

COMMENT ON FUNCTION kora_link.fn_public_lookup_link(text) IS
  'KL-18 — Public token lookup. Accepts token_digest only (NEVER raw token). '
  'Returns minimum status/reason — no PII, no link_id, no worker_id, no tenant_id. '
  'Not-found and unusable return identical response (no enumeration). '
  'SECURITY DEFINER. search_path explicit. '
  '[TODO-RPC-01] CTO: confirm anon GRANT or service_role-only path.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. fn_activate_link_for_worker — worker activation
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Atomically associates a token with a worker after consent is accepted.
-- Called ONLY from the Next.js activation API route (server-side, authenticated).
-- The route must have already authenticated the worker and obtained their worker_id.
--
-- CALLER
-- Next.js activation API route:
--   1. Worker scans NFC chip → fn_public_lookup_link returns 'ready'
--   2. Worker logs in or is already authenticated
--   3. Route calls fn_activate_link_for_worker with (token_digest, worker_id, consent_version)
--   4. Function validates, inserts consent + assignment, updates link status
--
-- INPUTS
--   p_token_digest    — HMAC-SHA256 digest (64-char hex); raw token NEVER accepted
--   p_worker_id       — worker UUID (from server-side session / worker_identity table)
--   p_consent_version — DPO-approved privacy notice version (e.g. 'kora-link-privacy-v1.0')
--
-- RETURN VALUES (jsonb)
--   { "status": "activated" }       — success
--   { "status": "already_active" }  — token already assigned to this worker
--   { "status": "unavailable" }     — token not in activatable state
--   { "status": "consent_required", "reason": "invalid_version" }
--   { "status": "error", "reason": "invalid_input" }
--   { "status": "error", "reason": "internal" }
--
-- [TODO-RPC-02] Cross-schema validation: p_worker_id must match auth.uid() → personal.worker_identity.
-- This validation is NOT included in the v1 draft — the calling route must enforce it.
-- [TODO-RPC-03] consent_version whitelist: hardcoded below as 'kora-link-privacy-v1.0'.
-- DPO must approve the valid version list before production use.

CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(
  p_token_digest    text,
  p_worker_id       uuid,
  p_consent_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
DECLARE
  -- [TODO-RPC-03] DPO: approve valid consent_version strings before production.
  -- This constant must be updated when the DPO approves the actual notice text.
  c_valid_consent_version CONSTANT text := 'kora-link-privacy-v1.0';

  v_link_id                    uuid;
  v_link_status                text;
  v_link_tenant_id             uuid;
  v_pre_activation_expires_at  timestamptz;
  v_assignment_id              uuid;
  v_consent_id                 uuid;
BEGIN
  -- ── Input validation ──────────────────────────────────────────────────────
  IF NOT kora_link.fn_is_valid_token_digest(p_token_digest) THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'invalid_input');
  END IF;

  IF p_worker_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'invalid_input');
  END IF;

  -- [TODO-RPC-03] Validate consent_version against DPO-approved whitelist.
  IF p_consent_version IS NULL OR p_consent_version <> c_valid_consent_version THEN
    RETURN jsonb_build_object('status', 'consent_required', 'reason', 'invalid_version');
  END IF;

  -- ── Token lookup ─────────────────────────────────────────────────────────
  SELECT l.id, l.status, l.tenant_id, l.pre_activation_expires_at
  INTO v_link_id, v_link_status, v_link_tenant_id, v_pre_activation_expires_at
  FROM kora_link.links l
  WHERE l.token_digest = p_token_digest
  -- Lock the row to prevent concurrent activations (serialization safety).
  -- NOWAIT: if another transaction holds the lock, fail fast (return error).
  FOR UPDATE NOWAIT
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- ── Token state validation ────────────────────────────────────────────────
  -- Unusable permanent states
  IF v_link_status IN ('revoked', 'suspended', 'replaced', 'orphaned', 'expired') THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- TTL check
  IF v_pre_activation_expires_at IS NOT NULL
     AND v_pre_activation_expires_at <= now()
     AND v_link_status <> 'active' THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- Already active: check if this specific worker already holds it
  IF v_link_status = 'active' THEN
    -- Check if this worker is the current active holder
    IF EXISTS (
      SELECT 1 FROM kora_link.link_assignments
      WHERE link_id = v_link_id
        AND worker_id = p_worker_id
        AND status = 'active'
    ) THEN
      RETURN jsonb_build_object('status', 'already_active');
    ELSE
      -- Active but held by a different worker (should not happen in normal flow)
      RETURN jsonb_build_object('status', 'unavailable');
    END IF;
  END IF;

  -- Activatable states: 'delivered' or 'activation_pending'
  -- 'generated' / 'assigned_to_tenant' are pre-delivery — not worker-activatable
  IF v_link_status NOT IN ('delivered', 'activation_pending') THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  -- ── Consent record ────────────────────────────────────────────────────────
  -- INSERT consent. ON CONFLICT: update to 'accepted' if a pending record exists.
  -- UNIQUE constraint: (worker_id, link_id, consent_version).
  INSERT INTO kora_link.link_consents (
    link_id, tenant_id, worker_id, consent_version, status, accepted_at
  ) VALUES (
    v_link_id, v_link_tenant_id, p_worker_id, p_consent_version, 'accepted', now()
  )
  ON CONFLICT (worker_id, link_id, consent_version) DO UPDATE
    SET status      = 'accepted',
        accepted_at = now()
  RETURNING id INTO v_consent_id;

  -- ── Assignment record ─────────────────────────────────────────────────────
  -- uq_assignment_link_active partial unique index prevents duplicate active assignments.
  INSERT INTO kora_link.link_assignments (
    link_id, tenant_id, worker_id, status, assigned_at
  ) VALUES (
    v_link_id, v_link_tenant_id, p_worker_id, 'active', now()
  )
  RETURNING id INTO v_assignment_id;

  -- Back-fill assignment_id on consent record (FK nullable until now)
  UPDATE kora_link.link_consents
  SET assignment_id = v_assignment_id
  WHERE id = v_consent_id;

  -- ── Link status transition ────────────────────────────────────────────────
  UPDATE kora_link.links
  SET status       = 'active',
      activated_at = now()
  WHERE id = v_link_id;

  -- ── Event log ─────────────────────────────────────────────────────────────
  INSERT INTO kora_link.link_events (
    link_id, tenant_id, worker_id, event_type, scan_context,
    actor_type, actor_id, result, metadata
  ) VALUES (
    v_link_id, v_link_tenant_id, p_worker_id,
    'activation_completed', 'activation',
    'worker', p_worker_id, 'ok',
    jsonb_build_object(
      'event_category', 'activation',
      'consent_version', p_consent_version
    )
  );

  RETURN jsonb_build_object('status', 'activated');

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'concurrent_request');
  WHEN unique_violation THEN
    -- uq_assignment_link_active: another activation committed concurrently
    RETURN jsonb_build_object('status', 'unavailable');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'internal');
END;
$$;

REVOKE ALL ON FUNCTION kora_link.fn_activate_link_for_worker(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_activate_link_for_worker(text, uuid, text) TO authenticated;

COMMENT ON FUNCTION kora_link.fn_activate_link_for_worker(text, uuid, text) IS
  'KL-18 — Atomic worker activation. '
  'Accepts token_digest (NEVER raw token), worker_id, consent_version. '
  'Creates link_consents + link_assignments + updates links.status atomically. '
  'FOR UPDATE NOWAIT on links row: prevents concurrent activation races. '
  'Returns minimum jsonb — never returns token_digest, assignment_id, or tenant_id. '
  '[TODO-RPC-02] Cross-schema worker validation deferred to production implementation. '
  '[TODO-RPC-03] consent_version whitelist: DPO must approve before production. '
  'SECURITY DEFINER. search_path explicit.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. fn_revoke_link — admin token revocation
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Revokes a token: marks it unusable, ends any active assignment, records the event.
-- KORA_ADMIN only — role check inside function.
--
-- CALLER
-- Next.js admin API route (server-side, KORA_ADMIN authenticated session).
--
-- INPUTS
--   p_link_id — UUID of the link to revoke
--   p_reason  — must be one of the valid reason values from 034 schema
--
-- RETURN VALUES (jsonb)
--   { "success": true }
--   { "success": false, "error_code": "forbidden" }
--   { "success": false, "error_code": "not_found" }
--   { "success": false, "error_code": "already_terminal" }
--   { "success": false, "error_code": "invalid_input" }
--   { "success": false, "error_code": "internal" }

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

  RETURN jsonb_build_object('success', true);

EXCEPTION
  WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'concurrent_request');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'internal');
END;
$$;

REVOKE ALL ON FUNCTION kora_link.fn_revoke_link(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_revoke_link(uuid, text) TO authenticated;

COMMENT ON FUNCTION kora_link.fn_revoke_link(uuid, text) IS
  'KL-18 — Admin token revocation. KORA_ADMIN only (role check inside). '
  'Updates link status, ends active assignment, inserts revocation + event. '
  'All writes append-only except status field updates on links/assignments. '
  'SECURITY DEFINER. search_path explicit.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. fn_replace_link — admin token replacement
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Replaces an old token with a new one. Records the replacement chain in
-- kora_link.link_replacements (the sole source of replacement chain — A-08/D-08).
-- The old token's status transitions to 'replaced'. The new token inherits the tenant.
-- KORA_ADMIN only.
--
-- INPUTS
--   p_old_link_id — UUID of the token being replaced
--   p_new_link_id — UUID of the new token (must already exist in kora_link.links)
--   p_reason      — reason for replacement
--
-- RETURN VALUES (jsonb)
--   { "success": true, "new_link_id": "<uuid>" }
--   { "success": false, "error_code": "..." }

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

REVOKE ALL ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) IS
  'KL-18 — Admin token replacement chain. KORA_ADMIN only. '
  'Uses kora_link.link_replacements as SOLE chain source (A-08/D-08). '
  'No replaced_by_link_id column on links (removed in KL-16). '
  'Returns new_link_id in success response; no PII returned. '
  'SECURITY DEFINER. search_path explicit.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. fn_company_link_status_aggregate — company-safe aggregate counts
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PURPOSE
-- Returns aggregate link counts by status for a specific tenant.
-- COMPANY_ADMIN safe: only counts, no link_id, no token_digest, no worker_id.
-- Called from the company dashboard to show chip deployment status.
--
-- CALLER
-- Next.js company dashboard route (server-side, authenticated COMPANY_ADMIN).
-- p_tenant_id MUST match the caller's JWT tenant_id (kora.tenant_id()).
--
-- INPUTS
--   p_tenant_id — must match JWT kora.tenant_id() for COMPANY_ADMIN
--
-- RETURN VALUES
--   TABLE (status text, count bigint) — one row per status bucket
--   Empty if tenant has no chips or role mismatch.
--
-- [TODO-RPC-04] Privacy threshold: decide if counts < N should be suppressed.
-- Current draft: no minimum threshold. All status counts returned for COMPANY_ADMIN.

CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(
  p_tenant_id uuid
)
RETURNS TABLE (
  status  text,
  count   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, kora, public
AS $$
BEGIN
  -- ── Role check ────────────────────────────────────────────────────────────
  -- COMPANY_ADMIN or KORA_ADMIN may call this function.
  IF kora.kora_role() NOT IN ('COMPANY_ADMIN', 'KORA_ADMIN') THEN
    RETURN;
  END IF;

  -- ── Tenant validation ─────────────────────────────────────────────────────
  -- COMPANY_ADMIN: p_tenant_id must match JWT tenant (prevents cross-tenant queries).
  -- KORA_ADMIN: can query any tenant.
  IF kora.kora_role() = 'COMPANY_ADMIN' THEN
    IF p_tenant_id IS NULL OR p_tenant_id <> kora.tenant_id() THEN
      RETURN;
    END IF;
  END IF;

  IF p_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- ── Aggregate query ───────────────────────────────────────────────────────
  -- Returns counts per status bucket. Includes TTL-aware 'expired' count.
  -- NEVER returns link_id, token_digest, worker_id, or any per-chip data.
  RETURN QUERY
  SELECT
    CASE
      -- Effective expired: pre_activation_expires_at passed but status not yet updated
      WHEN l.status IN ('generated','assigned_to_tenant','delivered','activation_pending')
           AND l.pre_activation_expires_at IS NOT NULL
           AND l.pre_activation_expires_at <= now()
        THEN 'expired'
      ELSE l.status
    END AS status,
    COUNT(*)::bigint AS count
  FROM kora_link.links l
  WHERE l.tenant_id = p_tenant_id
  GROUP BY 1
  ORDER BY 1;

END;
$$;

REVOKE ALL ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) TO authenticated;

COMMENT ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) IS
  'KL-18 — Company-safe aggregate link counts by status. '
  'COMPANY_ADMIN: p_tenant_id must match JWT tenant_id. '
  'KORA_ADMIN: can query any tenant. '
  'Returns only (status, count) — no link_id, no token_digest, no worker_id. '
  'Includes TTL-aware expired reclassification. '
  '[TODO-RPC-04] Privacy threshold: CTO/DPO to confirm if min count N applies. '
  'SECURITY DEFINER. search_path explicit.';


NOTIFY pgrst, 'reload schema';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-APPLY VERIFICATION QUERIES (run manually after apply — DO NOT automate)
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. Confirm all 6 functions created:
--    SELECT routine_name
--    FROM information_schema.routines
--    WHERE routine_schema = 'kora_link'
--    ORDER BY routine_name;
--    Expected: fn_activate_link_for_worker, fn_company_link_status_aggregate,
--              fn_is_valid_token_digest, fn_public_lookup_link,
--              fn_replace_link, fn_revoke_link
--
-- 2. Confirm all SECURITY DEFINER functions have explicit search_path:
--    SELECT p.proname, p.prosecdef, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
--    FROM pg_proc p
--    JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'kora_link'
--      AND p.prosecdef = true;
--    Expected: fn_public_lookup_link, fn_activate_link_for_worker,
--              fn_revoke_link, fn_replace_link, fn_company_link_status_aggregate
--              (fn_is_valid_token_digest is SECURITY INVOKER — expected absent here)
--
-- 3. Confirm fn_is_valid_token_digest works:
--    SELECT kora_link.fn_is_valid_token_digest('a' || repeat('0', 63));  -- true
--    SELECT kora_link.fn_is_valid_token_digest('ABCDEF' || repeat('0', 58));  -- false (uppercase)
--    SELECT kora_link.fn_is_valid_token_digest(repeat('0', 63));  -- false (63 chars)
--    SELECT kora_link.fn_is_valid_token_digest(NULL);  -- false
--
-- 4. Confirm public lookup returns unavailable for invalid digest:
--    SELECT * FROM kora_link.fn_public_lookup_link('invalid');
--    Expected: status='unavailable', reason='service_unavailable'
--
-- 5. Confirm no token_value in any function body:
--    SELECT routine_name, routine_definition
--    FROM information_schema.routines
--    WHERE routine_schema = 'kora_link'
--      AND routine_definition ILIKE '%token_value%';
--    Expected: 0 rows.
--
-- 6. Confirm no SELECT * patterns (only specific columns selected):
--    SELECT routine_name
--    FROM information_schema.routines
--    WHERE routine_schema = 'kora_link'
--      AND routine_definition LIKE '%SELECT *%'
--      AND routine_definition NOT LIKE '%--%SELECT *%';
--    Expected: 0 rows.
