-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA — Migration 090: Saved Column Mapping (tenant-scoped)
-- Migration:   090_saved_column_mapping_tenant_scoped
-- Created:     2026-09-21
-- Block:       KORA-WP-066 — Saved Mappings (closes COMPANY-011)
-- Gate:        Gate 2 CLOSED WITH CONDITIONS (staging authorized) — written and
--              validated LOCAL/test only by this task. NOT applied to staging
--              or production by this migration file.
-- ───────────────────────────────────────────────────────────────────────────────
-- SCOPO
-- ─────
-- Persists the EXISTING B27 column mapping object — Record<sourceHeader,
-- CanonicalIntakeField>, lib/data-intake/column-mapping.ts — so that the second
-- upload from the SAME Company is easier than the first.
--
-- FOUNDER SEMANTIC RULING (2026-09-21) — READING 1, TENANT-SCOPED SESSION REUSE.
-- The historical registry wording "reusable mapping across Companies" is NOT the
-- intended Product semantics. The corrected canonical acceptance is: "a saved
-- mapping is reusable across upload/mapping sessions for the same Company."
--   Ownership        = Company / tenant
--   Operational actor = KORA_ADMIN / KORA Operator
--   Reuse boundary   = same Company only
--
-- WHAT THIS IS NOT
-- ────────────────
-- Not a cross-Company template. Not a global KORA mapping catalogue. Not a
-- promotion/sanitization pipeline. Not a Company-authored cross-tenant-readable
-- object. Not a shared mutable object (the application path is copy-on-use, in
-- the service layer). Not a mapping-management lifecycle: there is deliberately
-- no draft/archive/superseded state and no version history, because none is
-- required to satisfy safe save + reuse (WP-066 §11). Not a change to the BCM
-- classifier (COMPANY-010 KEEP), to WP-029's manual-remap Case governance, to
-- normative/pillar/care-economy mappings, or to analytics.source_batch.
--
-- WHY A NEW TABLE
-- ───────────────
-- No mapping is persisted anywhere today (Phase 39 UNK-21, "RESOLVED — ABSENT";
-- re-verified at this WP's own pre-check: zero saved_mapping/mapping_template/
-- mapping_rule/column_mapping tables in migrations 001–089). The mapping is
-- ephemeral React state, sent to accept and discarded. analytics.source_batch
-- .payload_sample is documented as "redacted non-sensitive sample for operator
-- debugging" and is deliberately NOT reused for this purpose.
--
-- PRIVACY — STRUCTURALLY ENFORCED, NOT MERELY DOCUMENTED
-- ──────────────────────────────────────────────────────
-- A saved mapping may carry ONLY what is needed to reconstruct
-- sourceHeader -> CanonicalIntakeField. The CHECK below makes it structurally
-- impossible to store anything else: every value must be one of the 17 canonical
-- intake field names spelled literally. Row values, sample data, worker fields,
-- pseudonyms, payload samples and file contents therefore cannot be persisted
-- here even by a buggy caller — they would violate the constraint.
--
-- Source HEADERS are Company artefacts and are treated as tenant-owned data:
-- they never leave the tenant (RLS §4), which is exactly why cross-Company
-- reuse is out of scope under the Founder ruling above.
--
-- ADDITIVE / EXPAND-ONLY
-- ──────────────────────
-- One new table, one IMMUTABLE validation function, RLS, least-privilege grants.
-- No DROP, no ALTER of an existing object, no backfill, no data rewrite. Every
-- existing ingestion write continues to work unchanged, and ingestion never
-- requires a row in this table (WP-066 §12, non-blocking invariant).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Shape validator ──────────────────────────────────────────────────────
--
-- IMMUTABLE + PARALLEL SAFE so it is legal inside a CHECK constraint. Lives in
-- the existing `kora` helper schema alongside kora.kora_role()/kora.tenant_id()
-- and kora.investment_source_attributes_valid() (migration 089's precedent,
-- followed here rather than inventing a new pattern).
--
-- The canonical field list is exactly CANONICAL_FIELDS in
-- lib/data-intake/column-mapping.ts. It is spelled literally, not derived at
-- runtime, so the constraint stays IMMUTABLE and a future canonical field is a
-- deliberate, visible edit here.

CREATE OR REPLACE FUNCTION kora.saved_column_mapping_valid(mapping jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    -- (a) object only — never a scalar, array, or JSON null
    jsonb_typeof(mapping) = 'object'
    -- (b) never empty: an empty mapping is not worth saving and would be
    --     indistinguishable from "no saved mapping" at the Product level
    AND mapping <> '{}'::jsonb
    -- (c) every value is a canonical intake field name — this is what makes
    --     storing a row value, sample or payload structurally impossible
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_each(mapping) AS e
      WHERE jsonb_typeof(e.value) <> 'string'
         OR (e.value #>> '{}') NOT IN (
              'initiative_name', 'description', 'category', 'type',
              'amount', 'participants', 'source', 'evidence_level', 'pillar',
              'reporting_period', 'provider', 'budget_class', 'cost_center',
              'hours', 'coverage', 'uptake', 'policy_evidence'
            )
    )
$$;

