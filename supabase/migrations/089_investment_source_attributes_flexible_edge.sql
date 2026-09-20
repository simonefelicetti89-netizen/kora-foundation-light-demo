-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 089: Investment source attributes (bounded flexible edge)
-- Migration:   089_investment_source_attributes_flexible_edge
-- Created:     2026-09-20
-- Block:       KORA-WP-016 — Structured Spine + Normalized Data/Evidence Layer
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Closes CORE-015 (structured spine / flexible edges) and CORE-016 (Normalized
-- Data & Evidence layer) for the Investment module ONLY, by giving migration
-- 053's typed spine the bounded flexible edge that the ingestion layer already
-- has (`analytics.uef_record.payload`, migration 001 — the named architectural
-- precedent, used as precedent and NOT modified by this WP).
--
-- FOUNDER ADJUDICATION RECORDED: PD-029 ("structured spine, flexible edges")
-- is RATIFIED FOR KORA-WP-016 ONLY. It is not generalized beyond this WP, and
-- no historical document's status wording is rewritten by this migration.
--
-- WHY A FLEXIBLE EDGE IS NEEDED AT ALL
-- ─────────────────────────────────────
-- The approved second, differently-shaped source is the real, existing intake
-- role `IntakeFileRole = 'policy'` (lib/data-intake/file-role-detection.ts) —
-- an entitlement/coverage investment that legitimately carries NO monetary
-- amount and whose native attributes (coverage, copertura, uptake,
-- eligible_population, diritto, smart_working, normativa) have no home in the
-- 053 spine. PT §15 (FROZEN) defines the Investment Map over "risorse ...
-- finalità, popolazione, orizzonte, Evidence" — resources, not only cash — so
-- such a source is semantically legitimate Investment, not a new concept.
--
-- WHAT THIS IS NOT
-- ────────────────
-- Not a new domain object (PT §14: "Normalized Company Data & Evidence" stays
-- a functional description, never a frozen Product object). Not an EAV or
-- attribute subsystem. Not a normalization platform. Not a new table. Not a
-- new source discriminator: source discrimination continues to use the
-- EXISTING canonical path `observed_investment_fact.source_batch_id ->
-- analytics.source_batch.source_type` (migration 001/053), deliberately NOT
-- denormalized onto this table. No RLS, grant, tenant-ownership or auth change
-- — see section 4. No sibling generalization of migrations 055/064/065.
--
-- WHY THE EDGE IS "BOUNDED" WITHOUT INVENTING A NUMERIC LIMIT
-- ───────────────────────────────────────────────────────────
-- The bound is derived from the real source shape, not chosen for convenience.
-- Every intake role in lib/data-intake/file-role-detection.ts is detected from
-- TABULAR HEADERS (CSV/XLSX columns), so a legitimate source-specific attribute
-- set is by nature a FLAT map of column -> scalar. The three enforced rules
-- below therefore restate the sources' own shape:
--   (a) it must be a JSON object;
--   (b) every value must be a scalar (string/number/boolean/null) — no nested
--       object or array, because a tabular cell is not a tree;
--   (c) it may not carry any key that names a canonical typed spine column.
-- (c) is what makes silent replacement, duplication and conflicting override
-- of the typed spine structurally impossible rather than merely discouraged.
-- No byte cap, key-count cap or depth number is invented here: none is needed
-- once values are scalars drawn from a tabular row, and KORA has no existing
-- convention for one (verified: no other jsonb column in supabase/migrations
-- carries a CHECK, and `uef_record.payload` — the named precedent — is itself
-- unconstrained at the schema level).
--
-- ADDITIVE / EXPAND-ONLY
-- ──────────────────────
-- One ADD COLUMN with a default, one IMMUTABLE validation function, one CHECK
-- constraint. No DROP, no ALTER of an existing column, no data rewrite, no
-- backfill, no destructive step. Existing rows receive '{}'::jsonb and remain
-- valid. Every existing WP-014 write continues to work unchanged.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Reserved-key / shape validator ───────────────────────────────────────
--
-- IMMUTABLE + PARALLEL SAFE so it is legal inside a CHECK constraint. Lives in
-- the existing `kora` helper schema alongside kora.kora_role()/kora.tenant_id()
-- (migration 001/010) rather than inventing a new schema.
--
-- The reserved list is exactly migration 053's own column set. It is spelled
-- literally, not derived at runtime, so the constraint stays IMMUTABLE and a
-- future column addition is a deliberate, visible edit here.

