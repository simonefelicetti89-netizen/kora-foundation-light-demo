-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration:   036_kora_link_rpc_functions
-- Feature:     KL-18 — KORA Link v1 — Server-side RPC / SECURITY DEFINER functions
-- Author:      KORA Foundation Light · 2026-07-01
-- Amended:     KORA-LINK-S3A — added service_role EXECUTE grants alongside each
--              function's existing authenticated[/anon] grant · 2026-07-12
-- Amended:     KORA-LINK-SECURITY-FOUNDATION-08 — fn_activate_link_for_worker
--              no longer accepts a client-supplied p_worker_id; worker identity
--              is derived from auth.uid() inside the function (mirrors the
--              established pattern in migration 020,
--              fn_redistribute_worker_pib). Adds the previously-missing
--              worker-tenant ↔ link-tenant boundary check. fn_activate_link_
--              for_worker and fn_company_link_status_aggregate now write to
--              kora_link.audit_log. fn_company_link_status_aggregate now
--              applies the canonical safe_aggregation_threshold (10, matches
--              lib/constants/kora.ts and migration 015 [G2]) to every status
--              bucket. See [RESOLVED KORA-LINK-S08] markers below and
--              docs/KORA_LINK_SECURITY_FOUNDATION_08.md · 2026-07-16
-- Amended:     KORA-LINK-DPO-DECISIONS-09 — titolare ratified the consent_
--              version whitelist decision ([TODO-RPC-03]): canonical value
--              'kora-link-activation-notice-v1.0' (not consent, Art. 6(1)(f)
--              legitimate interest — see docs/KORA_LINK_DPO_DECISIONS_09.md
--              section 5/BLOCCO 4). fn_activate_link_for_worker now writes
--              to the renamed kora_link.link_activation_acknowledgements
--              table (activation_notice_version/acknowledged_at columns,
--              status 'acknowledged') instead of kora_link.link_consents —
--              see 034 section 4. The RPC's own external signature/parameter
--              names (p_token_digest, p_consent_version) are UNCHANGED —
--              only the underlying table/column names and the whitelisted
--              value changed · 2026-07-16
-- Depends on:  034_kora_link_schema.sql (KL-19, 2026-07-04: PROPOSED_GATE2_TECHNICALLY_REVIEWED;
--              KORA-LINK-DPO-DECISIONS-09, 2026-07-16: the 4 genuine Gate 3/DPO
--              blockers ratified — see 034 header. Gate 3 overall still open.)
--              035_kora_link_rls.sql    (PROPOSED_RLS_DRAFT_INTERNAL_ENGINEERING — still open, Gate 4)
-- Gate:        This file (036) itself: Gate 2 OPEN + Gate 3 OPEN, NOT reviewed, NOT applied.
--              034's own engineering review closed at KL-19 — that does NOT extend to 036.
--              KORA-LINK-S3A is a draft-only grant-hardening pass — it does NOT close
--              Gate 2 or Gate 3 for this file. KORA-LINK-SECURITY-FOUNDATION-08 closes
--              [TODO-RPC-02] and [TODO-RPC-04] as engineering fixes (see below); KORA-LINK-
--              DPO-DECISIONS-09 closes [TODO-RPC-03] as a ratified DPO decision. None of
--              these close Gate 2, Gate 3, or Gate 4 overall; [TODO-RPC-01] remains an open
--              CTO decision, and this migration is still NOT applied to any database.
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- STATUS: PROPOSED_RPC_FUNCTIONS_DRAFT_INTERNAL_ENGINEERING
-- ─────────────────────────────────────────────────────────────────────────────
-- This file is a DESIGN DRAFT. Internal Engineering provisional — NOT CTO-approved.
-- KL-19 (2026-07-04) reviewed and closed 034's own engineering TODOs — it did NOT
-- review or change the RPC functions in this file. KORA-LINK-SECURITY-FOUNDATION-08
-- (2026-07-16) DID change two function bodies in this file — see amendment note above
-- and [RESOLVED KORA-LINK-S08] markers — closing two concrete Gate 07 pilot-readiness
-- blockers found in docs/KORA_LINK_DECISION_GATE_07.md. This remains a technical/
-- engineering hardening pass: it does not constitute CTO ratification or DPO review.
-- Do not apply until:
--   (1) 034 formally approved by CTO (Gate 2 — engineering substance closed at KL-19,
--       human CTO ratification still pending)
--   (2) 035 RLS applied and smoke-tested on staging
--   (3) DPO review of consent model and public lookup response (Gate 3)
--   (4) All GRANT decisions confirmed by CTO (especially anon access to public lookup)
--   (5) Integration tests written and passing on staging
--   (6) This file's own KORA-LINK-SECURITY-FOUNDATION-08 changes are reviewed by a
--       human CTO — an engineering session hardened this file, a human has not yet
--       ratified it
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
--   fn_activate_link_for_worker(text,text)   — worker activation (SECURITY DEFINER)
--                                               KORA-LINK-S08: signature changed from
--                                               (text,uuid,text) — p_worker_id removed,
--                                               worker resolved from auth.uid() instead.
--   fn_revoke_link(uuid, text)               — admin revocation (SECURITY DEFINER)
--   fn_replace_link(uuid, uuid, text)        — admin replacement (SECURITY DEFINER)
--   fn_company_link_status_aggregate(uuid)   — company aggregate view (SECURITY DEFINER)
--                                               KORA-LINK-S08: now applies
--                                               safe_aggregation_threshold (10) per bucket.
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
--   fn_activate_link_for_worker → personal.worker_identity (SELECT via SECDEF —
--                                 resolves worker from auth.uid(), KORA-LINK-S08)
--                               → kora_link.links (SELECT + UPDATE via SECDEF)
--                               → kora_link.link_assignments (INSERT via SECDEF)
--                               → kora_link.link_activation_acknowledgements (INSERT via
--                                 SECDEF; renamed from link_consents, KORA-LINK-DPO-DECISIONS-09)
--                               → kora_link.link_events (INSERT via SECDEF)
--                               → kora_link.audit_log (INSERT via SECDEF, KORA-LINK-S08)
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
--   DROP FUNCTION IF EXISTS kora_link.fn_activate_link_for_worker(text, text) CASCADE;
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
-- [RESOLVED KORA-LINK-S08] TODO-RPC-02: fn_activate_link_for_worker cross-schema
--   validation. The function no longer accepts p_worker_id as a parameter at
--   all — the signature is now (p_token_digest text, p_consent_version text).
--   Worker identity is resolved inside the function from auth.uid() via
--   personal.worker_identity, exactly mirroring the established pattern in
--   migration 020 (fn_redistribute_worker_pib: "Risolve worker_identity_id da
--   auth.uid() — mai dal client"). This is Option A from
--   docs/KORA_LINK_SECURITY_FOUNDATION_08.md (no client-controlled worker
--   identifier at all), not Option B (verify-then-trust) — it is not merely
--   "verified", it is structurally impossible to pass a different worker's id.
--   The function also now checks the worker's tenant_id against the link's
--   tenant_id — a check that did not exist at all before this resolution; a
--   worker from tenant B could previously activate a tenant-A chip. Function
--   owner is postgres (superuser, BYPASSRLS) — same security mechanism
--   documented in migration 015 §SECURITY MECHANISM — so this cross-schema
--   SELECT does not require any new GRANT on personal.worker_identity.
--   Still requires: human CTO ratification of this engineering resolution
--   (this note documents the fix, not a CTO sign-off).
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] TODO-RPC-03: fn_activate_link_for_worker
--   consent_version whitelist. p_consent_version (external parameter name
--   unchanged) is validated against c_valid_consent_version below, now set to
--   the titolare-ratified canonical value 'kora-link-activation-notice-v1.0'.
--   This same value is applied consistently to lib/kora-link/activation.ts
--   KORA_LINK_ACTIVATION_CONSENT_VERSION — the two-string mismatch
--   KORA-LINK-S08 flagged as a residual risk is resolved. The proposed
--   activation-notice text is in docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 3;
--   legal basis is Art. 6(1)(f) legitimate interest, not consent (§5). Gate 3
--   overall is NOT closed by this — see docs/KORA_LINK_DPO_DECISIONS_09.md §9/§24
--   for what remains (DPIA, worker self-service deactivation, Gate 4 RLS).
--
-- [RESOLVED KORA-LINK-S08] TODO-RPC-04: fn_company_link_status_aggregate
--   privacy threshold. Applies the canonical safe_aggregation_threshold = 10
--   (lib/constants/kora.ts SAFE_AGGREGATION_THRESHOLD, CLAUDE.md §13,
--   already-applied precedent in migration 015
--   analytics.fn_company_activation_summary [G2]) to every status bucket:
--   counts in [1,9] return NULL with suppressed = true; counts = 0 never
--   appear as a row; counts ≥ 10 are returned as-is with suppressed = false.
--   This is an application of an already-constitutional, already-precedented
--   threshold value — not a new CTO/DPO decision. RETURNS TABLE shape changed
--   from (status text, count bigint) to (status text, count bigint,
--   suppressed boolean) — see docs/KORA_LINK_SECURITY_FOUNDATION_08.md for
--   the full before/after contract and the one caller this affects.
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
GRANT EXECUTE ON FUNCTION kora_link.fn_is_valid_token_digest(text) TO authenticated, anon, service_role;

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
GRANT EXECUTE ON FUNCTION kora_link.fn_public_lookup_link(text) TO anon, authenticated, service_role;

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
--
-- CALLER
-- Next.js activation API route:
--   1. Worker scans NFC chip → fn_public_lookup_link returns 'ready'
--   2. Worker logs in or is already authenticated (route resolves this via
--      the caller's own session cookie — same session the RPC call below runs under)
--   3. Route calls fn_activate_link_for_worker with (token_digest, consent_version)
--   4. Function resolves the worker from auth.uid(), validates, inserts
--      activation acknowledgement + assignment, updates link status
--
-- INPUTS
--   p_token_digest    — HMAC-SHA256 digest (64-char hex); raw token NEVER accepted
--   p_consent_version — DPO-ratified activation notice version (KORA-LINK-DPO-DECISIONS-09:
--                       'kora-link-activation-notice-v1.0'). Parameter name unchanged;
--                       stores into link_activation_acknowledgements.activation_notice_version.
--
-- WORKER IDENTITY (KORA-LINK-S08 — [RESOLVED] TODO-RPC-02)
-- There is NO p_worker_id parameter. The worker is resolved exclusively from
-- auth.uid() → personal.worker_identity, inside this function, exactly as
-- migration 020's fn_redistribute_worker_pib already does ("Risolve
-- worker_identity_id da auth.uid() — mai dal client"). It is therefore
-- structurally impossible for a caller to activate a chip as a different
-- worker — there is no parameter through which to attempt it. The function
-- also validates worker.tenant_id = link.tenant_id (a check that did not
-- exist before KORA-LINK-S08).
--
-- RETURN VALUES (jsonb)
--   { "status": "activated" }       — success
--   { "status": "already_active" }  — token already assigned to this worker
--   { "status": "unavailable" }     — token not in activatable state, OR
--                                      worker/tenant identity check failed
--                                      (deliberately the same response as
--                                      "token not in activatable state" —
--                                      no enumeration of WHY it failed)
--   { "status": "consent_required", "reason": "invalid_version" }
--   { "status": "error", "reason": "unauthenticated" }  — auth.uid() IS NULL
--   { "status": "error", "reason": "invalid_input" }
--   { "status": "error", "reason": "internal" }
--
-- [RESOLVED KORA-LINK-DPO-DECISIONS-09] consent_version whitelist: ratified
-- value below is 'kora-link-activation-notice-v1.0'.

CREATE OR REPLACE FUNCTION kora_link.fn_activate_link_for_worker(
  p_token_digest    text,
  p_consent_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kora_link, personal, kora, public
AS $$
DECLARE
  -- [RESOLVED KORA-LINK-DPO-DECISIONS-09] Titolare-ratified canonical
  -- activation-notice version — docs/KORA_LINK_DPO_DECISIONS_09.md BLOCCO 4.
  c_valid_consent_version CONSTANT text := 'kora-link-activation-notice-v1.0';

  v_worker_id                  uuid;
  v_worker_tenant_id           uuid;
  v_worker_status              text;
  v_link_id                    uuid;
  v_link_status                text;
  v_link_tenant_id             uuid;
  v_pre_activation_expires_at  timestamptz;
  v_assignment_id              uuid;
  v_ack_id                     uuid;
BEGIN
  -- ── Input validation ──────────────────────────────────────────────────────
  IF NOT kora_link.fn_is_valid_token_digest(p_token_digest) THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'invalid_input');
  END IF;

  -- ── Worker identity — resolved from auth.uid(), never from a parameter ─────
  -- KORA-LINK-S08 (BLOCCO 1). See header note above and
  -- docs/KORA_LINK_SECURITY_FOUNDATION_08.md.
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'reason', 'unauthenticated');
  END IF;

  SELECT wi.id, wi.tenant_id, wi.status
  INTO v_worker_id, v_worker_tenant_id, v_worker_status
  FROM personal.worker_identity wi
  WHERE wi.auth_user_id = auth.uid()
  LIMIT 1;

  -- No worker_identity row for this session, or worker disabled: same generic
  -- response as every other "cannot activate" path below — no enumeration.
  IF v_worker_id IS NULL OR v_worker_status = 'disabled' THEN
    RETURN jsonb_build_object('status', 'unavailable');
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

  -- ── Tenant boundary — KORA-LINK-S08, previously MISSING entirely ───────────
  -- Without this check a worker from tenant B could activate a chip
  -- provisioned to tenant A. Generic 'unavailable' response — same as every
  -- other rejection path, no enumeration.
  IF v_link_tenant_id IS DISTINCT FROM v_worker_tenant_id THEN
    INSERT INTO kora_link.audit_log (
      link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
    ) VALUES (
      v_link_id, v_link_tenant_id, 'worker', auth.uid(), 'ACTIVATION_ATTEMPTED', 'forbidden',
      left(p_token_digest, 8),
      jsonb_build_object('event_category', 'activation', 'reason', 'tenant_mismatch')
    );
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
        AND worker_id = v_worker_id
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

  -- ── Activation acknowledgement record (renamed from "consent record",
  --    table renamed from link_consents — KORA-LINK-DPO-DECISIONS-09) ────────
  -- INSERT acknowledgement. ON CONFLICT: update to 'acknowledged' if a pending record exists.
  -- UNIQUE constraint: (worker_id, link_id, activation_notice_version).
  INSERT INTO kora_link.link_activation_acknowledgements (
    link_id, tenant_id, worker_id, activation_notice_version, status, acknowledged_at
  ) VALUES (
    v_link_id, v_link_tenant_id, v_worker_id, p_consent_version, 'acknowledged', now()
  )
  ON CONFLICT (worker_id, link_id, activation_notice_version) DO UPDATE
    SET status          = 'acknowledged',
        acknowledged_at = now()
  RETURNING id INTO v_ack_id;

  -- ── Assignment record ─────────────────────────────────────────────────────
  -- uq_assignment_link_active partial unique index prevents duplicate active assignments.
  INSERT INTO kora_link.link_assignments (
    link_id, tenant_id, worker_id, status, assigned_at
  ) VALUES (
    v_link_id, v_link_tenant_id, v_worker_id, 'active', now()
  )
  RETURNING id INTO v_assignment_id;

  -- Back-fill assignment_id on the activation-acknowledgement record (FK nullable until now)
  UPDATE kora_link.link_activation_acknowledgements
  SET assignment_id = v_assignment_id
  WHERE id = v_ack_id;

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
    v_link_id, v_link_tenant_id, v_worker_id,
    'activation_completed', 'activation',
    'worker', v_worker_id, 'ok',
    jsonb_build_object(
      'event_category', 'activation',
      'activation_notice_version', p_consent_version
    )
  );

  -- ── Audit log (KORA-LINK-S08, BLOCCO 6) ──────────────────────────────────
  INSERT INTO kora_link.audit_log (
    link_id, tenant_id, actor_type, actor_id, action, result, token_digest_prefix, metadata
  ) VALUES (
    v_link_id, v_link_tenant_id, 'worker', auth.uid(), 'ACTIVATION_COMPLETED', 'ok',
    left(p_token_digest, 8),
    jsonb_build_object('event_category', 'activation')
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

REVOKE ALL ON FUNCTION kora_link.fn_activate_link_for_worker(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_activate_link_for_worker(text, text) TO authenticated, service_role;

COMMENT ON FUNCTION kora_link.fn_activate_link_for_worker(text, text) IS
  'KL-18 — Atomic worker activation. KORA-LINK-S08 hardened, '
  'KORA-LINK-DPO-DECISIONS-09 ratified. '
  'Accepts token_digest (NEVER raw token) and consent_version only — '
  'NO p_worker_id parameter. Worker resolved from auth.uid() via '
  'personal.worker_identity, mirroring migration 020. Validates '
  'worker.tenant_id = link.tenant_id (KORA-LINK-S08 — previously missing). '
  'Creates link_activation_acknowledgements (renamed from link_consents) + '
  'link_assignments + updates links.status atomically. '
  'Writes kora_link.audit_log on success and on tenant-mismatch rejection. '
  'FOR UPDATE NOWAIT on links row: prevents concurrent activation races. '
  'Returns minimum jsonb — never returns token_digest, assignment_id, tenant_id, or worker_id. '
  'consent_version whitelist ratified (KORA-LINK-DPO-DECISIONS-09): '
  'kora-link-activation-notice-v1.0 — not GDPR consent, Art. 6(1)(f) legitimate interest. '
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
GRANT EXECUTE ON FUNCTION kora_link.fn_revoke_link(uuid, text) TO authenticated, service_role;

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
GRANT EXECUTE ON FUNCTION kora_link.fn_replace_link(uuid, uuid, text) TO authenticated, service_role;

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
--   TABLE (status text, count bigint, suppressed boolean) — one row per status
--   bucket that has at least one chip. Empty if tenant has no chips or role mismatch.
--
-- PRIVACY THRESHOLD (KORA-LINK-S08 — [RESOLVED] TODO-RPC-04)
-- Applies the canonical safe_aggregation_threshold = 10 (lib/constants/kora.ts
-- SAFE_AGGREGATION_THRESHOLD, CLAUDE.md §13) to EVERY status bucket
-- independently, mirroring the already-applied precedent in migration 015
-- analytics.fn_company_activation_summary [G2]:
--   bucket count in [1, 9]  → count returned as NULL, suppressed = true
--   bucket count = 0        → bucket never appears as a row (GROUP BY semantics)
--   bucket count >= 10      → count returned as-is, suppressed = false
-- No filter parameters exist on this function beyond p_tenant_id, so filter-
-- combination inference does not apply here. A caller cannot recover a
-- suppressed bucket's exact count by summing the other rows because no total
-- count is ever returned by this function.

CREATE OR REPLACE FUNCTION kora_link.fn_company_link_status_aggregate(
  p_tenant_id uuid
)
RETURNS TABLE (
  status      text,
  count       bigint,
  suppressed  boolean
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
  -- Returns counts per status bucket, threshold-suppressed (KORA-LINK-S08).
  -- Includes TTL-aware 'expired' count.
  -- NEVER returns link_id, token_digest, worker_id, or any per-chip data.
  RETURN QUERY
  WITH raw_counts AS (
    SELECT
      CASE
        -- Effective expired: pre_activation_expires_at passed but status not yet updated
        WHEN l.status IN ('generated','assigned_to_tenant','delivered','activation_pending')
             AND l.pre_activation_expires_at IS NOT NULL
             AND l.pre_activation_expires_at <= now()
          THEN 'expired'
        ELSE l.status
      END AS status_bucket,
      COUNT(*)::bigint AS raw_count
    FROM kora_link.links l
    WHERE l.tenant_id = p_tenant_id
    GROUP BY 1
  )
  SELECT
    rc.status_bucket,
    CASE WHEN rc.raw_count BETWEEN 1 AND 9 THEN NULL ELSE rc.raw_count END,
    rc.raw_count BETWEEN 1 AND 9
  FROM raw_counts rc
  ORDER BY 1;

END;
$$;

REVOKE ALL ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION kora_link.fn_company_link_status_aggregate(uuid) IS
  'KL-18 — Company-safe aggregate link counts by status. KORA-LINK-S08 hardened. '
  'COMPANY_ADMIN: p_tenant_id must match JWT tenant_id. '
  'KORA_ADMIN: can query any tenant. '
  'Returns (status, count, suppressed) — no link_id, no token_digest, no worker_id. '
  'Applies safe_aggregation_threshold = 10 per bucket: [1,9] -> NULL/suppressed=true, '
  '0 -> row absent, >=10 -> count/suppressed=false. Matches migration 015 [G2] and '
  'lib/constants/kora.ts SAFE_AGGREGATION_THRESHOLD. '
  'Includes TTL-aware expired reclassification. '
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
--
-- 7. KORA-LINK-S08 — confirm fn_activate_link_for_worker has exactly 2 args
--    (p_worker_id removed):
--    SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
--    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'kora_link' AND p.proname = 'fn_activate_link_for_worker';
--    Expected: 'p_token_digest text, p_consent_version text' (no uuid arg).
--
-- 8. KORA-LINK-S08 — confirm fn_company_link_status_aggregate never returns a
--    bucket count in [1,9] unsuppressed (requires seeded test data):
--    SELECT * FROM kora_link.fn_company_link_status_aggregate('<tenant with 1-9 chips>');
--    Expected: count IS NULL AND suppressed = true for any bucket in that range.
