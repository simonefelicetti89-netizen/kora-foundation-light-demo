-- ═══════════════════════════════════════════════════════════════════════════════
-- KORA Foundation Light — LIVE v1 Schema Migration
-- Migration:   001_live_v1_foundation
-- Created:     2026-05-29
-- Gate status: Gate 2 (CTO review) required before production provisioning
--              Gate 3 (Legal/Privacy) required before live company data
-- ───────────────────────────────────────────────────────────────────────────────
-- ARCHITECTURE NOTES:
--   analytics  → company-level aggregates, Index results, scoring outputs
--   personal   → pseudonymized records (stricter RLS, no employer access)
--   gov        → financial governance, budget evidence
--   audit      → append-only audit trail
--
-- RLS design:
--   - KORA_ADMIN can access all tenant data in all schemas
--   - COMPANY_ADMIN / COMPANY_VIEWER see only their own tenant_id
--   - personal schema: employers NEVER see row-level data (individual records)
--   - audit.audit_log: INSERT only via application; SELECT = KORA_ADMIN only
--   - JWT claims used: kora_role (text), tenant_id (uuid)
--
-- PRIVACY RULES (non-bypassable):
--   - personal.uploaded_record: NO employer RLS policy — operators only
--   - personal.workforce_baseline: aggregate data only (N≥10 enforced at app layer)
--   - No individual PIB columns anywhere in these schemas
--   - No gov.kip_records — explicitly excluded from Foundation Light
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 0. Schemas ────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS personal;
CREATE SCHEMA IF NOT EXISTS gov;
CREATE SCHEMA IF NOT EXISTS audit;


-- ── 1. JWT claim helpers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    NULL
  );
$$;

CREATE OR REPLACE FUNCTION auth.kora_role() RETURNS text
  LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb ->> 'kora_role',
    'anonymous'
  );
$$;


-- ── 2. analytics.tenant ───────────────────────────────────────────────────────
-- Company registry — one row per onboarded organisation.

CREATE TABLE analytics.tenant (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code             text          UNIQUE NOT NULL,
  company_name            text          NOT NULL,
  industry_code           text,
  country_code            text          NOT NULL DEFAULT 'IT',
  onboarding_status       text          NOT NULL DEFAULT 'pending',
  data_readiness_status   text          NOT NULL DEFAULT 'incomplete',
  decision_pack_status    text          NOT NULL DEFAULT 'not_ready',
  methodology_version_id  text          NOT NULL DEFAULT 'KORA Methodology v0.1',
  is_active               boolean       NOT NULL DEFAULT true,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  deleted_at              timestamptz   -- soft delete
);

CREATE INDEX idx_tenant_code ON analytics.tenant (tenant_code);

ALTER TABLE analytics.tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_tenants" ON analytics.tenant
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_tenant_read" ON analytics.tenant
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER', 'ADVISOR')
    AND id = auth.tenant_id()
  );


-- ── 3. personal.workforce_baseline ───────────────────────────────────────────
-- Aggregated workforce headcount per tenant × period.
-- Aggregate data only — no individual worker rows here.
-- Minimum group size N≥10 enforced at application layer before insert.

CREATE TABLE personal.workforce_baseline (
  id                        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period          text          NOT NULL,
  total_workers             integer       NOT NULL CHECK (total_workers >= 0),
  segment_breakdown         jsonb         NOT NULL DEFAULT '{}'::jsonb,
    -- e.g. {"departments": {"dept-ops": 45}, "sites": {"Milano": 120}}
    -- All segments with < 10 workers are suppressed at app layer before insert.
  privacy_threshold_applied boolean       NOT NULL DEFAULT true,
  minimum_group_size        integer       NOT NULL DEFAULT 10,
  created_at                timestamptz   NOT NULL DEFAULT now(),
  updated_at                timestamptz   NOT NULL DEFAULT now(),
  created_by                text,

  UNIQUE (tenant_id, reporting_period)
);

CREATE INDEX idx_workforce_baseline_tenant ON personal.workforce_baseline (tenant_id);

ALTER TABLE personal.workforce_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_baselines" ON personal.workforce_baseline
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_baseline_read" ON personal.workforce_baseline
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 4. analytics.source_batch ────────────────────────────────────────────────
-- One row per file/source ingestion batch.

