-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 068: Revoke PUBLIC EXECUTE on commit_commitment()
-- Migration:   068_commit_commitment_revoke_public_execute
-- Created:     2026-09-15
-- Block:       KORA-WP-022 security hardening remediation (not a new WP)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Migration 067 created `analytics.commit_commitment()` and explicitly
-- `GRANT EXECUTE ... TO service_role`, but never revoked PostgreSQL's own
-- implicit default: every newly-created function grants EXECUTE to `PUBLIC`
-- automatically unless revoked (functions differ from tables here — tables
-- carry no such implicit PUBLIC grant). Confirmed present, both locally and
-- on staging, via `pg_proc.proacl`: `{=X/postgres,postgres=X/postgres,
-- service_role=X/postgres}` — the leading `=X` entry (empty role name) is
-- PUBLIC's own EXECUTE grant.
--
-- PRACTICAL IMPACT TODAY: none — `authenticated` (the Postgres role every
-- session, including one with an ADVISOR/WORKER/PARTNER `kora_role` JWT
-- claim, actually runs as) still cannot complete a call end-to-end, because
-- it lacks the underlying `UPDATE`/`SELECT ... FOR UPDATE` table grants the
-- function body needs on `analytics.commitment`/`analytics.evidence_plan`.
-- ARCHITECTURAL RISK, why this is fixed anyway: that protection is
-- incidental, not designed — a future, unrelated migration granting
-- `authenticated` any additional privilege on those tables (for a
-- legitimate, different feature) would silently and unintentionally also
-- reopen full constitutive commit-activation capability through this RPC,
-- since the EXECUTE gate itself was never actually closed. A constitutive
-- governance transition must not depend on an accidental, unrelated
-- table-grant absence for its authorization boundary.
--
-- `commit_commitment()` is `SECURITY INVOKER` (confirmed via `pg_proc.
-- prosecdef = false`), not `SECURITY DEFINER` — no privilege-escalation/
-- search_path review is applicable; it already runs as whichever role
-- calls it, exactly as designed.
--
-- No business logic touched. No WP-022 semantics changed. Migration 067
-- itself is not edited — this is a separate, additive, minimal privilege
-- correction only.
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION analytics.commit_commitment(uuid, uuid, text, text) FROM PUBLIC;

-- service_role's own EXECUTE grant (migration 067) is untouched by the
-- REVOKE above — REVOKE FROM PUBLIC removes only PUBLIC's own ACL entry,
-- never a role-specific grant made separately.

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the GRANT below
-- GRANT EXECUTE ON FUNCTION analytics.commit_commitment(uuid, uuid, text, text) TO PUBLIC;
-- Rollback is safe at any time — restores PostgreSQL's own original default
-- implicit grant; changes nothing else.
