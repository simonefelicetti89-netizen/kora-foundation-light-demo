-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 055: Need Hypothesis
-- Migration:   055_need_hypothesis
-- Created:     2026-09-12
-- Block:       KORA-WP-017 — Needs Map + Need Hypothesis + Listening-Hypothesis Slice
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Implements the first real, persisted Need Hypothesis object — "the pilot's
-- first provisional Needs state — never 'Needs truth'" (KORA-WP-017's own
-- Purpose text). Closes CORE-005 (full) and is the deliberate Hypothesis-only
-- early slice of CORE-006 (full Listening closes later, at KORA-WP-069 —
-- itself gated by the still-open external legal blocker F-12, unaffected by
-- this migration).
--
-- HYPOTHESIS ≠ SUPPORTED — THE CENTRAL INVARIANT
-- ─────────────────────────────────────────────────
-- Doc 67 §2 (DD-3 Canonical Domain Model) names the frozen classification
-- vocabulary verbatim: "Hypothesis / Emerging / Supported / Insufficient-
-- Evidence-Unknown" — a stable `need_id` other future objects (Opportunity,
-- Commitment) can reference. All four values are present in the schema's
-- CHECK constraint from day one, because that reference shape must be stable
-- for those future consumers — but this migration's own DEFAULT is
-- 'Hypothesis', and the companion service (lib/needs-map/
-- need-hypothesis-service.ts) structurally cannot create any of the other
-- three: promoting a Hypothesis into Emerging/Supported/Insufficient-
-- Evidence-Unknown requires real evidence from the full Listening instrument
-- (KORA-WP-069), not built here. No promotion/transition path exists in this
-- migration or its service — no UPDATE grant is given to any role.
--
-- AGGREGATE / PRIVACY-SAFE — NO WORKER-LEVEL DATA
-- ──────────────────────────────────────────────────
-- PT FT-006: "Needs aggregati privacy-safe." This table carries no worker
-- identity, no individual response, no auth_user_id of an employee — only a
-- Company-level hypothesis statement. A Company can never reach individual
-- worker data through this object.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Company-scoped only, using KORA-WP-010's canonical Pattern A (tenant-
-- claim-bound) RLS template. Uses ONLY the `COMPANY_ADMIN` role — NOT
-- `COMPANY_VIEWER`, which was removed from this codebase (B143;
-- lib/constants/kora.ts REMOVED_KORA_ROLES) — even though the older
-- precedent tables (analytics.tenant, migration 001/002; analytics.
-- observed_investment_fact, migration 053) still carry a harmless, inert
-- `COMPANY_VIEWER` clause in their own policies (dead code today, since no
-- session can ever carry that role — not fixed here, out of this WP's scope,
-- disclosed in the implementation report). This migration deliberately does
-- not repeat that stale reference.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.need_hypothesis ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.need_hypothesis (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- The hypothesis content itself — a local implementation choice (doc 67
  -- §2 does not name this field, only the classification/reference shape).
  statement         text          NOT NULL,

  -- Frozen vocabulary (doc 67 §2), all four values present for a stable
  -- reference shape — but DEFAULT and, per this WP's own service, the ONLY
  -- value ever written by KORA-WP-017's own create path is 'Hypothesis'.
  classification    text          NOT NULL DEFAULT 'Hypothesis'
                                  CHECK (classification IN (
                                    'Hypothesis', 'Emerging', 'Supported', 'Insufficient-Evidence-Unknown'
                                  )),

  -- Explicit provenance — mirrors the actor_role/actor_id shape already used
  -- throughout this schema (audit.audit_log, audit.governance_event,
  -- analytics.observed_investment_fact).
  recorded_by_role  text          NOT NULL,
  recorded_by_id    text          NOT NULL,

  created_at        timestamptz   NOT NULL DEFAULT now()
  -- No updated_at, no lifecycle column — this WP exposes no mutation path at
  -- all (no UPDATE grant below); a future evidence-driven state transition
  -- is KORA-WP-069's own, later, separately-authorized concern.
);

CREATE INDEX IF NOT EXISTS idx_need_hypothesis_tenant         ON analytics.need_hypothesis (tenant_id);
CREATE INDEX IF NOT EXISTS idx_need_hypothesis_classification ON analytics.need_hypothesis (classification);
CREATE INDEX IF NOT EXISTS idx_need_hypothesis_created        ON analytics.need_hypothesis (created_at DESC);

-- ── 2. RLS — Pattern A (tenant-claim-bound), COMPANY_ADMIN only ─────────────
-- Identical shape to analytics.observed_investment_fact (migration 053),
-- except the role list correctly reflects today's actual active Company
-- role (COMPANY_ADMIN only) rather than repeating the stale COMPANY_VIEWER
-- reference the older precedent tables still carry.

ALTER TABLE analytics.need_hypothesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.need_hypothesis FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_need_hypothesis" ON analytics.need_hypothesis
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_need_hypothesis_read" ON analytics.need_hypothesis
  FOR SELECT USING (
    kora.kora_role() = 'COMPANY_ADMIN'
    AND tenant_id = kora.tenant_id()
  );

-- ── 3. GRANTs ────────────────────────────────────────────────────────────────
-- SELECT + INSERT only for service_role — no UPDATE, no DELETE, for anyone:
-- this WP's own service exposes no mutation path, and none should be
-- possible even at the GRANT layer. authenticated gets SELECT only (Company
-- self-read via the policy above); Company sessions never write directly.

GRANT SELECT, INSERT ON analytics.need_hypothesis TO service_role;
GRANT SELECT ON analytics.need_hypothesis TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON analytics.need_hypothesis FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.need_hypothesis FROM service_role;
-- DROP POLICY IF EXISTS "company_own_need_hypothesis_read" ON analytics.need_hypothesis;
-- DROP POLICY IF EXISTS "kora_admin_all_need_hypothesis" ON analytics.need_hypothesis;
-- DROP INDEX IF EXISTS analytics.idx_need_hypothesis_created;
-- DROP INDEX IF EXISTS analytics.idx_need_hypothesis_classification;
-- DROP INDEX IF EXISTS analytics.idx_need_hypothesis_tenant;
-- DROP TABLE IF EXISTS analytics.need_hypothesis;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else.