COMMENT ON FUNCTION kora.saved_column_mapping_valid(jsonb) IS
  'KORA-WP-066: a saved column mapping is a non-empty flat object whose every value is one of the 17 canonical intake field names (lib/data-intake/column-mapping.ts). Structurally prevents persisting row values, samples or payloads in a saved mapping.';

-- ── 2. Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics.saved_column_mapping (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership. Canonical tenant identity, same FK + ON DELETE CASCADE shape as
  -- analytics.source_batch (migration 001). Deleting a Company removes its
  -- saved mappings with it — a saved mapping has no meaning outside its tenant.
  tenant_id     uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,

  -- Operator-chosen label, so the Operator can tell two saved mappings apart.
  mapping_name  text          NOT NULL,

  -- The mapping itself: { sourceHeader: CanonicalIntakeField }.
  mapping       jsonb         NOT NULL,

  -- Repository-convention persistence metadata.
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  created_by    text,

  -- Provenance: ownership and origin are mechanically clear from the row itself
  -- (tenant_id + created_by + created_at). No cross-Company promotion or
  -- template-origin column exists, because cross-Company templates are out of
  -- scope under the Founder ruling — no field is added for a hypothetical
  -- future sharing capability.

  CONSTRAINT saved_column_mapping_name_not_blank
    CHECK (length(btrim(mapping_name)) > 0),

  CONSTRAINT saved_column_mapping_shape
    CHECK (kora.saved_column_mapping_valid(mapping)),

  -- Re-saving under the same name for the same Company is an explicit update,
  -- never a silent duplicate. Scoped per tenant, so two Companies may
  -- independently use the same label without ever seeing each other's row.
  CONSTRAINT saved_column_mapping_unique_name_per_tenant
    UNIQUE (tenant_id, mapping_name)
);

COMMENT ON TABLE analytics.saved_column_mapping IS
  'KORA-WP-066 Saved Mappings (COMPANY-011). Tenant-scoped reuse of the B27 column mapping across upload/mapping sessions FOR THE SAME COMPANY. Never cross-Company: see migration header and the Founder semantic ruling of 2026-09-21.';
COMMENT ON COLUMN analytics.saved_column_mapping.mapping IS
  'Flat object { sourceHeader: CanonicalIntakeField }. CHECK-enforced to contain canonical field names only — never row values, samples, pseudonyms or payloads.';

CREATE INDEX IF NOT EXISTS idx_saved_column_mapping_tenant
  ON analytics.saved_column_mapping (tenant_id);

-- ── 3. updated_at maintenance ───────────────────────────────────────────────
-- Reuses the repository's existing trigger function if one is present; falls
-- back to a local, minimal one otherwise. No new convention is introduced.

CREATE OR REPLACE FUNCTION analytics.saved_column_mapping_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saved_column_mapping_updated_at ON analytics.saved_column_mapping;
CREATE TRIGGER trg_saved_column_mapping_updated_at
  BEFORE UPDATE ON analytics.saved_column_mapping
  FOR EACH ROW EXECUTE FUNCTION analytics.saved_column_mapping_touch_updated_at();

-- ── 4. RLS — tenant isolation is enforced here, never by UI filtering ───────
--
-- LEAST PRIVILEGE (Founder ruling, 2026-09-22). Saved Mappings are Operator
-- configuration. WP-066 ships NO Company-facing Saved Mapping surface, so no
-- normal tenant role needs direct database read access to this table today:
--   KORA_ADMIN                                  → operational access
--   service_role (the server's own write path)  → INSERT/SELECT/UPDATE grant
--   COMPANY_ADMIN / COMPANY_VIEWER / WORKER /
--   ADVISOR / PARTNER / anonymous               → NO access at all
--
-- An earlier draft of this migration carried a `company_own_read` SELECT
-- policy "for architectural consistency". It was removed: tenant ownership is
-- a persistence and authorization boundary, not evidence that Company users
-- need to read the rows. Granting for a hypothetical future UI is exactly the
-- broadening this ruling forbids — if a Company-facing Saved Mapping Product
-- is ever introduced, its access model gets specified then.
--
-- There is likewise NO cross-tenant read policy: a mapping saved for Company A
-- is invisible to Company B at the database level, so it cannot be listed,
-- suggested or applied for Company B even if an application-layer bug tried.

ALTER TABLE analytics.saved_column_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.saved_column_mapping FORCE ROW LEVEL SECURITY;

CREATE POLICY "saved_column_mapping_kora_admin_all" ON analytics.saved_column_mapping
  FOR ALL USING (kora.kora_role() = 'KORA_ADMIN');

-- ── 5. GRANTs — least privilege ─────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE ON analytics.saved_column_mapping TO service_role;

-- `authenticated` keeps SELECT at the TABLE level only so the KORA_ADMIN
-- policy above is actually reachable on a user-JWT path; row visibility is
-- then decided entirely by that policy, which admits KORA_ADMIN and no one
-- else. Removing this grant was tried and reverted: it made the KORA_ADMIN
-- policy dead code and turned every role's denial into "permission denied"
-- rather than the intended empty result. No INSERT/UPDATE/DELETE is granted
-- to `authenticated` at all — the write path is service_role only.
GRANT SELECT ON analytics.saved_column_mapping TO authenticated;
GRANT EXECUTE ON FUNCTION kora.saved_column_mapping_valid(jsonb) TO service_role, authenticated;
