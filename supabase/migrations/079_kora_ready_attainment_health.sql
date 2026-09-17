-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 079: KORA Ready Attainment / Current Readiness Health
-- Migration:   079_kora_ready_attainment_health
-- Created:     2026-09-17
-- Block:       KORA-WP-027 — Onboarding Readiness Pipeline Rebuild + KORA Ready
--              Attainment/Health Split
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/disposable-DB only by this task. NOT applied to
--              staging or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Registry 142's own KORA-WP-027 entry: "Proposed New: rebuilt onboarding
-- pipeline, `kora_ready_attainment` (immutable) + `current_readiness_health`
-- (overwritable) tables... Acceptance: governed attainment event recorded; a
-- later degradation never erases historical attainment."
--
-- SOLE SEMANTIC AUTHORITY: doc `81` §8 ("KORA Ready — Historical Attainment
-- vs. Current Readiness Health"), quoted in full:
--
-- "KORA Ready Attainment — a historical governance event: the Company
-- reached enough truth to decide, at a specific point in time. Once
-- legitimately attained, this fact is never deleted. It conceptually
-- carries: achieved-at, basis/version, evidence/context, actor/system, and
-- any override used to reach it.
--
-- Current Readiness Health — a current operational assessment, which may
-- later deteriorate... into a degraded/insufficient/blocked state or
-- another source-supported equivalent — exact status names are Master Plan
-- scope.
--
-- Invariant: a later readiness problem never rewrites history to claim the
-- Company never previously reached KORA Ready. Historical attainment ≠
-- Current readiness health — always."
--
-- Status vocabulary sourced from doc `79` §5's own workflow diagram (the
-- most concrete, actually-named terms found — doc `81` §8 defers exact
-- names to "Master Plan scope," and no further Master Plan refinement of
-- these specific names was found): `automated_evaluation → READY |
-- NOT_READY (blocker/warning detail)`, `override_requested → READY
-- (override)`, `READY + later issue → degraded/revoked`. Adopted here,
-- lower-cased to match this schema's own established status-value
-- convention (`commitment.status`, `review.status`, etc.): `ready`,
-- `not_ready`, `degraded`, `revoked`.
--
-- OVERRIDE MODEL: doc `78` §7 ("KORA Ready Governance"), verbatim: "Override
-- authority: yes, restricted to a defined internal capability (Company
-- Operations, informed by Advisor input where relevant) — never a blanket
-- permission. Override recording: target, previous state, requested
-- action, operator, authority, reason, supporting evidence, effective
-- date, audit record" (doc `79` §15's own Override/Exception Model field
-- list). **Advisor concurrence is explicitly NOT a mandatory gate** (doc
-- `81` §7, "RESOLVED BY DD-1.1") — Advisor input may be recorded as
-- supporting evidence only, never a veto, never implemented as a second
-- authority here.
--
-- WP-013 REUSE (Hard Dep), NOT DUPLICATION
-- ───────────────────────────────────────────
-- Doc `79` §16 ("Policy / Configuration Versioning"): "Applies to the
-- Governance Policy, Commercial Configuration, and Implementation/
-- Operational Configuration tiers (`78` §24)... Every change carries:
-- actor, timestamp, previous value/version, new value/version, effective
-- date, reason, audit history" — this IS `gov.policy_config_version`'s own
-- schema (`KORA-WP-013`, migration 075), verbatim. `kora_ready_attainment`
-- therefore carries a **nullable** `policy_config_version_id` reference
-- (provenance only — doc `81` §8's own "basis/version" field — never the
-- policy payload itself duplicated, per this WP's own §9 instruction) so a
-- future Governance Policy value (e.g. "which capability may override
-- Ready") can be referenced once a Founder/Admin decision creates one.
-- **No such value is seeded here** — same "zero seeded rows, no fabricated
-- default" discipline as `WP-013`'s own migration 075 and `WP-062`'s own
-- Commercial Entitlement reuse; the column is genuinely NULL until a real
-- policy exists, never populated with an invented value. The BASELINE-
-- SUFFICIENCY EVALUATION CRITERIA THEMSELVES remain `lib/methodology-
-- config/v0.1.ts`'s own, separate, untouched concern (doc `78` §7:
-- "methodology-config-governed") — never moved into WP-013's runtime
-- policy store (this WP's own §8 instruction, respected).
--
-- OVERRIDE AUTHORITY = THE EXISTING WP-009 CAPABILITY SYSTEM, NOT A NEW
-- MECHANISM: doc `78` §7's own "restricted to a defined internal
-- capability (Company Operations)... never a blanket permission" maps
-- EXACTLY onto `KORA-WP-009`'s own, already-frozen vocabulary
-- (`lib/admin-capability/capability-service.ts`): capability domain
-- `COMPANY_OPERATIONS` (already exists), capability action `OVERRIDE`
-- (already exists) — zero new enum value needed. The service layer (not
-- this migration) calls the existing `hasAdminCapability(authUserId,
-- 'COMPANY_OPERATIONS', 'OVERRIDE')` before any override/revoke write —
-- this is the first real write-path adopter of that primitive (WP-009's
-- own header notes no route had adopted it yet), a disclosed, canonically-
-- motivated first use, not a new authorization mechanism.
--
-- WHAT THIS MIGRATION DOES AND DOES NOT DO
-- ─────────────────────────────────────────
-- Adds exactly the two named tables. Does NOT touch `analytics.tenant`
-- (its existing `onboarding_status`/`data_readiness_status`/
-- `decision_pack_status` columns remain the EXISTING, unmodified input
-- signals — reused via the existing, untouched `lib/live/
-- company-onboarding-view.ts` derivation, confirmed by inventory to
-- already exist, PARTIAL, with zero real runtime caller before this WP).
-- Does NOT touch `gov.policy_config_version`, `gov.capability_grant`, or
-- any WP-009/WP-013 object. Does NOT touch `CORE-013`'s own KEEP mechanism
-- (`analytics.uef_record.approved_for_impact_units`/etc.) — a UEF-record-
-- level gate, a different concept from this WP's own Company-level
-- attainment, confirmed distinct by inspection and left untouched.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.kora_ready_attainment — append-only historical fact ───────

CREATE TABLE IF NOT EXISTS analytics.kora_ready_attainment (
  id                       uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- "achieved-at" (doc 81 §8, verbatim).
  achieved_at              timestamptz   NOT NULL DEFAULT now(),

  -- doc 79 §5's own two paths: automated_evaluation reaching READY, or the
  -- override_requested -> override_recorded -> READY (override) path.
  basis                    text          NOT NULL CHECK (basis IN ('automated', 'override')),

  -- "basis/version" (doc 81 §8) — provenance only, nullable, never a
  -- fabricated value (see header). WP-013 reuse point.
  policy_config_version_id uuid          REFERENCES gov.policy_config_version (id),

  -- "evidence/context" (doc 81 §8) — a small, Company-level, non-PII
  -- snapshot of which readiness checks passed (check_id/label/status only,
  -- the existing OnboardingReadinessCheck shape) — never raw Worker/PIB
  -- content, never a fabricated narrative.
  evidence_context         jsonb,

  -- Present only when basis = 'override' — doc 79 §15's own Override/
  -- Exception Model field list (reason, authority; operator/actor below;
  -- target = this row's own tenant_id; effective date = achieved_at).
  override_reason          text,
  override_authority       text,

  actor_role               text          NOT NULL,
  actor_id                 text          NOT NULL,

  CONSTRAINT kora_ready_attainment_override_reason_required
    CHECK (basis <> 'override' OR (override_reason IS NOT NULL AND override_reason <> ''))
);

CREATE INDEX IF NOT EXISTS idx_kora_ready_attainment_tenant ON analytics.kora_ready_attainment (tenant_id, achieved_at DESC);

-- Never deleted, never updated — "once legitimately attained, this fact is
-- never deleted" (doc 81 §8, verbatim). A correction is always a new row.

CREATE OR REPLACE FUNCTION analytics.reject_kora_ready_attainment_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'kora/immutable: analytics.kora_ready_attainment rows are never updated or deleted — a correction is always a new attainment event (doc 81 §8)';
END;
$$;

CREATE TRIGGER trg_kora_ready_attainment_no_mutation
  BEFORE UPDATE OR DELETE ON analytics.kora_ready_attainment
  FOR EACH ROW
  EXECUTE FUNCTION analytics.reject_kora_ready_attainment_mutation();

-- ── 2. analytics.current_readiness_health — mutable current-state row ──────
-- Exactly one row per Company ("overwritable," registry's own word) — the
-- UNIQUE constraint is the real, DB-level invariant protecting this.

CREATE TABLE IF NOT EXISTS analytics.current_readiness_health (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid          NOT NULL UNIQUE REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Vocabulary sourced from doc 79 §5's own workflow diagram (see header).
  status         text          NOT NULL CHECK (status IN ('ready', 'not_ready', 'degraded', 'revoked')),

  -- "with blocker/warning detail" (doc 79 §5, verbatim) — Company-facing,
  -- the existing OnboardingReadinessCheck shape (check_id/label/status/
  -- detail/blocking), never opaque prose, never Worker-level content.
  blockers       jsonb         NOT NULL DEFAULT '[]'::jsonb,
  warnings       jsonb         NOT NULL DEFAULT '[]'::jsonb,

  evaluated_at   timestamptz   NOT NULL DEFAULT now(),
  actor_role     text          NOT NULL,
  actor_id       text          NOT NULL,

  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_current_readiness_health_updated_at
  BEFORE UPDATE ON analytics.current_readiness_health
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. RLS — Pattern A (identical shape to migration 065's analytics.commitment) ──

ALTER TABLE analytics.kora_ready_attainment ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.kora_ready_attainment FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_kora_ready_attainment" ON analytics.kora_ready_attainment
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_kora_ready_attainment_read" ON analytics.kora_ready_attainment
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

ALTER TABLE analytics.current_readiness_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.current_readiness_health FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_current_readiness_health" ON analytics.current_readiness_health
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_current_readiness_health_read" ON analytics.current_readiness_health
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 4. GRANTs — writes via service_role only (mirrors migration 065's shape) ──

GRANT SELECT, INSERT ON analytics.kora_ready_attainment TO service_role;
GRANT SELECT ON analytics.kora_ready_attainment TO authenticated;

GRANT SELECT, INSERT, UPDATE ON analytics.current_readiness_health TO service_role;
GRANT SELECT ON analytics.current_readiness_health TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs/DROPs below
-- REVOKE SELECT ON analytics.current_readiness_health FROM authenticated;
-- REVOKE SELECT, INSERT, UPDATE ON analytics.current_readiness_health FROM service_role;
-- REVOKE SELECT ON analytics.kora_ready_attainment FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.kora_ready_attainment FROM service_role;
-- DROP POLICY IF EXISTS "company_own_current_readiness_health_read" ON analytics.current_readiness_health;
-- DROP POLICY IF EXISTS "kora_admin_all_current_readiness_health" ON analytics.current_readiness_health;
-- DROP POLICY IF EXISTS "company_own_kora_ready_attainment_read" ON analytics.kora_ready_attainment;
-- DROP POLICY IF EXISTS "kora_admin_all_kora_ready_attainment" ON analytics.kora_ready_attainment;
-- DROP TRIGGER IF EXISTS trg_current_readiness_health_updated_at ON analytics.current_readiness_health;
-- DROP TABLE IF EXISTS analytics.current_readiness_health;
-- DROP TRIGGER IF EXISTS trg_kora_ready_attainment_no_mutation ON analytics.kora_ready_attainment;
-- DROP FUNCTION IF EXISTS analytics.reject_kora_ready_attainment_mutation();
-- DROP TABLE IF EXISTS analytics.kora_ready_attainment;
-- Rollback is safe at any time — this migration inserts no seeded row, and
-- no other object references either table.
