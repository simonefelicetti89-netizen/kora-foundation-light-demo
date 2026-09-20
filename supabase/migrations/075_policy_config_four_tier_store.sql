-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 075: Policy/Config Four-Tier Store
-- Migration:   075_policy_config_four_tier_store
-- Created:     2026-09-16
-- Block:       KORA-WP-013 — Policy/Config Four-Tier Store
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/disposable-DB only by this task. NOT applied to
--              staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-013 entry: "Purpose: built early because Company
-- Operating Mode and later Certification-policy decisions depend on it...
-- Proposed New: versioned config table, four tiers (Constitutional/Governance
-- Policy/Commercial Configuration/Implementation Configuration)... Service/API:
-- config-read/write helper, versioned... Audit: every config change versioned
-- and audited... Acceptance: `78` §24's four-tier model implemented,
-- Constitutional tier structurally unreachable... Out of Scope: the actual
-- Certification-policy values (set later, at `KORA-WP-054`)."
--
-- Frozen source doc 78 §24 (verbatim table), the sole semantic authority:
--   Tier 1 — Constitutional Invariant — NOT CONFIGURABLE. "Only a new Founder/
--     Founder-Closure-level process — never an Admin settings screen... Outside
--     Admin's configuration surface entirely." No settings screen, of any kind,
--     can move an item out of this tier (doc 78's own Test T).
--   Tier 2 — Governance Policy — ADMIN GOVERNED. Changed by "the relevant
--     governance capability, within its authority." Versioning: "Actor,
--     timestamp, previous/new value, effective date, reason, audit history."
--   Tier 3 — Commercial Configuration. Changed by "Commercial/Entitlement
--     Operations." "Same versioning discipline."
--   Tier 4 — Implementation/Operational Configuration. Changed by "the owning
--     operations capability." "Same versioning discipline."
--
-- THIS MIGRATION BUILDS THE STORE, NEVER ANY TIER'S ACTUAL VALUES. Company
-- Operating Mode's derivation logic, its real Commercial Configuration values,
-- and KORA-WP-054's own Certification-policy values are all explicitly out of
-- scope — this table has zero seeded rows and this migration inserts none.
--
-- TIER 1 IS STRUCTURALLY UNREACHABLE, NOT MERELY UNWRITTEN. Doc 78 §24's own
-- words are "Outside Admin's configuration surface entirely" — this is not a
-- permission you could theoretically grant and choose not to; it is a shape
-- that must not exist as a data row at all. The `tier` CHECK constraint below
-- therefore has exactly THREE legal values (governance_policy,
-- commercial_configuration, implementation_configuration) — 'constitutional'
-- is not a legal value anywhere in this schema, not gated by RLS/GRANT, but
-- absent from the type itself. Constitutional truth continues to live where
-- it already lives — CLAUDE.md's own Red Lines, the frozen canonical docs,
-- and hardcoded invariants in code (e.g. the 5 Pillars, the 14-stage
-- algorithm) — never in this or any other database row.
--
-- VERSIONING, NOT MUTATION. "A previous version is never mutated in place —
-- a correction is always a new version" (the same discipline this engagement
-- has already applied to Commitment/Evidence Plan/Review, migrations
-- 065/066/070/071) — enforced here by NEVER exposing an UPDATE path on the
-- payload/value of an existing row (see the immutability trigger below) and
-- by routing every write through one atomic RPC
-- (`gov.set_policy_config_version()`) that supersedes the prior active
-- version and inserts the new one in the same transaction.
--
-- CONCURRENCY. A partial UNIQUE index — `(tier, config_key,
-- COALESCE(tenant_id, '00000000-...'::uuid)) WHERE status = 'active'` —
-- structurally prevents two simultaneously-active versions of the same key,
-- and the RPC's own `SELECT ... FOR UPDATE` row lock on the current active
-- row (before superseding it) serializes concurrent writers for the same
-- key so the second writer correctly supersedes the version the first
-- writer just created, never racing to create two active rows or silently
-- losing the first writer's update.
--
-- AUDIT. Reuses the existing `audit.governance_event` substrate (migration
-- 051, this engagement's own established convention — never a parallel
-- audit system) — one event per successful version write, emitted inside
-- the same RPC transaction, never a separate best-effort call.
--
-- SCOPE. Global (`gov`-schema, KORA-internal-operator primitive, same
-- reasoning as `gov.workload_event`, migration 063: "the established home
-- for KORA-internal-operator primitives"). `tenant_id` is nullable — NULL
-- means a KORA-global policy; a real UUID scopes one entry to one Company
-- (for a future Commercial Configuration override, e.g. a Company-specific
-- Operating Mode override per doc 78 §8) — but this migration builds no
-- Company-facing read path: RLS below grants only KORA_ADMIN access. No
-- COMPANY_ADMIN policy is added — doc 78's own Control Plane is explicitly
-- an Admin-side system ("Company Operations" in §8 refers to a KORA-internal
-- operating capability, never the Company's own admin user), and no
-- canonical source in this task's own scope requires tenant-facing read
-- access yet (Out of Scope, same as the actual values themselves).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. gov.policy_config_version ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gov.policy_config_version (
  id                     uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Doc 78 §24's four-tier model — 'constitutional' is deliberately NOT a
  -- legal value; see header. Three writable tiers only.
  tier                   text          NOT NULL CHECK (tier IN ('governance_policy', 'commercial_configuration', 'implementation_configuration')),

  -- Stable, machine-readable identifier — never a display label (this WP's
  -- own §17 instruction). The actual vocabulary of keys is owned by each
  -- future consuming WP (e.g. KORA-WP-054 for Certification-policy keys) —
  -- not enumerated or validated here beyond non-empty.
  config_key             text          NOT NULL CHECK (config_key <> ''),

  -- NULL = KORA-global policy. A real value scopes one entry to one Company
  -- (future Commercial Configuration overrides) — no FK-driven Company read
  -- access is granted by this migration (see header).
  tenant_id              uuid          REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Business semantics are typed/validated at the service layer (this WP's
  -- own §12 instruction) — this column is intentionally a generic, opaque
  -- payload container, never itself a source of untyped business truth:
  -- every real caller goes through the versioned TS service, never a raw
  -- table write.
  value                  jsonb         NOT NULL,

  status                 text          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
  effective_from         timestamptz   NOT NULL DEFAULT now(),
  supersedes_version_id  uuid          REFERENCES gov.policy_config_version (id),

  -- Doc 78 §24's own versioning discipline, verbatim: "Actor, timestamp,
  -- previous/new value, effective date, reason, audit history." previous
  -- value is reachable via supersedes_version_id; new value is this row's
  -- own `value`; audit history is the governance_event trail (see below).
  actor_role             text          NOT NULL,
  actor_id               text          NOT NULL,
  reason                 text          NOT NULL CHECK (reason <> ''),

  created_at             timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_policy_config_version_lookup
  ON gov.policy_config_version (tier, config_key, tenant_id, status);

-- Exactly one ACTIVE version per (tier, config_key, tenant) — the real
-- concurrency guarantee (see header). COALESCE folds NULL tenant_id
-- ("global") into a single well-defined value so global keys are correctly
-- single-active too, not accidentally exempt from the constraint (a plain
-- UNIQUE would treat every NULL as distinct, defeating the purpose).
CREATE UNIQUE INDEX IF NOT EXISTS uq_policy_config_version_active
  ON gov.policy_config_version (tier, config_key, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'active';

-- ── 2. Immutability — a version's own payload is never mutated in place ────
-- Only `status` may ever change (active -> superseded, by the RPC below,
-- exactly once). Every other column is frozen from creation — the same
-- "no delete" / "no in-place rewrite" discipline already established for
-- Commitment (065), Evidence Plan addenda (066), Review Event (070), and
-- Review Advisor Proposal (071).

CREATE OR REPLACE FUNCTION gov.enforce_policy_config_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'kora/immutable: gov.policy_config_version rows are never deleted — history must remain inspectable';
  END IF;

  IF NEW.tier                  IS DISTINCT FROM OLD.tier
     OR NEW.config_key         IS DISTINCT FROM OLD.config_key
     OR NEW.tenant_id          IS DISTINCT FROM OLD.tenant_id
     OR NEW.value              IS DISTINCT FROM OLD.value
     OR NEW.effective_from     IS DISTINCT FROM OLD.effective_from
     OR NEW.supersedes_version_id IS DISTINCT FROM OLD.supersedes_version_id
     OR NEW.actor_role         IS DISTINCT FROM OLD.actor_role
     OR NEW.actor_id           IS DISTINCT FROM OLD.actor_id
     OR NEW.reason             IS DISTINCT FROM OLD.reason
     OR NEW.created_at         IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'kora/immutable: gov.policy_config_version only its own status may ever change (active -> superseded) — a correction is always a new version';
  END IF;

  -- The only legal status transition is active -> superseded, exactly once.
  IF OLD.status = 'superseded' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'kora/immutable: a superseded gov.policy_config_version row can never change status again';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_policy_config_version_immutability
  BEFORE UPDATE OR DELETE ON gov.policy_config_version
  FOR EACH ROW
  EXECUTE FUNCTION gov.enforce_policy_config_version_immutability();

-- ── 3. RLS — KORA_ADMIN only, no Company-facing policy (see header) ────────

ALTER TABLE gov.policy_config_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE gov.policy_config_version FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_policy_config_version" ON gov.policy_config_version
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 4. set_policy_config_version() — the ONLY write path ───────────────────
-- One Postgres function body = one implicit transaction. Locks + supersedes
-- the current active row (if any) for this (tier, config_key, tenant), then
-- inserts the new active version, then emits exactly one governance_event —
-- all atomic, all-or-nothing. SECURITY DEFINER so it can write
-- audit.governance_event (cross-schema) under the function owner's own
-- privileges regardless of the caller's own grants — the real authorization
-- check is the caller's own KORA_ADMIN role (enforced by TypeScript before
-- this RPC is ever invoked, exactly like commit_commitment()/conclude_review()
-- — the RPC's own EXECUTE grant, service_role-only, PUBLIC revoked, is the
-- DB-level control; see GRANTs below).

CREATE OR REPLACE FUNCTION gov.set_policy_config_version(
  p_tier            text,
  p_config_key      text,
  p_tenant_id       uuid,
  p_value           jsonb,
  p_actor_role      text,
  p_actor_id        text,
  p_reason          text
)
RETURNS gov.policy_config_version
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = gov, audit, pg_catalog
AS $$
DECLARE
  v_current   gov.policy_config_version;
  v_new       gov.policy_config_version;
  v_attempt   int := 0;
BEGIN
  IF p_tier NOT IN ('governance_policy', 'commercial_configuration', 'implementation_configuration') THEN
    RAISE EXCEPTION 'kora/invalid-tier: "%" is not a legal Policy/Config tier — the Constitutional tier is structurally unreachable through this function (doc 78 §24)', p_tier;
  END IF;
  IF p_config_key IS NULL OR p_config_key = '' THEN
    RAISE EXCEPTION 'kora/invalid-key: config_key is required';
  END IF;
  IF p_reason IS NULL OR p_reason = '' THEN
    RAISE EXCEPTION 'kora/reason-required: doc 78 §24 requires a reason for every Governance Policy / Commercial / Implementation Configuration change';
  END IF;

  -- Real-DB proven concurrency gap this loop closes: `SELECT ... FOR UPDATE`
  -- only locks EXISTING rows — for a brand-new (tier, config_key, tenant)
  -- with no prior active version, there is nothing to lock, so two
  -- concurrent first-writers can both reach the INSERT below at once. The
  -- partial UNIQUE index (uq_policy_config_version_active) still correctly
  -- prevents the corruption itself (data integrity holds either way — no
  -- duplicate active row, no lost update, ever) but, without this loop,
  -- the losing transaction would receive a raw unique-violation instead of
  -- gracefully retrying as a proper supersession. One retry is sufficient:
  -- after the loser's INSERT fails, the winner's transaction has already
  -- committed, so on retry the loser's own SELECT ... FOR UPDATE now finds
  -- and correctly locks the winner's just-created active row.
  LOOP
    v_attempt := v_attempt + 1;

    SELECT * INTO v_current
    FROM gov.policy_config_version
    WHERE tier = p_tier
      AND config_key = p_config_key
      AND tenant_id IS NOT DISTINCT FROM p_tenant_id
      AND status = 'active'
    FOR UPDATE;

    IF FOUND THEN
      UPDATE gov.policy_config_version SET status = 'superseded' WHERE id = v_current.id;
    END IF;

    BEGIN
      INSERT INTO gov.policy_config_version (
        tier, config_key, tenant_id, value, status, effective_from,
        supersedes_version_id, actor_role, actor_id, reason
      ) VALUES (
        p_tier, p_config_key, p_tenant_id, p_value, 'active', now(),
        v_current.id, p_actor_role, p_actor_id, p_reason
      )
      RETURNING * INTO v_new;

      EXIT; -- success — leave the loop
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 2 THEN
        RAISE; -- exhausted the one retry this race class ever needs — re-raise, do not loop forever
      END IF;
      -- another transaction won the first-write race; loop once more, now
      -- correctly sees and supersedes its row instead of racing it again.
    END;
  END LOOP;

  INSERT INTO audit.governance_event (
    source_module, actor_role, actor_id, event_type, object_type, object_id, tenant_id, payload
  ) VALUES (
    'gov.policy_config', p_actor_role, p_actor_id, 'policy_config.version_created',
    'policy_config_version', v_new.id, p_tenant_id,
    jsonb_build_object(
      'tier', p_tier, 'config_key', p_config_key, 'reason', p_reason,
      'supersedes_version_id', v_current.id
    )
  );

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION gov.set_policy_config_version(text, text, uuid, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gov.set_policy_config_version(text, text, uuid, jsonb, text, text, text) TO service_role;

-- ── 5. GRANTs — read-only table access for service_role; no direct write ───
-- Reads (getCurrentPolicyConfig / listPolicyConfigHistory) go through plain
-- SELECT; writes go through the RPC only — no INSERT/UPDATE/DELETE grant on
-- the table itself for any role, so no direct-write bypass of the RPC's own
-- versioning/audit/concurrency guarantees is possible even for service_role.

GRANT SELECT ON gov.policy_config_version TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- REVOKE SELECT ON gov.policy_config_version FROM service_role;
-- REVOKE ALL ON FUNCTION gov.set_policy_config_version(text, text, uuid, jsonb, text, text, text) FROM service_role;
-- DROP FUNCTION IF EXISTS gov.set_policy_config_version(text, text, uuid, jsonb, text, text, text);
-- DROP POLICY IF EXISTS "kora_admin_all_policy_config_version" ON gov.policy_config_version;
-- DROP TRIGGER IF EXISTS trg_policy_config_version_immutability ON gov.policy_config_version;
-- DROP FUNCTION IF EXISTS gov.enforce_policy_config_version_immutability();
-- DROP TABLE IF EXISTS gov.policy_config_version;
-- NOTIFY pgrst, 'reload schema';
-- Rollback is safe at any time — no seeded row exists (this migration
-- inserts none), no other object references this table.
