-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 053: Observed Investment Fact
-- Migration:   053_observed_investment_fact
-- Created:     2026-09-12
-- Block:       KORA-WP-014 — Investment Map Core (Observed Investment Fact)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Implements the persisted half of the Investment Map: an Observed Investment
-- Fact — "something ingested at onboarding or later that already happened/
-- exists, independent of any KORA Commitment" (doc 70 §4 "PRE-KORA INVESTMENT
-- MAP TREATMENT — Corrected composition"; doc 71 §7). The Investment Map
-- itself remains a composed intelligence view (doc 67 §2 / doc 70 §4's own
-- corrected restatement: "no standalone aggregate — this DD-3 decision
-- stands") drawing on two provenance classes — this migration builds only
-- the Observed class. The Governed Investment Fact class (things flowing
-- through Commitment → Resource Allocation → Program) is composed later,
-- from tables KORA-WP-015+ will create — nothing here anticipates them.
--
-- OBSERVED ≠ GOVERNED — THE CENTRAL INVARIANT
-- ─────────────────────────────────────────────
-- An Observed Investment Fact never implies KORA governance occurred.
-- `commitment_ref` exists as a column (the frozen shape itself names it —
-- doc 70/71: "carries... commitment_ref = null") but is constrained to
-- always be NULL by this migration — there is no FK to a Commitment table,
-- because no such table exists yet (KORA-WP-020+). A future migration, once
-- Commitment exists, is the only place that constraint may be relaxed and an
-- FK added — never this one, and never by application code today.
--
-- UNKNOWN IS A REAL STATE, NOT ZERO/FALSE/EMPTY
-- ────────────────────────────────────────────────
-- `amount`, `provider`, `population_descriptor`, `reach_summary`,
-- `evidence_summary` are all nullable — NULL means genuinely not known, never
-- coerced to 0/false/empty at the schema or service layer. `unknown_fields`
-- names which of those columns are explicitly confirmed Unknown (as opposed
-- to simply not yet asked) — this mirrors the existing, precedented
-- `analytics.uef_record.missing_fields text[]` pattern (migration 001)
-- exactly; no new taxonomy is invented.
--
-- SCOPE BOUNDARY
-- ───────────────
-- Company-scoped only, consuming KORA-WP-010's canonical Pattern A
-- (tenant-claim-bound) RLS template (docs/RLS_COMPANY_SCOPED_PATTERN.md) —
-- this is ordinary Company-owned operational data, not an identity/ownership
-- fact, so Pattern A (not Pattern B) applies, matching the existing
-- `analytics.source_batch`/`kora_index_result` precedent exactly. No
-- Resource Allocation, no Commitment, no Program, no Opportunity, no Need
-- inference, no Partner promotion of a free-text provider name — all
-- explicitly out of this WP's scope (KORA-WP-015/017/019/020/051).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. analytics.observed_investment_fact ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.observed_investment_fact (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Optional provenance link to the generic ingestion pipeline — a fact may
  -- also be entered manually (source_batch_id NULL), so this is nullable by
  -- design, not a gap. ON DELETE SET NULL: deleting a batch record must
  -- never cascade-delete the historical fact it once helped produce.
  source_batch_id       uuid          REFERENCES analytics.source_batch (id) ON DELETE SET NULL,

  -- Explicit provenance of WHO/WHAT recorded this fact — mirrors the
  -- actor_role/actor_id shape already used by audit.audit_log and
  -- audit.governance_event (migration 005/051), so provenance is queryable
  -- on the row itself without a join.
  recorded_by_role      text          NOT NULL,
  recorded_by_id        text          NOT NULL,

  -- Always describable, even when every other detail is unknown — this is
  -- the one field the frozen source text does not list among the "if known"
  -- attributes (amount/provider/population/Reach/Evidence all are).
  purpose               text          NOT NULL,

  -- "if known" attributes — nullable, NULL = genuinely Unknown, never 0/false.
  amount                numeric(14,2),
  provider              text,
  population_descriptor text,
  reach_summary         text,
  evidence_summary      text,

  -- Explicit Unknown/Data-Quality flags (doc 70/71's own phrase), naming
  -- which of the five nullable columns above are confirmed Unknown, not
  -- merely not-yet-entered. Mirrors analytics.uef_record.missing_fields
  -- exactly (migration 001) — no new taxonomy invented.
  unknown_fields        text[]        NOT NULL DEFAULT '{}',

  -- The frozen shape names this column even for the Observed class
  -- ("carries... commitment_ref = null") — present, but structurally
  -- prevented from ever pointing anywhere until a future WP (KORA-WP-020+,
  -- once Commitment exists) migrates it into a real FK. No speculative FK
  -- to a table that does not exist is created here.
  commitment_ref        uuid          CHECK (commitment_ref IS NULL),

  created_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observed_investment_fact_tenant       ON analytics.observed_investment_fact (tenant_id);
CREATE INDEX IF NOT EXISTS idx_observed_investment_fact_source_batch ON analytics.observed_investment_fact (source_batch_id);
CREATE INDEX IF NOT EXISTS idx_observed_investment_fact_created      ON analytics.observed_investment_fact (created_at DESC);

-- ── 2. RLS — Pattern A (tenant-claim-bound), per docs/RLS_COMPANY_SCOPED_PATTERN.md ──
-- Identical shape to analytics.source_batch/kora_index_result (migration
-- 001): KORA_ADMIN gets full access; COMPANY_ADMIN/COMPANY_VIEWER get
-- SELECT only, scoped by tenant claim. Writes happen exclusively through the
-- server-side Investment Map service (getSupabaseServiceClient(), bypasses
-- RLS by role) — no ordinary session ever inserts this table directly, same
-- convention as every other Pattern-A table in this schema.

ALTER TABLE analytics.observed_investment_fact ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.observed_investment_fact FORCE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_observed_investment_fact" ON analytics.observed_investment_fact
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_observed_investment_fact_read" ON analytics.observed_investment_fact
  FOR SELECT USING (
    kora.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = kora.tenant_id()
  );

-- ── 3. GRANTs ────────────────────────────────────────────────────────────────
-- Proactive, from the start — precedent: migrations 032/033/050 (missing
-- service_role GRANT) and migration 052 (missing authenticated GRANT) both
-- found this exact defect class in real-DB validation for earlier WPs.
-- service_role needs INSERT (the service writes) + SELECT (the service
-- reads back what it wrote); authenticated needs SELECT only (Company
-- sessions read via the policy above, never write directly).

GRANT SELECT, INSERT ON analytics.observed_investment_fact TO service_role;
GRANT SELECT ON analytics.observed_investment_fact TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- NOTIFY pgrst, 'reload schema'; -- after the REVOKEs below
-- REVOKE SELECT ON analytics.observed_investment_fact FROM authenticated;
-- REVOKE SELECT, INSERT ON analytics.observed_investment_fact FROM service_role;
-- DROP POLICY IF EXISTS "company_own_observed_investment_fact_read" ON analytics.observed_investment_fact;
-- DROP POLICY IF EXISTS "kora_admin_all_observed_investment_fact" ON analytics.observed_investment_fact;
-- DROP INDEX IF EXISTS analytics.idx_observed_investment_fact_created;
-- DROP INDEX IF EXISTS analytics.idx_observed_investment_fact_source_batch;
-- DROP INDEX IF EXISTS analytics.idx_observed_investment_fact_tenant;
-- DROP TABLE IF EXISTS analytics.observed_investment_fact;
-- Rollback is safe at any time: this migration creates one new table and
-- touches nothing else — no existing column, row, policy, or table
-- (including analytics.tenant and analytics.source_batch, only referenced
-- via nullable FKs) is altered by this migration or by rolling it back.