CREATE TABLE analytics.source_batch (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  source_type             text          NOT NULL,
    -- 'welfare_provider' | 'lms' | 'hr_aggregate' | 'esg' | 'partner' | 'manual'
  source_name             text,
  reporting_period        text          NOT NULL,
  row_count               integer       NOT NULL DEFAULT 0,
  mapped_count            integer       NOT NULL DEFAULT 0,
  rejected_count          integer       NOT NULL DEFAULT 0,
  batch_status            text          NOT NULL DEFAULT 'pending',
    -- 'pending' | 'processing' | 'approved' | 'rejected' | 'partial'
  completeness_pct        numeric(5,4),
  mapping_confidence_avg  numeric(5,4),
  evidence_attached_pct   numeric(5,4),
  pending_review_count    integer       NOT NULL DEFAULT 0,
  source_notes            text,
  payload_sample          jsonb,        -- redacted non-sensitive sample for operator debugging
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now(),
  processed_at            timestamptz,
  created_by              text
);

CREATE INDEX idx_source_batch_tenant ON analytics.source_batch (tenant_id);
CREATE INDEX idx_source_batch_period ON analytics.source_batch (tenant_id, reporting_period);

ALTER TABLE analytics.source_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_batches" ON analytics.source_batch
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_batches_read" ON analytics.source_batch
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 5. personal.uploaded_record ───────────────────────────────────────────────
-- Pseudonymized individual rows from uploaded files.
-- Privacy boundary: NO employer RLS policy — KORA_ADMIN only.
-- Employers NEVER access this table, even read-only.

CREATE TABLE personal.uploaded_record (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  batch_id          uuid          NOT NULL REFERENCES analytics.source_batch (id) ON DELETE CASCADE,
  pseudonym_id      text          NOT NULL,  -- pseudonymised worker identifier, never real name/email
  raw_hash          text          NOT NULL,  -- SHA-256 of original row for deduplication, no PII
  eligibility_status text,
    -- 'eligible' | 'limited' | 'blocked' | 'review_required'
  primary_pillar    text,
  action_family     text,
  event_nature      text,
  review_status     text          NOT NULL DEFAULT 'pending',
  payload           jsonb         NOT NULL DEFAULT '{}'::jsonb,  -- redacted safe fields only
  privacy_redacted  boolean       NOT NULL DEFAULT true,
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);

CREATE INDEX idx_uploaded_record_tenant ON personal.uploaded_record (tenant_id);
CREATE INDEX idx_uploaded_record_batch  ON personal.uploaded_record (batch_id);
CREATE INDEX idx_uploaded_record_pseudonym ON personal.uploaded_record (tenant_id, pseudonym_id);

ALTER TABLE personal.uploaded_record ENABLE ROW LEVEL SECURITY;

-- PRIVACY BOUNDARY: only KORA_ADMIN can read/write uploaded_record rows.
-- No COMPANY_ADMIN or COMPANY_VIEWER policy exists — intentional.
CREATE POLICY "kora_admin_only_uploaded_records" ON personal.uploaded_record
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');


-- ── 6. analytics.uef_record ───────────────────────────────────────────────────
-- Unified Event Frame — one row per initiative/category (not per individual worker).
-- Company-safe: rows represent initiatives, not worker identities.

