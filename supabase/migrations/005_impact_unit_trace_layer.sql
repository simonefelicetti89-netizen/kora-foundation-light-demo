-- ── 005_impact_unit_trace_layer.sql ──────────────────────────────────────────
-- B62-B: Impact Units™ Trace Layer
-- Stage 10 of the 14-stage KORA algorithm: IU_{e,p} = NM × BC × CQ × EV × CF × AGF
--
-- Design constraints:
--   - No worker identity. No PIB. Aggregate-safe record-level only.
--   - factor_trace stored as JSONB — server-side only, never returned to employer-facing API.
--   - Append-only (no UPDATE policy) — immutable scoring artifact.
--   - RLS: KORA admin full access; company role read-only aggregate (no row-level trace).

-- ── analytics.impact_unit ─────────────────────────────────────────────────────

CREATE TABLE analytics.impact_unit (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid          NOT NULL REFERENCES analytics.tenant(id),
  uef_record_id        uuid          NOT NULL REFERENCES analytics.uef_record(id),
  source_batch_id      uuid          NOT NULL REFERENCES analytics.source_batch(id),
  reporting_period     text          NOT NULL,

  -- ── IU formula factors ──────────────────────────────────────────────────────
  nm                   numeric(8,4)  NOT NULL DEFAULT 1.0,   -- Normalized Magnitude
  bc                   numeric(8,4)  NOT NULL DEFAULT 1.0,   -- Base Contribution
  cq                   numeric(8,4)  NOT NULL DEFAULT 1.0,   -- Completeness Quality
  ev                   numeric(8,4)  NOT NULL DEFAULT 0.5,   -- Evidence Verification
  cf                   numeric(8,4)  NOT NULL DEFAULT 1.0,   -- Continuity Factor (stub)
  agf                  numeric(8,4)  NOT NULL DEFAULT 0.0,   -- Anti-Gaming Factor

  -- ── IU output ───────────────────────────────────────────────────────────────
  impact_units_total   numeric(10,4) NOT NULL DEFAULT 0.0,
  life_iu              numeric(10,4) NOT NULL DEFAULT 0.0,
  growth_iu            numeric(10,4) NOT NULL DEFAULT 0.0,
  connection_iu        numeric(10,4) NOT NULL DEFAULT 0.0,
  impact_iu            numeric(10,4) NOT NULL DEFAULT 0.0,
  legacy_iu            numeric(10,4) NOT NULL DEFAULT 0.0,

  -- ── Governance ──────────────────────────────────────────────────────────────
  computed             boolean       NOT NULL DEFAULT false,
  exclusion_reason     text,

  -- ── Trace — server-side only ────────────────────────────────────────────────
  -- Never returned to employer-facing API responses. Audit + debugging only.
  factor_trace         jsonb         NOT NULL DEFAULT '[]',

  -- ── Methodology versioning ──────────────────────────────────────────────────
  methodology_version  text          NOT NULL DEFAULT 'KORA-METHOD-v1.0',
  calibration_status   text          NOT NULL DEFAULT 'pre_empirical_calibration',

  created_at           timestamptz   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_impact_unit_tenant       ON analytics.impact_unit (tenant_id);
CREATE INDEX idx_impact_unit_batch        ON analytics.impact_unit (source_batch_id);
CREATE INDEX idx_impact_unit_period       ON analytics.impact_unit (tenant_id, reporting_period);
CREATE INDEX idx_impact_unit_uef_record   ON analytics.impact_unit (uef_record_id);

-- RLS
ALTER TABLE analytics.impact_unit ENABLE ROW LEVEL SECURITY;

-- KORA Admin: full read + insert (no update — append-only)
CREATE POLICY "kora_admin_impact_unit_read"
  ON analytics.impact_unit FOR SELECT
  USING (auth.jwt() ->> 'role' = 'KORA_ADMIN');

CREATE POLICY "kora_admin_impact_unit_insert"
  ON analytics.impact_unit FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'KORA_ADMIN');

-- Company role: can read aggregate impact_unit data for their own tenant.
-- factor_trace is excluded from company-facing queries at the application layer.
CREATE POLICY "company_own_impact_unit_read"
  ON analytics.impact_unit FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'COMPANY_USER'
    AND tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
  );

-- Trigger: no updated_at — append-only by design