CREATE OR REPLACE FUNCTION kora.investment_source_attributes_valid(attrs jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    -- (a) object only — never a scalar, array, or JSON null
    jsonb_typeof(attrs) = 'object'
    -- (b) flat: every value is a scalar, mirroring a tabular cell
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_each(attrs) AS e
      WHERE jsonb_typeof(e.value) IN ('object', 'array')
    )
    -- (c) may never name a canonical typed spine column
    AND NOT (attrs ?| ARRAY[
      'id',
      'tenant_id',
      'source_batch_id',
      'recorded_by_role',
      'recorded_by_id',
      'purpose',
      'amount',
      'provider',
      'population_descriptor',
      'reach_summary',
      'evidence_summary',
      'unknown_fields',
      'commitment_ref',
      'created_at'
    ]);
$$;

COMMENT ON FUNCTION kora.investment_source_attributes_valid(jsonb) IS
  'KORA-WP-016: validates the Investment flexible edge — object only, flat scalar values only, and never a key naming a canonical typed spine column of analytics.observed_investment_fact.';

-- ── 2. The bounded flexible edge column ─────────────────────────────────────
--
-- NOT NULL DEFAULT '{}' so "no source-specific attributes" is an explicit empty
-- object, never NULL. This is deliberately NOT part of the Unknown/null
-- semantics of the five "if known" spine columns: an empty edge means "this
-- source contributed no extra attributes", never "this value is Unknown".
-- unknown_fields therefore continues to name exactly the omitted SPINE fields
-- and is not affected by this column (KORA-WP-014 invariant preserved).

ALTER TABLE analytics.observed_investment_fact
  ADD COLUMN IF NOT EXISTS source_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN analytics.observed_investment_fact.source_attributes IS
  'KORA-WP-016 bounded flexible edge: flat map of source-specific attribute -> scalar, for legitimate Investment attributes a differently-shaped source carries that the typed spine does not model. Never duplicates or overrides a spine column (CHECK-enforced). Empty object = no extra attributes, never Unknown.';

-- ── 3. Enforce the edge contract at the schema level ────────────────────────
--
-- Idempotent: ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL, so the
-- existence check is explicit (pg_constraint), matching the defensive style
-- already used in migration 034.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'observed_investment_fact_source_attributes_governed'
      AND conrelid = 'analytics.observed_investment_fact'::regclass
  ) THEN
    ALTER TABLE analytics.observed_investment_fact
      ADD CONSTRAINT observed_investment_fact_source_attributes_governed
      CHECK (kora.investment_source_attributes_valid(source_attributes));
  END IF;
END
$$;

-- ── 4. RLS / GRANTs — DELIBERATELY UNCHANGED ────────────────────────────────
--
-- Nothing in this section, on purpose, and this comment is the evidence that
-- the omission is deliberate rather than forgotten.
--
-- Migration 053's two policies are row predicates only —
--   kora_admin_all_observed_investment_fact:  kora.kora_role() = 'KORA_ADMIN'
--   company_own_observed_investment_fact_read: kora_role() = 'COMPANY_ADMIN'
--                                              AND tenant_id = kora.tenant_id()
-- — and its GRANTs are table-level (SELECT, INSERT to service_role; SELECT to
-- authenticated). Neither names a column list, so a new column is covered
-- automatically. RLS stays enabled and FORCEd. No new policy, no grant change,
-- no tenant-ownership change, no auth change. `Auth/RLS: inherited from
-- KORA-WP-014` is satisfied literally.

-- ── 5. ROLLBACK (manual, commented — repository convention) ─────────────────
--
-- ALTER TABLE analytics.observed_investment_fact
--   DROP CONSTRAINT IF EXISTS observed_investment_fact_source_attributes_governed;
-- ALTER TABLE analytics.observed_investment_fact
--   DROP COLUMN IF EXISTS source_attributes;
-- DROP FUNCTION IF EXISTS kora.investment_source_attributes_valid(jsonb);