CREATE TABLE analytics.uef_record (
  id                          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  batch_id                    uuid          NOT NULL REFERENCES analytics.source_batch (id) ON DELETE CASCADE,
  reporting_period            text          NOT NULL,
  raw_name                    text          NOT NULL,   -- initiative/category name, not worker name
  eligibility                 text          NOT NULL,
    -- 'eligible' | 'limited' | 'blocked'
  primary_pillar              text,
  action_family               text,
  event_nature                text,
  approved_for_scoring        boolean       NOT NULL DEFAULT false,
  approved_for_bti_governance boolean       NOT NULL DEFAULT false,
  approved_for_impact_units   boolean       NOT NULL DEFAULT false,
  data_completeness_score     numeric(5,4)  NOT NULL DEFAULT 0,
  missing_fields              text[]        NOT NULL DEFAULT '{}',
  review_status               text          NOT NULL DEFAULT 'pending',
  reviewer_notes              text,
  reviewed_by                 text,
  reviewed_at                 timestamptz,
  payload                     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_uef_record_tenant  ON analytics.uef_record (tenant_id);
CREATE INDEX idx_uef_record_period  ON analytics.uef_record (tenant_id, reporting_period);
CREATE INDEX idx_uef_record_status  ON analytics.uef_record (tenant_id, review_status);

ALTER TABLE analytics.uef_record ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_uef" ON analytics.uef_record
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "advisor_tenant_uef_read" ON analytics.uef_record
  FOR SELECT USING (
    auth.kora_role() = 'ADVISOR'
    AND tenant_id = auth.tenant_id()
  );

-- No COMPANY_ADMIN / COMPANY_VIEWER policy — employers see only aggregated outputs,
-- never UEF row-level data.


-- ── 7. analytics.activation_result ───────────────────────────────────────────
-- Company-level activation aggregate for a reporting period.

CREATE TABLE analytics.activation_result (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period                text          NOT NULL,
  total_workers                   integer       NOT NULL DEFAULT 0,
  eligible_worker_count           integer       NOT NULL DEFAULT 0,
  active_worker_count             integer       NOT NULL DEFAULT 0,
  meaningful_active_worker_count  integer       NOT NULL DEFAULT 0,
  activation_rate                 numeric(5,4)  NOT NULL DEFAULT 0,
  meaningful_activation_rate      numeric(5,4)  NOT NULL DEFAULT 0,
  continuity_rate                 numeric(5,4)  NOT NULL DEFAULT 0,
  verification_rate               numeric(5,4)  NOT NULL DEFAULT 0,
  pillar_distribution             jsonb         NOT NULL DEFAULT '{}'::jsonb,
  department_activation           jsonb         NOT NULL DEFAULT '{}'::jsonb,
    -- groups < 10 workers suppressed at app layer before insert
  privacy_threshold_met           boolean       NOT NULL DEFAULT true,
  methodology_version_id          text          NOT NULL,
  calibration_status              text          NOT NULL,
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_activation_result_tenant ON analytics.activation_result (tenant_id);

ALTER TABLE analytics.activation_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_activation" ON analytics.activation_result
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_activation_read" ON analytics.activation_result
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 8. analytics.confidence_result ───────────────────────────────────────────
-- Confidence Score record — external to KORA Index v3 computation, weight = 0.

CREATE TABLE analytics.confidence_result (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period        text          NOT NULL,
  confidence_score        numeric(5,4)  NOT NULL DEFAULT 0,  -- 0–1
  confidence_level        text          NOT NULL,            -- 'high' | 'medium' | 'low'
  data_completeness       numeric(5,4)  NOT NULL DEFAULT 0,
  evidence_quality        numeric(5,4)  NOT NULL DEFAULT 0,
  mapping_confidence      numeric(5,4)  NOT NULL DEFAULT 0,
  verification_weight     numeric(5,4)  NOT NULL DEFAULT 0,
  source_coverage         jsonb         NOT NULL DEFAULT '{}'::jsonb,
  gaps_identified         text[]        NOT NULL DEFAULT '{}',
  limitations             text          NOT NULL DEFAULT '',
  methodology_version_id  text          NOT NULL,
  calibration_status      text          NOT NULL,
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_confidence_result_tenant ON analytics.confidence_result (tenant_id);

ALTER TABLE analytics.confidence_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_confidence" ON analytics.confidence_result
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_confidence_read" ON analytics.confidence_result
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 9. analytics.bti_result ───────────────────────────────────────────────────
-- Budget-to-Human-Impact engine output — macroblock 4, weight 20%.

CREATE TABLE analytics.bti_result (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period                text          NOT NULL,
  total_people_welfare_budget     numeric(14,2) NOT NULL DEFAULT 0,
  deep_activation_spend           numeric(14,2) NOT NULL DEFAULT 0,
  economic_relief_spend           numeric(14,2) NOT NULL DEFAULT 0,
  blocked_compliance_spend        numeric(14,2) NOT NULL DEFAULT 0,
  activation_debt_eur             numeric(14,2) NOT NULL DEFAULT 0,
  deep_activation_share           numeric(5,4)  NOT NULL DEFAULT 0,  -- 0–1
  budget_evidence_quality         numeric(5,4)  NOT NULL DEFAULT 0,  -- 0–1
  bti_score                       numeric(6,2)  NOT NULL DEFAULT 0,  -- 0–100
  cost_per_impact_unit            numeric(14,2),
  payload                         jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_bti_result_tenant ON analytics.bti_result (tenant_id);

ALTER TABLE analytics.bti_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_bti" ON analytics.bti_result
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_bti_read" ON analytics.bti_result
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 10. analytics.kora_index_result ──────────────────────────────────────────
-- KORA Index v3 computation result — the primary output record.
-- JSONB payload for components/macroblocks because exact schema may evolve
-- with methodology versioning (pre-empirical → Delphi → empirical).

CREATE TABLE analytics.kora_index_result (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period        text          NOT NULL,
  methodology_version_id  text          NOT NULL,
  kora_index_value        numeric(6,2)  NOT NULL,
  safeguard_status        text          NOT NULL,  -- 'CLEAR' | 'WARNING' | 'FLAGGED'
  calibration_status      text          NOT NULL,  -- 'pre_empirical_calibration' | ...
  limitations_text        text,
  components              jsonb         NOT NULL DEFAULT '[]'::jsonb,
    -- KoraIndexComponent[] — stored as JSONB for methodology version flexibility
  macroblocks             jsonb         NOT NULL DEFAULT '[]'::jsonb,
    -- MacroblockScore[] — stored as JSONB
  scoring_run_id          text,
  confidence_result_id    uuid          REFERENCES analytics.confidence_result (id),
  activation_result_id    uuid          REFERENCES analytics.activation_result (id),
  is_current              boolean       NOT NULL DEFAULT true,
    -- Only one current result per tenant × period.
    -- When a new result is computed, the old one is set is_current = false.
  created_at              timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — results are immutable; superseded by new records with is_current logic.
);

CREATE INDEX idx_kora_index_result_tenant   ON analytics.kora_index_result (tenant_id);
CREATE INDEX idx_kora_index_result_current  ON analytics.kora_index_result (tenant_id, is_current) WHERE is_current = true;

-- Partial unique: at most one current result per tenant × period.
CREATE UNIQUE INDEX idx_kora_index_result_one_current
  ON analytics.kora_index_result (tenant_id, reporting_period)
  WHERE is_current = true;

ALTER TABLE analytics.kora_index_result ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_kora_index" ON analytics.kora_index_result
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_kora_index_read" ON analytics.kora_index_result
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
    AND is_current = true
  );


-- ── 11. analytics.decision_pack_version ──────────────────────────────────────
-- Versioned Decision Pack output — links scoring results and stores pack payload.

CREATE TABLE analytics.decision_pack_version (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  version_id            text          NOT NULL,
  reporting_period      text          NOT NULL,
  status                text          NOT NULL DEFAULT 'draft',
    -- 'draft' | 'data_review_required' | 'advisor_review_required'
    -- | 'ready' | 'exported' | 'archived' | 'blocked'
  kora_index_result_id  uuid          REFERENCES analytics.kora_index_result (id),
  bti_result_id         uuid          REFERENCES analytics.bti_result (id),
  activation_result_id  uuid          REFERENCES analytics.activation_result (id),
  confidence_result_id  uuid          REFERENCES analytics.confidence_result (id),
  pack_payload          jsonb         NOT NULL DEFAULT '{}'::jsonb,
    -- Serialized Decision Pack content — JSONB for version flexibility.
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),
  exported_at           timestamptz,
  archived_at           timestamptz,
  created_by            text,

  UNIQUE (tenant_id, version_id)
);

CREATE INDEX idx_decision_pack_tenant ON analytics.decision_pack_version (tenant_id);
CREATE INDEX idx_decision_pack_status ON analytics.decision_pack_version (tenant_id, status);

ALTER TABLE analytics.decision_pack_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_dp" ON analytics.decision_pack_version
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_dp_ready_read" ON analytics.decision_pack_version
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
    AND status IN ('ready', 'exported')
  );


-- ── 12. gov.budget_governance ────────────────────────────────────────────────
-- Financial governance record for BTI evidence tracking.
-- No gov.kip_records — explicitly excluded from Foundation Light (CLAUDE.md §17).

CREATE TABLE gov.budget_governance (
  id                              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid          NOT NULL REFERENCES analytics.tenant (id) ON DELETE CASCADE,
  reporting_period                text          NOT NULL,
  fiscal_year                     text          NOT NULL,
  total_welfare_budget_declared   numeric(14,2) NOT NULL DEFAULT 0,
  budget_evidence_level           text          NOT NULL DEFAULT 'L0_NO_EVIDENCE',
    -- 'L0_NO_EVIDENCE' | 'L1_SELF_DECLARED' | 'L2_INTERNAL_DOCUMENT'
    -- | 'L3_THIRD_PARTY_DOCUMENT' | 'L4_VERIFIED_EVIDENCE'
  budget_source_reference         text,
  advisor_validated               boolean       NOT NULL DEFAULT false,
  payload                         jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at                      timestamptz   NOT NULL DEFAULT now(),
  updated_at                      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_budget_gov_tenant ON gov.budget_governance (tenant_id);

ALTER TABLE gov.budget_governance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kora_admin_all_budget_gov" ON gov.budget_governance
  FOR ALL USING (auth.kora_role() = 'KORA_ADMIN');

CREATE POLICY "company_own_budget_gov_read" ON gov.budget_governance
  FOR SELECT USING (
    auth.kora_role() IN ('COMPANY_ADMIN', 'COMPANY_VIEWER')
    AND tenant_id = auth.tenant_id()
  );


-- ── 13. audit.audit_log ───────────────────────────────────────────────────────
-- Immutable append-only audit trail.
-- No UPDATE or DELETE policies — enforced at RLS + application layer.

CREATE TABLE audit.audit_log (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid,         -- nullable: system-level events have no tenant
  actor_role      text          NOT NULL,
  actor_id        text          NOT NULL,
  action          text          NOT NULL,
    -- e.g. 'batch.upload', 'uef.review.approve', 'kora_index.compute', 'dp.export'
  resource_type   text          NOT NULL,
    -- e.g. 'source_batch', 'uef_record', 'kora_index_result', 'decision_pack_version'
  resource_id     text,
  payload         jsonb         NOT NULL DEFAULT '{}'::jsonb,
  ip_address      inet,
  created_at      timestamptz   NOT NULL DEFAULT now()
  -- No updated_at — audit log is append-only by design.
);

CREATE INDEX idx_audit_log_tenant   ON audit.audit_log (tenant_id);
CREATE INDEX idx_audit_log_actor    ON audit.audit_log (actor_id);
CREATE INDEX idx_audit_log_action   ON audit.audit_log (action);
CREATE INDEX idx_audit_log_created  ON audit.audit_log (created_at DESC);

ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;

-- KORA_ADMIN can read the audit trail.
CREATE POLICY "kora_admin_read_audit" ON audit.audit_log
  FOR SELECT USING (auth.kora_role() = 'KORA_ADMIN');

-- INSERT is allowed from the application layer (service role or privileged context).
-- No application-layer actor can INSERT with arbitrary content — enforced in Phase 2B.
CREATE POLICY "application_insert_audit" ON audit.audit_log
  FOR INSERT WITH CHECK (true);

-- No UPDATE, no DELETE — the table is immutable after insert.
-- Enforce also at DB level: revoke UPDATE/DELETE from all non-superuser roles.
REVOKE UPDATE, DELETE ON audit.audit_log FROM PUBLIC;


-- ── 14. updated_at auto-update triggers ──────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_updated_at
  BEFORE UPDATE ON analytics.tenant
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_workforce_baseline_updated_at
  BEFORE UPDATE ON personal.workforce_baseline
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_source_batch_updated_at
  BEFORE UPDATE ON analytics.source_batch
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_uploaded_record_updated_at
  BEFORE UPDATE ON personal.uploaded_record
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_uef_record_updated_at
  BEFORE UPDATE ON analytics.uef_record
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_activation_result_updated_at
  BEFORE UPDATE ON analytics.activation_result
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_confidence_result_updated_at
  BEFORE UPDATE ON analytics.confidence_result
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_bti_result_updated_at
  BEFORE UPDATE ON analytics.bti_result
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_decision_pack_updated_at
  BEFORE UPDATE ON analytics.decision_pack_version
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_budget_gov_updated_at
  BEFORE UPDATE ON gov.budget_governance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
